// Runs utils/stock.js against PGlite: real Postgres, in process, fresh per test.
//   npm test

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PGlite } from '@electric-sql/pglite'
import { createStock, resetStockTablesForTests } from './stock.js'

// The slice of pg's Pool that stock.js uses. PGlite has one connection, which
// is enough for tests that run one change at a time.
function poolFor(pg) {
  const query = async (text, params) => {
    const r = await pg.query(text, params)
    return { rows: r.rows, rowCount: r.affectedRows ?? r.rows.length }
  }
  return { query, connect: async () => ({ query, release() {} }) }
}

async function fresh(setup) {
  const pg = new PGlite()
  if (setup) await pg.exec(setup)
  resetStockTablesForTests()
  return { pg, stock: createStock(poolFor(pg)) }
}

test('a build raises the made item and lowers its components; a sale lowers only the product', async () => {
  const { stock } = await fresh()
  const bead = await stock.create({ name: 'Green bead', sku: 'B-1', unit: 'beads', quantity: 100, low_stock_threshold: 20 })
  const clasp = await stock.create({ name: 'Clasp', quantity: 5 })
  const bracelet = await stock.create({ name: 'Bracelet', sku: 'BR-1', sellable: true })
  await stock.setBomLine(bracelet.id, bead.id, 12.5)
  await stock.setBomLine(bracelet.id, clasp.id, 1)

  const built = await stock.move(bracelet.id, { kind: 'build', quantity: 2 })
  assert.equal(built.item.quantity, 2)
  assert.deepEqual(built.consumed.map((c) => [c.name, c.quantity]).sort(), [['Clasp', 3], ['Green bead', 75]])

  const sold = await stock.move(bracelet.id, { kind: 'sale', quantity: 1 })
  assert.equal(sold.item.quantity, 1)
  assert.equal(sold.consumed.length, 0)
  assert.equal((await stock.get(bead.id)).quantity, 75)

  const detail = await stock.get(bead.id)
  assert.deepEqual(detail.used_in.map((u) => u.name), ['Bracelet'])
  assert.deepEqual(detail.movements.map((m) => [m.kind, m.delta]), [['consume', -25], ['opening', 100]])
})

test('a physical count records the correction and becomes Previous', async () => {
  const { stock } = await fresh()
  const bead = await stock.create({ name: 'Bead', quantity: 50 })
  await stock.move(bead.id, { kind: 'sale', quantity: 8 })
  const { item } = await stock.move(bead.id, { kind: 'count', quantity: 40 })
  assert.equal(item.quantity, 40)
  assert.equal(item.counted_quantity, 40)
  const [correction] = (await stock.get(bead.id)).movements
  assert.deepEqual([correction.kind, correction.delta], ['count', -2])
})

test('reports low stock among everything a change touched', async () => {
  const { stock } = await fresh()
  const bead = await stock.create({ name: 'Bead', quantity: 10, low_stock_threshold: 5 })
  const charm = await stock.create({ name: 'Charm', sellable: true })
  await stock.setBomLine(charm.id, bead.id, 3)
  const { lowStock } = await stock.move(charm.id, { kind: 'build', quantity: 2 })
  assert.deepEqual(lowStock.map((s) => s.name), ['Bead'])
})

test('refuses a Bill of Materials loop at any depth, and itself', async () => {
  const { stock } = await fresh()
  const bead = await stock.create({ name: 'Bead' })
  const charm = await stock.create({ name: 'Charm' })
  const bracelet = await stock.create({ name: 'Bracelet' })
  await stock.setBomLine(charm.id, bead.id, 3)
  await stock.setBomLine(bracelet.id, charm.id, 1)
  await assert.rejects(stock.setBomLine(bead.id, bracelet.id, 1), { status: 400 })
  await assert.rejects(stock.setBomLine(bead.id, bead.id, 1), { status: 400 })
})

test('refuses a duplicate SKU, deleting an item still in a Bill of Materials, and bad quantities', async () => {
  const { stock } = await fresh()
  const bead = await stock.create({ name: 'Bead', sku: 'B-1' })
  await assert.rejects(stock.create({ name: 'Other', sku: 'B-1' }), { status: 409 })
  const charm = await stock.create({ name: 'Charm' })
  await stock.setBomLine(charm.id, bead.id, 1)
  await assert.rejects(stock.remove(bead.id), { status: 409 })
  await assert.rejects(stock.move(charm.id, { kind: 'sale', quantity: 0 }), { status: 400 })
  await assert.rejects(stock.move(charm.id, { kind: 'gift', quantity: 1 }), { status: 400 })
  await assert.rejects(stock.move(charm.id, { kind: 'sale', quantity: 1.0001 }), { status: 400 })
})

