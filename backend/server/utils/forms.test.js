// Runs utils/forms.js against PGlite: real Postgres, in process, fresh per test.
//   npm test

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PGlite } from '@electric-sql/pglite'
import { createForms, resetFormTableForTests } from './forms.js'
import { createTemplates, resetTemplateTableForTests } from './emailTemplates.js'

function poolFor(pg) {
  return {
    async query(text, params) {
      const r = await pg.query(text, params)
      return { rows: r.rows, rowCount: r.affectedRows ?? r.rows.length }
    },
  }
}

// Mail goes to `sent` instead of SES.
let sent = []
function fresh(db = poolFor(new PGlite())) {
  resetFormTableForTests()
  resetTemplateTableForTests()
  sent = []
  return createForms(db, { mailer: { async send(m) { sent.push(m) } }, templates: createTemplates(db) })
}
const lastCode = () => sent.at(-1).text.match(/\b(\d{6})\b/)[1]
// Asks for a code and enters it, as the customer's page does.
async function open(f, token) {
  await f.requestCode(token)
  return f.verify(token, lastCode())
}

const SO = 'sales_orders'
const form = (no = '') => ({ c: { name: 'Acme', email: 'ann@acme.test' }, i: { no, date: '2026-10-27' }, lines: [{ sku: 'TBD', qty: 350, retail: 35 }] })

test('a draft saves without a number; generating numbers it from 4122 and locks it', async () => {
  const f = fresh()
  const d = await f.createDraft(SO, form())
  assert.deepEqual([d.status, d.number, d.file], ['draft', null, '20261027_draft_Acme'])
  await f.saveDraft(SO, d.id, { ...form(), c: { name: 'Acme Co' } })
  const g = await f.generate(SO, d.id, { ...form(), c: { name: 'Acme Co' } })
  assert.deepEqual([g.status, g.number, g.file, g.data.i.no], ['generated', '4122', '20261027_4122_Acme-Co', '4122'])
  await assert.rejects(f.saveDraft(SO, d.id, form()), { status: 409 })
  await assert.rejects(f.generate(SO, d.id, form()), { status: 409 })
  await assert.rejects(f.removeDraft(SO, d.id), { status: 409 })
})

test('numbers count per folder; a typed free number is kept, a taken one moves on', async () => {
  const f = fresh()
  const nums = []
  for (const typed of ['', '4122', '9000', '']) {
    const d = await f.createDraft(SO, form(typed))
    nums.push((await f.generate(SO, d.id, form(typed))).number)
  }
  assert.deepEqual(nums, ['4122', '4123', '9000', '9001'])
  const w = await f.createDraft('waivers', form())
  assert.equal((await f.generate('waivers', w.id, form())).number, '1001')
  assert.deepEqual(await f.folders(), { sales_orders: 4, waivers: 1 })
})

test('an entry is only reached through its own folder', async () => {
  const f = fresh()
  const d = await f.createDraft(SO, form())
  await assert.rejects(f.get('waivers', d.id), { status: 404 })
  await assert.rejects(f.list('../etc'), { status: 400 })
})

test('sent and paid move separately, only once generated; drafts can be deleted', async () => {
  const f = fresh()
  const d = await f.createDraft(SO, form())
  await assert.rejects(f.setStatus(SO, d.id, { sent: true }), { status: 409 })
  await f.generate(SO, d.id, form())
  await f.setStatus(SO, d.id, { sent: true })
  const after = await f.setStatus(SO, d.id, { paid: true })
  assert.deepEqual([after.sent, after.paid], [true, true])
  assert.ok(after.sent_at && after.paid_at)
  assert.equal(String((await f.setStatus(SO, d.id, { sent: true })).sent_at), String(after.sent_at)) // kept, not re-stamped
  const unpaid = await f.setStatus(SO, d.id, { paid: false })
  assert.deepEqual([unpaid.paid, unpaid.paid_at, Boolean(unpaid.sent_at)], [false, null, true])

  const gone = await f.createDraft(SO, form())
  await f.removeDraft(SO, gone.id)
  assert.deepEqual((await f.list(SO)).map((r) => r.id), [d.id])
})

test('an entry with no fields is refused; a missing one is 404', async () => {
  const f = fresh()
  await assert.rejects(f.createDraft(SO, null), { status: 400 })
  await assert.rejects(f.get(SO, 99), { status: 404 })
})

test('next is the number Generate would give', async () => {
  const f = fresh()
  assert.equal(await f.next(SO), '4122')
  const d = await f.createDraft(SO, form())
  await f.generate(SO, d.id, form())
  assert.equal(await f.next(SO), '4123')
})

