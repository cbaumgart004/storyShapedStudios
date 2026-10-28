// server/routes/emails.js
// The studio's email templates, mounted at /api/emails (see routes/index.js).
// Rules live in utils/emailTemplates.js.
//
//   GET     /       every template, edited or default
//   PUT     /:key   { subject, body }
//   DELETE  /:key   back to the default wording
//
// Every route needs a login the Edge of the Map console says can edit this site
// (utils/requireEditor.js), the same as /api/forms.

import express from 'express'
import { pool, hasDb } from '../utils/db.js'
import { createTemplates, TemplateError } from '../utils/emailTemplates.js'
import { requireEditor } from '../utils/requireEditor.js'

const router = express.Router()
router.use(requireEditor)
const templates = hasDb ? createTemplates(pool) : null

const handle = (label, fn) => async (req, res) => {
  if (!hasDb) return res.status(503).json({ error: 'Emails not configured.' })
  try {
    await fn(req, res)
  } catch (err) {
    if (err instanceof TemplateError) return res.status(err.status).json({ error: err.message })
    console.error(`[emails] ${label} failed:`, err.message)
    res.status(500).json({ error: 'Email template request failed.' })
  }
}

router.get('/', handle('GET /', async (req, res) => {
  res.json(await templates.list())
}))

router.put('/:key', handle('PUT /:key', async (req, res) => {
  res.json(await templates.save(req.params.key, req.body ?? {}, req.editor?.email ?? req.editor?.name))
}))

router.delete('/:key', handle('DELETE /:key', async (req, res) => {
  res.json(await templates.reset(req.params.key))
}))

export default router
