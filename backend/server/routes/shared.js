// server/routes/shared.js
// The customer's invoice link, mounted at /api/shared (see routes/index.js).
// No studio login: the link's token plus a session from an emailed code
// (utils/forms.js requestCode / verify), sent as X-Invoice-Session. Drafts are
// never returned.
//
//   GET   /:token        { folder, number, file, data, signature, consent };
//                        401 { error, verify: true, number, sentTo } without a session
//   POST  /:token/code   { sentTo } emails a 6-digit code to the invoice's customer
//   POST  /:token/verify { code } -> { session, ...the GET answer }
//   POST  /:token/sign   { method: draw|type|upload, name, typed?, image?, consent: true };
//                        a customer account's bearer token, when sent, is kept with the signature

import express from 'express'
import { pool, hasDb } from '../utils/db.js'
import { createForms, FormError } from '../utils/forms.js'
import { createTemplates } from '../utils/emailTemplates.js'
import { mailer, MailError } from '../utils/mail.js'
import { accounts, bearer } from './account.js'

const router = express.Router()
const forms = hasDb ? createForms(pool, { mailer, templates: createTemplates(pool) }) : null
const session = (req) => req.headers['x-invoice-session'] || null

const handle = (label, fn) => async (req, res) => {
  if (!hasDb) return res.status(503).json({ error: 'Not configured.' })
  res.set('Cache-Control', 'no-store')
  try {
    await fn(req, res)
  } catch (err) {
    if (err instanceof FormError) return res.status(err.status).json({ error: err.message, ...err.extra })
    if (err instanceof MailError) return res.status(503).json({ error: 'We could not send the email just now. Please try again shortly.' })
    console.error(`[shared] ${label} failed:`, err.message)
    res.status(500).json({ error: 'Request failed.' })
  }
}

router.get('/:token', handle('GET', async (req, res) => {
  res.json(await forms.shared(req.params.token, session(req)))
}))

router.post('/:token/code', handle('code', async (req, res) => {
  res.json(await forms.requestCode(req.params.token))
}))

router.post('/:token/verify', handle('verify', async (req, res) => {
  res.json(await forms.verify(req.params.token, req.body?.code))
}))

router.post('/:token/sign', handle('sign', async (req, res) => {
  const ip = String(req.headers['x-forwarded-for'] ?? req.socket?.remoteAddress ?? '').split(',')[0].trim()
  const account = await accounts.session(bearer(req)).catch(() => null)
  res.json(await forms.sign(req.params.token, req.body ?? {}, { ip, ua: req.headers['user-agent'], account, session: session(req) }))
}))

export default router
