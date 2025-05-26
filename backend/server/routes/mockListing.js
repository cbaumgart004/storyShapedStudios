// server/routes/mockListing.js
console.log('🛠️ Mock listing route loaded')

import express from 'express'
const router = express.Router()

router.get('/etsy/mock-listing', (req, res) => {
  res.json({
    listing_id: 123456789,
    title: 'Handmade Leather Journal',
    price: { amount: 3500, currency_code: 'USD' },
    images: [
      {
        url_fullxfull: 'https://placekitten.com/600/400',
      },
    ],
    url: 'https://www.etsy.com/listing/123456789/handmade-leather-journal',
  })
})

export default router
