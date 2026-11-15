import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createSquare } from './square.js'

test('Square is off without a token and asks nothing', async () => {
  let asked = false
  const s = createSquare({ env: {}, fetchImpl: async () => { asked = true } })
  assert.equal(s.configured(), false)
  await assert.rejects(s.check(), /not set up/)
  assert.equal(asked, false)
})

test('Square reads locations and picks the set one, or the first active', async () => {
  const locations = [{ id: 'A', name: 'Closed shop', status: 'INACTIVE' }, { id: 'B', name: 'Studio', status: 'ACTIVE' }]
  const fetchImpl = async (url, opts) => {
    assert.match(url, /squareupsandbox\.com\/v2\/locations$/)
    assert.match(opts.headers.authorization, /^Bearer /)
    return { ok: true, json: async () => ({ locations }) }
  }
  assert.equal((await createSquare({ env: { SQUARE_ACCESS_TOKEN: 't' }, fetchImpl }).check()).location.id, 'B')
  const wrong = await createSquare({ env: { SQUARE_ACCESS_TOKEN: 't', SQUARE_LOCATION_ID: 'Z' }, fetchImpl }).check()
  assert.equal(wrong.location, null)
  assert.match(wrong.problem, /SQUARE_LOCATION_ID/)
})
