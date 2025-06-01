// backend/server/routes/ebayDummyListing.js
import express from 'express'
import axios from 'axios'
import { loadToken as loadEbayToken } from '../utils/ebayTokenStorage.js'

const router = express.Router()

const fallbackListing = {
  href: '/api/ebay/dummy-listing',
  total: 1,
  itemSummaries: [
    {
      itemId: 'dummy1234',
      title: 'Vintage Uranium Glass Bowl (Placeholder)',
      price: { value: '42.00', currency: 'USD' },
      itemWebUrl: 'https://example.com/fallback-listing',
      image: {
        imageUrl: 'https://via.placeholder.com/300x300?text=Uranium+Glass',
      },
      condition: 'Used',
      location: 'Springfield, USA',
      seller: { username: 'demo-seller' },
    },
  ],
}

router.get('/api/ebay/dummy-listing', async (req, res) => {
  const tokenData = loadEbayToken()
  const accessToken = tokenData?.access_token

  if (!accessToken) {
    console.warn('⚠️ No eBay token found, serving fallback listing.')
    return res.status(200).json(fallbackListing)
  }

  try {
    const response = await axios.get(
      'https://api.ebay.com/buy/browse/v1/item_summary/search?q=uranium%20glass',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-EBAY-C-ENDUSERCTX': 'contextualLocation=country=US',
        },
      }
    )
    res.json(response.data)
  } catch (err) {
    console.error(
      '❌ eBay listing fetch failed, serving fallback:',
      err.response?.data || err.message
    )
    res.status(200).json(fallbackListing)
  }
})

export default router
