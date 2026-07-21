// src/components/SiteHeader.jsx
// Shared top nav + UV toggle, used on every page so branding and the
// daylight/blacklight switch stay identical across the site. Relies on the
// .sss-home[data-mode] design tokens from Home.css, so render it inside a
// <div className="sss-home" data-mode={mode}> wrapper.

import React from 'react'
import { Link } from 'react-router-dom'
import { useUvMode } from '@/context/UvMode'

import logo from '/assets/StoryShapedStudiosLogo_GmailOptimized.png'

export default function SiteHeader() {
  const { lit, toggle } = useUvMode()

  return (
    <header className="sss-nav">
      <Link to="/" className="sss-brand">
        <img src={logo} alt="StoryShaped Studios" />
        <span>StoryShaped Studios</span>
      </Link>

      <nav className="sss-navlinks">
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
  )
}
