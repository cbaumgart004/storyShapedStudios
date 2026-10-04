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
// Below 820px it stacks, its parts ordered by y then x (styles/Frame.css). The
// page's code order is unchanged, so a screen reader reads the content in order.

import '@/styles/Frame.css'

const NO_FRAME = { free: false, root: {}, wrap: {}, part: (name, style) => mark(name, null, style), group: (name, style) => ({ ...mark(name, null, style), 'data-eotm-group': '' }) }

function mark(name, p, style) {
  if (!p) return { 'data-eotm-part': name, ...(style ? { style } : {}) }
  const vars = {
    '--x': p.x, '--y': p.y, '--w': p.w, '--order': Math.round(p.y * 100 + p.x),
    ...(p.h != null ? { '--ph': `${p.h}cqw` } : {}),
    ...(p.z != null ? { '--z': p.z } : {}),
    ...(p.opacity != null ? { '--o': p.opacity / 100 } : {}),
  }
  return { 'data-eotm-part': name, 'data-eotm-placed': '', style: { ...style, ...vars } }
}

export function frameOf(data) {
  const layout = data?._layout
  if (layout?.mode !== 'free') return NO_FRAME
  const parts = layout.parts ?? {}
  return {
    free: true,
    // On the section's outermost element (SitePage passes it in with the marks).
    root: { 'data-eotm-frame': 'free', style: { '--frame-h': layout.height ?? 50 } },
    wrap: { 'data-eotm-wrap': '' },
    part: (name, style) => mark(name, parts[name], style),
    group: (name, style) => ({ ...mark(name, parts[name], style), 'data-eotm-group': '' }),
  }
}
