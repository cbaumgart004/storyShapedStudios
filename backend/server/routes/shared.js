// server/routes/shared.js
// The customer's invoice link, mounted at /api/shared (see routes/index.js).
// No login: the token is the key, made when the entry was generated
// (utils/forms.js share token). Drafts are never returned.
//
//   GET   /:token        { folder, number, file, data, signature, consent }
//   POST  /:token/viewed 204; the customer opened the link (the page skips this for a signed-in owner)
//   POST  /:token/sign   { method: draw|type|upload, name, typed?, image?, consent: true };
//                        a customer account's bearer token, when sent, is kept with the signature

import express from 'express'
import { pool, hasDb } from '../utils/db.js'
import { createForms, FormError } from '../utils/forms.js'
import { accounts, bearer } from './account.js'

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

router.post('/:token/viewed', async (req, res) => {
  if (!hasDb) return res.status(503).json({ error: 'Not configured.' })
  try {
    await forms.viewed(req.params.token)
    res.status(204).end()
  } catch (err) {
    console.error('[shared] viewed failed:', err.message)
    res.status(500).json({ error: 'Request failed.' })
  }
})

router.post('/:token/sign', async (req, res) => {
  if (!hasDb) return res.status(503).json({ error: 'Not configured.' })
  try {
    const ip = String(req.headers['x-forwarded-for'] ?? req.socket?.remoteAddress ?? '').split(',')[0].trim()
    const account = await accounts.session(bearer(req)).catch(() => null)
    res.json(await forms.sign(req.params.token, req.body ?? {}, { ip, ua: req.headers['user-agent'], account }))
  } catch (err) {
    if (err instanceof FormError) return res.status(err.status).json({ error: err.message })
    console.error('[shared] sign failed:', err.message)
    res.status(500).json({ error: 'Request failed.' })
  }
})

export default router
