// src/pages/Home.jsx
// Live home page for StoryShaped Studios.
// Signature: the UV (blacklight) toggle flips the whole page between
// daylight (pale vaseline glass) and blacklight (full uranium glow).

import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import '@/styles/Home.css'

import logo from '/assets/StoryShapedStudiosLogo_GmailOptimized.png'
import etsyIcon from '@/assets/coming-soon/etsy.png'
import ebayIcon from '@/assets/coming-soon/ebay.png'
import facebookIcon from '@/assets/coming-soon/facebook.png'
import instagramIcon from '@/assets/coming-soon/instagram.png'

// Pull the real product photography from the assets folder.
const photoImports = import.meta.glob('@/assets/coming-soon/PSX_*.jpg', {
  eager: true,
})
const photos = Object.entries(photoImports)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([, mod]) => mod.default)

const featured = [
  { name: 'The Marquise', tag: 'Uranium · Filigree' },
  { name: 'The Hexagon', tag: 'Faceted glass' },
  { name: 'The Drop', tag: 'Art Deco · c.1930s' },
]

const socials = [
  { href: 'https://www.etsy.com/shop/storyshapedstudios/?etsrc=sdt', icon: etsyIcon, label: 'Etsy' },
  { href: 'https://www.ebay.com/str/storyshapedstudios', icon: ebayIcon, label: 'eBay' },
  { href: 'https://www.facebook.com/storyshapedstudios/', icon: facebookIcon, label: 'Facebook' },
  { href: 'https://www.instagram.com/storyshaped_studios/?hl=en', icon: instagramIcon, label: 'Instagram' },
]

const Home = () => {
  const [mode, setMode] = useState('blacklight')
  const lit = mode === 'blacklight'
  const toggle = () => setMode(lit ? 'daylight' : 'blacklight')

  return (
    <div className="sss-home" data-mode={mode}>
      <header className="sss-nav">
        <Link to="/" className="sss-brand">
          <img src={logo} alt="StoryShaped Studios" />
          <span>StoryShaped Studios</span>
        </Link>

        <nav className="sss-navlinks">
          <Link to="/shop">Collection</Link>
          <a href="#glow">The Glow</a>
          <Link to="/about">Our Story</Link>
          <button
            type="button"
            className="uv-toggle"
            onClick={toggle}
            aria-pressed={lit}
            title="Toggle blacklight"
          >
            <span className="uv-label">{lit ? 'Blacklight' : 'Daylight'}</span>
            <span className="uv-switch" aria-hidden="true" />
          </button>
        </nav>
      </header>

      <main>
        {/* ---------------- HERO ---------------- */}
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">Antique Uranium Glass</p>
            <h1>
              Worn by day.
              <span className="lit">Alive by night.</span>
            </h1>
            <p className="hero-sub">
              Hand-set Art Deco filigree cradling genuine uranium glass — pale
              gold in the light, electric green the moment the blacklight hits.
            </p>
            <div className="hero-cta">
              <Link to="/shop" className="btn btn-primary">
                Enter the Collection
              </Link>
              <button type="button" className="btn btn-ghost" onClick={toggle}>
                {lit ? 'See it by day' : 'See it glow'}
              </button>
            </div>
          </div>

          <figure className="hero-piece deco-corners">
            <img src={photos[0]} alt="Uranium glass pendant from the collection" />
            <figcaption>From the archive</figcaption>
          </figure>
        </section>

        <div className="deco-divider" aria-hidden="true" />

        {/* ---------------- FEATURED ---------------- */}
        <section className="section">
          <div className="section-head">
            <p className="eyebrow">From the Collection</p>
            <h2>Pieces with a past</h2>
          </div>

          <div className="piece-grid">
            {featured.map((piece, i) => (
              <Link key={piece.name} to="/shop" className="piece-card deco-corners">
                <div className="frame">
                  <img
                    src={photos[(i + 1) % photos.length]}
                    alt={`${piece.name} — ${piece.tag}`}
                  />
                </div>
                <div className="piece-meta">
                  <h3>{piece.name}</h3>
                  <span>{piece.tag}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <div className="deco-divider" aria-hidden="true" />

        {/* ---------------- GLOW STORY ---------------- */}
        <section className="section" id="glow">
          <div className="glow-story">
            <figure className="story-img deco-corners">
              <img src={photos[photos.length - 1]} alt="Uranium glass beads glowing green" />
            </figure>
            <div className="story-copy">
              <p className="eyebrow">Why it glows</p>
              <h2>A trace of uranium, a century of light</h2>
              <p>
                Uranium glass carries a whisper of uranium oxide. Its most
                beloved form — <b>vaseline glass</b>, named for its soft, buttery
                daylight color — answers ultraviolet light with a green that looks
                lit from within. Every piece here is antique, hand-set, and
                unmistakably alive.
              </p>
              <button type="button" className="story-link" onClick={toggle}>
                {lit ? 'Return to daylight' : 'Flip the blacklight'}
                <span className="arrow" aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* ---------------- FOOTER ---------------- */}
      <footer className="sss-footer">
        <img className="mark" src={logo} alt="StoryShaped Studios" />
        <div className="footer-socials">
          {socials.map((s) => (
            <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer">
              <img src={s.icon} alt={s.label} />
            </a>
          ))}
        </div>
        <p className="footer-note">StoryShaped Studios · Crafted with love and light</p>
      </footer>
    </div>
  )
}

export default Home
