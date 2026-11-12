// server/routes/marketplace.js
// The Marketplace sync (marketplace/sync.js), mounted at /api/marketplace.
//
//   GET  /status                 live or dry run, each Marketplace signed in, every link
//   POST /listings/:docId/check  { only } the Listing as saved (draft included) against both, or those named; sends nothing
//   POST /listings/:docId/push   { confirm: true, only } a published Listing to Etsy and eBay, or those named
//   POST /quantities/push        { skus: [...] } each count to every Marketplace it is linked on
//   POST /sales/pull             paid Etsy receipts and eBay orders since the last pull, into stock
//   POST /snapshots              { source: etsy|ebay, rows: [...] } a CSV export, kept unmodified
//   POST /snapshots/etsy         every active Etsy listing through the API, kept the same way
//   GET  /snapshots/etsy         the newest snapshot of each Etsy listing, cut to what the review shows
//   GET  /snapshots/etsy/:key    one listing's newest snapshot as Etsy sent it
//   POST /import/etsy            a draft Listing for each snapshot no Listing holds yet
//   POST /snapshots/ebay         every live eBay listing through the Trading API (read only), kept the same way
//   GET  /snapshots/ebay         the newest snapshot of each eBay listing, cut to a review
//   POST /import/ebay            a draft Listing for each snapshot no Listing holds or resembles; resemblances come back as suggested pairs
//   POST /pair                   { pairs: [{ provider, externalId, listing }] } pair Listing numbers with Marketplace listings, filling what each Listing lacks
//   POST /listings/number        give every Listing without a Listing number the next one
//   GET  /etsy/sections         the shop's section titles, for the Listing editor
//   GET  /etsy/categories        every Etsy category as its path, the same way
//
// Each answers what it did, or, while MARKETPLACE_SYNC is not "on", what it
// would have sent. Every route but the two /etsy/ choice lists needs a console
// sign-in for this site, as /api/inventory does. A schedule calling /sales/pull is not set up yet.

import express from 'express'
import { pool, hasDb } from '../utils/db.js'
import { createStock } from '../utils/stock.js'
import { requireEditor } from '../utils/requireEditor.js'
import { createSync } from '../marketplace/sync.js'
import { createEtsy } from '../marketplace/etsy.js'
import { createEbay } from '../marketplace/ebay.js'

const router = express.Router()
export const sync = hasDb ? createSync({ db: pool, stock: createStock(pool), etsy: createEtsy(), ebay: createEbay() }) : null

// The Listing editor's choices (console schema optionsUrl), [{ value, label }].
// Open, ahead of the sign-in: the console asks without a token, and a shop's
// section titles and Etsy's category tree are public on Etsy already. 503 when
// Etsy cannot be asked, and the editor keeps its own list.
for (const kind of ['sections', 'categories']) {
  router.get(`/etsy/${kind}`, async (_req, res) => {
    const list = sync ? await sync.etsyChoices(kind) : null
    if (!list) return res.status(503).json({ error: `Etsy ${kind} unavailable.` })
    res.set('Cache-Control', 'public, max-age=600').json(list)
  })
}

router.use(requireEditor)

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
const only = (req) => (Array.isArray(req.body?.only) && req.body.only.length ? req.body.only.filter((p) => p === 'etsy' || p === 'ebay') : ['etsy', 'ebay'])
router.post('/listings/:docId/check', handle('check listing', (req) => sync.pushListing(req.params.docId, { check: true, only: only(req) })))
// The gate: a push changes the live shop, so it is sent only with confirm: true.
router.post('/listings/:docId/push', handle('push listing', (req) => (req.body?.confirm === true
  ? sync.pushListing(req.params.docId, { only: only(req) })
  : { error: 'Not sent: a push needs confirm: true. Test the update first.' })))
router.post('/quantities/push', handle('push quantities', (req) => sync.pushQuantities(Array.isArray(req.body?.skus) ? req.body.skus : [])))
router.post('/sales/pull', handle('pull sales', () => sync.pullSales()))
router.post('/snapshots', handle('snapshot', (req) => sync.snapshot(req.body?.source, req.body?.rows)))
router.post('/snapshots/etsy', handle('snapshot etsy', () => sync.snapshotEtsy()))
router.get('/snapshots/etsy', handle('read etsy snapshots', () => sync.etsySnapshots()))
router.get('/snapshots/etsy/:key', handle('read etsy snapshot', (req) => sync.etsySnapshot(req.params.key)))
router.post('/import/etsy', handle('import etsy listings', (req) => sync.importEtsyListings(req.editor)))
router.post('/snapshots/ebay', handle('snapshot ebay', (req) => sync.snapshotEbay({ page: req.body?.page ?? 1 })))
router.get('/snapshots/ebay', handle('read ebay snapshots', () => sync.ebaySnapshots()))
router.post('/import/ebay', handle('import ebay listings', (req) => sync.importEbayListings(req.editor)))
router.post('/pair', handle('pair listings', (req) => sync.pairListings(req.body?.pairs, req.editor)))
router.post('/listings/number', handle('number listings', () => sync.numberListings()))

export default router
