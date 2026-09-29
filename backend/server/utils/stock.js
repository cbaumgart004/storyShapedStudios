// server/utils/stock.js
// The studio's stock (ADR-0002, ADR-0003; terms in CONTEXT.md). One table of
// Stock Items: a Product is one marked sellable, a Component is one named in
// another's Bill of Materials, and one item can be both. Every count change is
// a row in stock_movements, written in the same transaction as the count:
//
//   restock  +n        sale     -n (the Product only; its Components left at Build)
//   build    +n on the made item, and one `consume` row per Component, -n x its
//            Bill of Materials quantity, each pointing at the build row
//   count    Actual - Calculated (a Count Correction); Actual becomes Previous
//   opening  the starting quantity a new item is created with
//
// `quantity` is Calculated: never typed in, only moved by those rows.
// `counted_quantity` / `counted_at` are Previous, the last Physical Count.
//
// Takes a pg Pool (or anything with query() and connect()), so the tests run
// the same SQL against PGlite.

export class StockError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS stock_items (
    id                  SERIAL PRIMARY KEY,
    sku                 TEXT UNIQUE,
    name                TEXT NOT NULL,
    description         TEXT,
    unit                TEXT NOT NULL DEFAULT 'each',
    sellable            BOOLEAN NOT NULL DEFAULT false,
    quantity            NUMERIC(12,3) NOT NULL DEFAULT 0,
    low_stock_threshold NUMERIC(12,3) NOT NULL DEFAULT 0,
    counted_quantity    NUMERIC(12,3),
    counted_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS stock_bom (
    item_id           INTEGER NOT NULL REFERENCES stock_items(id) ON DELETE CASCADE,
    component_id      INTEGER NOT NULL REFERENCES stock_items(id) ON DELETE RESTRICT,
    quantity_per_unit NUMERIC(12,3) NOT NULL CHECK (quantity_per_unit > 0),
    PRIMARY KEY (item_id, component_id),
    CHECK (item_id <> component_id)
  );
  CREATE INDEX IF NOT EXISTS idx_stock_bom_component_id ON stock_bom(component_id);

  CREATE TABLE IF NOT EXISTS stock_movements (
    id                 SERIAL PRIMARY KEY,
    stock_item_id      INTEGER NOT NULL REFERENCES stock_items(id) ON DELETE CASCADE,
    kind               TEXT NOT NULL CHECK (kind IN ('opening', 'restock', 'sale', 'build', 'consume', 'count')),
    delta              NUMERIC(12,3) NOT NULL,
    resulting_quantity NUMERIC(12,3) NOT NULL,
    build_id           INTEGER REFERENCES stock_movements(id) ON DELETE CASCADE,
    note               TEXT,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS idx_stock_movements_item ON stock_movements(stock_item_id, created_at);
`

// Any number of servers may start at once; the lock makes the Phase 1 copy
// happen exactly once.
const MIGRATION_LOCK = 4812002

async function inTransaction(db, fn) {
  const client = await db.connect()
  try {
    await client.query('BEGIN')
    const out = await fn(client)
    await client.query('COMMIT')
    return out
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

// Phase 1 kept Products in inventory_items and Components in
// inventory_components (ADR-0002 replaces that). Their rows move into
// stock_items once, with their Bill of Materials and adjustment log, and the old
// tables are renamed phase1_* rather than dropped, so nothing is lost if the
// copy needs checking. A Component whose SKU a Product already holds keeps its
// own row and count under "<sku>-component": which count is right is a
// Physical Count's question, not this copy's.
async function copyPhase1(client) {
  const { rows: [found] } = await client.query(
    `SELECT to_regclass('inventory_items') AS items, to_regclass('inventory_components') AS components`
  )
  if (!found.items && !found.components) return null

  const itemIds = new Map()
  const componentIds = new Map()
  const renamed = []
  if (found.items) {
    const { rows } = await client.query('SELECT * FROM inventory_items ORDER BY id')
    for (const r of rows) {
      const { rows: [s] } = await client.query(
        `INSERT INTO stock_items (sku, name, description, unit, sellable, quantity, created_at, updated_at)
         VALUES ($1, $2, $3, 'each', true, $4, $5, $6) RETURNING id`,
        [r.sku, r.name, r.description, r.quantity_on_hand, r.created_at, r.updated_at]
      )
      itemIds.set(r.id, s.id)
    }
  }
  if (found.components) {
    const { rows } = await client.query('SELECT * FROM inventory_components ORDER BY id')
    for (const r of rows) {
      const clash = r.sku && (await client.query('SELECT 1 FROM stock_items WHERE sku = $1', [r.sku])).rows.length
      if (clash) renamed.push(r.sku)
      const { rows: [s] } = await client.query(
        `INSERT INTO stock_items (sku, name, description, unit, sellable, quantity, low_stock_threshold, created_at, updated_at)
         VALUES ($1, $2, $3, $4, false, $5, $6, $7, $8) RETURNING id`,
        [clash ? `${r.sku}-component` : r.sku, r.name, r.description, r.unit, r.quantity_on_hand, r.low_stock_threshold, r.created_at, r.updated_at]
      )
      componentIds.set(r.id, s.id)
    }
  }
  if (found.items && found.components && (await client.query(`SELECT to_regclass('inventory_bom') AS t`)).rows[0].t) {
    const { rows } = await client.query('SELECT * FROM inventory_bom')
    for (const r of rows) {
      await client.query(
        'INSERT INTO stock_bom (item_id, component_id, quantity_per_unit) VALUES ($1, $2, $3)',
        [itemIds.get(r.item_id), componentIds.get(r.component_id), r.quantity_per_unit]
      )
    }
  }
  if (found.items && (await client.query(`SELECT to_regclass('inventory_adjustments') AS t`)).rows[0].t) {
    const { rows } = await client.query('SELECT * FROM inventory_adjustments ORDER BY id')
    for (const r of rows) {
      await client.query(
        `INSERT INTO stock_movements (stock_item_id, kind, delta, resulting_quantity, note, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [itemIds.get(r.item_id), r.delta < 0 ? 'sale' : 'restock', r.delta, r.resulting_quantity, `Phase 1: ${r.reason}`, r.created_at]
      )
    }
  }
  for (const t of ['inventory_adjustments', 'inventory_bom', 'inventory_items', 'inventory_components']) {
    await client.query(`ALTER TABLE IF EXISTS ${t} RENAME TO phase1_${t}`)
  }
  if (renamed.length) console.warn(`[stock] Phase 1 components renamed <sku>-component (SKU also on a product): ${renamed.join(', ')}`)
  return { items: itemIds.size, components: componentIds.size, renamed }
}

