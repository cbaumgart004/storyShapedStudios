// Runs marketplace/sync.js against PGlite, with Etsy and eBay stubbed.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PGlite } from '@electric-sql/pglite'
import { createStock, resetStockTablesForTests } from '../utils/stock.js'
import { createSync } from './sync.js'

function poolFor(pg) {
  const query = async (text, params) => {
    const r = await pg.query(text, params)
    return { rows: r.rows, rowCount: r.affectedRows ?? r.rows.length }
  }
  return { query, connect: async () => ({ query, release() {} }) }
}

async function fresh(env, { etsy = {}, ebay = {} } = {}) {
  const pg = new PGlite()
  resetStockTablesForTests()
  const db = poolFor(pg)
  const stock = createStock(db)
  const sent = []
  const record = (name) => async (...args) => { sent.push([name, ...args]); return {} }
  const sync = createSync({
    db, stock, env,
    etsy: { receipts: async () => ({ results: [] }), setInventory: record('etsy.setInventory'), ...etsy },
    ebay: { orders: async () => ({ orders: [] }), setQuantities: record('ebay.setQuantities'), ...ebay },
  })
  return { db, stock, sync, sent }
}

const ORDER = { orders: [{ orderId: 'O1', lineItems: [{ lineItemId: 'L1', sku: 'RING-7', quantity: 1 }] }] }

test('an eBay sale lowers the Stock Item once, however often it is pulled, and is pushed to Etsy', async () => {
  const { db, stock, sync, sent } = await fresh({ MARKETPLACE_SYNC: 'on' }, {
    ebay: { orders: async () => ORDER },
    etsy: {
      receipts: async () => ({ results: [] }),
      inventory: async () => ({ products: [{ sku: 'RING-7', property_values: [], offerings: [{ quantity: 3, price: { amount: 14900, divisor: 100 } }] }], price_on_property: [], quantity_on_property: [], sku_on_property: [] }),
    },
  })
  const ring = await stock.create({ name: 'Ring 7', sku: 'RING-7', sellable: true, quantity: 3 })
  await sync.pushQuantities([]) // creates the tables
  await db.query(`INSERT INTO marketplace_links (provider, sku, listing_doc_id, external_id) VALUES ('etsy', 'RING-7', 'd1', '555')`)

  const first = await sync.pullSales()
  assert.deepEqual(first.ebay.map((l) => l.outcome), ['recorded'])
  assert.equal((await stock.get(ring.id)).quantity, 2)
  const [, listingId, body] = sent.find((s) => s[0] === 'etsy.setInventory')
  assert.equal(listingId, '555')
  assert.equal(body.products[0].offerings[0].quantity, 2)

  const again = await sync.pullSales()
  assert.deepEqual(again.ebay.map((l) => l.outcome), ['already recorded'])
  assert.equal((await stock.get(ring.id)).quantity, 2)
})

test('off, a sale is reported and nothing moves or is sent', async () => {
  const { stock, sync, sent } = await fresh({}, { ebay: { orders: async () => ORDER } })
  const ring = await stock.create({ name: 'Ring 7', sku: 'RING-7', sellable: true, quantity: 3 })
  const out = await sync.pullSales()
  assert.deepEqual(out.ebay.map((l) => l.outcome), ['dry run'])
  assert.equal((await stock.get(ring.id)).quantity, 3)
  assert.deepEqual(sent, [])
})

test('a sale of a SKU with no Stock Item is kept, not lost', async () => {
  const { stock, sync } = await fresh({ MARKETPLACE_SYNC: 'on' }, { ebay: { orders: async () => ORDER } })
  await stock.list() // creates the stock tables
  const out = await sync.pullSales()
  assert.deepEqual(out.ebay.map((l) => l.outcome), ['no stock item'])
})

