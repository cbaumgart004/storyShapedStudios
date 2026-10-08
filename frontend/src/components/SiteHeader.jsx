// src/components/SiteHeader.jsx
// Shared top nav + UV toggle + social strip, used on every page so branding and
// the daylight/blacklight switch stay identical across the site. Relies on the
// .sss-home[data-mode] design tokens from Home.css, so render it inside a
// <div className="sss-home" data-mode={mode}> wrapper.
//
// Shape follows the reference site Whitney picked (satomikawakita.com): the
// site title alone on the top line, then one row of links. The neon logo
// lockup no longer appears in the bar at all. On home it runs full size in the
// hero, so the wordmark is dropped there too (board #39); elsewhere the
// wordmark carries the branding.
//
// The link matching the current page is dropped from the row, so the nav never
// offers you the page you are already on.
//
// The social band under the nav carries the social links and, after a rule,
// the utility icons (moved out of the nav bar per the 2026-08-04 notes). Pass
// `featured` on the home page for the big band; every other page gets the
// compact strip. The band is Facebook + Instagram only; the footer keeps the
// full list with Etsy/eBay.

import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useUvMode } from '@/context/UvMode'
import { socialsFrom } from '@/components/socials'
import { utilityIcons } from '@/components/navIcons'
import { useOwner, useCustomerView, openEditor, useSiteSettings, useMenu, useSchema } from '@/lib/siteConsole'
import { SocialMark, lookFor } from '@/components/Extras'
import { frameOf } from '@/components/Frame'

// Order matters on a phone: the row is a 3-up grid with the UV toggle as its
// last cell. One link is always filtered out (the page you are on), so four
// links + the toggle leave a short second row, which is harmless.
//
// Shop is hidden for Go-Live (CURRENT_WORK Track E, E1): the page is an empty
// scaffold and selling is not part of the launch. The route still exists.
const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/library', label: 'Library' },
  { to: '/glossary', label: 'Glossary' },
  // No /images route exists yet, so this renders inert rather than as a dead
  // link. Give it a `to` and drop `soon` once the gallery page lands.
  { to: '/images', label: 'Images', soon: true },
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
  // Sign in is the owner's (the console confirms the role); hidden from
  // everyone else until customer accounts exist.
  // Customer view hides it, so the owner sees the header a visitor gets.
  const customer = useCustomerView()
  const owner = useOwner() && !customer
  // Name, menu and links from the console's Site header and footer, when there is one.
  const settings = useSiteSettings()
  const schema = useSchema()
  const menu = useMenu()
  const navLinks = menu ? menu.links : settings?.navLinks?.length
    ? settings.navLinks.filter((l) => l.label && l.url).map((l) => ({ to: l.url, label: l.label, soon: l.soon }))
    : NAV_LINKS
  const siteName = settings?.siteName || 'StoryShaped Studios'
  const edit = { 'data-eotm-edit': `siteSettings:${settings?.docId ?? 'sitesettings'}`, 'data-eotm-label': 'Header and footer' }
  // The bar and the band are two arranged regions of Site header and footer
  // (_layout_header, _layout_band; components/Frame.jsx).
  const bar = frameOf(settings, 'header')
  const band = frameOf(settings, 'band')
  const marksOf = (frame, key) => {
    const { style, ...rest } = frame.root
    return { ...rest, ...(style ? { style } : {}), 'data-eotm-frame-key': key }
  }

  // Hide the current page's own link. Library article URLs (/library/:slug)
  // count as being on Library, hence the prefix check rather than equality.
  const links = navLinks.filter(
    (l) => !(l.to === pathname || (l.to !== '/' && pathname.startsWith(`${l.to}/`)))
  )
  // Every item sits in its own .sss-navitem cell. The pipe between items is
  // that cell's right border, so it survives wrapping into rows and never
  // strands a divider at the end of a line — a <span> pipe in the flow would.
  // On home, a phone hides Shop so the toggle takes its cell and the grid stays
  // two rows; the hero carries its own Shop button (Home.css, max-width 760px).
  const shopOnHome = (l) => pathname === '/' && l.to === '/shop'
  const renderLink = (l) => (
    <span key={l.label} className={`sss-navitem${shopOnHome(l) ? ' sss-navitem-home-shop' : ''}`} style={lookFor(schema, 'types.menu.items', l.row)}>
      {l.soon || !l.to ? (
        <span className="sss-navlink-soon" aria-disabled="true" title="Coming soon">
          {l.label}
        </span>
      ) : (
        <Link to={l.to} className={l.draft ? 'is-draft' : undefined} title={l.draft ? 'Draft: only you see this link until the page is published' : undefined}>{l.label}</Link>
      )}
    </span>
  )

  return (
    <>
      <header className="sss-nav" {...edit} {...marksOf(bar, 'header')}>
        {pathname !== '/' && (
          <Link to="/" className="sss-wordmark" data-eotm-field="siteName" {...bar.part('wordmark')}>
            {siteName}
          </Link>
        )}

        <div className="sss-nav-bar" {...bar.part('menu')}>
          <nav className="sss-navlinks" aria-label="Primary"
            data-eotm-edit={menu ? `menu:${menu.docId}` : 'menu:menu'} data-eotm-label="Menu">
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
                <span className="uv-label">{lit ? settings?.blacklightLabel || 'Blacklight' : settings?.daylightLabel || 'Daylight'}</span>
                <span className="uv-switch" aria-hidden="true" />
              </button>
            </span>
          </nav>
        </div>
      </header>

      <section
        className={`sss-social-bar${featured ? ' is-featured' : ''}`}
        aria-label={`Connect with ${siteName}`}
        {...edit}
        {...marksOf(band, 'band')}
      >
        <div className="sss-social-icons" {...band.wrap}>
          {socialsFrom(settings, { band: true }).map((s) => (
            <a
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={s.label}
              title={s.label}
              data-eotm-field="socials"
              data-eotm-in={s.row?._id}
              {...band.part(`social:${s.row?._id ?? s.label}`)}
            >
              <SocialMark schema={schema} social={s} />
            </a>
          ))}

          {/* Placeholders: none of these features exist yet (search,
              accounts, the wishlist and the cart are all still to build,
              board #22). They are real buttons rather than links so nothing
              404s, and they announce themselves as unavailable. The rule
              goes with them. */}
          {/* Sign in shows to the owner on every build; the other three stay
              behind the flag. */}
          {(UTILITY_ICONS_VISIBLE || owner) && (
            <>
              <span className="sss-nav-sep" aria-hidden="true" />
              {utilityIcons.filter(({ label }) => (label === 'Sign in' ? owner : UTILITY_ICONS_VISIBLE)).map(({ label, Icon }) => label === 'Sign in' ? (
                // The owner's way into the editor (lib/siteConsole.js, openEditor).
                <button key={label} type="button" className="sss-nav-util is-live" aria-label="Edit the site" title="Edit the site" onClick={openEditor}>
                  <Icon />
                </button>
              ) : (
                <button
                  key={label}
                  type="button"
                  className="sss-nav-util"
                  aria-disabled="true"
                  aria-label={`${label}: coming soon`}
                  title={`${label}: coming soon`}
                  onClick={(e) => e.preventDefault()}
                >
                  <Icon />
                </button>
              ))}
            </>
          )}
        </div>
      </section>
    </>
  )
}
