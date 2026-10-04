// src/components/SiteFooter.jsx
// Shared footer (logo + socials). Render inside a .sss-home[data-mode] wrapper.

import React from 'react'

import logo from '/assets/StoryShapedStudiosLogo_GmailOptimized.png'
import { socialsFrom } from '@/components/socials'
import { useSiteSettings, useSchema } from '@/lib/siteConsole'
import { Extras, SocialMark } from '@/components/Extras'
import { frameOf } from '@/components/Frame'

// `brand={false}` drops the logo + wordmark: Home already leads with the logo,
// and Whitney's notes ask for it gone there but kept on the other pages.
export default function SiteFooter({ brand = true }) {
  // Name and links from the console's Site header and footer, when there is one.
  const settings = useSiteSettings()
  const schema = useSchema()
  const siteName = settings?.siteName || 'StoryShaped Studios'
  // "© <year> <owner>. <notice>": both from the Site header and footer; an
  // owner blank there is the site's name, a notice blank there is left out.
  const owner = settings?.copyrightOwner || siteName
  const notice = settings ? settings.copyrightNotice : 'All rights reserved.'
  // An arranged region of Site header and footer (_layout_footer; components/Frame.jsx).
  const frame = frameOf(settings, 'footer')
  const { style: frameStyle, ...frameMarks } = frame.root
  return (
    <footer className="sss-footer" data-eotm-edit={`siteSettings:${settings?.docId ?? 'sitesettings'}`} data-eotm-label="Header and footer"
      data-eotm-frame-key="footer" {...frameMarks} style={frameStyle}>
      {brand && (
        <div className="footer-brand" {...frame.part('brand')}>
          <img className="mark" src={logo} alt="" />
          <span className="footer-wordmark">{siteName}</span>
        </div>
      )}
      <div className="footer-socials" {...frame.part('socials')}>
        {socialsFrom(settings).map((s) => (
          <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" data-eotm-field="socials" data-eotm-in={s.row?._id}>
            <SocialMark schema={schema} social={s} />
          </a>
        ))}
      </div>
      {/* Year is derived, not hardcoded, so the notice does not go stale
          (board #31). Whitney asked for this twice in the notes doc. */}
      <p className="footer-note" {...frame.part('copyright')}>
        &copy; {new Date().getFullYear()} {owner}.{notice ? ` ${notice}` : ''}
      </p>
      <Extras at="types.siteSettings" data={settings} className="extras footer-extras" frame={frame} />
    </footer>
  )
}