test('a snapshot keeps only new or changed listings, and drops repeats left by earlier refreshes', async () => {
  const { db, sync } = await fresh({})
  const a = { listing_id: 1, title: 'Ring', views: 5 }
  const b = { listing_id: 2, title: 'Bead', views: 1 }
  assert.equal((await sync.snapshot('etsy', [a, b])).kept, 2)
  // A repeat stored the old way, before a refresh kept only changes.
  await db.query(`INSERT INTO import_snapshots (source, external_key, raw, outcome) VALUES ('etsy', '1', $1, 'snapshot')`, [JSON.stringify({ ...a, views: 9 })])
  const out = await sync.snapshot('etsy', [{ ...a, views: 40 }, { ...b, title: 'Glass bead' }, { listing_id: 3, title: 'New' }])
  assert.deepEqual([out.kept, out.unchanged], [2, 1])
  const { rows } = await db.query(`SELECT external_key, raw->>'title' AS title FROM import_snapshots ORDER BY id`)
  assert.deepEqual(rows.map((r) => `${r.external_key}:${r.title}`), ['1:Ring', '2:Bead', '2:Glass bead', '3:New'])
})

test("the editor's choices are the shop's section titles and every category path, or null without Etsy", async () => {
  const etsy = {
    sections: async () => ({ results: [{ shop_section_id: 2, title: 'Rings' }, { shop_section_id: 1, title: 'Beads' }] }),
    taxonomy: async () => ({ results: [{ id: 1, name: 'Jewelry', children: [{ id: 2, name: 'Rings', children: [] }] }] }),
  }
  const { sync } = await fresh({}, { etsy })
  assert.deepEqual(await sync.etsyChoices('sections'), [{ value: 'Beads', label: 'Beads' }, { value: 'Rings', label: 'Rings' }])
  assert.deepEqual((await sync.etsyChoices('categories')).map((o) => o.value), ['Jewelry', 'Jewelry < Rings'])

  const down = await fresh({}, { etsy: { sections: async () => { throw new Error('no sign-in') }, taxonomy: etsy.taxonomy } })
  assert.equal(await down.sync.etsyChoices('sections'), null)
})

