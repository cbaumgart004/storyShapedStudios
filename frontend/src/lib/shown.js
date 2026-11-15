// src/lib/shown.js
// A Listing holds its own fields and, once matched, what Etsy and eBay say
// (`sources.etsy`, `sources.ebay`). The owner picks per field which one the
// site shows (`display.<field>`: site, etsy or ebay). Blank, or a source with
// nothing for that field, shows the Listing's own.
const blank = (v) => v == null || v === '' || (Array.isArray(v) && !v.length)

export function shownFrom(listing, field) {
  const pick = listing?.display?.[field]
  return pick && pick !== 'site' && !blank(listing?.sources?.[pick]?.[field]) ? pick : 'site'
}

export function shown(listing, field) {
  const from = shownFrom(listing, field)
  return from === 'site' ? listing?.[field] : listing.sources[from][field]
}
