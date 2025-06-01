import React from 'react'

const EbayItemCard = ({ item }) => {
  if (!item) return null

  return (
    <div
      style={{
        border: '1px solid #ccc',
        borderRadius: '8px',
        padding: '1rem',
        width: '250px',
      }}
    >
      <img
        src={item.image?.imageUrl}
        alt={item.title}
        style={{ width: '100%', borderRadius: '6px' }}
      />
      <h3>{item.title}</h3>
      <p>
        <strong>Price:</strong> {item.price?.value} {item.price?.currency}
      </p>
      <p>
        <strong>Condition:</strong> {item.condition}
      </p>
      <a href={item.itemWebUrl} target="_blank" rel="noopener noreferrer">
        View on eBay
      </a>
    </div>
  )
}

export default EbayItemCard
