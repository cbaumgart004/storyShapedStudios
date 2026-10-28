// server/routes/shared.js
// The customer's invoice link, mounted at /api/shared (see routes/index.js).
// No login: the token is the key, made when the entry was generated
// (utils/forms.js share token). Drafts are never returned.
//
//   GET  /:token   { folder, number, file, data }

import express from 'express'
import { pool, hasDb } from '../utils/db.js'
import { createForms, FormError } from '../utils/forms.js'

const router = express.Router()
const forms = hasDb ? createForms(pool) : null

router.get('/:token', async (req, res) => {
  if (!hasDb) return res.status(503).json({ error: 'Not configured.' })
  try {
    res.set('Cache-Control', 'no-store')
    res.json(await forms.shared(req.params.token))
  } catch (err) {
    if (err instanceof FormError) return res.status(err.status).json({ error: err.message })
    console.error('[shared] GET failed:', err.message)
    res.status(500).json({ error: 'Request failed.' })
  }
})

export default router
