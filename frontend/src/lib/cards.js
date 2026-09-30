// src/lib/cards.js
// The Card is the site's most general component: small heading, heading, rich
// text, images, links (shown by title only), an optional signature, and a look
// (Text or Story). It replaced four narrower ones on 2026-09-30; a page saved
// with those still renders, through toCard, until scripts/migrate-pages.mjs
// rewrites it. Plain JS, no React, so Node can import it.

const blankCard = { eyebrow: '', heading: '', body: '', images: [], links: [], byline: '', bylineNote: '', look: 'text' }

// A section in one of the retired shapes, as a Card with the same _id (so a
// Page layout keyed on it still applies). Anything else is returned as it is.
export function toCard(block) {
  const base = { ...blankCard, _id: block._id, _type: 'card' }
  switch (block._type) {
    case 'prose': // Text section
      return {
        ...base, heading: block.heading ?? '', body: block.body ?? '',
        links: block.link?.url && block.link?.label ? [{ _id: `${block._id}-link`, title: block.link.label, url: block.link.url }] : [],
      }
    case 'portraits': // Portrait row
      return { ...base, eyebrow: block.eyebrow ?? '', heading: block.heading ?? '', images: block.photos ?? [] }
    case 'artistStory': // Artist story
      return {
        ...base, look: 'story', body: block.body ?? '', byline: block.signature ?? '', bylineNote: block.signatureTitle ?? '',
        links: (block.links ?? []).map((l, i) => ({ _id: l._id ?? `${block._id}-link-${i + 1}`, title: l.title || l.url, url: l.url })),
      }
    case 'framedPhoto': // Framed photo
      return { ...base, heading: block.caption ?? '', images: block.image?.src ? [block.image] : [] }
    default:
      return block
  }
}

export const RETIRED = ['prose', 'portraits', 'artistStory', 'framedPhoto']
