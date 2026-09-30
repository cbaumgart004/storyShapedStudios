// src/components/SiteFooter.jsx
// Shared footer (logo + socials). Render inside a .sss-home[data-mode] wrapper.

import React from 'react'

import logo from '/assets/StoryShapedStudiosLogo_GmailOptimized.png'
import { socialsFrom } from '@/components/socials'
import { useSiteSettings } from '@/lib/siteConsole'

// `brand={false}` drops the logo + wordmark: Home already leads with the logo,
// and Whitney's notes ask for it gone there but kept on the other pages.
export default function SiteFooter({ brand = true }) {
  // Name and links from the console's Site header and footer, when there is one.
  const settings = useSiteSettings()
  const siteName = settings?.siteName || 'StoryShaped Studios'
  // "© <year> <owner>. <notice>": both from the Site header and footer; an
  // owner blank there is the site's name, a notice blank there is left out.
  const owner = settings?.copyrightOwner || siteName
  const notice = settings ? settings.copyrightNotice : 'All rights reserved.'
  return (
    <footer className="sss-footer" data-eotm-edit={`siteSettings:${settings?.docId ?? 'sitesettings'}`} data-eotm-label="Header and footer">
      {brand && (
        <div className="footer-brand">
          <img className="mark" src={logo} alt="" />
          <span className="footer-wordmark">{siteName}</span>
        </div>
      )}
      <div className="footer-socials">
        {socialsFrom(settings).map((s) => (
          <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer">
            <img src={s.icon} alt={s.label} />
          </a>
        ))}
      </div>
      {/* Year is derived, not hardcoded, so the notice does not go stale
          (board #31). Whitney asked for this twice in the notes doc. */}
      <p className="footer-note">
        &copy; {new Date().getFullYear()} {owner}.{notice ? ` ${notice}` : ''}
      </p>
    </footer>
  )
}
