// eBay's account deletion endpoint: the challenge answer and the notice ack.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'crypto'
import express from 'express'
import { challengeResponse, ebayAccountDeletion } from './ebayAccountDeletion.js'

const env = {
  EBAY_DELETION_VERIFICATION_TOKEN: 'test_token_0123456789_abcdefghijklmnop',
  EBAY_DELETION_ENDPOINT: 'https://example.test/api/ebay/account-deletion',
}

async function serve(e) {
  const app = express()
  app.use(express.json())
  app.use(ebayAccountDeletion({ env: e }))
  const server = await new Promise((resolve) => { const s = app.listen(0, () => resolve(s)) })
  return { base: `http://127.0.0.1:${server.address().port}/api/ebay/account-deletion`, close: () => server.close() }
}

test('the challenge answer is SHA-256 of code, token and endpoint, in that order', () => {
  const want = crypto.createHash('sha256').update('abc' + env.EBAY_DELETION_VERIFICATION_TOKEN + env.EBAY_DELETION_ENDPOINT).digest('hex')
  assert.equal(challengeResponse('abc', env.EBAY_DELETION_VERIFICATION_TOKEN, env.EBAY_DELETION_ENDPOINT), want)
})

test('GET answers the challenge as JSON; POST acknowledges a notice', async () => {
  const s = await serve(env)
  try {
    const r = await fetch(`${s.base}?challenge_code=abc`)
    assert.equal(r.status, 200)
    assert.match(r.headers.get('content-type'), /^application\/json/)
    assert.deepEqual(await r.json(), { challengeResponse: challengeResponse('abc', env.EBAY_DELETION_VERIFICATION_TOKEN, env.EBAY_DELETION_ENDPOINT) })

    const p = await fetch(s.base, { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ metadata: { topic: 'MARKETPLACE_ACCOUNT_DELETION' }, notification: { notificationId: 'n1', data: { username: 'someone', userId: 'u1' } } }) })
    assert.equal(p.status, 204)
  } finally { s.close() }
})

test('unconfigured, the challenge is refused rather than answered wrongly', async () => {
  const s = await serve({})
  try { assert.equal((await fetch(`${s.base}?challenge_code=abc`)).status, 503) } finally { s.close() }
})
