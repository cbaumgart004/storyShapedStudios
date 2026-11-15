// server/marketplace/pairing.js
// Pairing a Listing with the Etsy or eBay listing that sells the same piece.
// The Listing is the parent of both and stays one record on the website. A
// pairing records the correlation and nothing else:
//
// - The Marketplace's id goes in its own field (etsyListingId, ebayItemId).
// - Its fields and values are recorded whole under `sources.<provider>`, so
//   the Listing holds what each Marketplace says. No field of the Listing is
//   filled or overwritten from them.
// - The owner picks, field by field, which one the website shows
//   (`display.<field>`: site, etsy or ebay; see frontend lib/shown.js).
// - Variations join by SKU, or one to one when each side has one. A
//   Marketplace Variation that joins none is reported.
// - Quantity is never written: it belongs to the stock item of each SKU. The
//   Marketplace's count is reported beside stock where they differ.

const ID_FIELD = { etsy: 'etsyListingId', ebay: 'ebayItemId' }
export const idField = (provider) => ID_FIELD[provider]

const blank = (v) => v == null || v === '' || (Array.isArray(v) && !v.length)
const norm = (t) => String(t ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
export const sameTitle = (a, b) => !!norm(a) && norm(a) === norm(b)

// How alike two titles read, 0 to 1: the share of meaningful words they have
// in common (Dice). Words of two letters or fewer, and words every glass
// listing shares, say nothing about which piece it is.
const COMMON = new Set(['the', 'and', 'with', 'for', 'vintage', 'glass', 'uranium', 'vaseline', 'handmade', 'jewelry', 'glows', 'glow', 'under', 'light', 'black'])
const seen = new Map() // title -> its words; a scrub compares every pair
const words = (t) => {
  const key = String(t ?? '')
  if (!seen.has(key)) { if (seen.size > 5000) seen.clear(); seen.set(key, new Set(norm(key).split(' ').filter((w) => w.length > 2 && !COMMON.has(w)))) }
  return seen.get(key)
}
export function titleLikeness(a, b) {
  const x = words(a), y = words(b)
  if (!x.size || !y.size) return 0
  let both = 0
  for (const w of x) if (y.has(w)) both++
  return (2 * both) / (x.size + y.size)
}

// A Marketplace listing beside a Listing: why they look alike and how sure,
// 0 to 1. A shared SKU is near certain; an equal title nearly so; otherwise
// the title likeness, counted only from 0.5 up.
export function likeness(listingData, data) {
  const skus = (data.variations ?? []).map((v) => String(v?.sku ?? '').trim()).filter(Boolean)
  const by = []
  if ((listingData.variations ?? []).some((v) => skus.includes(String(v?.sku ?? '').trim()))) by.push('sku')
  if (sameTitle(listingData.title, data.title)) by.push('title')
  const alike = titleLikeness(listingData.title, data.title)
  if (!by.length && alike >= 0.5) by.push('words')
  const score = Math.min(1, (by.includes('sku') ? 0.6 : 0) + (by.includes('title') ? 0.5 : 0) + alike * 0.4)
  return { by, score: Math.round(score * 100) / 100 }
}

// What a source record keeps of fromEtsy/fromEbay: every listing field, plus
// that Marketplace's own group. Ids live in their own fields, not here.
const SOURCE_FIELDS = ['title', 'description', 'photos', 'tags', 'materials', 'section', 'etsyCategory', 'ebayCategoryId',
  'condition', 'conditionNote', 'whoMade', 'whenMade', 'isSupply', 'package', 'variationName', 'variations']
export const DISPLAY_FIELDS = ['title', 'description', 'photos']

export function sourceOf(incoming, provider, at = new Date().toISOString()) {
  const source = { recordedAt: at }
  for (const k of [...SOURCE_FIELDS, provider]) if (!blank(incoming[k])) source[k] = incoming[k]
  return source
}

// listing: the Listing's draft data. incoming: fromEtsy/fromEbay of the
// Marketplace listing. Returns the new data and what the record shows.
export function recordSource(listing, incoming, provider, at) {
  const source = sourceOf(incoming, provider, at)
  const data = { ...listing, [idField(provider)]: String(incoming[idField(provider)] ?? ''), sources: { ...(listing.sources ?? {}), [provider]: source } }
  const differs = [...DISPLAY_FIELDS, 'tags'].filter((k) => !blank(source[k]) && !blank(listing[k]) && JSON.stringify(source[k]) !== JSON.stringify(listing[k]))
  const vars = listing.variations ?? [], inVars = incoming.variations ?? []
  const one = vars.length === 1 && inVars.length === 1
  const unmatched = inVars.filter((iv) => !one && !vars.some((v) => v.sku?.trim() && v.sku.trim() === iv.sku?.trim()))
    .map((iv) => iv.option || iv.sku || '(no option)')
  return { data, recorded: Object.keys(source).filter((k) => k !== 'recordedAt'), differs, variationsNotMatched: unmatched }
}

// [{ sku, quantity }] available on the Marketplace, from its raw listing.
export function marketplaceQuantities(provider, raw) {
  const n = (v) => Number(v?.['#text'] ?? v ?? 0)
  if (provider === 'etsy') {
    const products = raw.inventory?.products ?? []
    return products.length
      ? products.map((p) => ({ sku: p.sku ?? '', quantity: n(p.offerings?.[0]?.quantity) }))
      : [{ sku: raw.skus?.[0] ?? '', quantity: n(raw.quantity) }]
  }
  const vars = raw.Variations?.Variation ?? []
  return (vars.length ? vars : [raw]).map((v) => ({ sku: String(v.SKU ?? ''), quantity: n(v.Quantity) - n(v.SellingStatus?.QuantitySold) }))
}