let ready = null
export function ensureStockTables(db) {
  ready ??= inTransaction(db, async (client) => {
    await client.query('SELECT pg_advisory_xact_lock($1)', [MIGRATION_LOCK])
    for (const statement of SCHEMA.split(';').map((s) => s.trim()).filter(Boolean)) await client.query(statement)
    const copied = await copyPhase1(client)
    if (copied) console.log(`[stock] copied Phase 1 inventory: ${copied.items} products, ${copied.components} components`)
  }).catch((err) => {
    ready = null // try again on the next request
    throw err
  })
  return ready
}

// For the tests, which open a fresh database each time.
export function resetStockTablesForTests() {
  ready = null
}

const num = (v) => (v == null ? v : Number(v))
const row = (r) => r && {
  ...r,
  quantity: num(r.quantity),
  low_stock_threshold: num(r.low_stock_threshold),
  counted_quantity: num(r.counted_quantity),
}
const isLow = (r) => Number(r.quantity) <= Number(r.low_stock_threshold)

function amount(value, { allowZero = false } = {}) {
  const n = Number(value)
  if (value === '' || value == null || !Number.isFinite(n) || n < 0 || (!allowZero && n === 0)) {
    throw new StockError(400, allowZero ? 'Quantity must be zero or more.' : 'Quantity must be more than zero.')
  }
  if (Math.round(n * 1000) !== n * 1000) throw new StockError(400, 'Quantity allows at most three decimal places.')
  return n
}

// pg's own errors, in the owner's terms.
function explain(err) {
  if (err instanceof StockError) return err
  if (err.code === '23505') return new StockError(409, 'Another stock item already uses that SKU.')
  if (err.code === '23503' || err.code === '23001') return new StockError(409, 'This item is in another item’s Bill of Materials. Remove it there first.')
  return err
}

const EDITABLE = ['sku', 'name', 'description', 'unit', 'sellable', 'low_stock_threshold']

