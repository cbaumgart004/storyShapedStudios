// src/pages/Shop/index.jsx

import React, { useEffect, useState } from 'react'
import EtsyItemCard from '@/components/shop/EtsyItemCard'

const Shop = () => {
  console.log('🌿 Shop page loaded')
  const [listing, setListing] = useState(null)

  useEffect(() => {
    fetch('http://localhost:3000/api/etsy/mock-listing')
      .then((res) => res.json())
      .then((data) => setListing(data))
      .catch((err) => console.error('Failed to fetch listing:', err))
  }, [])

  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ textAlign: 'center' }}>Welcome to the Shop</h1>
      <EtsyItemCard listing={listing} />
    </div>
  )
}

export default Shop
