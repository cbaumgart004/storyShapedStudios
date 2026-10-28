// server/utils/emailTemplates.js
// The studio's email wording, editable at /admin/emails. Each template is a
// subject and a plain-text body with {{placeholders}}; one never edited reads
// from DEFAULTS, and Reset puts DEFAULTS back (an added email is deleted instead).
//
//   invoice  the email that carries the customer's link. Opened as a mailto:
//            by the Forms page (mailtoFor in frontend/src/pages/Admin/Forms.jsx),
//            so it goes from the studio's own mail app.
//   code     the 6-digit code that opens the link (utils/forms.js requestCode),
//            sent by the site through SES (utils/mail.js).
//   email-*  link emails the owner adds (`add`), starting from the invoice
//            wording. A form's folder is assigned to one link email (`forms`);
//            a folder no email lists goes out with `invoice` (`forForm`).
//
// Takes a pg Pool (or anything with query()), so the tests run the same SQL
// against PGlite.

export class TemplateError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

export const DEFAULTS = {
  invoice: {
    label: 'Invoice link',
    help: 'Opens in your mail app from Generate & email, Email and Share.',
    placeholders: ['name', 'number', 'link', 'balance', 'due', 'payment'],
    subject: 'StoryShaped Studios invoice {{number}}',
    body: [
      'Hi {{name}},', '',
      'Here is invoice {{number}} from StoryShaped Studios.', '',
      'View, sign or download it: {{link}}',
      'When you open it we will email you a 6-digit code, so only you can see it.', '',
      'Balance due: {{balance}} by {{due}}',
      '{{payment}}', '',
      'Thank you,', 'StoryShaped Studios',
    ].join('\n'),
  },
  code: {
    label: 'Verification code',
    help: 'Sent by the site when a customer opens their invoice link.',
    placeholders: ['name', 'number', 'code', 'minutes'],
    subject: 'Your StoryShaped Studios code: {{code}}',
    body: [
      'Hi {{name}},', '',
      'Your code to open invoice {{number}} is {{code}}.',
      'It works for {{minutes}} minutes.', '',
      'If you did not ask for it, you can ignore this email.', '',
      'StoryShaped Studios',
    ].join('\n'),
  },
}

// {{key}} -> vars[key]; an unknown key is left as typed so a typo shows.
export function fill(text, vars) {
  return String(text).replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k) => (k in vars ? String(vars[k] ?? '') : m))
}

// A row per edited built-in and per added email. `label` is set on added ones
// only; `forms` lists the form folders that email goes out for (link emails
// only, and a folder sits in one email at a time).
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS email_templates (
    key         TEXT PRIMARY KEY,
    subject     TEXT NOT NULL,
    body        TEXT NOT NULL,
    updated_by  TEXT,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  'ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS label TEXT',
  `ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS forms JSONB NOT NULL DEFAULT '[]'`,
]

let ready = null
function ensureTable(db) {
  ready ??= (async () => { for (const s of SCHEMA) await db.query(s) })().catch((err) => { ready = null; throw err })
  return ready
}
export function resetTemplateTableForTests() { ready = null }

const ADDED = /^email-[a-z0-9]{6,}$/
const isLink = (key) => key !== 'code'
const view = (key, row) => {
  const base = DEFAULTS[key] ?? DEFAULTS.invoice
  const added = !Object.hasOwn(DEFAULTS, key)
  return {
    key,
    label: added ? row.label : base.label,
    help: added ? 'An invoice-link email of your own. Pick the forms it goes out for.' : base.help,
    placeholders: base.placeholders,
    subject: row?.subject ?? base.subject, body: row?.body ?? base.body,
    forms: isLink(key) ? (row?.forms ?? []) : null,
    added, edited: added || Boolean(row && (row.subject !== base.subject || row.body !== base.body)), updated_at: row?.updated_at ?? null,
    default: added ? null : { subject: base.subject, body: base.body },
  }
}
const cleanForms = (forms) => [...new Set((Array.isArray(forms) ? forms : []).map((f) => String(f).trim()).filter((f) => /^[a-z0-9_]+$/.test(f)))]

