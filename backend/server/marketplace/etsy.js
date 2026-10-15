// server/marketplace/etsy.js
// Etsy Open API v3, the calls the sync needs and no more. The token comes from
// utils/tokens.js and is refreshed here when it has expired (Etsy access tokens
// last an hour). Paths and bodies are as Etsy documents them; **unverified**
// against a live call until a token with listings_w and transactions_r exists.
//
// Every call carries x-api-key as "keystring:shared secret" (Etsy's OpenAPI
// spec, securitySchemes.api_key). Creating and updating a listing take a form
// body, the inventory JSON, an image multipart (the same spec).
//
// Settings, by name: ETSY_CLIENT_ID (the keystring), ETSY_CLIENT_SECRET,
// ETSY_SHOP_ID.

import { loadToken, saveToken } from '../utils/tokens.js'

const API = 'https://api.etsy.com/v3'

export function createEtsy({ fetch: http = fetch, env = process.env } = {}) {
  // Read when called: locally, dotenv loads after this module is imported.
  const shopId = () => env.ETSY_SHOP_ID
  const apiKey = () => `${env.ETSY_CLIENT_ID}:${env.ETSY_CLIENT_SECRET}`

  async function token() {
    let t = await loadToken('etsy')
    if (!t?.access_token) throw new Error('No Etsy token: sign in at /auth/etsy.')
    if (t.obtained_at && Date.now() > t.obtained_at + (t.expires_in - 60) * 1000) {
      const res = await http(`${API}/public/oauth/token`, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-api-key': apiKey() },
        body: new URLSearchParams({ grant_type: 'refresh_token', client_id: env.ETSY_CLIENT_ID, refresh_token: t.refresh_token }),
      })
      if (!res.ok) throw new Error(`Etsy token refresh: ${res.status} ${await res.text()}`)
      t = { ...(await res.json()), obtained_at: Date.now() }
      await saveToken('etsy', t)
    }
    return t.access_token
  }

  // as: 'json' | 'form' (urlencoded; an array joined by commas, **unverified**
  // against Etsy's parser) | 'multipart' (a FormData).
  async function call(method, path, body, as = 'json') {
    if (!shopId()) throw new Error('ETSY_SHOP_ID is not set.')
    const headers = { 'x-api-key': apiKey(), authorization: `Bearer ${await token()}` }
    if (body && as === 'json') { headers['content-type'] = 'application/json'; body = JSON.stringify(body) }
    if (body && as === 'form') {
      headers['content-type'] = 'application/x-www-form-urlencoded'
      body = new URLSearchParams(Object.entries(body).filter(([, v]) => v != null).map(([k, v]) => [k, Array.isArray(v) ? v.join(',') : String(v)]))
    }
    const res = await http(`${API}/application${path.replace('{shop}', shopId())}`, { method, headers, body })
    const text = await res.text()
    if (!res.ok) throw new Error(`Etsy ${method} ${path}: ${res.status} ${text}`)
    return text ? JSON.parse(text) : null
  }

  return {
    sections: () => call('GET', '/shops/{shop}/sections'),
    taxonomy: () => call('GET', '/seller-taxonomy/nodes'),
    createDraft: (body) => call('POST', '/shops/{shop}/listings', body, 'form'),
    update: (listingId, body) => call('PATCH', `/shops/{shop}/listings/${listingId}`, body, 'form'),
    inventory: (listingId) => call('GET', `/listings/${listingId}/inventory`),
    setInventory: (listingId, body) => call('PUT', `/listings/${listingId}/inventory`, body),
    // Etsy takes the file itself, not an address.
    async uploadImage(listingId, url, rank) {
      const img = await http(url)
      if (!img.ok) throw new Error(`Fetching ${url}: ${img.status}`)
      const form = new FormData()
      form.append('image', new Blob([await img.arrayBuffer()], { type: img.headers.get('content-type') ?? 'image/jpeg' }), url.split('/').pop())
      form.append('rank', String(rank))
      return call('POST', `/shops/{shop}/listings/${listingId}/images`, form, 'multipart')
    },
    // A page of active listings with their images and inventory.
    listings: (offset = 0) => call('GET', `/shops/{shop}/listings?state=active&limit=100&offset=${offset}&includes=Images,Inventory`),
    // Paid receipts created at or after `since` (unix seconds), each with its
    // transactions (sku, quantity, transaction_id).
    receipts: (since) => call('GET', `/shops/{shop}/receipts?was_paid=true&min_created=${since}&limit=100`),
  }
}

// "Jewelry < Rings < Statement Rings" to its node id, walking Etsy's taxonomy
// tree by name. Null when any step does not match.
export function taxonomyId(nodes, path) {
  let level = nodes
  let found = null
  for (const name of String(path ?? '').split('<').map((s) => s.trim()).filter(Boolean)) {
    found = (level ?? []).find((n) => n.name.toLowerCase() === name.toLowerCase())
    if (!found) return null
    level = found.children
  }
  return found?.id ?? null
}
