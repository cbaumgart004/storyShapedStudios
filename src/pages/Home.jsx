//src/pages/Home.jsx

import React, { useState } from 'react'
import '@/styles/ComingSoon.css'
import banner from '@/assets/coming-soon/Banner.jpg'

const galleryImports = import.meta.glob('@/assets/coming-soon/*.{jpg,jpeg}', {
  eager: true,
})
const galleryImages = Object.values(galleryImports).map((mod) => mod.default)

const Home = () => {
  const [selectedImage, setSelectedImage] = useState(null)

  const handleLightboxClick = (e) => {
    if (e.target.classList.contains('lightbox')) {
      setSelectedImage(null)
    }
  }

  return (
    <div className="coming-soon-container">
      <img
        className="banner-image"
        src={banner}
        alt="StoryShaped Studios Banner"
      />

      <div className="tagline-box">
        <div className="tagline-content">
          <h1 className="glow-title">Coming Soon</h1>
          <p className="tagline">
            Welcome to StoryShaped Studios, your source for Uranium Glass. This
            website is currently under construction. In the meantime, feel free
            to visit any of our online shops.
          </p>
        </div>
      </div>

      <div className="social-links">
        <a href="#" target="_blank" rel="noopener noreferrer">
          Etsy
        </a>
        <a href="#" target="_blank" rel="noopener noreferrer">
          eBay
        </a>
        <a href="#" target="_blank" rel="noopener noreferrer">
          Facebook
        </a>
      </div>

      <div className="gallery">
        {galleryImages.map((img, idx) => (
          <img
            key={idx}
            src={img}
            alt={`gallery-${idx}`}
            className="gallery-thumb"
            onClick={() => setSelectedImage(img)}
          />
        ))}
      </div>

      {selectedImage && (
        <div className="lightbox" onClick={handleLightboxClick}>
          <div className="lightbox-content">
            <button
              className="lightbox-close"
              onClick={() => setSelectedImage(null)}
            >
              ×
            </button>
            <img src={selectedImage} alt="Selected" />
          </div>
        </div>
      )}
    </div>
  )
}

export default Home