test('copies Phase 1 inventory once and keeps the old tables as phase1_*', async () => {
  const { pg, stock } = await fresh(`
    CREATE TABLE inventory_items (id SERIAL PRIMARY KEY, sku TEXT UNIQUE, name TEXT NOT NULL, description TEXT,
      quantity_on_hand INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
    CREATE TABLE inventory_components (id SERIAL PRIMARY KEY, sku TEXT UNIQUE, name TEXT NOT NULL, description TEXT,
      unit TEXT NOT NULL DEFAULT 'unit', quantity_on_hand NUMERIC(12,3) NOT NULL DEFAULT 0, low_stock_threshold NUMERIC(12,3) NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
    CREATE TABLE inventory_bom (item_id INTEGER NOT NULL REFERENCES inventory_items(id), component_id INTEGER NOT NULL REFERENCES inventory_components(id),
      quantity_per_unit NUMERIC(12,3) NOT NULL, PRIMARY KEY (item_id, component_id));
    CREATE TABLE inventory_adjustments (id SERIAL PRIMARY KEY, item_id INTEGER NOT NULL REFERENCES inventory_items(id), delta INTEGER NOT NULL,
      reason TEXT NOT NULL DEFAULT 'manual', resulting_quantity INTEGER NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
    INSERT INTO inventory_items (sku, name, quantity_on_hand) VALUES ('BEAD-1', 'Loose bead', 4), ('BR-1', 'Bracelet', 2);
    INSERT INTO inventory_components (sku, name, unit, quantity_on_hand, low_stock_threshold) VALUES ('BEAD-1', 'Bead', 'beads', 90.5, 10);
    INSERT INTO inventory_bom VALUES (2, 1, 8);
    INSERT INTO inventory_adjustments (item_id, delta, reason, resulting_quantity) VALUES (2, -1, 'etsy', 2);
  `)
  const all = await stock.list()
  assert.deepEqual(all.map((s) => [s.name, s.sku, s.sellable, s.quantity]), [
    ['Bead', 'BEAD-1-component', false, 90.5], ['Bracelet', 'BR-1', true, 2], ['Loose bead', 'BEAD-1', true, 4]])
  const bracelet = await stock.get(all.find((s) => s.name === 'Bracelet').id)
  assert.deepEqual(bracelet.bom.map((b) => [b.name, b.quantity_per_unit]), [['Bead', 8]])
  assert.deepEqual(bracelet.movements.map((m) => [m.kind, m.delta, m.note]), [['sale', -1, 'Phase 1: etsy']])

  const { rows } = await pg.query(`SELECT table_name FROM information_schema.tables WHERE table_name LIKE '%inventory%' ORDER BY 1`)
  assert.deepEqual(rows.map((r) => r.table_name),
    ['phase1_inventory_adjustments', 'phase1_inventory_bom', 'phase1_inventory_components', 'phase1_inventory_items'])

  // A second start finds nothing left to copy.
  resetStockTablesForTests()
  assert.equal((await createStock(poolFor(pg)).list()).length, 3)
})

test('a Trunk import creates new SKUs, leaves known ones and variant groups, and keeps every row', async () => {
  const { pg, stock } = await fresh()
  await stock.create({ name: 'Emerald necklace', sku: '1111EmeraldCut', quantity: 2, sellable: true })
  const out = await stock.importTrunk([
    { title: '20mm Marble Green White Blue Swirl', sku: '1010marble', stock: 1, linked: { etsy: 1, ebay: 1 } },
    { title: 'Sterling Emerald Cut Necklace', sku: '1111EmeraldCut', stock: 4 },
    { title: 'Sterling Square Princess Ring', sku: '10mmSqRing_###', stock: 45, variants: 15 },
    { title: '', sku: 'x', stock: 1 },
  ])
  assert.deepEqual(out, { created: ['1010marble'], existing: ['1111EmeraldCut'], groups: ['10mmSqRing_###'], invalid: ['x'] })

  const [marble] = (await stock.list()).filter((i) => i.sku === '1010marble')
  assert.equal(marble.quantity, 1)
  assert.equal(marble.sellable, true)
  assert.equal((await stock.list()).find((i) => i.sku === '1111EmeraldCut').quantity, 2)

  const { rows } = await pg.query('SELECT outcome, raw FROM import_snapshots ORDER BY id')
  assert.deepEqual(rows.map((r) => r.outcome), ['created', 'existing', 'group', 'invalid'])
  assert.deepEqual(rows[0].raw.linked, { etsy: 1, ebay: 1 })
})
