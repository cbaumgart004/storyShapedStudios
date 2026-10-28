// server/routes/customers.js
// The customer list, mounted at /api/customers (see routes/index.js). Rules
// live in utils/customers.js.
//
//   GET   /    every customer, by name
//   POST  /    { name, company?, email?, phone?, bill?, ship? }; 409 if the name exists
//
// Every route needs a login the Edge of the Map console says can edit this site
// (utils/requireEditor.js), the same as /api/forms.

import express from 'express'
import { pool, hasDb } from '../utils/db.js'
import { createCustomers, CustomerError } from '../utils/customers.js'
import { requireEditor } from '../utils/requireEditor.js'

const router = express.Router()
router.use(requireEditor)
const customers = hasDb ? createCustomers(pool) : null

const handle = (label, fn) => async (req, res) => {
  if (!hasDb) return res.status(503).json({ error: 'Customers not configured.' })
  try {
    await fn(req, res)
  } catch (err) {
    if (err instanceof CustomerError) return res.status(err.status).json({ error: err.message })
    console.error(`[customers] ${label} failed:`, err.message)
    res.status(500).json({ error: 'Customer request failed.' })
  }
}

router.get('/', handle('GET /', async (req, res) => {
  res.json(await customers.list())
}))

router.post('/', handle('POST /', async (req, res) => {
  res.status(201).json(await customers.create(req.body, req.editor?.email ?? req.editor?.name ?? null))
}))

export default router
