// backend/server/utils/ebayTokenStorage.js

import fs from 'fs'
import path from 'path'

const EBAY_TOKEN_FILE = path.resolve('./ebay_token.json')

export function saveToken(token) {
  fs.writeFileSync(EBAY_TOKEN_FILE, JSON.stringify(token, null, 2))
  console.log('💾 eBay token saved.')
}

export function loadToken() {
  if (!fs.existsSync(EBAY_TOKEN_FILE)) {
    console.warn('⚠️ No saved eBay token found.')
    return null
  }

  const rawData = fs.readFileSync(EBAY_TOKEN_FILE)
  try {
    return JSON.parse(rawData)
  } catch (err) {
    console.error('⚠️ Failed to parse saved eBay token:', err)
    return null
  }
}
