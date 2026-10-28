// server/routes/forms.js
// Filled-in forms, mounted at /api/forms (see routes/index.js). Rules live in
// utils/forms.js; this file only maps HTTP onto them. :folder is the form's
// folder (sales_orders, waivers, …), made from the form's title.
//
//   GET    /                              entries per folder
//   GET    /:folder                       every entry, drafts included
//   POST   /:folder                       new draft from the template sent
//   GET    /:folder/next                  { number } Generate would give now
//   GET    /:folder/:id                   one
//   PUT    /:folder/:id                   save a draft (409 once generated)
//   DELETE /:folder/:id                   delete a draft (409 once generated)
//   POST   /:folder/:id/generate          number it and lock it
//   PATCH  /:folder/:id                   { sent?, paid? }, generated only
//   POST   /:folder/:id/share             the entry with its share token (generated only)
//   POST   /:folder/:id/relink            a new share token; the old link and its sessions stop
//   POST   /:folder/:id/email             { email } on a generated entry; ends the link's sessions
//
// The customer's link reads through routes/shared.js, the one route without a login.
//
// Every route needs a login the Edge of the Map console says can edit this site
// (utils/requireEditor.js), the same as /api/inventory.

import express from 'express'
import { pool, hasDb } from '../utils/db.js'
import { createForms, FormError } from '../utils/forms.js'
import { requireEditor } from '../utils/requireEditor.js'

const router = express.Router()
router.use(requireEditor)
const forms = hasDb ? createForms(pool) : null

const id = (v) => {
  const n = Number(v)
  if (!Number.isInteger(n) || n < 1) throw new FormError(400, 'Invalid form entry id.')
  return n
}

const handle = (label, fn) => async (req, res) => {
  if (!hasDb) return res.status(503).json({ error: 'Forms not configured.' })
  try {
    await fn(req, res)
  } catch (err) {
    if (err instanceof FormError) return res.status(err.status).json({ error: err.message })
    console.error(`[forms] ${label} failed:`, err.message)
    res.status(500).json({ error: 'Form request failed.' })
  }
}
const by = (req) => req.editor?.email ?? req.editor?.name

router.get('/', handle('GET /', async (req, res) => {
  res.json(await forms.folders())
}))

router.get('/:folder', handle('GET /:folder', async (req, res) => {
  res.json(await forms.list(req.params.folder))
}))

router.post('/:folder', handle('POST /:folder', async (req, res) => {
  res.status(201).json(await forms.createDraft(req.params.folder, req.body, by(req)))
}))

router.get('/:folder/next', handle('GET /:folder/next', async (req, res) => {
  res.json({ number: await forms.next(req.params.folder) })
}))

router.get('/:folder/:id', handle('GET /:folder/:id', async (req, res) => {
  res.json(await forms.get(req.params.folder, id(req.params.id)))
}))

router.put('/:folder/:id', handle('PUT /:folder/:id', async (req, res) => {
  res.json(await forms.saveDraft(req.params.folder, id(req.params.id), req.body))
}))

router.delete('/:folder/:id', handle('DELETE /:folder/:id', async (req, res) => {
  await forms.removeDraft(req.params.folder, id(req.params.id))
  res.status(204).end()
}))

router.post('/:folder/:id/generate', handle('POST /:folder/:id/generate', async (req, res) => {
  res.json(await forms.generate(req.params.folder, id(req.params.id), req.body))
}))

router.post('/:folder/:id/share', handle('POST /:folder/:id/share', async (req, res) => {
  res.json(await forms.share(req.params.folder, id(req.params.id)))
}))

router.post('/:folder/:id/relink', handle('POST /:folder/:id/relink', async (req, res) => {
  res.json(await forms.relink(req.params.folder, id(req.params.id)))
}))

router.post('/:folder/:id/email', handle('POST /:folder/:id/email', async (req, res) => {
  res.json(await forms.setEmail(req.params.folder, id(req.params.id), req.body?.email))
}))

router.patch('/:folder/:id', handle('PATCH /:folder/:id', async (req, res) => {
  res.json(await forms.setStatus(req.params.folder, id(req.params.id), req.body ?? {}))
}))

export default router