test('a generated entry gets a share token; the link needs a code, never shows a draft', async () => {
  const f = fresh()
  const d = await f.createDraft(SO, form())
  assert.equal(d.share, null)
  await assert.rejects(f.share(SO, d.id), { status: 409 })
  const g = await f.generate(SO, d.id, form())
  assert.match(g.share, /^[A-Za-z0-9_-]{24}$/)
  assert.equal((await f.share(SO, d.id)).share, g.share)
  await assert.rejects(f.shared(g.share), (e) => e.status === 401 && e.extra.verify && e.extra.sentTo === 'a•••@acme.test')
  await assert.rejects(f.shared(g.share, 'made-up'), { status: 401 })
  const v = await open(f, g.share)
  assert.equal(sent[0].to, 'ann@acme.test')
  assert.equal(sent[0].subject, 'Your One Time Code')
  assert.match(sent[0].text, /\d{6}/)
  const s = await f.shared(g.share, v.session)
  assert.deepEqual([s.number, s.folder, s.data.c.name, 'sent' in s], ['4122', SO, 'Acme', false])
  await assert.rejects(f.shared('nope'), { status: 404 })
})

test('five wrong codes spend it; a used code works once', async () => {
  const f = fresh()
  const d = await f.createDraft(SO, form())
  const g = await f.generate(SO, d.id, form())
  await f.requestCode(g.share)
  const code = lastCode()
  const wrong = code === '000000' ? '111111' : '000000'
  for (let i = 0; i < 5; i++) await assert.rejects(f.verify(g.share, wrong), { status: 400 })
  await assert.rejects(f.verify(g.share, code), { status: 429 })
  const v = await open(f, g.share)
  assert.ok(v.session)
  await assert.rejects(f.verify(g.share, lastCode()), { status: 400 }) // spent
})

test('no email on the invoice, no code; codes are capped an hour', async () => {
  const f = fresh()
  const bare = { ...form(), c: { name: 'Acme' } }
  const d = await f.createDraft(SO, bare)
  const g = await f.generate(SO, d.id, bare)
  await assert.rejects(f.requestCode(g.share), { status: 409 })
  const d2 = await f.createDraft(SO, form())
  const g2 = await f.generate(SO, d2.id, form())
  for (let i = 0; i < 5; i++) await f.requestCode(g2.share)
  await assert.rejects(f.requestCode(g2.share), { status: 429 })
})

