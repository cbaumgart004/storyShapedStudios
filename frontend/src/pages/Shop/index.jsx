// frontend/src/pages/Shop/index.jsx

import React, { useEffect, useState } from 'react'
import EtsyItemCard from '@/components/shop/EtsyItemCard'
import EbayItemCard from '@/components/shop/EbayItemCard' // You'll create this next
import { API_BASE } from '@/lib/api'

const Shop = () => {
  console.log('🌿 Shop page loaded')
  const [etsyListing, setEtsyListing] = useState(null)
  const [ebayListings, setEbayListings] = useState([])

  useEffect(() => {
    // Fetch Etsy mock listing
    fetch(`${API_BASE}/api/etsy/mock-listing`)
      .then((res) => res.json())
      .then((data) => setEtsyListing(data))
      .catch((err) => console.error('Failed to fetch Etsy listing:', err))

    // Fetch eBay dummy listing
    fetch(`${API_BASE}/api/ebay/dummy-listing`)
      .then((res) => res.json())
      .then((data) => setEbayListings(data.itemSummaries || []))
      .catch((err) => console.error('Failed to fetch eBay listings:', err))
  }, [])

  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ textAlign: 'center' }}>Welcome to the Shop</h1>

      <section>
        <h2>Etsy</h2>
        <EtsyItemCard listing={etsyListing} />
      </section>

      <section>
        <h2>eBay</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
          {ebayListings.map((item) => (
            <EbayItemCard key={item.itemId} item={item} />
          ))}
        </div>
      </section>
    </div>
  )
}

export default Shop
