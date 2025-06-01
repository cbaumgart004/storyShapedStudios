// backend/server/server.js (Unified OAuth Server)

import express from 'express'
import dotenv from 'dotenv'
import axios from 'axios'
import cors from 'cors'
import path from 'path'
import open from 'open'
import { fileURLToPath } from 'url'
import {
  saveToken as saveEtsyToken,
  loadToken as loadEtsyToken,
} from './utils/etsyTokenStorage.js'
import {
  saveToken as saveEbayToken,
  loadToken as loadEbayToken,
} from './utils/ebayTokenStorage.js'
import ebayDummyListing from './routes/ebayDummyListing.js'

// Path setup for future flexibility
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

console.log('🚀 Unified OAuth server booting up...')

const app = express()
const PORT = process.env.PORT || 3000

app.use(express.json())
app.use(cors())

// Externalized eBay dummy listing route
app.use(ebayDummyListing)

const CLIENT_ID_ETSY = process.env.ETSY_CLIENT_ID
const CLIENT_SECRET_ETSY = process.env.ETSY_CLIENT_SECRET
const REDIRECT_URI_ETSY = process.env.ETSY_REDIRECT_URI

const CLIENT_ID_EBAY = process.env.EBAY_CLIENT_ID
const CLIENT_SECRET_EBAY = process.env.EBAY_CLIENT_SECRET
const REDIRECT_URI_EBAY = process.env.EBAY_REDIRECT_URI
const EBAY_ENV = process.env.EBAY_ENVIRONMENT || 'sandbox'
const EBAY_AUTH_URL =
  EBAY_ENV === 'sandbox'
    ? 'https://auth.sandbox.ebay.com/oauth2/authorize'
    : 'https://auth.ebay.com/oauth2/authorize'
const EBAY_TOKEN_URL =
  EBAY_ENV === 'sandbox'
    ? 'https://api.sandbox.ebay.com/identity/v1/oauth2/token'
    : 'https://api.ebay.com/identity/v1/oauth2/token'
const EBAY_VALIDATE_URL =
  EBAY_ENV === 'sandbox'
    ? 'https://api.sandbox.ebay.com/ws/api.dll'
    : 'https://api.ebay.com/ws/api.dll'

app.get('/', (req, res) => {
  res.json({
    message: 'Unified OAuth Server is running',
    available_routes: {
      etsy_auth: '/auth/etsy',
      etsy_validate: '/api/etsy/validate-token',
      ebay_auth: '/auth/ebay',
      ebay_validate: '/api/ebay/validate-token',
      ebay_dummy: '/api/ebay/dummy-listing',
    },
  })
})

// ---------------------
// Etsy OAuth Routes
// ---------------------
app.get('/auth/etsy', (req, res) => {
  console.log('🌀 Initiating Etsy auth flow...')
  const authUrl = `https://www.etsy.com/oauth/connect?response_type=code&redirect_uri=${encodeURIComponent(
    REDIRECT_URI_ETSY
  )}&scope=email_r%20profile_r%20listings_r&client_id=${CLIENT_ID_ETSY}`
  res.redirect(authUrl)
})

app.get('/oauth/etsy-callback', async (req, res) => {
  const { code, error: authError, error_description } = req.query

  if (authError || !code) {
    console.error(
      '❌ Etsy OAuth failed:',
      authError || 'Missing authorization code.'
    )
    return res.status(400).send(
      `Etsy OAuth failed: ${authError || 'No authorization code received.'}$
        {error_description ? ' - ' + error_description : ''}`
    )
  }

  try {
    const response = await axios.post(
      'https://api.etsy.com/v3/public/oauth/token',
      {
        grant_type: 'authorization_code',
        client_id: CLIENT_ID_ETSY,
        redirect_uri: REDIRECT_URI_ETSY,
        code,
        code_verifier: '',
      },
      {
        auth: {
          username: CLIENT_ID_ETSY,
          password: CLIENT_SECRET_ETSY,
        },
      }
    )
    const tokenObject = response.data
    saveEtsyToken(tokenObject)
    console.log('✅ Etsy access token:', tokenObject.access_token)
    res.send('Etsy authorization successful. You may close this window.')
  } catch (error) {
    console.error(
      '❌ Etsy token exchange failed:',
      error.response?.data || error.message
    )
    res.status(500).send('Etsy OAuth callback error.')
  }
})

