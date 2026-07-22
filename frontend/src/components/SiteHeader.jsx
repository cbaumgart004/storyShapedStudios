// src/components/SiteHeader.jsx
// Shared top nav + UV toggle + social strip, used on every page so branding and
// the daylight/blacklight switch stay identical across the site. Relies on the
// .sss-home[data-mode] design tokens from Home.css, so render it inside a
// <div className="sss-home" data-mode={mode}> wrapper.
//
// Pass `featured` on the home page to render the big, bold "Connect or Shop"
// social band; every other page gets the compact strip.

import React from 'react'
import { Link } from 'react-router-dom'
import { useUvMode } from '@/context/UvMode'
import { socials } from '@/components/socials'

import logo from '/assets/StoryShapedStudiosLogo_GmailOptimized.png'

export default function SiteHeader({ featured = false }) {
  const { lit, toggle } = useUvMode()

  return (
    <>
      <header className="sss-nav">
        <Link to="/" className="sss-brand">
          <img src={logo} alt="StoryShaped Studios" />
          <span>StoryShaped Studios</span>
        </Link>

        <nav className="sss-navlinks">
          <Link to="/">Home</Link>
          <Link to="/shop">Collection</Link>
          <Link to="/library">Library</Link>
          <Link to="/glossary">Glossary</Link>
          <Link to="/meet-the-artist">Meet the Artist</Link>
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

      <section
        className={`sss-social-bar${featured ? ' is-featured' : ''}`}
        aria-label="Connect or shop the collection"
      >
        {featured && (
          <p className="sss-social-head">Shop the Collection</p>
        )}
        <div className="sss-social-icons">
          {socials.map((s) => (
            <a
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={s.label}
              title={s.label}
            >
              <img src={s.icon} alt={s.label} />
            </a>
          ))}
        </div>
      </section>
    </>
  )
}
