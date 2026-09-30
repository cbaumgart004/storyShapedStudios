// server/utils/tokens.js
// Etsy and eBay OAuth tokens (ADR-0005): one row per Marketplace in Neon's
// marketplace_tokens, so they survive a Lambda container being replaced, which
// the old token files (etsy_token.json, ebay_token.json) could not. Without
// DATABASE_URL (local development) the files are still used.

import fs from 'fs'
import path from 'path'
import { pool, hasDb } from './db.js'

const FILES = { etsy: './etsy_token.json', ebay: './ebay_token.json' }
let ready = null

function ensureTable() {
  ready ??= pool.query(`
    CREATE TABLE IF NOT EXISTS marketplace_tokens (
      provider   TEXT PRIMARY KEY CHECK (provider IN ('etsy', 'ebay')),
      token      JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`).catch((err) => { ready = null; throw err })
  return ready
}

export async function saveToken(provider, token) {
  if (!hasDb) {
    fs.writeFileSync(path.resolve(FILES[provider]), JSON.stringify(token, null, 2))
    return
  }
  await ensureTable()
  await pool.query(
    `INSERT INTO marketplace_tokens (provider, token, updated_at) VALUES ($1, $2, now())
     ON CONFLICT (provider) DO UPDATE SET token = EXCLUDED.token, updated_at = now()`,
    [provider, JSON.stringify(token)])
}

export async function loadToken(provider) {
  try {
    if (!hasDb) {
      const file = path.resolve(FILES[provider])
      return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null
    }
    await ensureTable()
    const { rows } = await pool.query('SELECT token FROM marketplace_tokens WHERE provider = $1', [provider])
    return rows[0]?.token ?? null
  } catch (err) {
    console.error(`[tokens] loading the ${provider} token failed:`, err.message)
    return null
  }
}