export function createStock(db) {
  const guard = (fn) => async (...args) => {
    await ensureStockTables(db)
    try {
      return await fn(...args)
    } catch (err) {
      throw explain(err)
    }
  }

  async function bomOf(q, id) {
    const { rows } = await q.query(
      `SELECT b.component_id, s.name, s.sku, s.unit, s.quantity, b.quantity_per_unit
       FROM stock_bom b JOIN stock_items s ON s.id = b.component_id
       WHERE b.item_id = $1 ORDER BY s.name`, [id])
    return rows.map((r) => ({ ...r, quantity: num(r.quantity), quantity_per_unit: num(r.quantity_per_unit) }))
  }

  return {
    // filter: { sellable?: boolean, low?: boolean }
    list: guard(async ({ sellable, low } = {}) => {
      const where = []
      const params = []
      if (sellable != null) { params.push(sellable); where.push(`sellable = $${params.length}`) }
      if (low) where.push('quantity <= low_stock_threshold')
      const { rows } = await db.query(
        `SELECT s.*, EXISTS (SELECT 1 FROM stock_bom b WHERE b.component_id = s.id) AS is_component
         FROM stock_items s ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY name`, params)
      return rows.map(row)
    }),

    get: guard(async (id) => {
      const { rows: [item] } = await db.query('SELECT * FROM stock_items WHERE id = $1', [id])
      if (!item) throw new StockError(404, 'Stock item not found.')
      const { rows: usedIn } = await db.query(
        `SELECT b.item_id, s.name, b.quantity_per_unit FROM stock_bom b JOIN stock_items s ON s.id = b.item_id
         WHERE b.component_id = $1 ORDER BY s.name`, [id])
      const { rows: movements } = await db.query(
        `SELECT id, kind, delta, resulting_quantity, build_id, note, created_at FROM stock_movements
         WHERE stock_item_id = $1 ORDER BY created_at DESC, id DESC LIMIT 50`, [id])
      return {
        ...row(item),
        bom: await bomOf(db, id),
        used_in: usedIn.map((u) => ({ ...u, quantity_per_unit: num(u.quantity_per_unit) })),
        movements: movements.map((m) => ({ ...m, delta: num(m.delta), resulting_quantity: num(m.resulting_quantity) })),
      }
    }),

    // A starting quantity is the item's first Physical Count.
    create: guard(async (input = {}) => {
      const name = String(input.name ?? '').trim()
      if (!name) throw new StockError(400, 'A name is required.')
      const start = input.quantity == null || input.quantity === '' ? 0 : amount(input.quantity, { allowZero: true })
      const threshold = input.low_stock_threshold == null || input.low_stock_threshold === '' ? 0 : amount(input.low_stock_threshold, { allowZero: true })
      return inTransaction(db, async (c) => {
        const { rows: [item] } = await c.query(
          `INSERT INTO stock_items (sku, name, description, unit, sellable, quantity, low_stock_threshold, counted_quantity, counted_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $6, now()) RETURNING *`,
          [String(input.sku ?? '').trim() || null, name, input.description || null, String(input.unit ?? '').trim() || 'each',
            Boolean(input.sellable), start, threshold])
        await c.query(
          `INSERT INTO stock_movements (stock_item_id, kind, delta, resulting_quantity) VALUES ($1, 'opening', $2, $2)`,
          [item.id, start])
        return row(item)
      })
    }),

    // Details only: the count moves through move(), never here.
    update: guard(async (id, input = {}) => {
      const fields = EDITABLE.filter((f) => input[f] !== undefined)
      if (!fields.length) throw new StockError(400, 'Nothing to change.')
      const values = fields.map((f) => {
        if (f === 'name') { const v = String(input.name).trim(); if (!v) throw new StockError(400, 'A name is required.'); return v }
        if (f === 'sku') return String(input.sku ?? '').trim() || null
        if (f === 'unit') return String(input.unit ?? '').trim() || 'each'
        if (f === 'sellable') return Boolean(input.sellable)
        if (f === 'low_stock_threshold') return amount(input.low_stock_threshold, { allowZero: true })
        return input[f] || null
      })
      const { rows: [item] } = await db.query(
        `UPDATE stock_items SET ${fields.map((f, i) => `${f} = $${i + 2}`).join(', ')}, updated_at = now()
         WHERE id = $1 RETURNING *`, [id, ...values])
      if (!item) throw new StockError(404, 'Stock item not found.')
      return row(item)
    }),

    remove: guard(async (id) => {
      const { rowCount } = await db.query('DELETE FROM stock_items WHERE id = $1', [id])
      if (!rowCount) throw new StockError(404, 'Stock item not found.')
    }),

    // Adds or changes one line of an item's Bill of Materials. Refuses a line
    // that would make an item part of itself, however deep the nesting.
    setBomLine: guard(async (id, componentId, quantityPerUnit) => {
      const qpu = amount(quantityPerUnit)
      if (id === componentId) throw new StockError(400, 'An item cannot be part of itself.')
      const { rows: [loop] } = await db.query(
        `WITH RECURSIVE parts(id) AS (
           SELECT component_id FROM stock_bom WHERE item_id = $1
           UNION SELECT b.component_id FROM stock_bom b JOIN parts p ON b.item_id = p.id
         ) SELECT 1 AS hit FROM parts WHERE id = $2`, [componentId, id])
      if (loop) throw new StockError(400, 'That would make an item part of itself: it is already built from this one.')
      await db.query(
        `INSERT INTO stock_bom (item_id, component_id, quantity_per_unit) VALUES ($1, $2, $3)
         ON CONFLICT (item_id, component_id) DO UPDATE SET quantity_per_unit = EXCLUDED.quantity_per_unit`,
        [id, componentId, qpu])
      return bomOf(db, id)
    }),

    removeBomLine: guard(async (id, componentId) => {
      const { rowCount } = await db.query('DELETE FROM stock_bom WHERE item_id = $1 AND component_id = $2', [id, componentId])
      if (!rowCount) throw new StockError(404, 'That line is not in the Bill of Materials.')
      return bomOf(db, id)
    }),

    // The one way a count changes. kind: restock | sale | build | count;
    // quantity: units for the first three, Actual for a count.
    // Returns { item, consumed, lowStock }.
    move: guard(async (id, { kind, quantity, note = null } = {}) => {
      if (!['restock', 'sale', 'build', 'count'].includes(kind)) throw new StockError(400, 'kind must be restock, sale, build or count.')
      const n = amount(quantity, { allowZero: kind === 'count' })
      return inTransaction(db, async (c) => {
        const { rows: bom } = kind === 'build'
          ? await c.query('SELECT component_id, quantity_per_unit FROM stock_bom WHERE item_id = $1', [id])
          : { rows: [] }
        // Lock every row this change touches, in id order, so two builds sharing
        // a bead cannot deadlock.
        const ids = [id, ...bom.map((b) => b.component_id)]
        const { rows: locked } = await c.query('SELECT * FROM stock_items WHERE id = ANY($1) ORDER BY id FOR UPDATE', [ids])
        const current = locked.find((r) => r.id === id)
        if (!current) throw new StockError(404, 'Stock item not found.')

        const was = Number(current.quantity)
        const delta = kind === 'count' ? n - was : kind === 'sale' ? -n : n
        const { rows: [item] } = await c.query(
          `UPDATE stock_items SET quantity = quantity + $2, updated_at = now()
             ${kind === 'count' ? ', counted_quantity = $3, counted_at = now()' : ''}
           WHERE id = $1 RETURNING *`,
          kind === 'count' ? [id, delta, n] : [id, delta])
        const { rows: [movement] } = await c.query(
          `INSERT INTO stock_movements (stock_item_id, kind, delta, resulting_quantity, note)
           VALUES ($1, $2, $3, $4, $5) RETURNING id`, [id, kind, delta, item.quantity, note])

        const consumed = []
        for (const b of bom) {
          const use = Number(b.quantity_per_unit) * n
          const { rows: [comp] } = await c.query(
            'UPDATE stock_items SET quantity = quantity - $2, updated_at = now() WHERE id = $1 RETURNING *', [b.component_id, use])
          await c.query(
            `INSERT INTO stock_movements (stock_item_id, kind, delta, resulting_quantity, build_id)
             VALUES ($1, 'consume', $2, $3, $4)`, [b.component_id, -use, comp.quantity, movement.id])
          consumed.push(row(comp))
        }
        const changed = [row(item), ...consumed]
        return { item: row(item), consumed, lowStock: changed.filter(isLow) }
      })
    }),
  }
}
