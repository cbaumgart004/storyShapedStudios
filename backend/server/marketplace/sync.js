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
import { fromEtsy, slugify } from './fromEtsy.js'
import { fromEbay } from './fromEbay.js'
import { fillListing, idField, marketplaceQuantities, likeness } from './pairing.js'
import { ensureStockTables } from '../utils/stock.js'
import { loadToken } from '../utils/tokens.js'

// Fields of a Marketplace listing that move without the shop changing it
// (shoppers' counters, Etsy's own clocks); a snapshot differing only in these
// is not kept.
const VOLATILE = ['views', 'num_favorers', 'featured_rank', 'state_timestamp', 'updated_timestamp', 'last_modified_timestamp',
  'TimeLeft', 'HitCount', 'WatchCount', 'SellingStatus', 'ListingDetails']

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
  CREATE TABLE IF NOT EXISTS listing_numbers (
    number      INTEGER PRIMARY KEY,
    doc_id      TEXT NOT NULL UNIQUE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE TABLE IF NOT EXISTS marketplace_cursors (
    provider TEXT PRIMARY KEY CHECK (provider IN ('etsy', 'ebay')),
    since    TIMESTAMPTZ NOT NULL
  )
`

// The Listings (not yet paired on that Marketplace) a Marketplace listing
// looks like, surest first, at most five.
function looksLike(open, data) {
  return open.flatMap((doc) => {
    const { by, score } = likeness(doc.data ?? {}, data)
    return by.length ? [{ number: doc.data.listingNumber ?? null, slug: doc.slug, title: doc.data.title ?? '', by, score }] : []
  }).sort((a, b) => b.score - a.score).slice(0, 5)
}

// deps: { db, stock (utils/stock.js), etsy, ebay, env }
export function createSync({ db, stock, etsy, ebay, env = process.env }) {
  // Read on each call: locally, dotenv loads after this module is imported.
  const isLive = () => env.MARKETPLACE_SYNC === 'on'
  let ready = null

  // Names for the section and category ids the review shows: { sections:
  // {id: title}, categories: {id: "Jewelry < Rings < ..."} }, only for ids in
  // use. Read from Etsy, kept ten minutes per instance; without Etsy (no
  // sign-in, a stub) the ids stand alone.
  let named = null
  const loadNames = async () => {
    if (!named || Date.now() - named.at > 600_000) {
      const [sections, taxonomy] = await Promise.all([etsy.sections(), etsy.taxonomy()])
      const paths = {}
      const walk = (nodes, above) => { for (const n of nodes ?? []) { const p = above ? `${above} < ${n.name}` : n.name; paths[n.id] = p; walk(n.children, p) } }
      walk(taxonomy.results, '')
      named = { at: Date.now(), sections: Object.fromEntries((sections.results ?? []).map((s) => [s.shop_section_id, s.title])), paths, nodes: taxonomy.results ?? [], sectionList: sections.results ?? [] }
    }
    return named
  }
  const etsyNames = async (listings) => {
    try {
      await loadNames()
      const pick = (all, ids) => Object.fromEntries([...new Set(ids)].filter((id) => id != null && all[id]).map((id) => [id, all[id]]))
      return {
        sections: pick(named.sections, listings.map((l) => l.shop_section_id)),
        categories: pick(named.paths, listings.map((l) => l.taxonomy_id)),
      }
    } catch (err) {
      console.warn(`[marketplace] etsy section and category names unavailable: ${err.message}`)
      return { sections: {}, categories: {} }
    }
  }
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
    // Asked of Etsy on a check too, whether or not ETSY_SHOP_ID is set (the
    // shop is otherwise the signed-in seller's). A check that cannot reach
    // Etsy says so, rather than calling a real category or section missing.
    let names = null
    let unreachable = null
    try { names = await loadNames() } catch (err) {
      if (live) throw err
      unreachable = `Etsy could not be asked for its categories and the shop's sections, so neither was checked: ${err.message}`
    }
    const plan = toEtsy(listing, bySku, {
      taxonomyId: names ? taxonomyId(names.nodes, listing.etsyCategory) : null,
      shopSectionId: names?.sectionList.find((s) => s.title === listing.section)?.shop_section_id ?? null,
      defaults: { shippingProfileId: env.ETSY_SHIPPING_PROFILE_ID, returnPolicyId: env.ETSY_RETURN_POLICY_ID, readinessStateId: env.ETSY_READINESS_STATE_ID },
    })
    if (unreachable) plan.problems = [...plan.problems.filter((p) => !/^Etsy (category|shop section) "/.test(p)), unreachable]
    return plan
  }
  // eBay's required item specifics for the category, when eBay can be asked.
  async function requiredAspects(categoryId) {
    if (!categoryId || !ebay.requiredAspects) return { names: [] }
    try { return { names: await ebay.requiredAspects(categoryId) } } catch (err) { return { names: [], warning: `eBay's required item specifics were not checked: ${err.message}` } }
  }

  return {

    // The Listing editor's choices (console optionsUrl): the shop's sections by
    // title, or every Etsy category as its path, [{ value, label }]. The values
    // are what etsyPlan matches on. null when Etsy cannot be asked; the editor
    // then keeps its own list.
    etsyChoices: async (kind) => {
      try {
        const { sections, paths } = await loadNames()
        const values = kind === 'sections' ? Object.values(sections) : Object.values(paths)
        return [...new Set(values)].sort((a, b) => a.localeCompare(b)).map((v) => ({ value: v, label: v }))
      } catch (err) {
        console.warn(`[marketplace] etsy ${kind} unavailable: ${err.message}`)
        return null
      }
    },

    // check: read the draft and send nothing, whatever MARKETPLACE_SYNC says.
    // only: the Marketplaces to act on (default both); the other is skipped.
    pushListing: async (docId, { check = false, only = ['etsy', 'ebay'] } = {}) => {
      await ensure()
      const live = isLive() && !check
      const doc = await listingDoc(docId, { draft: check })
      if (!doc) return { error: check ? 'No Listing with that id.' : 'No published Listing with that id.' }
      const listing = doc.data
      const skus = (listing.variations ?? []).map((v) => v.sku)
      const bySku = await stockBySku(skus)
      const out = { listing: doc.slug, live, etsy: null, ebay: null }

      // Etsy: one listing per Listing; every Variation is a product in its inventory.
      if (!only.includes('etsy')) out.etsy = { skipped: ['Not chosen for this push.'] }
      else if (!sellsOn(listing, 'etsy')) out.etsy = { skipped: ['Not offered on Etsy (Sell on).'] }
      else try {
        const plan = await etsyPlan(listing, bySku, live)
        if (plan.problems.length) out.etsy = { skipped: plan.problems }
        else if (!live) out.etsy = { wouldSend: { listing: plan.listing, inventory: plan.inventory } }
        else {
          // The paired listing first, so a paired Listing updates it rather than making a second.
          const known = String(listing.etsyListingId ?? '').trim() || [...(await links('etsy', skus)).values()].find((l) => l.external_id)?.external_id
          const id = known ?? String((await etsy.createDraft(plan.listing)).listing_id)
          if (known) await etsy.update(id, plan.listing)
          else for (const [i, p] of (listing.photos ?? []).entries()) await etsy.uploadImage(id, absolute(p.src), i + 1)
          await etsy.setInventory(id, plan.inventory)
          for (const sku of skus) await link('etsy', sku, doc.id, id)
          out.etsy = { listingId: id, created: !known, note: known ? undefined : 'Created as a draft on Etsy: activate it there, or set state active once verified.' }
        }
      } catch (err) { out.etsy = { error: err.message } }

      // eBay: an inventory item per Variation, one offer each, grouped when several.
      const ebayPaired = String(listing.ebayItemId ?? '').trim()
      if (!only.includes('ebay')) out.ebay = { skipped: ['Not chosen for this push.'] }
      else if (!sellsOn(listing, 'ebay')) out.ebay = { skipped: ['Not offered on eBay (Sell on).'] }
      // A listing made on eBay's website is invisible to the Inventory API
      // until migrated; pushing would publish a second listing beside it.
      else if (ebayPaired && ![...(await links('ebay', skus)).values()].some((l) => l.external_id)) {
        out.ebay = { skipped: [`Paired with eBay item ${ebayPaired}, which was made on eBay's website. The site cannot update it until it is migrated to eBay's Inventory API; a push now would make a second listing, so nothing is sent.`] }
      } else try {
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
        etsy: { configured: Boolean(env.ETSY_CLIENT_ID), signedIn: await has('etsy') },
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
      const keys = [], skus = [], raws = []
      for (const r of rows) {
        const key = pick(r, ['listing_id', 'listing id', 'item number', 'item id', 'itemid', 'sku', 'custom label (sku)', 'title'])
        if (!key) continue
        const sku = pick(r, ['sku', 'custom label (sku)', 'custom label'])
        keys.push(String(key)); skus.push(sku ? String(sku) : null); raws.push(JSON.stringify(r))
      }
      // One statement for the lot: a round trip per row ran past the Lambda's
      // 20-second limit on the shop's listings. A listing is kept only when it
      // is new or differs from its newest snapshot, counters (VOLATILE) aside,
      // so each kept row is a real change.
      let kept = 0
      if (keys.length) {
        const out = await db.query(
          `WITH incoming AS (
             SELECT k, s, r::jsonb AS r FROM unnest($2::text[], $3::text[], $4::text[]) AS t(k, s, r)
           ), latest AS (
             SELECT DISTINCT ON (external_key) external_key, raw FROM import_snapshots
             WHERE source = $1 AND external_key = ANY($2::text[])
             ORDER BY external_key, imported_at DESC, id DESC
           )
           INSERT INTO import_snapshots (source, external_key, sku, raw, outcome)
           SELECT $1, i.k, i.s, i.r, 'snapshot' FROM incoming i LEFT JOIN latest l ON l.external_key = i.k
           WHERE l.raw IS NULL OR (l.raw - $5::text[]) IS DISTINCT FROM (i.r - $5::text[])`,
          [source, keys, skus, raws, VOLATILE])
        kept = out.rowCount
        // Refreshes before this one kept every listing every time: drop each
        // snapshot that only repeats the one before it, keeping the first.
        await db.query(
          `DELETE FROM import_snapshots WHERE id IN (
             SELECT id FROM (
               SELECT id, raw - $2::text[] AS body,
                      LAG(raw - $2::text[]) OVER (PARTITION BY external_key ORDER BY imported_at, id) AS before
               FROM import_snapshots WHERE source = $1
             ) t WHERE body = before)`,
          [source, VOLATILE])
      }
      return { source, kept, unchanged: keys.length - kept, skipped: rows.length - keys.length }
    },

    // Every active Etsy listing with its images and inventory, through the API
    // (needs a listings_r token), into the same snapshots.
    snapshotEtsy: async function () {
      const rows = []
      const started = Date.now()
      for (let offset = 0; ; offset += 100) {
        const page = await etsy.listings(offset)
        rows.push(...(page.results ?? []))
        if (!page.results?.length || rows.length >= page.count) break
      }
      const read = Date.now()
      const out = await this.snapshot('etsy', rows)
      console.log(`[marketplace] etsy snapshot: ${rows.length} listings, ${out.kept} new or changed, Etsy ${read - started} ms, kept ${Date.now() - read} ms`)
      return out
    },

    // The newest snapshot of each Etsy listing, cut to what the review page
    // (Admin/EtsyReview.jsx) shows: the whole shop as Etsy sent it is past the
    // Lambda's 6 MB response limit. `filled` counts, over the full rows, how
    // many listings fill each Etsy field, so the page can find model gaps.
    // etsySnapshot(key) is one listing as Etsy sent it.
    etsySnapshots: async () => {
      await ensureStockTables(db)
      const { rows } = await db.query(
        `SELECT DISTINCT ON (external_key) external_key, raw, imported_at FROM import_snapshots
         WHERE source = 'etsy' ORDER BY external_key, imported_at DESC`)
      const filled = {}
      const has = (v) => v != null && v !== '' && v !== false && !(Array.isArray(v) && !v.length)
      const listings = rows.map(({ external_key, raw: r, imported_at }) => {
        for (const [k, v] of Object.entries(r)) if (has(v)) filled[k] = (filled[k] ?? 0) + 1
        return {
          external_key, imported_at,
          listing: {
            listing_id: r.listing_id, title: r.title, description: r.description, url: r.url,
            price: r.price, quantity: r.quantity, skus: r.skus, tags: r.tags, materials: r.materials,
            shop_section_id: r.shop_section_id, taxonomy_id: r.taxonomy_id,
            who_made: r.who_made, when_made: r.when_made, is_supply: r.is_supply,
            item_weight: r.item_weight, item_weight_unit: r.item_weight_unit,
            item_length: r.item_length, item_width: r.item_width, item_height: r.item_height,
            item_dimensions_unit: r.item_dimensions_unit,
            images: (r.images ?? []).map((m) => ({ listing_image_id: m.listing_image_id, url_570xN: m.url_570xN, url_75x75: m.url_75x75, alt_text: m.alt_text })),
            inventory: r.inventory && {
              products: (r.inventory.products ?? []).map((p) => ({
                product_id: p.product_id, sku: p.sku,
                property_values: (p.property_values ?? []).map((v) => ({ property_name: v.property_name, values: v.values })),
                offerings: (p.offerings ?? []).slice(0, 1).map((o) => ({ price: o.price, quantity: o.quantity })),
              })),
            },
          },
        }
      })
      return { count: listings.length, filled, listings, ...(await etsyNames(listings.map((l) => l.listing))) }
    },
    etsySnapshot: async (key) => {
      await ensureStockTables(db)
      const { rows: [row] } = await db.query(
        `SELECT raw FROM import_snapshots WHERE source = 'etsy' AND external_key = $1 ORDER BY imported_at DESC LIMIT 1`, [String(key)])
      return row ? { raw: row.raw } : { error: 'No snapshot of that listing.' }
    },

    // Every Listing gets the next Listing number the first time it is seen,
    // and keeps it: listing_numbers holds it, so an editor save that drops the
    // copy in data.listingNumber gets it back on the next run. The copy is
    // written into the draft and the published data without a new version,
    // since it names the Listing rather than changing it.
    numberListings: async () => {
      await ensure()
      const { rowCount: added } = await db.query(
        `INSERT INTO listing_numbers (number, doc_id)
         SELECT (SELECT coalesce(max(number), 0) FROM listing_numbers) + row_number() OVER (ORDER BY coalesce(r.first, d.updated_at), d.slug), d.id::text
         FROM documents d
         LEFT JOIN (SELECT document_id, min(created_at) AS first FROM document_revisions GROUP BY document_id) r ON r.document_id = d.id
         WHERE d.type = 'listing' AND NOT EXISTS (SELECT 1 FROM listing_numbers n WHERE n.doc_id = d.id::text)
         ON CONFLICT DO NOTHING`)
      await db.query(
        `UPDATE documents d SET
           data = jsonb_set(d.data, '{listingNumber}', to_jsonb(n.number)),
           published_data = CASE WHEN d.published_data IS NULL THEN NULL ELSE jsonb_set(d.published_data, '{listingNumber}', to_jsonb(n.number)) END
         FROM listing_numbers n
         WHERE n.doc_id = d.id::text AND d.type = 'listing'
           AND ((d.data->'listingNumber') IS DISTINCT FROM to_jsonb(n.number)
             OR (d.published_data IS NOT NULL AND (d.published_data->'listingNumber') IS DISTINCT FROM to_jsonb(n.number)))`)
      return { added }
    },

    // A draft Listing for each Marketplace listing in the newest snapshots that
    // no Listing holds yet and that looks like no Listing either. One that
    // shares a SKU or a title with a Listing not yet paired on that
    // Marketplace is suggested for pairing (pairListings) instead, so a piece
    // sold on both is one Listing. Nothing is published and nothing is sent to
    // the Marketplace. Reruns only add.
    importListings: async function (provider, user = null) {
      await ensureStockTables(db)
      // Numbered first, so each suggestion names the number to pair with.
      await this.numberListings()
      const id = idField(provider)
      const { rows: snaps } = await db.query(
        `SELECT DISTINCT ON (external_key) external_key, raw FROM import_snapshots
         WHERE source = $1 ORDER BY external_key, imported_at DESC`, [provider])
      const { rows: have } = await db.query(`SELECT id, slug, data FROM documents WHERE type = 'listing'`)
      const held = new Set(have.map((r) => r.data?.[id]).filter(Boolean).map(String))
      const open = have.filter((r) => !r.data?.[id])
      const slugs = new Set(have.map((r) => r.slug))
      let names = { sections: {}, paths: {} }
      if (provider === 'etsy') {
        try { names = await loadNames() } catch (err) { console.warn(`[marketplace] import without section and category names: ${err.message}`) }
      }
      const rows = [], suggested = []
      let existing = 0
      for (const { raw } of snaps) {
        const data = provider === 'etsy' ? fromEtsy(raw, names) : fromEbay(raw)
        const external = String(data[id] ?? '')
        if (!external) continue
        if (held.has(external)) { existing++; continue }
        const skus = data.variations.map((v) => v.sku.trim()).filter(Boolean)
        const like = looksLike(open, data)
        if (like.length) { suggested.push({ provider, externalId: external, title: data.title, skus, listings: like }); continue }
        const base = slugify(data.title) || 'listing'
        let slug = base
        for (let n = 2; slugs.has(slug); n++) slug = `${base}-${n}`
        slugs.add(slug)
        rows.push({ slug, data })
      }
      let created = 0
      if (rows.length) {
        const author = user?.id ?? null
        const { rows: made } = await db.query(
          `WITH input AS (SELECT * FROM jsonb_to_recordset($1::jsonb) AS x(slug text, data jsonb)),
           ins AS (
             INSERT INTO documents (type, slug, status, version, data, updated_at, updated_by)
             SELECT 'listing', slug, 'draft', 1, data, now(), $2 FROM input
             ON CONFLICT (type, slug) DO NOTHING
             RETURNING id, version, data)
           INSERT INTO document_revisions (document_id, version, data, author)
           SELECT id, version, data, $2 FROM ins RETURNING document_id`,
          [JSON.stringify(rows), author])
        created = made.length
      }
      await this.numberListings()
      const withoutSku = rows.filter((r) => r.data.variations.some((v) => !v.sku)).length
      console.log(`[marketplace] ${provider} import: ${created} draft Listings made, ${suggested.length} suggested for pairing, ${existing} already held`)
      return { created, existing, suggested, snapshots: snaps.length, withoutSku }
    },
    // The pairing review, readable at any time: each Marketplace listing in
    // the newest snapshots that no Listing holds yet but some Listing looks
    // like, its Listings best guess first. Changes nothing.
    suggestions: async (provider) => {
      if (!idField(provider)) return { error: 'Unknown Marketplace.' }
      await ensureStockTables(db)
      const id = idField(provider)
      const { rows: snaps } = await db.query(
        `SELECT DISTINCT ON (external_key) external_key, raw FROM import_snapshots
         WHERE source = $1 ORDER BY external_key, imported_at DESC`, [provider])
      const { rows: have } = await db.query(`SELECT id, slug, data FROM documents WHERE type = 'listing'`)
      const held = new Set(have.map((r) => r.data?.[id]).filter(Boolean).map(String))
      const open = have.filter((r) => !r.data?.[id])
      const suggested = []
      for (const { raw } of snaps) {
        const data = provider === 'etsy' ? fromEtsy(raw, { sections: {}, paths: {} }) : fromEbay(raw)
        const external = String(data[id] ?? '')
        if (!external || held.has(external)) continue
        const like = looksLike(open, data)
        if (like.length) suggested.push({ provider, externalId: external, title: data.title, skus: data.variations.map((v) => v.sku.trim()).filter(Boolean), listings: like })
      }
      suggested.sort((a, b) => b.listings[0].score - a.listings[0].score)
      return { provider, suggested }
    },
    importEtsyListings: async function (user = null) { return this.importListings('etsy', user) },
    importEbayListings: async function (user = null) { return this.importListings('ebay', user) },

    // pairs: [{ provider, externalId, listing (its Listing number) }]. Each
    // fills its Listing's draft from the newest snapshot (pairing.js), with a
    // revision. A Listing already paired with another listing on that
    // Marketplace, or a listing another Listing holds, is refused.
    pairListings: async function (pairs, user = null) {
      if (!Array.isArray(pairs) || !pairs.length) throw new Error('pairs is a list of { provider, externalId, listing }')
      await ensureStockTables(db)
      await this.numberListings()
      const out = []
      for (const { provider, externalId, listing } of pairs) {
        const id = idField(provider)
        const external = String(externalId ?? '').trim()
        const fail = (error) => out.push({ provider, externalId: external, listing, error })
        if (!id) { fail('provider is etsy or ebay'); continue }
        const { rows: [doc] } = await db.query(
          `SELECT d.id, d.slug, d.version, d.data FROM documents d JOIN listing_numbers n ON n.doc_id = d.id::text
           WHERE n.number = $1 AND d.type = 'listing'`, [Number(listing)])
        if (!doc) { fail(`No Listing number ${listing}.`); continue }
        if (doc.data[id] && String(doc.data[id]) !== external) { fail(`Listing ${listing} is already paired with ${provider} ${doc.data[id]}.`); continue }
        const { rows: [other] } = await db.query(
          `SELECT n.number FROM documents d JOIN listing_numbers n ON n.doc_id = d.id::text
           WHERE d.type = 'listing' AND d.data->>$1 = $2 AND d.id <> $3`, [id, external, doc.id])
        if (other) { fail(`${provider} ${external} is already paired with Listing ${other.number}.`); continue }
        const { rows: [snap] } = await db.query(
          `SELECT raw FROM import_snapshots WHERE source = $1 AND external_key = $2 ORDER BY imported_at DESC, id DESC LIMIT 1`, [provider, external])
        if (!snap) { fail(`No ${provider} snapshot of ${external}; take a snapshot first.`); continue }
        let names = { sections: {}, paths: {} }
        if (provider === 'etsy') { try { names = await loadNames() } catch { /* ids stand alone */ } }
        const incoming = provider === 'etsy' ? fromEtsy(snap.raw, names) : fromEbay(snap.raw)
        const { data, filled, kept, variationsNotMatched } = fillListing(doc.data, incoming, provider)
        // Only if nobody saved the Listing since it was read.
        const { rows: saved } = await db.query(
          `WITH upd AS (
             UPDATE documents SET data = $2, version = version + 1, updated_at = now(), updated_by = $3
             WHERE id = $1 AND version = $4 RETURNING id, version, data)
           INSERT INTO document_revisions (document_id, version, data, author) SELECT id, version, data, $3 FROM upd RETURNING document_id`,
          [doc.id, JSON.stringify(data), user?.id ?? null, doc.version])
        if (!saved.length) { fail(`Listing ${listing} changed while pairing; try again.`); continue }
        const theirs = marketplaceQuantities(provider, snap.raw).filter((q) => q.sku)
        const stocked = await stockBySku(theirs.map((q) => q.sku))
        const quantities = theirs.map((q) => ({ sku: q.sku, [provider]: q.quantity, stock: stocked.get(q.sku)?.quantity ?? null }))
          .filter((q) => q.stock !== q[provider])
        out.push({ provider, externalId: external, listing: Number(listing), slug: doc.slug, filled, kept, variationsNotMatched, quantities })
      }
      return { paired: out.filter((p) => !p.error).length, results: out }
    },

    // Every live eBay listing, through the Trading API (read only), into the
    // same snapshots. Listings made on eBay's website are invisible to the
    // Inventory API until migrated, and migrating is not done here.
    // One page per call: all pages in one request ran past the Lambda's
    // 20-second limit on the live shop, so the caller asks for page 1, then
    // each next page until `pages`. Without a page, every page (tests, scripts).
    snapshotEbay: async function ({ page } = {}) {
      const one = page != null
      const rows = []
      const started = Date.now()
      let pages = 1
      for (let p = one ? Number(page) : 1; ; p++) {
        const got = await ebay.sellerList(p)
        pages = got.pages
        rows.push(...got.items.filter((i) => (i.SellingStatus?.ListingStatus ?? 'Active') === 'Active'))
        if (one || p >= pages || !got.items.length) break
      }
      const read = Date.now()
      const out = await this.snapshot('ebay', rows)
      console.log(`[marketplace] ebay snapshot${one ? ` page ${page} of ${pages}` : ''}: ${rows.length} listings, ${out.kept} new or changed, eBay ${read - started} ms, kept ${Date.now() - read} ms`)
      return { ...out, page: one ? Number(page) : pages, pages }
    },

    // The newest snapshot of each eBay listing, cut to what a review needs.
    ebaySnapshots: async () => {
      await ensureStockTables(db)
      const { rows } = await db.query(
        `SELECT DISTINCT ON (external_key) external_key, raw, imported_at FROM import_snapshots
         WHERE source = 'ebay' ORDER BY external_key, imported_at DESC`)
      const listings = rows.map(({ external_key, raw: r, imported_at }) => {
        const d = fromEbay(r)
        return {
          external_key, imported_at, title: d.title, url: r.ListingDetails?.ViewItemURL ?? null, quantity: r.Quantity ?? null,
          photo: d.photos[0]?.src ?? null, variations: d.variations.map(({ option, sku, price }) => ({ option, sku, price })),
        }
      })
      return { count: listings.length, listings }
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
