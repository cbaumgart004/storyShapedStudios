// server/marketplace/sync.js
// The site as the source of truth for Etsy and eBay (ADR-0004, ADR-0011):
//
//   pushListing(docId)    a published Listing to both Marketplaces: created on
//                         the first push, updated after; counts from its Stock Items
//   pushQuantities(skus)  each SKU's count to every Marketplace it is linked on
//   pullSales()           paid Etsy receipts and eBay orders since the last pull,
//                         each line a `sale` movement on its Stock Item (once:
//                         marketplace_sales is keyed by the Marketplace's line id),
//                         then the new counts pushed to the other Marketplace
//
// Nothing is sent unless MARKETPLACE_SYNC=on: until Trunk's own sync is switched
// off it would write the same counts (CURRENT_WORK.md, E6). Off, every call is a
// dry run returning what it would send.
//
// Links (which Marketplace listing holds which SKU) live in marketplace_links,
// per Variation as ADR-0004 asks. The Listing's own etsyListingId / ebayItemId
// fields are the import's; the push does not write console documents.

import { toEtsy, toEbay, units, sellsOn } from './translate.js'
import { taxonomyId } from './etsy.js'
import { ensureStockTables } from '../utils/stock.js'
import { loadToken } from '../utils/tokens.js'

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS marketplace_links (
    provider       TEXT NOT NULL CHECK (provider IN ('etsy', 'ebay')),
    sku            TEXT NOT NULL,
    listing_doc_id TEXT NOT NULL,
    external_id    TEXT,
    offer_id       TEXT,
    pushed_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (provider, sku)
  );
  CREATE TABLE IF NOT EXISTS marketplace_sales (
    provider     TEXT NOT NULL CHECK (provider IN ('etsy', 'ebay')),
    line_id      TEXT NOT NULL,
    order_id     TEXT NOT NULL,
    sku          TEXT,
    quantity     NUMERIC(12,3) NOT NULL,
    outcome      TEXT NOT NULL,
    received_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (provider, line_id)
  );
  CREATE TABLE IF NOT EXISTS marketplace_cursors (
    provider TEXT PRIMARY KEY CHECK (provider IN ('etsy', 'ebay')),
    since    TIMESTAMPTZ NOT NULL
  )
