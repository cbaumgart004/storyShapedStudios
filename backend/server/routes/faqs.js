import express from 'express'
const router = express.Router()

router.get('/faqs', (req, res) => {
  res.json({ message: '❓ FAQs route is working!' })
})

export default router
