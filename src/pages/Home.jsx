//src/pages/Home.jsx

import React, { useState } from 'react'
import '@/styles/ComingSoon.css'
import banner from '@/assets/coming-soon/Banner.jpg'
import border from '@/assets/coming-soon/Border.png'

const galleryImports = import.meta.glob('@/assets/coming-soon/*.jpg', {
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

      <div
        className="border-wrapper"
        style={{ backgroundImage: `url(${border})` }}
      >
        <div className="tagline-box">
          <div className="tagline-content">
            <h1 className="glow-title">Coming Soon</h1>
            <p className="tagline">
              Welcome to StoryShaped Studios, your source for Uranium Glass.
              This website is currently under construction. In the meantime,
              feel free to visit any of our online shops.
            </p>
          </div>
        </div>
      </div>

      <div className="social-links">
        <a
          href="https://www.etsy.com/shop/storyshapedstudios/?etsrc=sdt"
          target="_blank"
          rel="noopener noreferrer"
        >
          Etsy
        </a>

        <a
          href="https://www.ebay.com/str/storyshapedstudios"
          target="_blank"
          rel="noopener noreferrer"
        >
          eBay
        </a>
        <a
          href="https://www.facebook.com/storyshapedstudios/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Facebook
        </a>
        <a
          href="https://www.instagram.com/storyshaped_studios/?hl=en"
          target="_blank"
          rel="noopener noreferrer"
        >
          Instagram
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