`

// deps: { db, stock (utils/stock.js), etsy, ebay, env }
export function createSync({ db, stock, etsy, ebay, env = process.env }) {
  // Read on each call: locally, dotenv loads after this module is imported.
  const isLive = () => env.MARKETPLACE_SYNC === 'on'
  let ready = null
  const ensure = () => (ready ??= (async () => {
    for (const s of SCHEMA.split(';').map((x) => x.trim()).filter(Boolean)) await db.query(s)
  })().catch((err) => { ready = null; throw err }))

  async function stockBySku(skus) {
    const { rows } = await db.query('SELECT id, sku, quantity FROM stock_items WHERE sku = ANY($1)', [skus])
    return new Map(rows.map((r) => [r.sku, { ...r, quantity: Number(r.quantity) }]))
  }
  async function links(provider, skus) {
    const { rows } = await db.query('SELECT * FROM marketplace_links WHERE provider = $1 AND sku = ANY($2)', [provider, skus])
    return new Map(rows.map((r) => [r.sku, r]))
  }
  async function link(provider, sku, docId, externalId, offerId = null) {
    await db.query(
      `INSERT INTO marketplace_links (provider, sku, listing_doc_id, external_id, offer_id) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (provider, sku) DO UPDATE SET listing_doc_id = $3, external_id = $4, offer_id = COALESCE($5, marketplace_links.offer_id), pushed_at = now()`,
      [provider, sku, docId, externalId, offerId])
  }
  const absolute = (src) => (/^https?:\/\//.test(src) ? src : env.PUBLIC_SITE_URL ? new URL(src, env.PUBLIC_SITE_URL).href : src)

  // The console's published copy: a draft is never pushed. A check reads the
  // draft as it stands, so a Listing is checked before it is published.
  async function listingDoc(docId, { draft = false } = {}) {
    const { rows: [doc] } = await db.query(
      `SELECT id, slug, data, published_data FROM documents WHERE id::text = $1 AND type = 'listing'`, [String(docId)])
    const data = draft ? doc?.data : doc?.published_data
    return data ? { id: String(doc.id), slug: doc.slug, data } : null
  }

  async function etsyPlan(listing, bySku, live) {
    let taxonomy = null
    let section = null
    if (live || env.ETSY_SHOP_ID) {
      const nodes = (await etsy.taxonomy()).results
      taxonomy = taxonomyId(nodes, listing.etsyCategory)
      section = (await etsy.sections()).results.find((s) => s.title === listing.section)?.shop_section_id ?? null
    }
    return toEtsy(listing, bySku, {
      taxonomyId: taxonomy, shopSectionId: section,
      defaults: { shippingProfileId: env.ETSY_SHIPPING_PROFILE_ID, returnPolicyId: env.ETSY_RETURN_POLICY_ID, readinessStateId: env.ETSY_READINESS_STATE_ID },
    })
  }
  // eBay's required item specifics for the category, when eBay can be asked.
  async function requiredAspects(categoryId) {
    if (!categoryId || !ebay.requiredAspects) return { names: [] }
    try { return { names: await ebay.requiredAspects(categoryId) } } catch (err) { return { names: [], warning: `eBay's required item specifics were not checked: ${err.message}` } }
  }

  return {

    // check: read the draft and send nothing, whatever MARKETPLACE_SYNC says.
    pushListing: async (docId, { check = false } = {}) => {
      await ensure()
      const live = isLive() && !check
      const doc = await listingDoc(docId, { draft: check })
      if (!doc) return { error: check ? 'No Listing with that id.' : 'No published Listing with that id.' }
      const listing = doc.data
      const skus = (listing.variations ?? []).map((v) => v.sku)
      const bySku = await stockBySku(skus)
      const out = { listing: doc.slug, live, etsy: null, ebay: null }

      // Etsy: one listing per Listing; every Variation is a product in its inventory.
      if (!sellsOn(listing, 'etsy')) out.etsy = { skipped: ['Not offered on Etsy (Sell on).'] }
      else try {
        const plan = await etsyPlan(listing, bySku, live)
        if (plan.problems.length) out.etsy = { skipped: plan.problems }
        else if (!live) out.etsy = { wouldSend: { listing: plan.listing, inventory: plan.inventory } }
        else {
          const known = [...(await links('etsy', skus)).values()].find((l) => l.external_id)?.external_id
          const id = known ?? String((await etsy.createDraft(plan.listing)).listing_id)
          if (known) await etsy.update(id, plan.listing)
          else for (const [i, p] of (listing.photos ?? []).entries()) await etsy.uploadImage(id, absolute(p.src), i + 1)
          await etsy.setInventory(id, plan.inventory)
          for (const sku of skus) await link('etsy', sku, doc.id, id)
          out.etsy = { listingId: id, created: !known, note: known ? undefined : 'Created as a draft on Etsy: activate it there, or set state active once verified.' }
        }
      } catch (err) { out.etsy = { error: err.message } }

      // eBay: an inventory item per Variation, one offer each, grouped when several.
      if (!sellsOn(listing, 'ebay')) out.ebay = { skipped: ['Not offered on eBay (Sell on).'] }
      else try {
        const required = await requiredAspects(listing.ebayCategoryId)
        const plan = toEbay(listing, bySku, {
          imageUrls: (listing.photos ?? []).map((p) => absolute(p.src)),
          groupKey: doc.slug,
          requiredAspects: required.names,
          defaults: {
            condition: env.EBAY_CONDITION,
            fulfillmentPolicyId: env.EBAY_FULFILLMENT_POLICY_ID, paymentPolicyId: env.EBAY_PAYMENT_POLICY_ID, returnPolicyId: env.EBAY_RETURN_POLICY_ID,
          },
          merchantLocationKey: env.EBAY_LOCATION_KEY,
        })
        if (required.warning) plan.warnings = [...(plan.warnings ?? []), required.warning]
        if (plan.problems.length) out.ebay = { skipped: plan.problems, warnings: plan.warnings }
        else if (!live) out.ebay = { wouldSend: { items: plan.items, group: plan.group, offers: plan.offers }, warnings: plan.warnings }
        else {
          const known = await links('ebay', skus)
          for (const it of plan.items) await ebay.putItem(it.sku, it.body)
          if (plan.group) await ebay.putGroup(plan.group.key, plan.group.body)
          const offerIds = {}
          for (const o of plan.offers) {
            const existing = known.get(o.sku)?.offer_id ?? (await ebay.offers(o.sku).catch(() => null))?.offers?.[0]?.offerId
            if (existing) await ebay.updateOffer(existing, o.body)
            offerIds[o.sku] = existing ?? (await ebay.createOffer(o.body)).offerId
          }
          const listingId = plan.group
            ? (await ebay.publishGroup(plan.group.key)).listingId
            : (await ebay.publish(offerIds[skus[0]])).listingId
          for (const sku of skus) await link('ebay', sku, doc.id, listingId, offerIds[sku])
          out.ebay = { listingId, warnings: plan.warnings }
        }
      } catch (err) { out.ebay = { error: err.message } }
      return out
    },

    pushQuantities: async (skus) => {
      await ensure()
      const live = isLive()
      skus = [...new Set(skus.filter(Boolean))]
      if (!skus.length) return { live, etsy: [], ebay: [] }
      const bySku = await stockBySku(skus)
      const out = { live, etsy: [], ebay: [] }

      // Etsy sets a listing's whole inventory at once: read it, change the
      // offerings whose SKU moved, write it back.
      const etsyLinks = await links('etsy', skus)
      for (const id of new Set([...etsyLinks.values()].map((l) => l.external_id).filter(Boolean))) {
        try {
          if (!live) { out.etsy.push({ listingId: id, wouldSet: skus.filter((s) => etsyLinks.get(s)?.external_id === id).map((s) => [s, units(bySku.get(s)?.quantity)]) }); continue }
          const inv = await etsy.inventory(id)
          const products = inv.products.map((p) => {
            const offering = p.offerings[0]
            const q = bySku.has(p.sku) ? units(bySku.get(p.sku).quantity) : offering.quantity
            return {
              sku: p.sku,
              property_values: p.property_values.map((v) => ({ property_id: v.property_id, property_name: v.property_name, value_ids: v.value_ids, values: v.values })),
              offerings: [{ price: offering.price.amount / offering.price.divisor, quantity: q, is_enabled: q > 0 }],
            }
          })
          await etsy.setInventory(id, { products, price_on_property: inv.price_on_property, quantity_on_property: inv.quantity_on_property, sku_on_property: inv.sku_on_property })
          out.etsy.push({ listingId: id, set: true })
        } catch (err) { out.etsy.push({ listingId: id, error: err.message }) }
      }

      const ebayLines = [...(await links('ebay', skus)).keys()].map((sku) => ({ sku, quantity: units(bySku.get(sku)?.quantity) }))
      for (let i = 0; i < ebayLines.length; i += 25) {
        const batch = ebayLines.slice(i, i + 25)
        try {
          if (!live) out.ebay.push({ wouldSet: batch })
          else { await ebay.setQuantities(batch); out.ebay.push({ set: batch.length }) }
        } catch (err) { out.ebay.push({ error: err.message }) }
      }
      return out
    },

    // What the Marketplaces section shows: whether pushes are live, whether each
    // Marketplace is configured and signed in, and which SKUs are linked where.
    status: async () => {
      await ensure()
      const has = async (p) => Boolean(await loadToken(p).then((t) => t?.access_token).catch(() => null))
      const { rows } = await db.query('SELECT provider, sku, listing_doc_id, external_id, pushed_at FROM marketplace_links ORDER BY pushed_at DESC')
      return {
        live: isLive(),
        etsy: { configured: Boolean(env.ETSY_CLIENT_ID && env.ETSY_SHOP_ID), signedIn: await has('etsy') },
        ebay: { configured: Boolean(env.EBAY_CLIENT_ID), signedIn: await has('ebay'), environment: env.EBAY_ENVIRONMENT || 'sandbox' },
        links: rows,
      }
    },

    // A snapshot of a Marketplace's own listings as they are, kept unmodified
    // in import_snapshots (ADR-0004) so Listings can be built and reconciled
    // from them later. rows: one object per row of Etsy's or eBay's CSV export
    // (or Etsy's API); the key is the listing or item number, else the SKU,
    // else the title.
    snapshot: async (source, rows) => {
      if (!['etsy', 'ebay'].includes(source)) throw new Error('source is etsy or ebay')
      if (!Array.isArray(rows)) throw new Error('rows must be a list')
      await ensureStockTables(db)
      const pick = (r, names) => names.map((n) => Object.entries(r).find(([k]) => k.trim().toLowerCase() === n)?.[1]).find((v) => v != null && String(v).trim() !== '')
      let kept = 0
      for (const r of rows) {
        const key = pick(r, ['listing_id', 'listing id', 'item number', 'item id', 'itemid', 'sku', 'custom label (sku)', 'title'])
        if (!key) continue
        const sku = pick(r, ['sku', 'custom label (sku)', 'custom label'])
        await db.query('INSERT INTO import_snapshots (source, external_key, sku, raw, outcome) VALUES ($1, $2, $3, $4, $5)',
          [source, String(key), sku ? String(sku) : null, JSON.stringify(r), 'snapshot'])
        kept++
      }
      return { source, kept, skipped: rows.length - kept }
    },

    // Every active Etsy listing with its images and inventory, through the API
    // (needs a listings_r token), into the same snapshots.
    snapshotEtsy: async function () {
      const rows = []
      for (let offset = 0; ; offset += 100) {
        const page = await etsy.listings(offset)
        rows.push(...(page.results ?? []))
        if (!page.results?.length || rows.length >= page.count) break
      }
      return this.snapshot('etsy', rows)
    },

    // One Marketplace sale line into stock, at most once. Exported for the
    // tests and for a webhook, should either Marketplace's be adopted.
    recordSale: async (provider, { lineId, orderId, sku, quantity }) => {
      await ensure()
      const live = isLive()
      const { rows: [seen] } = await db.query('SELECT outcome FROM marketplace_sales WHERE provider = $1 AND line_id = $2', [provider, String(lineId)])
      if (seen) return { outcome: 'already recorded' }
      const item = sku ? (await stockBySku([sku])).get(sku) : null
      let outcome = 'no stock item'
      if (item && live) {
        await stock.move(item.id, { kind: 'sale', quantity, note: `${provider} order ${orderId}` })
        outcome = 'recorded'
      } else if (item) outcome = 'dry run'
      // A dry run is not remembered, so the same line is recorded once live.
      if (outcome !== 'dry run') {
        await db.query(
          'INSERT INTO marketplace_sales (provider, line_id, order_id, sku, quantity, outcome) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING',
          [provider, String(lineId), String(orderId), sku ?? null, quantity, outcome])
      }
      return { outcome, sku }
    },

    pullSales: async function () {
      await ensure()
      const live = isLive()
      const out = { live, etsy: [], ebay: [] }
      const started = new Date()
      const cursor = async (p) => (await db.query('SELECT since FROM marketplace_cursors WHERE provider = $1', [p])).rows[0]?.since
        ?? new Date(Date.now() - 24 * 3600 * 1000) // first pull: the last day
      const moved = []

      for (const [provider, fetchLines] of [
        ['etsy', async (since) => ((await etsy.receipts(Math.floor(since.getTime() / 1000))).results ?? [])
          .flatMap((r) => (r.transactions ?? []).map((t) => ({ lineId: t.transaction_id, orderId: r.receipt_id, sku: t.sku, quantity: t.quantity })))],
        ['ebay', async (since) => ((await ebay.orders(since.toISOString())).orders ?? [])
          .flatMap((o) => (o.lineItems ?? []).map((l) => ({ lineId: l.lineItemId, orderId: o.orderId, sku: l.sku, quantity: l.quantity })))],
      ]) {
        try {
          for (const line of await fetchLines(await cursor(provider))) {
            const r = await this.recordSale(provider, line)
            out[provider].push({ ...line, outcome: r.outcome })
            if (r.outcome === 'recorded') moved.push(line.sku)
          }
          if (live) {
            await db.query(
              `INSERT INTO marketplace_cursors (provider, since) VALUES ($1, $2) ON CONFLICT (provider) DO UPDATE SET since = $2`, [provider, started])
          }
        } catch (err) { out[provider] = { error: err.message } }
      }
      // A sale on one Marketplace lowers the count on the other.
      if (moved.length) out.pushed = await this.pushQuantities(moved)
      return out
    },
  }
}
