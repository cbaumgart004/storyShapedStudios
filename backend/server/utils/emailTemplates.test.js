// Runs utils/emailTemplates.js against PGlite.
//   npm test

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PGlite } from '@electric-sql/pglite'
import { createTemplates, resetTemplateTableForTests, fill, DEFAULTS } from './emailTemplates.js'

function fresh(pg = new PGlite()) {
  resetTemplateTableForTests()
  return createTemplates({ async query(text, params) { const r = await pg.query(text, params); return { rows: r.rows } } })
}

test('fill swaps known placeholders and leaves a typo showing', () => {
  assert.equal(fill('Hi {{name}}, {{ code }} {{nope}}', { name: 'Ann', code: 12 }), 'Hi Ann, 12 {{nope}}')
})

test('defaults until edited; reset brings them back', async () => {
  const t = fresh()
  const [inv] = await t.list()
  assert.deepEqual([inv.key, inv.edited, inv.subject], ['invoice', false, DEFAULTS.invoice.subject])
  const saved = await t.save('invoice', { subject: 'Invoice {{number}}', body: 'See {{link}}' }, 'owner')
  assert.deepEqual([saved.edited, saved.body], [true, 'See {{link}}'])
  assert.equal((await t.get('invoice')).subject, 'Invoice {{number}}')
  assert.equal((await t.reset('invoice')).edited, false)
  assert.equal((await t.get('invoice')).body, DEFAULTS.invoice.body)
})

test('the code email must carry the code, the invoice email its link', async () => {
  const t = fresh()
  await assert.rejects(t.save('code', { subject: 'Hi', body: 'No code here' }), { status: 400 })
  await assert.rejects(t.save('invoice', { subject: 'Hi', body: 'No link' }), { status: 400 })
  await assert.rejects(t.save('invoice', { subject: '', body: '{{link}}' }), { status: 400 })
  await assert.rejects(t.get('nope'), { status: 404 })
})

test('an added email takes forms from the others; a form goes out with one email', async () => {
  const t = fresh()
  await assert.rejects(t.add({ label: ' ' }), { status: 400 })
  const w = await t.add({ label: 'Wholesale' }, 'owner')
  assert.equal(w.body, DEFAULTS.invoice.body)
  assert.equal((await t.forForm('sales_orders')).key, 'invoice')
  await t.save('invoice', { subject: 'S', body: '{{link}}', forms: ['sales_orders', 'waivers'] })
  assert.equal((await t.forForm('waivers')).key, 'invoice')
  await t.save(w.key, { subject: 'W', body: 'Go {{link}}', forms: ['sales_orders'] })
  assert.equal((await t.forForm('sales_orders')).key, w.key)
  assert.deepEqual((await t.get('invoice')).forms, ['waivers'])
  assert.equal((await t.list()).length, 3)
  await assert.rejects(t.save(w.key, { subject: 'W', body: 'no link' }), { status: 400 })
  assert.equal((await t.reset('invoice')).edited, false)
  assert.deepEqual((await t.get('invoice')).forms, ['waivers'])
  assert.deepEqual(await t.reset(w.key), { key: w.key, deleted: true })
  assert.equal((await t.forForm('sales_orders')).key, 'invoice')
  await assert.rejects(t.get(w.key), { status: 404 })
})

test('a saved email from before link keys gets the new sentence and loses its deposit lines', async () => {
  const pg = new PGlite()
  await pg.query('CREATE TABLE email_templates (key TEXT PRIMARY KEY, subject TEXT NOT NULL, body TEXT NOT NULL, updated_by TEXT, updated_at TIMESTAMPTZ NOT NULL DEFAULT now())')
  await pg.query(`INSERT INTO email_templates (key, subject, body) VALUES ('invoice', 'Hi', $1)`,
    ['See {{link}}\nWhen you open it we will email you a 6-digit code, so only you can see it.\nDeposit: {{deposit}}\nDue {{ deposit_due }}\nBalance: {{balance}}'])
  const t = fresh(pg)
  assert.equal((await t.get('invoice')).body,
    'See {{link}}\nThe link opens until {{expires}}. After that, opening it emails you a 6-digit code, so only you can see it.\nBalance: {{balance}}')
})
