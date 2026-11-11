// backend/server/routes/ebayAccountDeletion.js
// eBay's Marketplace Account Deletion notifications, which a Production
// keyset needs before it is enabled. eBay first proves the endpoint with a GET
// carrying ?challenge_code=; the answer is the SHA-256 hex of the challenge
// code, the verification token and the endpoint URL, in that order, as
// {"challengeResponse": ...} with content-type application/json. Then each
// deleted eBay account arrives as a POST, to acknowledge with a 2xx.
//
// No eBay user identity is stored here: marketplace_sales keeps order, line
// and SKU ids only. So a notice has nothing to erase, and only its id is logged
// (never the username or user id it names). Add the erasure here if a table
// ever keeps a buyer's identity.
//
// Settings, by name: EBAY_DELETION_VERIFICATION_TOKEN (32 to 80 of A-Z a-z
// 0-9 _ -), EBAY_DELETION_ENDPOINT (the URL exactly as entered in eBay's
// developer portal, since it is part of the hash).

import express from 'express'
import crypto from 'crypto'

export function challengeResponse(challengeCode, verificationToken, endpoint) {
  return crypto.createHash('sha256').update(challengeCode).update(verificationToken).update(endpoint).digest('hex')
}

export function ebayAccountDeletion({ env = process.env } = {}) {
  const router = express.Router()
  const path = '/api/ebay/account-deletion'

  router.get(path, (req, res) => {
    const code = req.query.challenge_code
    const token = env.EBAY_DELETION_VERIFICATION_TOKEN
    const endpoint = env.EBAY_DELETION_ENDPOINT
    if (!code) return res.status(400).json({ error: 'challenge_code is required.' })
    if (!token || !endpoint) {
      console.warn('[ebay] account deletion challenge received, but EBAY_DELETION_VERIFICATION_TOKEN or EBAY_DELETION_ENDPOINT is not set')
      return res.status(503).json({ error: 'Not configured.' })
    }
    res.status(200).type('application/json').send(JSON.stringify({ challengeResponse: challengeResponse(String(code), token, endpoint) }))
  })

  router.post(path, (req, res) => {
    const id = req.body?.notification?.notificationId ?? 'unknown'
    const topic = req.body?.metadata?.topic ?? 'unknown'
    console.log(`[ebay] account deletion notice ${id} (${topic}): no eBay user data is stored, nothing to erase`)
    res.status(204).end()
  })

  return router
}

export default ebayAccountDeletion()
