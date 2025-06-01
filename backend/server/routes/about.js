import express from 'express'
const router = express.Router()

router.get('/about', (req, res) => {
  res.json({ message: '📖 About route is working!' })
})

export default router