export function createTemplates(db) {
  const rowOf = async (key) => (await db.query('SELECT * FROM email_templates WHERE key = $1', [key])).rows[0]
  const known = async (key) => {
    const row = await rowOf(key)
    if (!Object.hasOwn(DEFAULTS, key) && !row) throw new TemplateError(404, 'No such email template.')
    return row
  }
  // A folder goes out with one email: taking it here drops it from the others.
  const claim = async (key, forms) => {
    for (const f of forms) {
      await db.query(
        `UPDATE email_templates SET forms = forms - $2::text WHERE key <> $1 AND forms ? $2::text`, [key, f])
    }
  }

  return {
    async list() {
      await ensureTable(db)
      const { rows } = await db.query('SELECT * FROM email_templates ORDER BY updated_at')
      const byKey = Object.fromEntries(rows.map((r) => [r.key, r]))
      return [
        ...Object.keys(DEFAULTS).map((k) => view(k, byKey[k])),
        ...rows.filter((r) => !Object.hasOwn(DEFAULTS, r.key)).map((r) => view(r.key, r)),
      ]
    },

    async get(key) {
      await ensureTable(db)
      return view(key, await known(key))
    },

    // The link email a form's folder goes out with: the one that lists it, else `invoice`.
    async forForm(folder) {
      await ensureTable(db)
      const { rows } = await db.query('SELECT * FROM email_templates WHERE forms ? $1::text LIMIT 1', [folder])
      return rows[0] ? view(rows[0].key, rows[0]) : view('invoice', await rowOf('invoice'))
    },

    // A new link email, starting from the invoice email's current wording.
    async add({ label } = {}, by) {
      label = String(label ?? '').trim()
      if (!label) throw new TemplateError(400, 'Give the email a name.')
      if (label.length > 80) throw new TemplateError(400, 'That name is too long.')
      await ensureTable(db)
      const from = view('invoice', await rowOf('invoice'))
      const key = `email-${Math.random().toString(36).slice(2, 10).padEnd(6, '0')}`
      const { rows } = await db.query(
        `INSERT INTO email_templates (key, label, subject, body, updated_by) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [key, label, from.subject, from.body, by ?? null])
      return view(key, rows[0])
    },

    async save(key, { subject, body, label, forms } = {}, by) {
      await ensureTable(db)
      const row = await known(key)
      const added = !Object.hasOwn(DEFAULTS, key)
      subject = String(subject ?? '').trim()
      body = String(body ?? '').replace(/\r\n/g, '\n').trim()
      if (!subject || !body) throw new TemplateError(400, 'An email needs a subject and a body.')
      if (subject.length > 300 || body.length > 10_000) throw new TemplateError(400, 'That email is too long.')
      if (key === 'code' && !/\{\{\s*code\s*\}\}/.test(subject + body)) throw new TemplateError(400, 'The code email must include {{code}}.')
      if (isLink(key) && !/\{\{\s*link\s*\}\}/.test(body)) throw new TemplateError(400, 'The invoice email must include {{link}}.')
      label = added ? String(label ?? row.label).trim() : null
      if (added && !label) throw new TemplateError(400, 'Give the email a name.')
      const list = isLink(key) ? cleanForms(forms ?? row?.forms) : []
      await claim(key, list)
      const { rows } = await db.query(
        `INSERT INTO email_templates (key, label, subject, body, forms, updated_by) VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (key) DO UPDATE SET label = $2, subject = $3, body = $4, forms = $5, updated_by = $6, updated_at = now() RETURNING *`,
        [key, label, subject, body, JSON.stringify(list), by ?? null])
      return view(key, rows[0])
    },

    // A built-in goes back to its original wording (keeping its forms); an added one is deleted.
    async reset(key) {
      await ensureTable(db)
      const row = await known(key)
      if (!Object.hasOwn(DEFAULTS, key)) {
        await db.query('DELETE FROM email_templates WHERE key = $1', [key])
        return { key, deleted: true }
      }
      if (!row) return view(key, null)
      const { subject, body } = DEFAULTS[key]
      const { rows } = await db.query(
        'UPDATE email_templates SET subject = $2, body = $3, updated_at = now() WHERE key = $1 RETURNING *', [key, subject, body])
      return view(key, rows[0])
    },
  }
}
