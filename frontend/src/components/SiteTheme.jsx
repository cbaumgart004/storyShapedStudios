// src/components/SiteTheme.jsx
// Applies the owner's Theme from the Edge of the Map console (its `theme`
// type): heading and body fonts, and per mode the background, accent, text,
// quiet text, glow colour, strength, reach and movement. Rendered once in App; draws
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

// One mode's tokens. The glow set is Home.css's blacklight set with the colour,
// strength (1 = today's blacklight: brightness and size together) and reach
// (1 = today's: size alone) as inputs. A moving glow scales every layer's alpha
// by --sss-glow-pulse, which an animation drives (movementCss). As in Home.css the glow is
// the accent unless a glow colour is given; with no accent, glow or strength
// set it is left alone, so daylight keeps its near-flat look.
// Each mode's glow as Home.css draws it today, layer by layer: blur in px, alpha,
// and whether the layer is part of the haze (the soft, diffuse outer bloom).
// At 100% strength, haze and reach these reproduce Home.css exactly, so a
// Theme that only changes a colour recolours the glow and keeps its shape.
const SHAPES = {
  blacklight: {
    glow: '#00fb00', line: 0.35, wash: 0.12,
    glow1: [[5, 0.7]],
    strong: [[3, 1], [9, 1], [22, 0.45, 'haze'], [44, 0.2, 'haze']],
    frame: [[10, 0.5], [12, 0.18, 'inset']],
  },
  daylight: {
    glow: '#d9ff6b', line: 0.28, wash: 0.1,
    glow1: [[1, 0.4]],
    strong: [[1, 0.5]],
    frame: [],
  },
}

function tokens(m = {}, mode) {
  const shape = SHAPES[mode]
  const out = []
  if (m.background) out.push(`--void: ${m.background};`)
  if (m.accent) out.push(`--accent: ${m.accent};`)
  if (m.text) out.push(`--bone: ${m.text};`)
  if (m.muted) out.push(`--muted: ${m.muted};`)
  let background = null
  const touched = m.glow || m.accent || m.glowStrength != null || m.glowHaze != null || m.glowSpread != null || m.glowPulse
  if (touched) {
    const g = rgb(m.glow || m.accent || shape.glow)
    const k = (m.glowStrength ?? 100) / 100
    const h = (m.glowHaze ?? 100) / 100
    const r = (m.glowSpread ?? 100) / 100
    const al = (n) => (m.glowPulse ? `calc(${a(n)} * var(--sss-glow-pulse, 1))` : a(n))
    const layer = ([blur, alpha, kind]) => `${kind === 'inset' ? 'inset ' : ''}0 0 ${px(blur * r)} rgba(${g}, ${al(alpha * (kind === 'haze' ? h : k))})`
    const list = (layers) => (layers.length ? layers.map(layer).join(', ') : 'inset 0 0 0 rgba(0, 0, 0, 0)')
    out.push(
      `--line: rgba(${g}, ${a(shape.line)});`,
      `--glow-1: ${list(shape.glow1)};`,
      `--glow-strong: ${list(shape.strong)};`,
      `--frame-glow: ${list(shape.frame)};`,
    )
    background = `radial-gradient(120% 90% at 50% -10%, rgba(${g}, ${a(shape.wash * h)}), transparent 55%), var(--void)`
  }
  return { vars: out.join(' '), background }
}

const MOVES = {
  breathe: { name: 'sss-glow-breathe', frames: '0%, 100% { --sss-glow-pulse: 1; } 50% { --sss-glow-pulse: 0.45; }', run: '5s ease-in-out infinite' },
  flicker: { name: 'sss-glow-flicker', frames: '0%, 39%, 45%, 71%, 100% { --sss-glow-pulse: 1; } 40% { --sss-glow-pulse: 0.3; } 42% { --sss-glow-pulse: 0.85; } 43% { --sss-glow-pulse: 0.4; } 72% { --sss-glow-pulse: 0.6; }', run: '3.2s steps(1, end) infinite' },
}
function movementCss(selector, pulse) {
  const move = MOVES[pulse]
  if (!move) return []
  return [
    `@keyframes ${move.name} { ${move.frames} }`,
    `${selector} { animation: ${move.name} ${move.run}; }`,
    `@media (prefers-reduced-motion: reduce) { ${selector} { animation: none; } }`,
  ]
}

export function themeCss(t = {}) {
  const rules = []
  const fonts = []
  if (t.headingFont) fonts.push(`--font-heading: ${family(t.headingFont, 'heading')};`)
  if (t.bodyFont) fonts.push(`--font-body: ${family(t.bodyFont, 'body')};`)
  if (fonts.length) rules.push(`:root .sss-home { ${fonts.join(' ')} }`)

  // Same pairing as Home.css: blacklight on the page and on a lit photo,
  // daylight on a daylight page and on an unlit photo.
  const night = tokens(t.blacklight, 'blacklight')
  const day = tokens(t.daylight, 'daylight')
  // Night rules name the page as "not daylight": a bare `:root .sss-home` ties
  // Home.css's daylight rule on specificity and, coming later, would win it.
  const nightPage = ":root .sss-home:not([data-mode='daylight'])"
  if (t.blacklight?.glowPulse || t.daylight?.glowPulse) {
    rules.push("@property --sss-glow-pulse { syntax: '<number>'; inherits: true; initial-value: 1; }")
  }
  if (night.vars) rules.push(`${nightPage}, :root .uv-photo.is-lit { ${night.vars} }`)
  rules.push(...movementCss(nightPage, t.blacklight?.glowPulse))
  rules.push(...movementCss(":root .sss-home[data-mode='daylight']", t.daylight?.glowPulse))
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
