// server/utils/db.js
// Lazily-created Postgres pool (Neon in production). If DATABASE_URL is unset,
// `pool` is null and `hasDb` is false so routes can degrade gracefully instead
// of crashing the server. Neon requires SSL.

import pg from 'pg'

const { Pool } = pg
const connectionString = process.env.DATABASE_URL

export const pool = connectionString
  ? new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
    })
  : null

export const hasDb = Boolean(pool)

if (!hasDb) {
  console.warn('[db] DATABASE_URL not set — Postgres-backed features disabled.')
}