test('the code email uses the edited template', async () => {
  const db = poolFor(new PGlite())
  const f = fresh(db)
  await createTemplates(db).save('code', { subject: 'Code {{code}}', body: 'Hello {{name}}, {{code}} for #{{number}}' })
  const d = await f.createDraft(SO, form())
  const g = await f.generate(SO, d.id, form())
  await f.requestCode(g.share)
  assert.match(sent.at(-1).text, /^Hello Acme, \d{6} for #4122$/)
})

test('getting past the code marks it viewed once', async () => {
  const f = fresh()
  const d = await f.createDraft(SO, form())
  const g = await f.generate(SO, d.id, form())
  assert.equal(g.viewed_at, null)
  await open(f, g.share)
  const first = (await f.get(SO, d.id)).viewed_at
  assert.ok(first)
  await open(f, g.share)
  assert.equal(String((await f.get(SO, d.id)).viewed_at), String(first))
})

test('a generated entry takes a new email; the next code goes there', async () => {
  const f = fresh()
  const d = await f.createDraft(SO, form())
  const g = await f.generate(SO, d.id, form())
  const v = await open(f, g.share)
  await assert.rejects(f.setEmail(SO, d.id, 'nope'), { status: 400 })
  const e = await f.setEmail(SO, d.id, ' new@example.com ')
  assert.equal(e.data.c.email, 'new@example.com')
  assert.equal(e.share, g.share)
  await assert.rejects(f.shared(g.share, v.session), { status: 401 })
  assert.equal((await f.requestCode(g.share)).sentTo, 'n•••@example.com')
  const draft = await f.createDraft(SO, form())
  await assert.rejects(f.setEmail(SO, draft.id, 'a@b.co'), { status: 409 })
})

test('a signed order is revised as v2: the old one is archived and its link opens v2', async () => {
  const f = fresh()
  const d = await f.createDraft(SO, form())
  const g = await f.generate(SO, d.id, form())
  await assert.rejects(f.revise(SO, g.id), { status: 409 }) // not signed yet
  const v = await open(f, g.share)
  await f.sign(g.share, { method: 'type', name: 'Acme', typed: 'Acme', consent: true }, { session: v.session })
  await assert.rejects(f.setEmail(SO, g.id, 'b@acme.test'), { status: 409 })
  const r = await f.revise(SO, g.id)
  assert.deepEqual([r.status, r.version, r.supersedes_id, r.data.i.no, r.data.i.v, r.file], ['draft', 2, g.id, '4122', 2, '20261027_4122v2_Acme'])
  assert.equal((await f.revise(SO, g.id)).id, r.id) // one open revision
  const changed = { ...r.data, lines: [{ sku: 'TBD', qty: 400, retail: 35 }] }
  await f.saveDraft(SO, r.id, changed)
  const g2 = await f.generate(SO, r.id, { ...changed, i: { ...changed.i, no: '9999' } })
  assert.deepEqual([g2.number, g2.version, g2.file], ['4122', 2, '20261027_4122v2_Acme'])
  const old = await f.get(SO, g.id)
  assert.ok(old.superseded_at)
  assert.equal(old.superseded_by, g2.id)
  assert.equal(old.signature.name, 'Acme') // the signed version is kept as signed
  await assert.rejects(f.setStatus(SO, g.id, { paid: true }), { status: 409 })
  await assert.rejects(f.revise(SO, g.id), { status: 409 })
  // The old link now opens v2, which needs a new code and is unsigned.
  await assert.rejects(f.shared(g.share, v.session), { status: 401 })
  const v2 = await open(f, g.share)
  assert.deepEqual([v2.number, v2.data.lines[0].qty, v2.signature], ['4122', 400, null])
  const next = await f.createDraft(SO, form())
  assert.equal((await f.generate(SO, next.id, form())).number, '4123')
})

test('a shared link opens with its key, no code, until the key expires', async () => {
  const pg = new PGlite()
  const f = fresh(poolFor(pg))
  const d = await f.createDraft(SO, form())
  await assert.rejects(f.issueKey(SO, d.id), { status: 409 })
  const g = await f.generate(SO, d.id, form())
  const k = await f.issueKey(SO, g.id)
  assert.ok(k.key && k.key_expires_at && k.share === g.share)
  const opened = await f.openKey(g.share, k.key)
  assert.ok(opened.session)
  assert.equal(opened.number, g.number)
  assert.ok((await f.shared(g.share, opened.session)).data)
  assert.equal(sent.length, 0) // no code email
  await assert.rejects(f.openKey(g.share, 'wrong'), (err) => err.status === 401 && err.extra.verify)
  await assert.rejects(f.openKey('other', k.key), { status: 404 })
  // Expired: the code again.
  await pg.query(`UPDATE share_keys SET expires_at = now() - interval '1 minute'`)
  await assert.rejects(f.openKey(g.share, k.key), (err) => err.status === 401 && err.extra.expired)
  // A new email ends every key.
  const k2 = await f.issueKey(SO, g.id)
  await f.setEmail(SO, g.id, 'new@acme.test')
  await assert.rejects(f.openKey(g.share, k2.key), { status: 401 })
  // A new link ends them too.
  const k3 = await f.issueKey(SO, g.id)
  await f.relink(SO, g.id)
  await assert.rejects(f.openKey(g.share, k3.key), { status: 404 })
})

test('a new link stops the old one and its sessions', async () => {
  const f = fresh()
  const d = await f.createDraft(SO, form())
  const g = await f.generate(SO, d.id, form())
  const v = await open(f, g.share)
  const n = await f.relink(SO, d.id)
  assert.notEqual(n.share, g.share)
  await assert.rejects(f.shared(g.share, v.session), { status: 404 })
  await assert.rejects(f.shared(n.share, v.session), { status: 401 })
})

test('the customer signs once through the link; typed must match the name', async () => {
  const f = fresh()
  const d = await f.createDraft(SO, form())
  const g = await f.generate(SO, d.id, form())
  await assert.rejects(f.sign(g.share, { method: 'type', name: 'Ann Lee', typed: 'Ann Lee', consent: true }), { status: 401 }) // no session
  const { session } = await open(f, g.share)
  await assert.rejects(f.sign(g.share, { method: 'type', name: 'Ann Lee', typed: 'Ann Lee' }, { session }), { status: 400 }) // no consent
  await assert.rejects(f.sign(g.share, { method: 'type', name: 'Ann Lee', typed: 'Ann', consent: true }, { session }), { status: 400 })
  await assert.rejects(f.sign(g.share, { method: 'draw', name: 'Ann Lee', image: 'nope', consent: true }, { session }), { status: 400 })
  const s = await f.sign(g.share, { method: 'type', name: 'Ann Lee', typed: 'ann  lee', consent: true }, { ip: '203.0.113.9', ua: 'test', session })
  assert.deepEqual([s.signature.name, s.signature.typed, 'ip' in s.signature, s.signature.hash.length, s.signature.verifiedEmail],
    ['Ann Lee', 'ann lee', false, 64, 'ann@acme.test'])
  const admin = await f.get(SO, d.id)
  assert.equal(admin.signature.ip, '203.0.113.9')
  assert.ok(admin.signed_at)
  await assert.rejects(f.sign(g.share, { method: 'type', name: 'Ann Lee', typed: 'Ann Lee', consent: true }, { session }), { status: 409 })
  const png = 'data:image/png;base64,iVBORw0KGgo='
  const d2 = await f.createDraft(SO, form())
  const g2 = await f.generate(SO, d2.id, form())
  const o2 = await open(f, g2.share)
  assert.equal((await f.sign(g2.share, { method: 'draw', name: 'Bo', image: png, consent: true }, { session: o2.session })).signature.image, png)
})
