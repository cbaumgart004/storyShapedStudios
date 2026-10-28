// Runs utils/emailTemplates.js against PGlite.
//   npm test

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PGlite } from '@electric-sql/pglite'
import { createTemplates, resetTemplateTableForTests, fill, DEFAULTS } from './emailTemplates.js'

function fresh() {
  resetTemplateTableForTests()
  const pg = new PGlite()
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
