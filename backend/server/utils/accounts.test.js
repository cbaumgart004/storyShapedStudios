// Runs utils/accounts.js against PGlite: real Postgres, in process, fresh per test.
//   npm test

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PGlite } from '@electric-sql/pglite'
import { createAccounts, resetAccountTablesForTests } from './accounts.js'

function fresh() {
  resetAccountTablesForTests()
  const pg = new PGlite()
  return createAccounts({
    async query(text, params) {
      const r = await pg.query(text, params)
      return { rows: r.rows, rowCount: r.affectedRows ?? r.rows.length }
    },
  })
}

test('register, sign in, look up and sign out', async () => {
  const a = fresh()
  const r = await a.register({ email: 'Ann@Example.com', name: 'Ann Lee', password: 'correct horse' })
  assert.equal(r.account.name, 'Ann Lee')
  assert.deepEqual(await a.session(r.token), r.account)
  await assert.rejects(a.register({ email: 'ann@example.com', name: 'X', password: '12345678' }), { status: 409 })
  await assert.rejects(a.login({ email: 'ann@example.com', password: 'wrong pass' }), { status: 401 })
  const l = await a.login({ email: 'ANN@example.com', password: 'correct horse' })
  assert.equal(l.account.id, r.account.id)
  await a.logout(l.token)
  assert.equal(await a.session(l.token), null)
  assert.equal(await a.session('nope'), null)
})

test('register checks email, name and password length', async () => {
  const a = fresh()
  await assert.rejects(a.register({ email: 'bad', name: 'A', password: '12345678' }), { status: 400 })
  await assert.rejects(a.register({ email: 'a@b.co', name: '', password: '12345678' }), { status: 400 })
  await assert.rejects(a.register({ email: 'a@b.co', name: 'A', password: 'short' }), { status: 400 })
})
