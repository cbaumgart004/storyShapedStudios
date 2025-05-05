// etsy_oauth_server.js

import express from 'express'
import dotenv from 'dotenv'
import axios from 'axios'
import cors from 'cors'

console.log('🚀 Etsy OAuth server booting up...')

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

app.use(express.json())
app.use(cors())

import mockListing from './routes/mockListing.js'
app.use('/api', mockListing)

const CLIENT_ID = process.env.ETSY_CLIENT_ID
const CLIENT_SECRET = process.env.ETSY_CLIENT_SECRET
const REDIRECT_URI = process.env.ETSY_REDIRECT_URI

app.get('/', (req, res) => {
  res.send('Server is running')
})

// 1. Redirect to Etsy's consent screen
app.get('/auth/etsy', (req, res) => {
  const scope = 'listings_r listings_w' // Modify scopes as needed
  const authUrl = `https://www.etsy.com/oauth/connect?response_type=code&redirect_uri=${encodeURIComponent(
    REDIRECT_URI
  )}&scope=${scope}&client_id=${CLIENT_ID}`
  res.redirect(authUrl)
})

// 2. Handle the OAuth callback
app.get('/oauth/callback', async (req, res) => {
  const { code } = req.query
  try {
    const response = await axios.post(
      'https://api.etsy.com/v3/public/oauth/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: CLIENT_ID,
        redirect_uri: REDIRECT_URI,
        code,
        code_verifier: '', // Optional: use PKCE if required
      }),
      {
        auth: {
          username: CLIENT_ID,
          password: CLIENT_SECRET,
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    )

    const accessToken = response.data.access_token
    // TODO: Store accessToken securely
    console.log('Etsy access token:', accessToken)
    res.send('Authorization successful. You may close this window.')
  } catch (error) {
    console.error(
      'Token exchange failed:',
      error.response?.data || error.message
    )
    res.status(500).send('OAuth callback error.')
  }
})

app.listen(PORT, () => {
  console.log(`Etsy OAuth server running on port ${PORT}`)
})
