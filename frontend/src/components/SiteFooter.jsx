// src/components/SiteFooter.jsx
// Shared footer (logo + socials). Render inside a .sss-home[data-mode] wrapper.

import React from 'react'

import logo from '/assets/StoryShapedStudiosLogo_GmailOptimized.png'
import etsyIcon from '@/assets/coming-soon/etsy.png'
import ebayIcon from '@/assets/coming-soon/ebay.png'
import facebookIcon from '@/assets/coming-soon/facebook.png'
import instagramIcon from '@/assets/coming-soon/instagram.png'

const socials = [
  { href: 'https://www.etsy.com/shop/storyshapedstudios/?etsrc=sdt', icon: etsyIcon, label: 'Etsy' },
  { href: 'https://www.ebay.com/str/storyshapedstudios', icon: ebayIcon, label: 'eBay' },
  { href: 'https://www.facebook.com/storyshapedstudios/', icon: facebookIcon, label: 'Facebook' },
  { href: 'https://www.instagram.com/storyshaped_studios/?hl=en', icon: instagramIcon, label: 'Instagram' },
]

export default function SiteFooter() {
  return (
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
  )
}
