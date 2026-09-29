import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequireEditor } from './requireEditor.js'

// A fake console: 'good' is a member, 'outsider' a login without the site.
function harness({ down = false } = {}) {
  let clock = 0
  let calls = 0
  const fetchFn = async (url, { headers }) => {
    calls++
    if (down) throw new Error('ECONNREFUSED')
    const token = headers.authorization.slice(7)
    if (token === 'good') return { ok: true, status: 200, json: async () => ({ id: 'u1', role: 'owner' }) }
    return { ok: false, status: token === 'outsider' ? 403 : 401 }
  }
  const guard = createRequireEditor({ api: 'https://console.test/api/sites/x', fetchFn, now: () => clock })
  const run = async (token) => {
    const req = { headers: token ? { authorization: `Bearer ${token}` } : {} }
    const out = { status: 200 }
    const res = { status(c) { out.status = c; return this }, json(b) { out.body = b; return this } }
    await guard(req, res, () => { out.editor = req.editor })
    return out
  }
  return { run, tick: (ms) => { clock += ms }, calls: () => calls }
}

test('lets a member through and remembers them for a minute', async () => {
  const h = harness()
  assert.deepEqual((await h.run('good')).editor, { id: 'u1', role: 'owner' })
  await h.run('good')
  assert.equal(h.calls(), 1)
  h.tick(61_000)
  await h.run('good')
  assert.equal(h.calls(), 2)
})

test('refuses no token, an expired one, and a login without the site', async () => {
  const h = harness()
  assert.equal((await h.run(null)).status, 401)
  assert.equal((await h.run('stale')).status, 401)
  assert.equal((await h.run('outsider')).status, 403)
})

test('answers 503, not a pass, when the console cannot be reached', async () => {
  assert.equal((await harness({ down: true }).run('good')).status, 503)
})
