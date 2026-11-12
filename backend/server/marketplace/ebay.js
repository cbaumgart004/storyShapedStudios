// server/marketplace/ebay.js
// eBay's Sell Inventory and Fulfillment APIs, the calls the sync needs and no
// more. The token comes from utils/tokens.js and is refreshed here when it has
// expired (eBay user tokens last two hours). **Unverified** against a live call
// until a token with the sell.inventory and sell.fulfillment scopes exists.
//
// eBay listings made on its website are not visible to the Inventory API until
// migrated (bulk_migrate_listing); the existing shop's listings need that once
// before the site can update them. **Unverified** which of hers qualify.
//
// Settings, by name: EBAY_CLIENT_ID, EBAY_CLIENT_SECRET, EBAY_ENVIRONMENT.

import { XMLParser } from 'fast-xml-parser'
import { loadToken, saveToken } from '../utils/tokens.js'

// Trading API elements that repeat; the parser makes them lists even when one
// comes back. Values stay text: a SKU of "007" must not become 7.
const LISTS = new Set(['Item', 'Variation', 'NameValueList', 'Value', 'PictureURL', 'Errors'])
const xml = new XMLParser({
  ignoreAttributes: false, attributeNamePrefix: '@', textNodeName: '#text',
  parseTagValue: false, parseAttributeValue: false, isArray: (name) => LISTS.has(name),
})

export const EBAY_SCOPES = [
  'https://api.ebay.com/oauth/api_scope',
  'https://api.ebay.com/oauth/api_scope/sell.inventory',
  'https://api.ebay.com/oauth/api_scope/sell.account',
  'https://api.ebay.com/oauth/api_scope/sell.fulfillment',
]

export function createEbay({ fetch: http = fetch, env = process.env, tokens = { loadToken, saveToken } } = {}) {
  // Read when called: locally, dotenv loads after this module is imported.
  const host = () => ((env.EBAY_ENVIRONMENT || 'sandbox') === 'sandbox' ? 'https://api.sandbox.ebay.com' : 'https://api.ebay.com')

  async function token() {
    let t = await tokens.loadToken('ebay')
    if (!t?.access_token) throw new Error('No eBay token: sign in at /auth/ebay.')
    if (t.obtained_at && Date.now() > t.obtained_at + (t.expires_in - 60) * 1000) {
      const res = await http(`${host()}/identity/v1/oauth2/token`, {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          authorization: `Basic ${Buffer.from(`${env.EBAY_CLIENT_ID}:${env.EBAY_CLIENT_SECRET}`).toString('base64')}`,
        },
        body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: t.refresh_token, scope: EBAY_SCOPES.join(' ') }),
      })
      if (!res.ok) throw new Error(`eBay token refresh: ${res.status} ${await res.text()}`)
      // A refresh does not return a new refresh token; keep the old one.
      t = { ...t, ...(await res.json()), obtained_at: Date.now() }
      await tokens.saveToken('ebay', t)
    }
    return t.access_token
  }

  async function call(method, path, body) {
    const res = await http(`${host()}${path}`, {
      method,
      headers: { authorization: `Bearer ${await token()}`, 'content-type': 'application/json', 'content-language': 'en-US' },
      body: body && JSON.stringify(body),
    })
    const text = await res.text()
    if (!res.ok) throw new Error(`eBay ${method} ${path}: ${res.status} ${text}`)
    return text ? JSON.parse(text) : null
  }
  const inv = '/sell/inventory/v1'

  // The Trading API (XML), for listings made on eBay's website, which the
  // Inventory API cannot see until migrated. Read calls only. The OAuth token
  // goes in X-EBAY-API-IAF-TOKEN. A Warning Ack still carries the answer.
  async function trading(callName, inner) {
    const res = await http(`${host()}/ws/api.dll`, {
      method: 'POST',
      headers: {
        'content-type': 'text/xml',
        'x-ebay-api-call-name': callName,
        'x-ebay-api-siteid': '0',
        'x-ebay-api-compatibility-level': '1193',
        'x-ebay-api-iaf-token': await token(),
      },
      body: `<?xml version="1.0" encoding="utf-8"?><${callName}Request xmlns="urn:ebay:apis:eBLBaseComponents">${inner}</${callName}Request>`,
    })
    const body = await res.text()
    const out = res.ok ? xml.parse(body)[`${callName}Response`] : null
    if (!out || out.Ack === 'Failure' || out.Ack === 'PartialFailure') {
      const why = (out?.Errors ?? []).filter((e) => e.SeverityCode === 'Error').map((e) => e.LongMessage ?? e.ShortMessage).join('; ')
      throw new Error(`eBay ${callName}: ${res.status} ${why || body.slice(0, 300)}`)
    }
    return out
  }

  return {
    // The seller's account standing; the cheapest call that proves the token works.
    privileges: () => call('GET', '/sell/account/v1/privilege'),
    // One page of the seller's listings ending in the next 119 days (eBay's
    // window is 120), which takes in every live Good 'Til Cancelled listing,
    // with variations, photos and description. { items, pages }.
    sellerList: async (page = 1) => {
      const now = Date.now()
      const out = await trading('GetSellerList', `<DetailLevel>ReturnAll</DetailLevel><IncludeVariations>true</IncludeVariations>`
        + `<EndTimeFrom>${new Date(now).toISOString()}</EndTimeFrom><EndTimeTo>${new Date(now + 119 * 86400e3).toISOString()}</EndTimeTo>`
        + `<Pagination><EntriesPerPage>100</EntriesPerPage><PageNumber>${page}</PageNumber></Pagination>`)
      return { items: out.ItemArray?.Item ?? [], pages: Number(out.PaginationResult?.TotalNumberOfPages ?? 1) }
    },
    putItem: (sku, body) => call('PUT', `${inv}/inventory_item/${encodeURIComponent(sku)}`, body),
    putGroup: (key, body) => call('PUT', `${inv}/inventory_item_group/${encodeURIComponent(key)}`, body),
    offers: (sku) => call('GET', `${inv}/offer?sku=${encodeURIComponent(sku)}`),
    createOffer: (body) => call('POST', `${inv}/offer`, body),
    updateOffer: (offerId, body) => call('PUT', `${inv}/offer/${offerId}`, body),
    publish: (offerId) => call('POST', `${inv}/offer/${offerId}/publish`),
    publishGroup: (key, marketplaceId = 'EBAY_US') => call('POST', `${inv}/offer/publish_by_inventory_item_group`, { inventoryItemGroupKey: key, marketplaceId }),
    // The names of the item specifics eBay requires in a category (US tree 0).
    requiredAspects: async (categoryId) => ((await call('GET', `/commerce/taxonomy/v1/category_tree/0/get_item_aspects_for_category?category_id=${encodeURIComponent(categoryId)}`)).aspects ?? [])
      .filter((a) => a.aspectConstraint?.aspectRequired).map((a) => a.localizedAspectName),
    // [{ sku, quantity }], up to 25 per call.
    setQuantities: (lines) => call('POST', `${inv}/bulk_update_price_quantity`, {
      requests: lines.map((l) => ({ sku: l.sku, shipToLocationAvailability: { quantity: l.quantity } })),
    }),
    // Orders created at or after `since` (ISO), each with lineItems (sku, quantity, lineItemId).
    orders: (since) => call('GET', `/sell/fulfillment/v1/order?filter=${encodeURIComponent(`creationdate:[${since}..]`)}&limit=200`),
  }
}
