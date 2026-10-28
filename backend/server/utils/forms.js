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
//
// The entry is kept whole in `data`, so the page shows it exactly as written.
//
// Takes a pg Pool (or anything with query()), so the tests run the same SQL
// against PGlite.

import { randomBytes } from 'node:crypto'

export class FormError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
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
const SHARE_COLUMN = 'ALTER TABLE form_entries ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE'

let ready = null
function ensureTable(db) {
  ready ??= db.query(SCHEMA).then(() => db.query(SHARE_COLUMN)).catch((err) => {
    ready = null // try again on the next request
    throw err
  })
  return ready
}
export function resetFormTableForTests() { ready = null }

const newToken = () => randomBytes(18).toString('base64url')

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

// <yyyymmdd>_<customer>_<number>, safe as a file name.
export function fileName(data, number) {
  const who = String(data?.c?.name || data?.c?.company || 'Customer').trim().replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return `${String(data?.i?.date || '').replace(/-/g, '')}_${who || 'Customer'}_${number ?? 'draft'}`
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
})

const checkFolder = (folder) => {
  if (!FOLDER.test(folder ?? '')) throw new FormError(400, 'Unknown form folder.')
}
const checkData = (data) => {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new FormError(400, 'A form entry needs its fields.')
}

export function createForms(db) {
  async function row(folder, id) {
    checkFolder(folder)
    await ensureTable(db)
    const { rows } = await db.query('SELECT * FROM form_entries WHERE folder = $1 AND id = $2', [folder, id])
    if (!rows[0]) throw new FormError(404, 'No such form entry.')
    return rows[0]
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

    // What the customer's link shows: a generated entry only, without its flags.
    async shared(token) {
      await ensureTable(db)
      const { rows } = await db.query(`SELECT * FROM form_entries WHERE share_token = $1 AND status = 'generated'`, [String(token ?? '')])
      if (!rows[0]) throw new FormError(404, 'No such invoice.')
      const { folder, number, file, data } = out(rows[0])
      return { folder, number, file, data }
    },

    async setStatus(folder, id, { sent, paid } = {}) {
      if (sent === undefined && paid === undefined) throw new FormError(400, 'Send sent and/or paid.')
      const current = await row(folder, id)
      if (current.status !== 'generated') throw new FormError(409, 'Generate the entry before marking it sent or paid.')
      const { rows } = await db.query(
        `UPDATE form_entries SET sent = COALESCE($3, sent), paid = COALESCE($4, paid), updated_at = now()
         WHERE folder = $1 AND id = $2 RETURNING *`,
        [folder, id, sent === undefined ? null : Boolean(sent), paid === undefined ? null : Boolean(paid)])
      return out(rows[0])
    },
  }
}
