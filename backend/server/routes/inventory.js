// server/routes/inventory.js
// Inventory foundation: sellable items, raw components/supplies, and the
// bill-of-materials (BOM) linking them. Mounted at /api/inventory (see
// routes/index.js), so e.g. GET /items below -> GET /api/inventory/items.
//
// Quantity changes always go through PATCH /items/:id/quantity, which runs
// as a transaction: it locks the item row, applies the delta, logs an
// inventory_adjustments row, and — only when the change is a DECREASE
// (a sale or a loss) — prorates linked components down per the BOM. An
// increase (restock) does not consume components; it's treated as "more
// pre-made stock arrived," not an assembly event.
//
// Degrades gracefully when no DB is configured, same as libraryViews.js.

import express from 'express'
import { pool, hasDb } from '../utils/db.js'
import { notifyLowStock } from '../utils/notifyLowStock.js'

const router = express.Router()

let initialized = false
async function ensureTables() {
  if (initialized) return
  await pool.query(`
    CREATE TABLE IF NOT EXISTS inventory_items (
      id               SERIAL PRIMARY KEY,
      sku              TEXT UNIQUE,
      name             TEXT NOT NULL,
      description      TEXT,
      quantity_on_hand INTEGER NOT NULL DEFAULT 0,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS inventory_components (
      id                  SERIAL PRIMARY KEY,
      sku                 TEXT UNIQUE,
      name                TEXT NOT NULL,
      description         TEXT,
      unit                TEXT NOT NULL DEFAULT 'unit',
      quantity_on_hand    NUMERIC(12,3) NOT NULL DEFAULT 0,
      low_stock_threshold NUMERIC(12,3) NOT NULL DEFAULT 0,
      created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS inventory_bom (
      item_id           INTEGER NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
      component_id      INTEGER NOT NULL REFERENCES inventory_components(id) ON DELETE CASCADE,
      quantity_per_unit NUMERIC(12,3) NOT NULL CHECK (quantity_per_unit > 0),
      PRIMARY KEY (item_id, component_id)
    );
    CREATE INDEX IF NOT EXISTS idx_inventory_bom_component_id ON inventory_bom(component_id);

    CREATE TABLE IF NOT EXISTS inventory_adjustments (
      id                 SERIAL PRIMARY KEY,
      item_id            INTEGER NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
      delta              INTEGER NOT NULL,
      reason             TEXT NOT NULL DEFAULT 'manual',
      resulting_quantity INTEGER NOT NULL,
      created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_inventory_adjustments_item_id ON inventory_adjustments(item_id);
  `)
  initialized = true
}

function handleError(res, label, err) {
  console.error(`[inventory] ${label} failed:`, err.message)
  res.status(500).json({ error: 'Inventory request failed.' })
}

// ---------------------
// Items
// ---------------------

router.get('/items', async (req, res) => {
  if (!hasDb) return res.json([])
  try {
    await ensureTables()
    const { rows } = await pool.query(
      'SELECT * FROM inventory_items ORDER BY name'
    )
    res.json(rows)
  } catch (err) {
    handleError(res, 'GET /items', err)
  }
})

router.post('/items', async (req, res) => {
  if (!hasDb) return res.status(503).json({ error: 'Inventory not configured.' })
  const { sku = null, name, description = null } = req.body || {}
  if (!name) return res.status(400).json({ error: 'name is required.' })
  try {
    await ensureTables()
    const { rows } = await pool.query(
      `INSERT INTO inventory_items (sku, name, description)
       VALUES ($1, $2, $3) RETURNING *`,
      [sku, name, description]
    )
    res.status(201).json(rows[0])
  } catch (err) {
    handleError(res, 'POST /items', err)
  }
})

