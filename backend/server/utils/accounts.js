// server/utils/accounts.js
// Customer accounts: email + password, for the customer's invoice link
// (/invoice/<token>), where a signer can continue signed in or as a guest.
// Passwords are kept as scrypt hashes with their own salt; a sign-in is a
// random session token stored here (30 days), sent back as a bearer token.
// Emails are not verified: the site sends no email yet, so an account says who
// the customer claims to be, nothing more.
//
// Takes a pg Pool (or anything with query()), so the tests run the same SQL
// against PGlite.

import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(scryptCb)

export class AccountError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

const TABLES = [
  `CREATE TABLE IF NOT EXISTS customer_accounts (
    id             SERIAL PRIMARY KEY,
    email          TEXT NOT NULL,
    name           TEXT NOT NULL,
    password_hash  TEXT NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  'CREATE UNIQUE INDEX IF NOT EXISTS customer_accounts_email_key ON customer_accounts (lower(email))',
  `CREATE TABLE IF NOT EXISTS customer_sessions (
    token       TEXT PRIMARY KEY,
    account_id  INTEGER NOT NULL REFERENCES customer_accounts(id) ON DELETE CASCADE,
    expires_at  TIMESTAMPTZ NOT NULL
  )`,
]

let ready = null
function ensureTables(db) {
  ready ??= (async () => { for (const q of TABLES) await db.query(q) })().catch((err) => {
    ready = null // try again on the next request
    throw err
  })
  return ready
}
export function resetAccountTablesForTests() { ready = null }

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

async function hash(password) {
  const salt = randomBytes(16)
  const key = await scrypt(password, salt, 64)
  return `scrypt:${salt.toString('base64')}:${key.toString('base64')}`
}
async function matches(password, stored) {
  const [, salt, key] = String(stored).split(':')
  const want = Buffer.from(key, 'base64')
  const got = await scrypt(password, Buffer.from(salt, 'base64'), want.length)
  return timingSafeEqual(got, want)
}

const pub = (a) => ({ id: a.id, email: a.email, name: a.name })

export function createAccounts(db) {
  async function startSession(account) {
    const token = randomBytes(24).toString('base64url')
    await db.query(`INSERT INTO customer_sessions (token, account_id, expires_at) VALUES ($1, $2, now() + interval '30 days')`,
      [token, account.id])
    return { token, account: pub(account) }
  }

  return {
    async register({ email, name, password } = {}) {
      await ensureTables(db)
      email = String(email ?? '').trim()
      name = String(name ?? '').trim()
      password = String(password ?? '')
      if (!EMAIL.test(email)) throw new AccountError(400, 'Enter a valid email address.')
      if (!name) throw new AccountError(400, 'Enter your full name.')
      if (password.length < 8) throw new AccountError(400, 'Use a password of at least 8 characters.')
      try {
        const { rows: [a] } = await db.query(
          'INSERT INTO customer_accounts (email, name, password_hash) VALUES ($1, $2, $3) RETURNING *', [email, name, await hash(password)])
        return startSession(a)
      } catch (err) {
        if (err.code === '23505' || /unique|duplicate/i.test(err.message)) throw new AccountError(409, 'An account with this email already exists. Sign in instead.')
        throw err
      }
    },

    async login({ email, password } = {}) {
      await ensureTables(db)
      const { rows: [a] } = await db.query('SELECT * FROM customer_accounts WHERE lower(email) = lower($1)', [String(email ?? '').trim()])
      if (!a || !(await matches(String(password ?? ''), a.password_hash))) throw new AccountError(401, 'That email and password do not match.')
      return startSession(a)
    },

    // The account a bearer token belongs to, or null.
    async session(token) {
      if (!token) return null
      await ensureTables(db)
      const { rows: [a] } = await db.query(
        `SELECT a.* FROM customer_sessions s JOIN customer_accounts a ON a.id = s.account_id WHERE s.token = $1 AND s.expires_at > now()`,
        [String(token)])
      return a ? pub(a) : null
    },

    async logout(token) {
      await ensureTables(db)
      await db.query('DELETE FROM customer_sessions WHERE token = $1', [String(token ?? '')])
    },
  }
}