app.get('/api/etsy/validate-token', async (req, res) => {
  const tokenData = loadEtsyToken()
  const accessToken = tokenData?.access_token
  if (!accessToken) {
    return res.status(400).json({ error: 'Missing Etsy access token.' })
  }
  try {
    const response = await axios.get(
      'https://api.etsy.com/v3/application/openapi-ping',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )
    res.json({ message: '✅ Etsy token is valid.', data: response.data })
  } catch (error) {
    console.error(
      '❌ Etsy token validation failed:',
      error.response?.data || error.message
    )
    res.status(401).json({ error: 'Invalid or expired Etsy token.' })
  }
})

// ---------------------
// eBay OAuth Routes
// ---------------------
app.get('/auth/ebay', (req, res) => {
  const authUrl = `${EBAY_AUTH_URL}?client_id=${CLIENT_ID_EBAY}&response_type=code&redirect_uri=${encodeURIComponent(
    REDIRECT_URI_EBAY
  )}&scope=https://api.ebay.com/oauth/api_scope`
  res.redirect(authUrl)
})

app.get('/oauth/ebay-callback', async (req, res) => {
  const { code } = req.query
  try {
    const response = await axios.post(
      EBAY_TOKEN_URL,
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI_EBAY,
      }),
      {
        auth: {
          username: CLIENT_ID_EBAY,
          password: CLIENT_SECRET_EBAY,
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    )

    const tokenObject = response.data
    saveEbayToken(tokenObject)
    console.log('✅ eBay access token:', tokenObject.access_token)
    res.send('eBay authorization successful. You may close this window.')
  } catch (error) {
    console.error(
      '❌ eBay token exchange failed:',
      error.response?.data || error.message
    )
    res.status(500).send('eBay OAuth callback error.')
  }
})

app.get('/api/ebay/validate-token', async (req, res) => {
  const tokenData = loadEbayToken()
  const accessToken = tokenData?.access_token

  if (!accessToken) {
    return res.status(400).json({ error: 'Missing eBay access token.' })
  }

  try {
    const response = await axios.get(EBAY_VALIDATE_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    res.json({ message: '✅ eBay token is valid.', data: response.data })
  } catch (error) {
    const errData = error.response?.data || error.message
    console.error('❌ eBay token validation failed:', errData)
    res
      .status(401)
      .json({ error: 'Invalid or expired token.', details: errData })
  }
})

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found.' })
})

app.listen(PORT, () => {
  console.log(`🌐 Unified OAuth server running on port ${PORT}`)

  const urls = [
    `http://localhost:${PORT}/auth/etsy`,
    `http://localhost:${PORT}/api/etsy/validate-token`,
    `http://localhost:${PORT}/auth/ebay`,
    `http://localhost:${PORT}/api/ebay/validate-token`,
    `http://localhost:${PORT}/api/ebay/dummy-listing`,
  ]

  console.log(`🔐 Etsy auth URL:           ${urls[0]}`)
  console.log(`🔍 Etsy validate URL:       ${urls[1]}`)
  console.log(`🔐 eBay auth URL:           ${urls[2]}`)
  console.log(`🔍 eBay validate URL:       ${urls[3]}`)
  console.log(`🧪 Dummy listing endpoint:  ${urls[4]}`)

  const etsyTokenData = loadEtsyToken()
  const ebayTokenData = loadEbayToken()

  if (!etsyTokenData || !etsyTokenData.access_token) {
    console.warn('⚠️ No saved Etsy token found.')
  } else {
    console.log('✅ Etsy token found in storage.')
  }

  if (!ebayTokenData || !ebayTokenData.access_token) {
    console.warn('⚠️ No saved eBay token found.')
  } else {
    console.log('✅ eBay token found in storage.')
  }

  urls.forEach((url) =>
    open(url).catch(() => console.warn(`⚠️ Could not open ${url}`))
  )
})