router.get('/items/:id', async (req, res) => {
  if (!hasDb) return res.status(404).json({ error: 'Not found.' })
  const itemId = Number(req.params.id)
  if (!Number.isInteger(itemId)) return res.status(400).json({ error: 'Invalid item id.' })
  try {
    await ensureTables()
    const { rows: itemRows } = await pool.query(
      'SELECT * FROM inventory_items WHERE id = $1',
      [itemId]
    )
    if (!itemRows.length) return res.status(404).json({ error: 'Item not found.' })
    const { rows: bomRows } = await pool.query(
      `SELECT b.component_id, c.name, c.unit, b.quantity_per_unit
       FROM inventory_bom b
       JOIN inventory_components c ON c.id = b.component_id
       WHERE b.item_id = $1
       ORDER BY c.name`,
      [itemId]
    )
    res.json({ ...itemRows[0], bom: bomRows })
  } catch (err) {
    handleError(res, 'GET /items/:id', err)
  }
})

router.patch('/items/:id', async (req, res) => {
  if (!hasDb) return res.status(503).json({ error: 'Inventory not configured.' })
  const itemId = Number(req.params.id)
  if (!Number.isInteger(itemId)) return res.status(400).json({ error: 'Invalid item id.' })
  const fields = ['sku', 'name', 'description']
  const updates = fields.filter((f) => req.body && req.body[f] !== undefined)
  if (!updates.length) return res.status(400).json({ error: 'No fields to update.' })
  try {
    await ensureTables()
    const setClause = updates.map((f, i) => `${f} = $${i + 2}`).join(', ')
    const values = updates.map((f) => req.body[f])
    const { rows } = await pool.query(
      `UPDATE inventory_items SET ${setClause}, updated_at = now()
       WHERE id = $1 RETURNING *`,
      [itemId, ...values]
    )
    if (!rows.length) return res.status(404).json({ error: 'Item not found.' })
    res.json(rows[0])
  } catch (err) {
    handleError(res, 'PATCH /items/:id', err)
  }
})

router.delete('/items/:id', async (req, res) => {
  if (!hasDb) return res.status(503).json({ error: 'Inventory not configured.' })
  const itemId = Number(req.params.id)
  if (!Number.isInteger(itemId)) return res.status(400).json({ error: 'Invalid item id.' })
  try {
    await ensureTables()
    const { rowCount } = await pool.query('DELETE FROM inventory_items WHERE id = $1', [itemId])
    if (!rowCount) return res.status(404).json({ error: 'Item not found.' })
    res.status(204).end()
  } catch (err) {
    handleError(res, 'DELETE /items/:id', err)
  }
})

// Quantity changes: the single entry point for sales and manual corrections.
// Body: { delta?, quantity?, reason? } — provide either delta or an absolute
// quantity. Runs as a transaction so the item update, component
// decrement, and audit log stay consistent.
router.patch('/items/:id/quantity', async (req, res) => {
  if (!hasDb) return res.status(503).json({ error: 'Inventory not configured.' })
  const itemId = Number(req.params.id)
  const { delta, quantity, reason = 'manual' } = req.body || {}
  if (!Number.isInteger(itemId)) return res.status(400).json({ error: 'Invalid item id.' })
  if (delta == null && quantity == null) {
    return res.status(400).json({ error: 'Provide delta or quantity.' })
  }

  await ensureTables()
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const { rows: itemRows } = await client.query(
      'SELECT id, quantity_on_hand FROM inventory_items WHERE id = $1 FOR UPDATE',
      [itemId]
    )
    if (!itemRows.length) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Item not found.' })
    }

    const current = itemRows[0].quantity_on_hand
    const nextQty = quantity != null ? Number(quantity) : current + Number(delta)
    const appliedDelta = nextQty - current

    const { rows: updatedItem } = await client.query(
      `UPDATE inventory_items SET quantity_on_hand = $1, updated_at = now()
       WHERE id = $2 RETURNING *`,
      [nextQty, itemId]
    )

    await client.query(
      `INSERT INTO inventory_adjustments (item_id, delta, reason, resulting_quantity)
       VALUES ($1, $2, $3, $4)`,
      [itemId, appliedDelta, reason, nextQty]
    )

    const componentsDecremented = []
    if (appliedDelta < 0) {
      const consumedUnits = -appliedDelta
      const { rows: bomRows } = await client.query(
        'SELECT component_id, quantity_per_unit FROM inventory_bom WHERE item_id = $1',
        [itemId]
      )
      for (const bom of bomRows) {
        const consume = Number(bom.quantity_per_unit) * consumedUnits
        const { rows } = await client.query(
          `UPDATE inventory_components
           SET quantity_on_hand = quantity_on_hand - $1, updated_at = now()
           WHERE id = $2 RETURNING *`,
          [consume, bom.component_id]
        )
        componentsDecremented.push(rows[0])
      }
    }

    await client.query('COMMIT')

    const lowStock = componentsDecremented.filter(
      (c) => Number(c.quantity_on_hand) <= Number(c.low_stock_threshold)
    )
    if (lowStock.length) notifyLowStock(lowStock)

    res.json({ item: updatedItem[0], componentsDecremented, lowStock })
  } catch (err) {
    await client.query('ROLLBACK')
    handleError(res, 'PATCH /items/:id/quantity', err)
  } finally {
    client.release()
  }
})

