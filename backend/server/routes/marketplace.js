// server/routes/marketplace.js
// The Marketplace sync (marketplace/sync.js), mounted at /api/marketplace.
//
//   GET  /status                 live or dry run, each Marketplace signed in, every link
//   POST /listings/:docId/check  the Listing as saved (draft included) against both; sends nothing
//   POST /listings/:docId/push   a published Listing to Etsy and eBay
//   POST /quantities/push        { skus: [...] } each count to every Marketplace it is linked on
//   POST /sales/pull             paid Etsy receipts and eBay orders since the last pull, into stock
//   POST /snapshots              { source: etsy|ebay, rows: [...] } a CSV export, kept unmodified
//   POST /snapshots/etsy         every active Etsy listing through the API, kept the same way
//
// Each answers what it did, or, while MARKETPLACE_SYNC is not "on", what it
// would have sent. Every route needs a console sign-in for this site, as
// /api/inventory does. A schedule calling /sales/pull is not set up yet.

import express from 'express'
import { pool, hasDb } from '../utils/db.js'
import { createStock } from '../utils/stock.js'
import { requireEditor } from '../utils/requireEditor.js'
import { createSync } from '../marketplace/sync.js'
import { createEtsy } from '../marketplace/etsy.js'
import { createEbay } from '../marketplace/ebay.js'

const router = express.Router()
router.use(requireEditor)
export const sync = hasDb ? createSync({ db: pool, stock: createStock(pool), etsy: createEtsy(), ebay: createEbay() }) : null

const handle = (label, fn) => async (req, res) => {
  if (!sync) return res.status(503).json({ error: 'Marketplace sync not configured.' })
  try {
    res.json(await fn(req))
  } catch (err) {
    console.error(`[marketplace] ${label} failed:`, err.message)
    res.status(500).json({ error: 'Marketplace request failed.' })
  }
}

router.get('/status', handle('status', () => sync.status()))
router.post('/listings/:docId/check', handle('check listing', (req) => sync.pushListing(req.params.docId, { check: true })))
router.post('/listings/:docId/push', handle('push listing', (req) => sync.pushListing(req.params.docId)))
router.post('/quantities/push', handle('push quantities', (req) => sync.pushQuantities(Array.isArray(req.body?.skus) ? req.body.skus : [])))
router.post('/sales/pull', handle('pull sales', () => sync.pullSales()))
router.post('/snapshots', handle('snapshot', (req) => sync.snapshot(req.body?.source, req.body?.rows)))
router.post('/snapshots/etsy', handle('snapshot etsy', () => sync.snapshotEtsy()))

export default router
