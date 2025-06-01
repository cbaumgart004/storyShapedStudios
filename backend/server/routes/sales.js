import express from 'express'
const router = express.Router()

router.get('/sales', (req, res) => {
  res.json({ message: '💰 Sales route is working!' })
})

export default router