// ---------------------
// Components
// ---------------------

router.get('/components', async (req, res) => {
  if (!hasDb) return res.json([])
  try {
    await ensureTables()
    const { rows } = await pool.query(
      'SELECT * FROM inventory_components ORDER BY name'
    )
    res.json(rows)
  } catch (err) {
    handleError(res, 'GET /components', err)
  }
})

router.post('/components', async (req, res) => {
  if (!hasDb) return res.status(503).json({ error: 'Inventory not configured.' })
  const {
    sku = null,
    name,
    description = null,
    unit = 'unit',
    quantity_on_hand = 0,
    low_stock_threshold = 0,
  } = req.body || {}
  if (!name) return res.status(400).json({ error: 'name is required.' })
  try {
    await ensureTables()
    const { rows } = await pool.query(
      `INSERT INTO inventory_components
         (sku, name, description, unit, quantity_on_hand, low_stock_threshold)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [sku, name, description, unit, quantity_on_hand, low_stock_threshold]
    )
    res.status(201).json(rows[0])
  } catch (err) {
    handleError(res, 'POST /components', err)
  }
})

// Must be registered before /components/:id, or Express matches
// "low-stock" as the :id param.
router.get('/components/low-stock', async (req, res) => {
  if (!hasDb) return res.json([])
  try {
    await ensureTables()
    const { rows } = await pool.query(
      `SELECT * FROM inventory_components
       WHERE quantity_on_hand <= low_stock_threshold
       ORDER BY name`
    )
    res.json(rows)
  } catch (err) {
    handleError(res, 'GET /components/low-stock', err)
  }
})

router.get('/components/:id', async (req, res) => {
  if (!hasDb) return res.status(404).json({ error: 'Not found.' })
  const componentId = Number(req.params.id)
  if (!Number.isInteger(componentId)) return res.status(400).json({ error: 'Invalid component id.' })
  try {
    await ensureTables()
    const { rows } = await pool.query(
      'SELECT * FROM inventory_components WHERE id = $1',
      [componentId]
    )
    if (!rows.length) return res.status(404).json({ error: 'Component not found.' })
    res.json(rows[0])
  } catch (err) {
    handleError(res, 'GET /components/:id', err)
  }
})

router.patch('/components/:id', async (req, res) => {
  if (!hasDb) return res.status(503).json({ error: 'Inventory not configured.' })
  const componentId = Number(req.params.id)
  if (!Number.isInteger(componentId)) return res.status(400).json({ error: 'Invalid component id.' })
  const fields = ['sku', 'name', 'description', 'unit', 'quantity_on_hand', 'low_stock_threshold']
  const updates = fields.filter((f) => req.body && req.body[f] !== undefined)
  if (!updates.length) return res.status(400).json({ error: 'No fields to update.' })
  try {
    await ensureTables()
    const setClause = updates.map((f, i) => `${f} = $${i + 2}`).join(', ')
    const values = updates.map((f) => req.body[f])
    const { rows } = await pool.query(
      `UPDATE inventory_components SET ${setClause}, updated_at = now()
       WHERE id = $1 RETURNING *`,
      [componentId, ...values]
    )
    if (!rows.length) return res.status(404).json({ error: 'Component not found.' })
    res.json(rows[0])
  } catch (err) {
    handleError(res, 'PATCH /components/:id', err)
  }
})

router.delete('/components/:id', async (req, res) => {
  if (!hasDb) return res.status(503).json({ error: 'Inventory not configured.' })
  const componentId = Number(req.params.id)
  if (!Number.isInteger(componentId)) return res.status(400).json({ error: 'Invalid component id.' })
  try {
    await ensureTables()
    const { rowCount } = await pool.query('DELETE FROM inventory_components WHERE id = $1', [componentId])
    if (!rowCount) return res.status(404).json({ error: 'Component not found.' })
    res.status(204).end()
  } catch (err) {
    handleError(res, 'DELETE /components/:id', err)
  }
})

// ---------------------
// Bill of materials (per item)
// ---------------------

router.get('/items/:id/bom', async (req, res) => {
  if (!hasDb) return res.json([])
  const itemId = Number(req.params.id)
  if (!Number.isInteger(itemId)) return res.status(400).json({ error: 'Invalid item id.' })
  try {
    await ensureTables()
    const { rows } = await pool.query(
      `SELECT b.component_id, c.name, c.unit, b.quantity_per_unit
       FROM inventory_bom b
       JOIN inventory_components c ON c.id = b.component_id
       WHERE b.item_id = $1
       ORDER BY c.name`,
      [itemId]
    )
    res.json(rows)
  } catch (err) {
    handleError(res, 'GET /items/:id/bom', err)
  }
})

router.post('/items/:id/bom', async (req, res) => {
  if (!hasDb) return res.status(503).json({ error: 'Inventory not configured.' })
  const itemId = Number(req.params.id)
  const { component_id, quantity_per_unit } = req.body || {}
  if (!Number.isInteger(itemId)) return res.status(400).json({ error: 'Invalid item id.' })
  if (!Number.isInteger(component_id) || !(Number(quantity_per_unit) > 0)) {
    return res.status(400).json({ error: 'component_id and a positive quantity_per_unit are required.' })
  }
  try {
    await ensureTables()
    const { rows } = await pool.query(
      `INSERT INTO inventory_bom (item_id, component_id, quantity_per_unit)
       VALUES ($1, $2, $3)
       ON CONFLICT (item_id, component_id)
       DO UPDATE SET quantity_per_unit = EXCLUDED.quantity_per_unit
       RETURNING *`,
      [itemId, component_id, quantity_per_unit]
    )
    res.status(201).json(rows[0])
  } catch (err) {
    handleError(res, 'POST /items/:id/bom', err)
  }
})

router.delete('/items/:id/bom/:componentId', async (req, res) => {
  if (!hasDb) return res.status(503).json({ error: 'Inventory not configured.' })
  const itemId = Number(req.params.id)
  const componentId = Number(req.params.componentId)
  if (!Number.isInteger(itemId) || !Number.isInteger(componentId)) {
    return res.status(400).json({ error: 'Invalid item or component id.' })
  }
  try {
    await ensureTables()
    const { rowCount } = await pool.query(
      'DELETE FROM inventory_bom WHERE item_id = $1 AND component_id = $2',
      [itemId, componentId]
    )
    if (!rowCount) return res.status(404).json({ error: 'BOM line not found.' })
    res.status(204).end()
  } catch (err) {
    handleError(res, 'DELETE /items/:id/bom/:componentId', err)
  }
})

export default router
