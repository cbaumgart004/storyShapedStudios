//src/pages/Home.jsx

import React, { useState } from 'react'
import '@/styles/ComingSoon.css'
import banner from '@/assets/coming-soon/Banner.jpg'
import border from '@/assets/coming-soon/Border.png'
import facebookIcon from '@/assets/coming-soon/facebook.png'
import etsyIcon from '@/assets/coming-soon/etsy.png'
import ebayIcon from '@/assets/coming-soon/ebay.png'
import instagramIcon from '@/assets/coming-soon/instagram.png'

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
          <img src={etsyIcon} alt="Etsy" className="social-icon" />
        </a>

        <a
          href="https://www.ebay.com/str/storyshapedstudios"
          target="_blank"
          rel="noopener noreferrer"
        >
          <img src={ebayIcon} alt="eBay" className="social-icon" />
        </a>
        <a
          href="https://www.facebook.com/storyshapedstudios/"
          target="_blank"
          rel="noopener noreferrer"
        >
          <img src={facebookIcon} alt="Facebook" className="social-icon" />
        </a>
        <a
          href="https://www.instagram.com/storyshaped_studios/?hl=en"
          target="_blank"
          rel="noopener noreferrer"
        >
          <img src={instagramIcon} alt="Instagram" className="social-icon" />
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
