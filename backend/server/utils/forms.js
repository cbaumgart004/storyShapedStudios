// server/utils/forms.js
// Filled-in forms. A form's template lives in the console schema (`forms`); each
// entry made from it is one row here, filed under that form's folder, a name
// made from the form's title ("Sales Order" files under sales_orders). An entry:
//
//   draft      saved as it is typed, no number, can change or be deleted
//   generated  numbered (per folder, from FIRST_NUMBERS), never changes again;
//              only its Sent and Paid flags move. It gets a share token: the
//              link emailed to the customer (/invoice/<token>) reads it without
//              a login, through shared(); drafts are never shared.
//              The link alone shows nothing: requestCode() emails a 6-digit
//              code to the customer email on the entry (CODE_MINUTES to use it,
//              MAX_TRIES guesses, MAX_CODES an hour), and verify() trades it for
//              a session kept SESSION_DAYS in that browser. relink() replaces a
//              leaked link and ends its sessions.
//   viewed     the customer got past the code (verify()). Set once, the first time.
//   signed     the customer signed through that link (sign()): drawn, typed
//              (must match the printed name) or uploaded, after agreeing to
//              CONSENT. Kept with the time, IP, browser and a SHA-256 of the
//              order as signed, the usual e-signature audit trail (ESIGN/UETA).
//              Signed in with a customer account (utils/accounts.js) or as a
//              guest. Once signed it cannot be signed again.
//
// The entry is kept whole in `data`, so the page shows it exactly as written.
//
// Takes a pg Pool (or anything with query()), so the tests run the same SQL
// against PGlite.

import { randomBytes, randomInt, createHash } from 'node:crypto'
import { fill } from './emailTemplates.js'

