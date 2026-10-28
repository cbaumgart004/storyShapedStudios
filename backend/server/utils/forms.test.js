// Runs utils/forms.js against PGlite: real Postgres, in process, fresh per test.
//   npm test

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PGlite } from '@electric-sql/pglite'
import { createForms, resetFormTableForTests } from './forms.js'

function poolFor(pg) {
  return {
    async query(text, params) {
      const r = await pg.query(text, params)
      return { rows: r.rows, rowCount: r.affectedRows ?? r.rows.length }
    },
  }
}

function fresh() {
  resetFormTableForTests()
  return createForms(poolFor(new PGlite()))
}

const SO = 'sales_orders'
const form = (no = '') => ({ c: { name: 'Acme' }, i: { no, date: '2026-10-27' }, lines: [{ sku: 'TBD', qty: 350, retail: 35 }] })

test('a draft saves without a number; generating numbers it from 4122 and locks it', async () => {
  const f = fresh()
  const d = await f.createDraft(SO, form())
  assert.deepEqual([d.status, d.number, d.file], ['draft', null, '20261027_Acme_draft'])
  await f.saveDraft(SO, d.id, { ...form(), c: { name: 'Acme Co' } })
  const g = await f.generate(SO, d.id, { ...form(), c: { name: 'Acme Co' } })
  assert.deepEqual([g.status, g.number, g.file, g.data.i.no], ['generated', '4122', '20261027_Acme-Co_4122', '4122'])
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

  const gone = await f.createDraft(SO, form())
  await f.removeDraft(SO, gone.id)
  assert.deepEqual((await f.list(SO)).map((r) => r.id), [d.id])
})

test('an entry with no fields is refused; a missing one is 404', async () => {
  const f = fresh()
  await assert.rejects(f.createDraft(SO, null), { status: 400 })
  await assert.rejects(f.get(SO, 99), { status: 404 })
})
