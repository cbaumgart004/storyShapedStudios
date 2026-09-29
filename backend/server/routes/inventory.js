// server/routes/inventory.js
// The Stock Item API, mounted at /api/inventory (see routes/index.js), so
// GET /stock below is GET /api/inventory/stock. The rules live in
// utils/stock.js; this file only maps HTTP onto them.
//
//   GET    /stock?sellable=true|false&low=true   list
//   POST   /stock                                create (quantity = first count)
//   GET    /stock/:id                            item, Bill of Materials, used in, last 50 movements
//   PATCH  /stock/:id                            details, never the count
//   DELETE /stock/:id                            refused while in another's Bill of Materials
//   PUT    /stock/:id/bom/:componentId           { quantity_per_unit }
//   DELETE /stock/:id/bom/:componentId
//   POST   /stock/:id/movements                  { kind: restock|sale|build|count, quantity, note? }
//
// Every count change, a Marketplace sale included, enters through
// POST /stock/:id/movements. Phase 1's /items and /components routes are gone
// (ADR-0002); their rows are copied into stock_items on first use.
//
// NOT GATED YET: anyone who can reach the backend can call these. Real stock
// data waits on the admin-auth gate (docs/CURRENT_WORK.md, E3).
//
// Degrades gracefully when no DB is configured, same as libraryViews.js.

import express from 'express'
import { pool, hasDb } from '../utils/db.js'
import { createStock, StockError } from '../utils/stock.js'
import { notifyLowStock } from '../utils/notifyLowStock.js'

const router = express.Router()
const stock = hasDb ? createStock(pool) : null

const id = (v) => {
  const n = Number(v)
  if (!Number.isInteger(n) || n < 1) throw new StockError(400, 'Invalid stock item id.')
  return n
}

// Runs a handler; a StockError answers with its status, anything else is a 500.
const handle = (label, fn) => async (req, res) => {
  if (!hasDb) return res.status(503).json({ error: 'Inventory not configured.' })
  try {
    await fn(req, res)
  } catch (err) {
    if (err instanceof StockError) return res.status(err.status).json({ error: err.message })
    console.error(`[inventory] ${label} failed:`, err.message)
    res.status(500).json({ error: 'Inventory request failed.' })
  }
}

router.get('/stock', handle('GET /stock', async (req, res) => {
  const { sellable, low } = req.query
  res.json(await stock.list({
    sellable: sellable === 'true' ? true : sellable === 'false' ? false : undefined,
    low: low === 'true',
  }))
}))

router.post('/stock', handle('POST /stock', async (req, res) => {
  res.status(201).json(await stock.create(req.body))
}))

router.get('/stock/:id', handle('GET /stock/:id', async (req, res) => {
  res.json(await stock.get(id(req.params.id)))
}))

router.patch('/stock/:id', handle('PATCH /stock/:id', async (req, res) => {
  res.json(await stock.update(id(req.params.id), req.body))
}))

router.delete('/stock/:id', handle('DELETE /stock/:id', async (req, res) => {
  await stock.remove(id(req.params.id))
  res.status(204).end()
}))

router.put('/stock/:id/bom/:componentId', handle('PUT /stock/:id/bom', async (req, res) => {
  res.json(await stock.setBomLine(id(req.params.id), id(req.params.componentId), req.body?.quantity_per_unit))
}))

router.delete('/stock/:id/bom/:componentId', handle('DELETE /stock/:id/bom', async (req, res) => {
  res.json(await stock.removeBomLine(id(req.params.id), id(req.params.componentId)))
}))

router.post('/stock/:id/movements', handle('POST /stock/:id/movements', async (req, res) => {
  const result = await stock.move(id(req.params.id), req.body ?? {})
  if (result.lowStock.length) notifyLowStock(result.lowStock)
  res.status(201).json(result)
}))

export default router
