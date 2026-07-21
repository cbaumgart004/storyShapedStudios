import express from 'express'
const router = express.Router()

router.get('/', (req, res) => {
  res.json({ message: '💰 Sales route is working!' })
})

export default router
