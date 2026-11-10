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
