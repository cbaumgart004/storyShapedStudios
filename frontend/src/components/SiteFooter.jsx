// src/components/SiteFooter.jsx
// Shared footer (logo + socials). Render inside a .sss-home[data-mode] wrapper.

import React from 'react'

import logo from '/assets/StoryShapedStudiosLogo_GmailOptimized.png'
import { socials } from '@/components/socials'

// `brand={false}` drops the logo + wordmark: Home already leads with the logo,
// and Whitney's notes ask for it gone there but kept on the other pages.
export default function SiteFooter({ brand = true }) {
  return (
    <footer className="sss-footer">
      {brand && (
        <div className="footer-brand">
          <img className="mark" src={logo} alt="" />
          <span className="footer-wordmark">StoryShaped Studios</span>
        </div>
      )}
      <div className="footer-socials">
        {socials.map((s) => (
          <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer">
            <img src={s.icon} alt={s.label} />
          </a>
        ))}
      </div>
      {/* Year is derived, not hardcoded, so the notice does not go stale
          (board #31). Whitney asked for this twice in the notes doc. */}
      <p className="footer-note">
        &copy; {new Date().getFullYear()} StoryShaped Studios
      </p>
    </footer>
  )
}
