// src/components/SiteFooter.jsx
// Shared footer (logo + socials). Render inside a .sss-home[data-mode] wrapper.

import React from 'react'

import logo from '/assets/StoryShapedStudiosLogo_GmailOptimized.png'
import { socials } from '@/components/socials'

export default function SiteFooter() {
  return (
    <footer className="sss-footer">
      <div className="footer-brand">
        <img className="mark" src={logo} alt="" />
        <span className="footer-wordmark">StoryShaped Studios</span>
      </div>
      <div className="footer-socials">
        {socials.map((s) => (
          <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer">
            <img src={s.icon} alt={s.label} />
          </a>
        ))}
      </div>
      <p className="footer-note">StoryShaped Studios · Crafted with love and light</p>
    </footer>
  )
}
