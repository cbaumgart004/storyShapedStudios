// src/components/Frame.jsx
// A section the owner made Free in the console (ADR-0010): its parts placed on
// a canvas the section's size, from `_layout` in the section's own data. Every
// section component marks its parts once, through frameOf; Flow sections (the
// default) render exactly as before, and the marks are what the console's
// Arrange mode finds and moves.
//
//   const frame = frameOf(block)
//   <h2 {...frame.part('heading')}>…</h2>       a part, placed when the section is Free
//   <div className="prose-block" {...frame.wrap}>  a wrapper between the section and its
//                                                parts: no box of its own while Free
//   <div {...frame.group('links')}>…</div>      several elements moved as one part: no box
//                                                of its own while the section flows
//
// x and w are % of the section's width; y, h and height are % of it too (CSS
// container units), so a Free section keeps its proportions at every width.
// Below 820px it stacks, its parts ordered by y then x (styles/Frame.css), or,
// with `phone: 'scale'`, keeps the desktop arrangement: ScaleBox draws it at its
// desktop width and zooms it down whole, text included. The page's code order
// is unchanged, so a screen reader reads the content in order.

import React, { useEffect, useRef, useState } from 'react'
import '@/styles/Frame.css'

const NO_FRAME = { free: false, root: {}, wrap: {}, part: (name, style) => mark(name, null, style), group: (name, style) => ({ ...mark(name, null, style), 'data-eotm-group': '' }) }

function mark(name, p, style) {
  if (!p) return { 'data-eotm-part': name, ...(style ? { style } : {}) }
  const vars = {
    '--x': p.x, '--y': p.y, '--w': p.w, '--order': Math.round(p.y * 100 + p.x),
    ...(p.h != null ? { '--ph': `${p.h}cqw` } : {}),
    ...(p.z != null ? { '--z': p.z } : {}),
    ...(p.opacity != null ? { '--o': p.opacity / 100 } : {}),
    ...(p.fs != null ? { '--fs': p.fs } : {}),
  }
  return { 'data-eotm-part': name, 'data-eotm-placed': '', style: { ...style, ...vars } }
}

export function frameOf(data) {
  const layout = data?._layout
  if (layout?.mode !== 'free') return NO_FRAME
  const parts = layout.parts ?? {}
  return {
    free: true,
    scale: layout.phone === 'scale',
    // On the section's outermost element (SitePage passes it in with the marks).
    root: { 'data-eotm-frame': 'free', ...(layout.phone === 'scale' ? { 'data-eotm-phone': 'scale' } : {}), style: { '--frame-h': layout.height ?? 50 } },
    wrap: { 'data-eotm-wrap': '' },
    part: (name, style) => mark(name, parts[name], style),
    group: (name, style) => ({ ...mark(name, parts[name], style), 'data-eotm-group': '' }),
  }
}

// The desktop width a section is drawn at when a phone scales it: its share of
// the page's 12 columns at the width the site is designed for (approximate:
// the page's own maximum, not a measured one).
export const DESIGN_WIDTH = 1200
const PHONE = '(max-width: 819.98px)'

// A Free section with `phone: 'scale'`: on a phone, drawn at its desktop width
// and zoomed to fit, so the arrangement and its text shrink together. CSS zoom,
// unlike transform, also shrinks the space the section takes on the page.
// Elsewhere it renders its children untouched.
export function ScaleBox({ on, span = 12, children }) {
  const ref = useRef(null)
  const [zoom, setZoom] = useState(null)
  const width = Math.round((DESIGN_WIDTH * span) / 12)
  useEffect(() => {
    if (!on || !ref.current) return undefined
    const mq = matchMedia(PHONE)
    const fit = () => setZoom(mq.matches ? Math.min(1, ref.current.clientWidth / width) : null)
    const ro = new ResizeObserver(fit)
    ro.observe(ref.current)
    mq.addEventListener('change', fit)
    fit()
    return () => { ro.disconnect(); mq.removeEventListener('change', fit) }
  }, [on, width])
  // A section that never scales gets no wrappers at all.
  if (!on) return children
  return (
    <div ref={ref} className="eotm-scalebox">
      <div {...(zoom ? { 'data-eotm-scaled': '', style: { width, zoom } } : {})}>{children}</div>
    </div>
  )
}