export class FormError extends Error {
  constructor(status, message, extra) {
    super(message)
    this.status = status
    this.extra = extra
  }
}

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS form_entries (
    id            SERIAL PRIMARY KEY,
    folder        TEXT NOT NULL,
    number        TEXT,
    status        TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'generated')),
    data          JSONB NOT NULL,
    sent          BOOLEAN NOT NULL DEFAULT false,
    paid          BOOLEAN NOT NULL DEFAULT false,
    created_by    TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    generated_at  TIMESTAMPTZ,
    UNIQUE (folder, number)
  )`

// Added after the table first shipped; one statement per query for PGlite.
const ADDED = [
  'ALTER TABLE form_entries ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE',
  'ALTER TABLE form_entries ADD COLUMN IF NOT EXISTS signature JSONB',
  'ALTER TABLE form_entries ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ',
  'ALTER TABLE form_entries ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMPTZ',
  'ALTER TABLE form_entries ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ',
  'ALTER TABLE form_entries ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ',
  `CREATE TABLE IF NOT EXISTS share_codes (
     id SERIAL PRIMARY KEY, share_token TEXT NOT NULL, code_hash TEXT NOT NULL,
     tries INT NOT NULL DEFAULT 0, expires_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS share_sessions (
     token_hash TEXT PRIMARY KEY, share_token TEXT NOT NULL, email TEXT NOT NULL,
     expires_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
]
export const CODE_MINUTES = 10
const MAX_TRIES = 5
const MAX_CODES = 5
const SESSION_DAYS = 30

// What the customer agrees to before signing; stored with the signature.
export const CONSENT = 'I agree to sign this order electronically. My electronic signature is the legal equivalent of my handwritten signature, and I consent to receive this order and its records electronically.'
const MAX_IMAGE = 400_000 // characters of data URL

let ready = null
function ensureTable(db) {
  ready ??= db.query(SCHEMA).then(async () => { for (const q of ADDED) await db.query(q) }).catch((err) => {
    ready = null // try again on the next request
    throw err
  })
  return ready
}
export function resetFormTableForTests() { ready = null }

const newToken = () => randomBytes(18).toString('base64url')
const sha = (s) => createHash('sha256').update(s).digest('hex')
const emailOf = (data) => String(data?.c?.email ?? '').trim()
// a•••@example.com: enough for the customer to know where the code went.
export const masked = (email) => email.replace(/^(.)[^@]*@/, '$1•••@')

// Where each folder's numbering starts. Sales orders start at 4122 so the first
// does not read as number one; a folder not named here starts at 1001.
const FIRST_NUMBERS = { sales_orders: 4122 }
const FIRST_DEFAULT = 1001

// A folder name is made from the form's title by the Forms page (folderOf in
// frontend/src/pages/Admin/Forms.jsx); here it only has to look like one.
export const FOLDER = /^[a-z][a-z0-9_]*$/

async function nextNumber(db, folder) {
  const { rows } = await db.query(`SELECT number FROM form_entries WHERE folder = $1 AND number ~ '^[0-9]+$'`, [folder])
  const first = FIRST_NUMBERS[folder] ?? FIRST_DEFAULT
  return String(Math.max(first - 1, ...rows.map((r) => Number(r.number))) + 1)
}

// <yyyymmdd>_<number>_<customer>, safe as a file name.
// Keep in step with fileName in frontend/src/pages/Admin/Forms.jsx.
export function fileName(data, number) {
  const who = String(data?.c?.name || data?.c?.company || 'Customer').trim().replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return `${String(data?.i?.date || '').replace(/-/g, '')}_${number ?? 'draft'}_${who || 'Customer'}`
}

const out = (r) => ({
  id: r.id,
  folder: r.folder,
  number: r.number,
  status: r.status,
  sent: r.sent,
  paid: r.paid,
  file: fileName(r.data, r.number),
  data: r.data,
  created_at: r.created_at,
  updated_at: r.updated_at,
  generated_at: r.generated_at,
  share: r.share_token ?? null,
  signed_at: r.signed_at ?? null,
  viewed_at: r.viewed_at ?? null,
  sent_at: r.sent_at ?? null,
  paid_at: r.paid_at ?? null,
  signature: r.signature ?? null,
})
// The customer's view: no flags, and the signature without IP and browser.
const publicView = (r) => {
  const { folder, number, file, data, signature } = out(r)
  const sig = signature && (({ ip, ua, ...rest }) => rest)(signature)
  return { folder, number, file, data, signature: sig, consent: CONSENT }
}

const checkFolder = (folder) => {
  if (!FOLDER.test(folder ?? '')) throw new FormError(400, 'Unknown form folder.')
}
const checkData = (data) => {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new FormError(400, 'A form entry needs its fields.')
}

// mailer: utils/mail.js; templates: utils/emailTemplates.js (only requestCode uses them).
export function createForms(db, { mailer, templates } = {}) {
  async function row(folder, id) {
    checkFolder(folder)
    await ensureTable(db)
    const { rows } = await db.query('SELECT * FROM form_entries WHERE folder = $1 AND id = $2', [folder, id])
    if (!rows[0]) throw new FormError(404, 'No such form entry.')
    return rows[0]
  }

  // A generated entry by its link.
  async function linked(token) {
    await ensureTable(db)
    const { rows } = await db.query(`SELECT * FROM form_entries WHERE share_token = $1 AND status = 'generated'`, [String(token ?? '')])
    if (!rows[0]) throw new FormError(404, 'No such invoice.')
    return rows[0]
  }
  // The same, only with a live session for that link; carries the verified email.
  async function opened(token, session) {
    const r = await linked(token)
    if (session) {
      const { rows: [s] } = await db.query(
        'SELECT email FROM share_sessions WHERE token_hash = $1 AND share_token = $2 AND expires_at > now()', [sha(String(session)), r.share_token])
      if (s) return { ...r, verifiedEmail: s.email }
    }
    const to = emailOf(r.data)
    throw new FormError(401, 'Enter the code we email you to open this invoice.', { verify: true, number: r.number, sentTo: to ? masked(to) : null })
  }

  return {
    // Entries per folder, for the Forms page's template cards.
    async folders() {
      await ensureTable(db)
      const { rows } = await db.query('SELECT folder, count(*)::int AS entries FROM form_entries GROUP BY folder')
      return Object.fromEntries(rows.map((r) => [r.folder, r.entries]))
    },

    async list(folder) {
      checkFolder(folder)
      await ensureTable(db)
      const { rows } = await db.query('SELECT * FROM form_entries WHERE folder = $1 ORDER BY created_at DESC, id DESC', [folder])
      return rows.map(out)
    },

    // The number Generate would give now; a draft shows it from the start.
    async next(folder) {
      checkFolder(folder)
      await ensureTable(db)
      return nextNumber(db, folder)
    },

    async get(folder, id) {
      return out(await row(folder, id))
    },

    async createDraft(folder, data, by) {
      checkFolder(folder)
      checkData(data)
      await ensureTable(db)
      const { rows } = await db.query(
        'INSERT INTO form_entries (folder, data, created_by) VALUES ($1, $2, $3) RETURNING *', [folder, JSON.stringify(data), by ?? null])
      return out(rows[0])
    },

    async saveDraft(folder, id, data) {
      checkData(data)
      await row(folder, id)
      const { rows } = await db.query(
        `UPDATE form_entries SET data = $3, updated_at = now() WHERE folder = $1 AND id = $2 AND status = 'draft' RETURNING *`,
        [folder, id, JSON.stringify(data)])
      if (!rows[0]) throw new FormError(409, 'This entry is generated and can no longer change.')
      return out(rows[0])
    },

    async removeDraft(folder, id) {
      await row(folder, id)
      const { rowCount } = await db.query(`DELETE FROM form_entries WHERE folder = $1 AND id = $2 AND status = 'draft'`, [folder, id])
      if (!rowCount) throw new FormError(409, 'A generated entry is kept.')
    },

    // Keeps the typed number when it is free in the folder; otherwise takes the next one.
    async generate(folder, id, data) {
      checkData(data)
      const current = await row(folder, id)
      if (current.status !== 'draft') throw new FormError(409, 'This entry is already generated.')
      let number = String(data.i?.no ?? '').trim()
      for (let attempt = 0; attempt < 3; attempt++) {
        if (!number || (await db.query('SELECT 1 FROM form_entries WHERE folder = $1 AND number = $2', [folder, number])).rows.length) {
          number = await nextNumber(db, folder)
        }
        const stored = { ...data, i: { ...data.i, no: number } }
        try {
          const { rows } = await db.query(
            `UPDATE form_entries SET number = $3, data = $4, status = 'generated', generated_at = now(), updated_at = now(),
               share_token = $5
             WHERE folder = $1 AND id = $2 AND status = 'draft' RETURNING *`,
            [folder, id, number, JSON.stringify(stored), newToken()])
          if (!rows[0]) throw new FormError(409, 'This entry is already generated.')
          return out(rows[0])
        } catch (err) {
          if (err.code !== '23505') throw err // another Generate took the number first
          number = ''
        }
      }
      throw new FormError(409, 'Could not number the entry. Try again.')
    },

    // The share token of a generated entry, made now if it predates tokens.
    async share(folder, id) {
      const current = await row(folder, id)
      if (current.status !== 'generated') throw new FormError(409, 'Generate the entry before sharing it.')
      if (current.share_token) return out(current)
      const { rows } = await db.query(
        `UPDATE form_entries SET share_token = $3 WHERE folder = $1 AND id = $2 RETURNING *`, [folder, id, newToken()])
      return out(rows[0])
    },

    // What the customer's link shows, with a session from verify(): a generated
    // entry only, without its flags. Without one, 401 and where the code would go.
    async shared(token, session) {
      return publicView(await opened(token, session))
    },

    // Emails a code to the customer email on the entry.
    async requestCode(token) {
      const r = await linked(token)
      const to = emailOf(r.data)
      if (!to) throw new FormError(409, 'This invoice has no email on file. Please contact info@storyshapedstudios.com.')
      const { rows: [{ n }] } = await db.query(
        `SELECT count(*)::int AS n FROM share_codes WHERE share_token = $1 AND created_at > now() - interval '1 hour'`, [r.share_token])
      if (n >= MAX_CODES) throw new FormError(429, 'Too many codes asked for. Try again in an hour.')
      const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
      await db.query(
        `INSERT INTO share_codes (share_token, code_hash, expires_at) VALUES ($1, $2, now() + make_interval(mins => $3))`,
        [r.share_token, sha(`${r.share_token}:${code}`), CODE_MINUTES])
      const t = await templates.get('code')
      const vars = { name: String(r.data?.c?.name ?? '').trim() || 'there', number: r.number, code, minutes: CODE_MINUTES }
      await mailer.send({ to, subject: fill(t.subject, vars), text: fill(t.body, vars) })
      return { sentTo: masked(to) }
    },

    // Trades the newest live code for a session; the first time marks it viewed.
    async verify(token, code) {
      const r = await linked(token)
      const { rows: [c] } = await db.query(
        `SELECT * FROM share_codes WHERE share_token = $1 AND expires_at > now() ORDER BY id DESC LIMIT 1`, [r.share_token])
      if (!c) throw new FormError(400, 'That code has expired. Ask for a new one.')
      if (c.tries >= MAX_TRIES) throw new FormError(429, 'Too many wrong codes. Ask for a new one.')
      if (sha(`${r.share_token}:${String(code ?? '').replace(/\D/g, '')}`) !== c.code_hash) {
        await db.query('UPDATE share_codes SET tries = tries + 1 WHERE id = $1', [c.id])
        throw new FormError(400, 'That code is not right.')
      }
      await db.query('DELETE FROM share_codes WHERE share_token = $1', [r.share_token])
      const session = randomBytes(32).toString('base64url')
      await db.query(
        `INSERT INTO share_sessions (token_hash, share_token, email, expires_at) VALUES ($1, $2, $3, now() + make_interval(days => $4))`,
        [sha(session), r.share_token, emailOf(r.data).toLowerCase(), SESSION_DAYS])
      const { rows: [seen] } = await db.query(
        `UPDATE form_entries SET viewed_at = COALESCE(viewed_at, now()) WHERE id = $1 RETURNING *`, [r.id])
      return { session, ...publicView(seen) }
    },

    // A new link for a generated entry; the old one and its sessions stop working.
    async relink(folder, id) {
      const current = await row(folder, id)
      if (current.status !== 'generated') throw new FormError(409, 'Generate the entry before sharing it.')
      if (current.share_token) {
        await db.query('DELETE FROM share_sessions WHERE share_token = $1', [current.share_token])
        await db.query('DELETE FROM share_codes WHERE share_token = $1', [current.share_token])
      }
      const { rows } = await db.query(
        `UPDATE form_entries SET share_token = $3 WHERE folder = $1 AND id = $2 RETURNING *`, [folder, id, newToken()])
      return out(rows[0])
    },

    // Adds or corrects the customer email on a generated entry: the one field
    // that may change after Generate, since the link's code goes there. The
    // link stays; its sessions and unused codes end, so the next code goes to
    // the new address.
    async setEmail(folder, id, email) {
      const to = String(email ?? '').trim()
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) throw new FormError(400, 'Type a valid email address.')
      const current = await row(folder, id)
      if (current.status !== 'generated') throw new FormError(409, 'A draft takes its email in the form.')
      if (current.share_token) {
        await db.query('DELETE FROM share_sessions WHERE share_token = $1', [current.share_token])
        await db.query('DELETE FROM share_codes WHERE share_token = $1', [current.share_token])
      }
      const data = { ...current.data, c: { ...current.data?.c, email: to } }
      const { rows } = await db.query(
        `UPDATE form_entries SET data = $3, updated_at = now() WHERE folder = $1 AND id = $2 RETURNING *`,
        [folder, id, JSON.stringify(data)])
      return out(rows[0])
    },

    // The customer signs through their link. `meta` is { ip, ua, session } from the request.
    async sign(token, input = {}, meta = {}) {
      const r = await opened(token, meta.session)
      if (r.signed_at) throw new FormError(409, 'This order is already signed.')
      const name = String(input.name ?? '').trim()
      if (!name) throw new FormError(400, 'Type your full name.')
      if (input.consent !== true) throw new FormError(400, 'Agree to sign electronically first.')
      let image = null
      let typed = null
      if (input.method === 'type') {
        typed = String(input.typed ?? '').trim().replace(/\s+/g, ' ')
        if (typed.toLowerCase() !== name.replace(/\s+/g, ' ').toLowerCase()) throw new FormError(400, 'The typed signature must match your printed name.')
      } else if (input.method === 'draw' || input.method === 'upload') {
        image = String(input.image ?? '')
        if (!/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(image)) throw new FormError(400, 'Add your signature first.')
        if (image.length > MAX_IMAGE) throw new FormError(413, 'That signature image is too large.')
      } else {
        throw new FormError(400, 'Choose how to sign.')
      }
      const signature = {
        method: input.method, image, typed, name,
        signedAt: new Date().toISOString(),
        ip: meta.ip || null, ua: meta.ua ? String(meta.ua).slice(0, 300) : null,
        account: meta.account ? { id: meta.account.id, email: meta.account.email } : null, // null: signed as a guest
        verifiedEmail: r.verifiedEmail, // the address the code went to
        hash: createHash('sha256').update(JSON.stringify({ number: r.number, data: r.data })).digest('hex'),
        consent: CONSENT,
      }
      const { rows: [signed] } = await db.query(
        `UPDATE form_entries SET signature = $2, signed_at = $3, updated_at = now() WHERE id = $1 AND signed_at IS NULL RETURNING *`,
        [r.id, JSON.stringify(signature), signature.signedAt])
      if (!signed) throw new FormError(409, 'This order is already signed.')
      return publicView(signed)
    },

    async setStatus(folder, id, { sent, paid } = {}) {
      if (sent === undefined && paid === undefined) throw new FormError(400, 'Send sent and/or paid.')
      const current = await row(folder, id)
      if (current.status !== 'generated') throw new FormError(409, 'Generate the entry before marking it sent or paid.')
      const { rows } = await db.query(
        // Ticking stamps the time it was ticked; unticking clears it.
        `UPDATE form_entries SET
           sent_at = CASE WHEN $3::boolean IS NULL THEN sent_at WHEN $3::boolean THEN COALESCE(sent_at, now()) END,
           paid_at = CASE WHEN $4::boolean IS NULL THEN paid_at WHEN $4::boolean THEN COALESCE(paid_at, now()) END,
           sent = COALESCE($3::boolean, sent), paid = COALESCE($4::boolean, paid), updated_at = now()
         WHERE folder = $1 AND id = $2 RETURNING *`,
        [folder, id, sent === undefined ? null : Boolean(sent), paid === undefined ? null : Boolean(paid)])
      return out(rows[0])
    },
  }
}
