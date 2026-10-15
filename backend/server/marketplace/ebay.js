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

import { loadToken, saveToken } from '../utils/tokens.js'

export const EBAY_SCOPES = [
  'https://api.ebay.com/oauth/api_scope',
  'https://api.ebay.com/oauth/api_scope/sell.inventory',
  'https://api.ebay.com/oauth/api_scope/sell.account',
  'https://api.ebay.com/oauth/api_scope/sell.fulfillment',
]

export function createEbay({ fetch: http = fetch, env = process.env } = {}) {
  // Read when called: locally, dotenv loads after this module is imported.
  const host = () => ((env.EBAY_ENVIRONMENT || 'sandbox') === 'sandbox' ? 'https://api.sandbox.ebay.com' : 'https://api.ebay.com')

  async function token() {
    let t = await loadToken('ebay')
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
      await saveToken('ebay', t)
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

  return {
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
