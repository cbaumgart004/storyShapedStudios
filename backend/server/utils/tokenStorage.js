// utils/tokenStorage.js

import fs from 'fs'
import path from 'path'

const TOKEN_PATH = path.resolve('./etsy_token.json')

export function saveToken(tokenObject) {
  try {
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokenObject, null, 2))
    console.log('Access token saved.')
  } catch (err) {
    console.error('Failed to save token:', err)
  }
}

export function loadToken() {
  try {
    if (fs.existsSync(TOKEN_PATH)) {
      const data = fs.readFileSync(TOKEN_PATH)
      return JSON.parse(data)
    } else {
      console.warn('Token file does not exist.')
      return null
    }
  } catch (err) {
    console.error('Failed to load token:', err)
    return null
  }
}