test('the import makes a draft Listing per Etsy listing once, mapped field by field, and leaves Listings already made', async () => {
  const etsy = {
    sections: async () => ({ results: [{ shop_section_id: 7, title: 'Uranium Glass Rings' }] }),
    taxonomy: async () => ({ results: [{ id: 1, name: 'Jewelry', children: [{ id: 2, name: 'Rings', children: [] }] }] }),
  }
  const { db, sync } = await fresh({}, { etsy })
  // The console's own table (its migration 001), as in each site's database.
  await db.query(`CREATE TABLE documents (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), type text NOT NULL, slug text NOT NULL,
    status text NOT NULL, version integer NOT NULL, data jsonb NOT NULL, published_data jsonb, published_at timestamptz,
    updated_at timestamptz NOT NULL DEFAULT now(), updated_by text, UNIQUE (type, slug))`)
  await db.query(`CREATE TABLE document_revisions (id bigserial PRIMARY KEY, document_id uuid NOT NULL, version integer NOT NULL,
    data jsonb NOT NULL, author text, created_at timestamptz NOT NULL DEFAULT now())`)
  const ring = {
    listing_id: 11, title: 'Blue Ring', description: 'Glows.', shop_section_id: 7, taxonomy_id: 2,
    tags: ['uranium glass'], materials: ['silver'], who_made: 'i_did', when_made: 'made_to_order', is_supply: false,
    item_weight: 2, item_weight_unit: 'oz', shipping_profile_id: 555, style: ['Art Deco'], should_auto_renew: true,
    images: [{ url_fullxfull: 'https://i.etsystatic.com/a.jpg', alt_text: 'Ring' }],
    inventory: { products: [
      { sku: 'RING-7', property_values: [{ property_name: 'Ring size', values: ['7'] }], offerings: [{ price: { amount: 14900, divisor: 100, currency_code: 'USD' } }] },
      { sku: '', property_values: [{ property_name: 'Ring size', values: ['8'] }], offerings: [{ price: { amount: 15900, divisor: 100, currency_code: 'USD' } }] },
    ] },
  }
  await sync.snapshot('etsy', [ring, { listing_id: 12, title: 'Blue Ring', price: { amount: 500, divisor: 100, currency_code: 'USD' } }])
  // One made in the editor already holds listing 12.
  await db.query(`INSERT INTO documents (type, slug, status, version, data) VALUES ('listing', 'mine', 'draft', 1, '{"etsyListingId":"12"}')`)

  const out = await sync.importEtsyListings({ id: 'u1' })
  assert.deepEqual([out.created, out.existing, out.withoutSku], [1, 1, 1])
  const { rows: [doc] } = await db.query(`SELECT slug, status, published_data, data FROM documents WHERE data->>'etsyListingId' = '11'`)
  assert.equal(doc.slug, 'blue-ring')
  assert.equal(doc.status, 'draft')
  assert.equal(doc.published_data, null)
  const d = doc.data
  assert.deepEqual([d.section, d.etsyCategory, d.variationName, d.etsy.shippingProfileId], ['Uranium Glass Rings', 'Jewelry < Rings', 'Ring size', '555'])
  assert.deepEqual(d.variations.map((v) => [v.option, v.sku, v.price.amount]), [['7', 'RING-7', 14900], ['8', '', 15900]])
  assert.deepEqual(d.photos, [{ src: 'https://i.etsystatic.com/a.jpg', index: 'Light', alt: 'Ring' }])
  assert.deepEqual([d.tags[0].tag, d.etsy.styles[0].style, d.package.weight], ['uranium glass', 'Art Deco', 2])
  assert.equal((await db.query('SELECT count(*)::int AS n FROM document_revisions')).rows[0].n, 1)

  // Again: nothing new.
  assert.equal((await sync.importEtsyListings()).created, 0)
})

test('a check finds the category and section on Etsy without ETSY_SHOP_ID, and says so when Etsy cannot be asked', async () => {
  const etsy = {
    sections: async () => ({ results: [{ shop_section_id: 7, title: 'Uranium Gems and Cabs' }] }),
    taxonomy: async () => ({ results: [{ id: 1, name: 'Craft Supplies & Tools', children: [{ id: 2, name: 'Cabochons', children: [] }] }] }),
  }
  const listing = {
    title: 'Cab', section: 'Uranium Gems and Cabs', etsyCategory: 'Craft Supplies & Tools < Cabochons',
    variations: [{ sku: 'B6F', price: 14.99 }], photos: [{ src: 'https://example.test/a.jpg' }],
  }
  const check = async (etsyStub) => {
    const { db, stock, sync } = await fresh({}, { etsy: etsyStub })
    await stock.create({ name: 'Cab', sku: 'B6F', sellable: true, quantity: 7 })
    await db.query(`CREATE TABLE documents (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), type text NOT NULL, slug text NOT NULL,
      status text NOT NULL, version integer NOT NULL, data jsonb NOT NULL, published_data jsonb)`)
    const { rows: [doc] } = await db.query(`INSERT INTO documents (type, slug, status, version, data) VALUES ('listing', 'cab', 'draft', 1, $1) RETURNING id`, [JSON.stringify(listing)])
    return (await sync.pushListing(doc.id, { check: true })).etsy
  }

  const found = await check(etsy)
  const problems = found.skipped ?? []
  assert.ok(!problems.some((p) => /category|shop section/.test(p)), problems.join(' | '))

  const down = await check({ ...etsy, sections: async () => { throw new Error('no sign-in') } })
  assert.ok(down.skipped.some((p) => p.startsWith('Etsy could not be asked') && p.includes('no sign-in')))
  assert.ok(!down.skipped.some((p) => /matches no Etsy taxonomy node|does not exist in the shop/.test(p)))
})
