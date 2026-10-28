// server/routes/account.js
// Customer accounts, mounted at /api/account (see routes/index.js). Rules live
// in utils/accounts.js. Not the studio's login: Forms and Inventory use the
// Edge of the Map console's.
//
//   POST  /register  { email, name, password }  -> { token, account }; 409 if the email exists
//   POST  /login     { email, password }        -> { token, account }; 401 if they do not match
//   GET   /me        bearer token               -> account, or 401
//   POST  /logout    bearer token               -> 204

import express from 'express'
import { pool, hasDb } from '../utils/db.js'
import { createAccounts, AccountError } from '../utils/accounts.js'

const router = express.Router()
export const accounts = hasDb ? createAccounts(pool) : null
export const bearer = (req) => (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '') || null

const handle = (label, fn) => async (req, res) => {
  if (!hasDb) return res.status(503).json({ error: 'Accounts not configured.' })
  try {
    await fn(req, res)
  } catch (err) {
    if (err instanceof AccountError) return res.status(err.status).json({ error: err.message })
    console.error(`[account] ${label} failed:`, err.message)
    res.status(500).json({ error: 'Account request failed.' })
  }
}

router.post('/register', handle('POST /register', async (req, res) => {
  res.status(201).json(await accounts.register(req.body ?? {}))
}))

router.post('/login', handle('POST /login', async (req, res) => {
  res.json(await accounts.login(req.body ?? {}))
}))

router.get('/me', handle('GET /me', async (req, res) => {
  const a = await accounts.session(bearer(req))
  if (!a) return res.status(401).json({ error: 'Not signed in.' })
  res.json(a)
}))

router.post('/logout', handle('POST /logout', async (req, res) => {
  await accounts.logout(bearer(req))
  res.status(204).end()
}))

export default router
