// src/components/shop/EtsyItemCard.jsx
console.log('EtsyItemCard component loaded')
import React from 'react'

const EtsyItemCard = ({ listing }) => {
  if (!listing) return null

  const { title, price, images, url, listing_id } = listing

  const imageUrl =
    images?.[0]?.url_fullxfull || 'https://placekitten.com/600/400'
  const formattedPrice = price?.amount
    ? `$${(price.amount / 100).toFixed(2)} ${price.currency_code}`
    : 'Price Unavailable'

  return (
    <div
      className="etsy-item-card"
      style={{
        border: '1px solid #ddd',
        borderRadius: '10px',
        padding: '1.25rem',
        margin: '1.25rem auto',
        maxWidth: '420px',
        textAlign: 'center',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
      }}
    >
      <img
        src={imageUrl}
        alt={title}
        style={{ maxWidth: '100%', borderRadius: '8px', marginBottom: '1rem' }}
      />
      <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>{title}</h2>
      <p style={{ marginBottom: '0.75rem' }}>{formattedPrice}</p>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: '#0066c0', textDecoration: 'none', fontWeight: 'bold' }}
      >
        View on Etsy
      </a>
    </div>
  )
}

export default EtsyItemCard
