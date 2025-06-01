import express from 'express'
const router = express.Router()

router.get('/listings', (req, res) => {
  res.json({ message: '🧾 Listings route is working!' })
})

export default router
