import express from 'express'

import mockListing from './mockListing.js'
import listings from './listings.js'
import sales from './sales.js'
import about from './about.js'
import faqs from './faqs.js'
import libraryViews from './libraryViews.js'
import inventory from './inventory.js'
import forms from './forms.js'
import marketplace from './marketplace.js'

const router = express.Router()

router.use('/mock', mockListing)
router.use('/listings', listings)
router.use('/sales', sales)
router.use('/about', about)
router.use('/faqs', faqs)
router.use('/library/views', libraryViews)
router.use('/inventory', inventory)
router.use('/forms', forms)
router.use('/marketplace', marketplace)

export default router
