// src/components/UvPhoto.jsx
// A photo that exists in two real states — the same piece shot in daylight and
// under blacklight — and crossfades between them.
//
// This is deliberately NOT the CSS-filter treatment the rest of the page uses.
// A filter fakes the glow by tinting one photograph; here both photographs are
// genuine, so no filter is applied to either. Whitney asked for this on the
// hero (board #13) and as a general rule wherever a piece has both shots (#18).
//
// Two ways to drive it:
//   * the site-wide UV toggle in the nav, which every UvPhoto follows, and
//   * a per-image switch, so one piece can be flipped on its own without
//     changing the rest of the page (#19).
// Flipping the site-wide toggle clears any per-image override, so the page
// never gets stuck in a half-and-half state the visitor can't reset.
//
// `.is-lit` also re-scopes the mode's colour tokens onto this element (see the
// palette block in Home.css), so the caption switch is dressed in this photo's
// state — the same colours the nav toggle shows in that mode — rather than the
// page's, which is what a per-image flip in a daylight page needs.
//
// Both images render stacked and the blacklight one fades in on top, which
// avoids a flash of missing image on the first toggle and preloads both states.
//
// A piece with only one shot (a Listing with no blacklight photo, say) still
// toggles: the one photograph stays, and the other state is faked with a CSS
// filter (Home.css, `.uv-photo.is-single`): a daylight shot takes a blacklight
// tint and glow, a blacklight shot a softened daylight look.
//
// `daylight` / `blacklight` are asset paths WITHOUT the width suffix, matching
// what `scripts/resize_asset.py --preset hero` writes:
//   /assets/hero-necklace-daylight  ->  -900.jpg and -1600.jpg

import React, { useEffect, useState } from 'react'
import { useUvMode } from '@/context/UvMode'

export default function UvPhoto({
  daylight,
  blacklight,
  alt,
  widths = [900, 1600],
  sizes = '100vw',
  className = '',
  loading = 'eager',
}) {
  const { lit } = useUvMode()
  // null = follow the site-wide toggle; true/false = this image is overridden.
  const [override, setOverride] = useState(null)
  useEffect(() => setOverride(null), [lit])

  const showLit = override === null ? lit : override
  const single = !daylight || !blacklight
  const from = daylight ? 'day' : 'night'
  // No widths: the paths are whole image URLs (a console upload), not bases.
  const srcSet = (base) => (widths.length ? widths.map((w) => `${base}-${w}.jpg ${w}w`).join(', ') : undefined)
  const fallback = (base) => (widths.length ? `${base}-${widths[widths.length - 1]}.jpg` : base)

  return (
    <span className={`uv-photo${showLit ? ' is-lit' : ''}${single ? ` is-single is-from-${from}` : ''}${className ? ` ${className}` : ''}`}>
      {/* The two stacked shots get their own box so the switch below can sit in
          normal flow. The lit image is absolutely positioned against THIS
          element, not the whole component, which is what keeps it covering the
          photo alone rather than the switch too (board #34). */}
      <span className="uv-photo-frame">
        <img
          src={fallback(daylight || blacklight)}
          srcSet={srcSet(daylight || blacklight)}
          sizes={sizes}
          alt={alt}
          loading={loading}
        />
        {/* Decorative duplicate: same subject, so it carries no alt text of its
            own — screen readers get the description once, from the image above. */}
        {!single && <img
          className="uv-photo-lit"
          src={fallback(blacklight)}
          srcSet={srcSet(blacklight)}
          sizes={sizes}
          alt=""
          aria-hidden="true"
          loading={loading}
        />}
      </span>

      <button
        type="button"
        className="uv-photo-toggle"
        onClick={() => setOverride(!showLit)}
        aria-pressed={showLit}
        title="Toggle blacklight for this photo"
      >
        <span>{showLit ? 'Blacklight' : 'Daylight'}</span>
        {/* Its own switch class, not the nav's .uv-switch, so the site-wide
            `[data-mode]` rules can't drag the knob out of sync with this image. */}
        <span className="uv-mini-switch" aria-hidden="true" />
      </button>
    </span>
  )
}
