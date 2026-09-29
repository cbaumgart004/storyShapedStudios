// src/components/SiteTheme.jsx
// Applies the owner's Theme from the Edge of the Map console (its `theme`
// type): heading and body fonts, and per mode the background, accent, text,
// quiet text, glow colour and glow strength. Rendered once in App; draws
// nothing itself. It appends one <style> to <head>, after the site's own CSS,
// whose selectors outrank Home.css's palette blocks by one `:root`, so a blank
// field leaves the site's own value in place. Every rule here is one class or
// attribute more specific than the Home.css rule it replaces. While the owner edits, the draft
// applies live.

import { useEffect, useState } from 'react'
import { fetchPublished, useLiveDocuments } from '@/lib/siteConsole'

const NONE = []

// Google Fonts for any family the site does not bundle (Poiret One is bundled).
const FALLBACK = { heading: 'sans-serif', body: 'sans-serif' }
const SERIF = new Set(['Cinzel', 'Marcellus', 'Italiana', 'Playfair Display', 'Cormorant Garamond', 'EB Garamond'])
const family = (name, role) => `'${name}', ${SERIF.has(name) ? 'serif' : FALLBACK[role]}`

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ')
const px = (n) => `${Math.round(n * 10) / 10}px`
const a = (n) => Math.min(1, Math.round(n * 1000) / 1000)

// One mode's tokens. The glow set is Home.css's blacklight set with the colour
// and strength (1 = today's blacklight) as inputs. As in Home.css the glow is
// the accent unless a glow colour is given; with no accent, glow or strength
// set it is left alone, so daylight keeps its near-flat look.
function tokens(m = {}, { defaultGlow, defaultStrength, wash }) {
  const out = []
  if (m.background) out.push(`--void: ${m.background};`)
  if (m.accent) out.push(`--accent: ${m.accent};`)
  if (m.text) out.push(`--bone: ${m.text};`)
  if (m.muted) out.push(`--muted: ${m.muted};`)
  let background = null
  if (m.glow || m.accent || m.glowStrength != null) {
    const g = rgb(m.glow || m.accent || defaultGlow)
    const k = (m.glowStrength ?? defaultStrength) / 100
    out.push(
      `--line: rgba(${g}, 0.35);`,
      `--glow-1: 0 0 ${px(5 * k)} rgba(${g}, ${a(0.7 * k)});`,
      `--glow-strong: 0 0 ${px(3 * k)} rgba(${g}, ${a(k)}), 0 0 ${px(9 * k)} rgba(${g}, ${a(k)}), 0 0 ${px(22 * k)} rgba(${g}, ${a(0.45 * k)}), 0 0 ${px(44 * k)} rgba(${g}, ${a(0.2 * k)});`,
      `--frame-glow: 0 0 ${px(10 * k)} rgba(${g}, ${a(0.5 * k)}), inset 0 0 ${px(12 * k)} rgba(${g}, ${a(0.18 * k)});`,
    )
    background = `radial-gradient(120% 90% at 50% -10%, rgba(${g}, ${a(wash * k)}), transparent 55%), var(--void)`
  }
  return { vars: out.join(' '), background }
}

export function themeCss(t = {}) {
  const rules = []
  const fonts = []
  if (t.headingFont) fonts.push(`--font-heading: ${family(t.headingFont, 'heading')};`)
  if (t.bodyFont) fonts.push(`--font-body: ${family(t.bodyFont, 'body')};`)
  if (fonts.length) rules.push(`:root .sss-home { ${fonts.join(' ')} }`)

  // Same pairing as Home.css: blacklight on the page and on a lit photo,
  // daylight on a daylight page and on an unlit photo.
  const night = tokens(t.blacklight, { defaultGlow: '#00fb00', defaultStrength: 100, wash: 0.12 })
  const day = tokens(t.daylight, { defaultGlow: '#d9ff6b', defaultStrength: 20, wash: 0.1 })
  // Night rules name the page as "not daylight": a bare `:root .sss-home` ties
  // Home.css's daylight rule on specificity and, coming later, would win it.
  const nightPage = ":root .sss-home:not([data-mode='daylight'])"
  if (night.vars) rules.push(`${nightPage}, :root .uv-photo.is-lit { ${night.vars} }`)
  if (night.background) rules.push(`${nightPage} { background: ${night.background}; }`)
  if (day.vars) rules.push(`:root .sss-home[data-mode='daylight'], :root .uv-photo:not(.is-lit) { ${day.vars} }`)
  if (day.background) rules.push(`:root .sss-home[data-mode='daylight'] { background: ${day.background}; }`)
  return rules.join('\n')
}

export function themeFonts(t = {}) {
  return [t.headingFont, t.bodyFont].filter(Boolean)
}

export default function SiteTheme() {
  const [published, setPublished] = useState(null)
  useEffect(() => {
    let active = true
    fetchPublished('theme').then((docs) => active && setPublished(docs))
    return () => { active = false }
  }, [])
  const theme = useLiveDocuments('theme', published ?? NONE)[0]?.data

  const css = themeCss(theme)
  useEffect(() => {
    if (!css) return undefined
    const style = document.createElement('style')
    style.dataset.siteTheme = ''
    style.textContent = css
    document.head.append(style)
    return () => style.remove()
  }, [css])

  const families = themeFonts(theme).join('|')
  useEffect(() => {
    if (!families) return undefined
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = `https://fonts.googleapis.com/css2?${families.split('|').map((f) => `family=${encodeURIComponent(f).replace(/%20/g, '+')}:wght@400;700`).join('&')}&display=swap`
    document.head.append(link)
    return () => link.remove()
  }, [families])

  return null
}
