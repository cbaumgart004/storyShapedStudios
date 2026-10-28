// server/utils/emailTemplates.js
// The studio's email wording, editable at /admin/emails. Each template is a
// subject and a plain-text body with {{placeholders}}; one never edited reads
// from DEFAULTS, and Reset deletes the edited copy so DEFAULTS shows again.
//
//   invoice  the email that carries the customer's link. Opened as a mailto:
//            by the Forms page (mailtoFor in frontend/src/pages/Admin/Forms.jsx),
//            so it goes from the studio's own mail app.
//   code     the 6-digit code that opens the link (utils/forms.js requestCode),
//            sent by the site through SES (utils/mail.js).
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

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS email_templates (
    key         TEXT PRIMARY KEY,
    subject     TEXT NOT NULL,
    body        TEXT NOT NULL,
    updated_by  TEXT,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
  )`

let ready = null
function ensureTable(db) {
  ready ??= db.query(SCHEMA).catch((err) => { ready = null; throw err })
  return ready
}
export function resetTemplateTableForTests() { ready = null }

const check = (key) => {
  if (!Object.hasOwn(DEFAULTS, key)) throw new TemplateError(404, 'No such email template.')
}
const view = (key, row) => {
  const { label, help, placeholders, subject, body } = DEFAULTS[key]
  return {
    key, label, help, placeholders,
    subject: row?.subject ?? subject, body: row?.body ?? body,
    edited: Boolean(row), updated_at: row?.updated_at ?? null,
    default: { subject, body },
  }
}

export function createTemplates(db) {
  return {
    async list() {
      await ensureTable(db)
      const { rows } = await db.query('SELECT * FROM email_templates')
      const byKey = Object.fromEntries(rows.map((r) => [r.key, r]))
      return Object.keys(DEFAULTS).map((k) => view(k, byKey[k]))
    },

    async get(key) {
      check(key)
      await ensureTable(db)
      const { rows } = await db.query('SELECT * FROM email_templates WHERE key = $1', [key])
      return view(key, rows[0])
    },

    async save(key, { subject, body } = {}, by) {
      check(key)
      subject = String(subject ?? '').trim()
      body = String(body ?? '').replace(/\r\n/g, '\n').trim()
      if (!subject || !body) throw new TemplateError(400, 'An email needs a subject and a body.')
      if (subject.length > 300 || body.length > 10_000) throw new TemplateError(400, 'That email is too long.')
      if (key === 'code' && !/\{\{\s*code\s*\}\}/.test(subject + body)) throw new TemplateError(400, 'The code email must include {{code}}.')
      if (key === 'invoice' && !/\{\{\s*link\s*\}\}/.test(body)) throw new TemplateError(400, 'The invoice email must include {{link}}.')
      await ensureTable(db)
      const { rows } = await db.query(
        `INSERT INTO email_templates (key, subject, body, updated_by) VALUES ($1, $2, $3, $4)
         ON CONFLICT (key) DO UPDATE SET subject = $2, body = $3, updated_by = $4, updated_at = now() RETURNING *`,
        [key, subject, body, by ?? null])
      return view(key, rows[0])
    },

    async reset(key) {
      check(key)
      await ensureTable(db)
      await db.query('DELETE FROM email_templates WHERE key = $1', [key])
      return view(key, null)
    },
  }
}
