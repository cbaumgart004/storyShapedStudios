// src/components/SiteHeader.jsx
// Shared top nav + UV toggle + social strip, used on every page so branding and
// the daylight/blacklight switch stay identical across the site. Relies on the
// .sss-home[data-mode] design tokens from Home.css, so render it inside a
// <div className="sss-home" data-mode={mode}> wrapper.
//
// Shape follows the reference site Whitney picked (satomikawakita.com): the
// site title alone on the top line, then one row of links with the utility
// icons pushed to the right. The neon logo lockup no longer appears in the bar
// at all — on home it runs full size in the hero, and elsewhere the wordmark
// carries the branding.
//
// The link matching the current page is dropped from the row, so the nav never
// offers you the page you are already on.
//
// Pass `featured` on the home page to render the big, bold "Connect With Us"
// social band; every other page gets the compact strip. The band is Facebook +
// Instagram only — the footer keeps the full list with Etsy/eBay.

import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useUvMode } from '@/context/UvMode'
import { connectSocials } from '@/components/socials'
import { utilityIcons } from '@/components/navIcons'

// Order matters on a phone: the row is a 3-up grid, so this list plus the UV
// toggle at the end reads Home | Glossary | Images / Shop | Meet the Artist |
// toggle. One link is always filtered out (the page you are on), so the six
// routed pages become five links + the toggle = two full rows of three. A page
// outside this list drops nothing and leaves a short third row — harmless.
const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/library', label: 'Library' },
  { to: '/glossary', label: 'Glossary' },
  // No /images route exists yet, so this renders inert rather than as a dead
  // link. Give it a `to` and drop `soon` once the gallery page lands.
  { to: '/images', label: 'Images', soon: true },
  { to: '/shop', label: 'Shop' },
  { to: '/meet-the-artist', label: 'Meet the Artist' },
]

// Preview-only, on purpose (board #9/#22). The four utility icons stay VISIBLE
// on the `home-page-layout` preview branch so Whitney sees the finished bar,
// but nothing behind them works yet — flip this to `false` in the commit that
// merges this branch to `main`, since main is the live site. Flip it back (or
// split it per icon) as #22 delivers search / sign in / wishlist / cart.
const UTILITY_ICONS_VISIBLE = true

export default function SiteHeader({ featured = false }) {
  const { lit, toggle } = useUvMode()
  const { pathname } = useLocation()

  // Hide the current page's own link. Library article URLs (/library/:slug)
  // count as being on Library, hence the prefix check rather than equality.
  const links = NAV_LINKS.filter(
    (l) => !(l.to === pathname || (l.to !== '/' && pathname.startsWith(`${l.to}/`)))
  )
  // Every item sits in its own .sss-navitem cell. The pipe between items is
  // that cell's right border, so it survives wrapping into rows and never
  // strands a divider at the end of a line — a <span> pipe in the flow would.
  const renderLink = (l) => (
    <span key={l.label} className="sss-navitem">
      {l.soon ? (
        <span className="sss-navlink-soon" aria-disabled="true" title="Coming soon">
          {l.label}
        </span>
      ) : (
        <Link to={l.to}>{l.label}</Link>
      )}
    </span>
  )

  return (
    <>
      <header className="sss-nav">
        <Link to="/" className="sss-wordmark">
          StoryShaped Studios
        </Link>

        <div className="sss-nav-bar">
          <nav className="sss-navlinks" aria-label="Primary">
            {links.map(renderLink)}

            {/* The toggle is the last cell of the link grid, so on a phone it
                closes out row two rather than starting a row of its own. On
                desktop a margin pushes it back to the right of the bar. */}
            <span className="sss-navitem sss-navitem-toggle">
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
            </span>
          </nav>

          <div className="sss-nav-utils">
            {/* Placeholders: the icons make the bar read finished, but none of
                these features exist yet — search, accounts, the wishlist and
                the cart are all still to build (board #22). They are real
                buttons rather than links so nothing 404s, and they announce
                themselves as unavailable. The divider goes with them. */}
            {UTILITY_ICONS_VISIBLE && (
              <>
                <span className="sss-nav-sep" aria-hidden="true" />
                {utilityIcons.map(({ label, Icon }) => (
                  <button
                    key={label}
                    type="button"
                    className="sss-nav-util"
                    aria-disabled="true"
                    aria-label={`${label} — coming soon`}
                    title={`${label} — coming soon`}
                    onClick={(e) => e.preventDefault()}
                  >
                    <Icon />
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      </header>

      <section
        className={`sss-social-bar${featured ? ' is-featured' : ''}`}
        aria-label="Connect with StoryShaped Studios"
      >
        {featured && (
          <p className="sss-social-head">Connect With Us</p>
        )}
        <div className="sss-social-icons">
          {connectSocials.map((s) => (
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
