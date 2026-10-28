// Runs utils/customers.js against PGlite: real Postgres, in process, fresh per test.
//   npm test

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PGlite } from '@electric-sql/pglite'
import { createCustomers, resetCustomerTableForTests } from './customers.js'

function fresh() {
  resetCustomerTableForTests()
  const pg = new PGlite()
  return createCustomers({
    async query(text, params) {
      const r = params ? await pg.query(text, params) : await pg.exec(text).then((rs) => rs.at(-1))
      return { rows: r.rows, rowCount: r.affectedRows ?? r.rows.length }
    },
  })
}

test('a customer saves once; the same name in other case is refused', async () => {
  const c = fresh()
  const a = await c.create({ name: ' Acme ', email: 'a@acme.test', bill: '1 Main St' }, 'owner')
  assert.deepEqual([a.name, a.email, a.company, a.created_by], ['Acme', 'a@acme.test', null, 'owner'])
  await assert.rejects(c.create({ name: 'ACME' }), { status: 409 })
  await c.create({ name: 'Beta' })
  assert.deepEqual((await c.list()).map((r) => r.name), ['Acme', 'Beta'])
})

test('a name is required', async () => {
  await assert.rejects(fresh().create({ name: '  ' }), { status: 400 })
})
