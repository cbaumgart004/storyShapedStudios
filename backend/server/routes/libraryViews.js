// server/routes/libraryViews.js
// Global Library view counts, backed by Postgres (Neon).
// Mounted at /api/library/views (see routes/index.js), so:
//   GET  /api/library/views        -> { slug: count, ... }
//   POST /api/library/views/:slug  -> { slug, count }
// Degrades gracefully when no DB is configured.

import express from 'express'
import { pool, hasDb } from '../utils/db.js'

const router = express.Router()

let initialized = false
async function ensureTable() {
  if (initialized) return
  await pool.query(`
    CREATE TABLE IF NOT EXISTS library_views (
      slug  TEXT PRIMARY KEY,
      count INTEGER NOT NULL DEFAULT 0
    )
  `)
  initialized = true
}

// Return all counts as a { slug: count } map.
router.get('/', async (req, res) => {
  if (!hasDb) return res.json({})
  try {
    await ensureTable()
    const { rows } = await pool.query('SELECT slug, count FROM library_views')
    const counts = {}
    for (const row of rows) counts[row.slug] = row.count
    res.json(counts)
  } catch (err) {
    console.error('[library/views] GET failed:', err.message)
    res.status(500).json({ error: 'View counts unavailable.' })
  }
})

// Increment one entry's count and return the new value.
router.post('/:slug', async (req, res) => {
  if (!hasDb) return res.status(503).json({ error: 'View tracking not configured.' })
  const slug = String(req.params.slug).slice(0, 80)
  try {
    await ensureTable()
    const { rows } = await pool.query(
      `INSERT INTO library_views (slug, count)
       VALUES ($1, 1)
       ON CONFLICT (slug) DO UPDATE SET count = library_views.count + 1
       RETURNING count`,
      [slug]
    )
    res.json({ slug, count: rows[0].count })
  } catch (err) {
    console.error('[library/views] POST failed:', err.message)
    res.status(500).json({ error: 'Could not record view.' })
  }
})

export default router
