// server/marketplace/pairing.js
// Pairing a Listing with the Etsy or eBay listing that sells the same piece.
// The Listing is the record; a pairing only fills what it lacks, so nothing
// typed on the site is overwritten by a Marketplace.
//
// - Empty fields take the Marketplace's value (title, description, photos,
//   tags, materials, categories, condition, package, the Marketplace's own
//   group, the Variations' name).
// - Title and description that differ are kept as that Marketplace's own
//   (etsy.title / ebay.title, etsy.description / ebay.description), which the
//   push sends there; the shared ones stay what the website shows.
// - Photos the Listing already has stay; the Marketplace's are counted, not
//   added, because the same photo has a different address on each.
// - Variations join by SKU, or one to one when each side has one. A
//   Marketplace Variation that joins none is reported, not added.
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

// Fill only what `into` lacks, from `from`, one level of groups deep.
function fillEmpty(into, from, path, filled) {
  const out = { ...(into ?? {}) }
  for (const [k, v] of Object.entries(from ?? {})) {
    if (blank(v)) continue
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const before = JSON.stringify(out[k] ?? {})
      out[k] = fillEmpty(out[k], v, `${path}${k}.`, filled)
      if (JSON.stringify(out[k]) === before) continue
    } else if (blank(out[k]) || (typeof v === 'boolean' && out[k] == null)) {
      out[k] = v
      filled.push(`${path}${k}`)
    }
  }
  return out
}

// listing: the Listing's draft data. incoming: fromEtsy/fromEbay of the
// Marketplace listing. Returns the new data and what happened to it.
export function fillListing(listing, incoming, provider) {
  const other = provider === 'etsy' ? 'ebay' : 'etsy'
  const filled = [], kept = []
  const { variations: inVars = [], title, description, photos, channels, [provider]: own, [other]: _otherOwn, ...rest } = incoming
  let data = fillEmpty(listing, { ...rest, [idField(provider)]: incoming[idField(provider)] }, '', filled)
  data[provider] = fillEmpty(data[provider], own, `${provider}.`, filled)
  data.channels = { ...(data.channels ?? {}), [provider]: true }

  for (const [field, value] of [['title', title], ['description', description]]) {
    if (blank(value)) continue
    if (blank(data[field])) { data[field] = value; filled.push(field) }
    else if (data[field].trim() !== value.trim()) {
      if (blank(data[provider][field])) { data[provider] = { ...data[provider], [field]: value }; filled.push(`${provider}.${field}`) }
      else kept.push(`${provider}.${field}`)
    }
  }
  if (blank(data.photos) && !blank(photos)) { data.photos = photos; filled.push('photos') }
  else if (!blank(photos)) kept.push(`photos (${provider} has ${photos.length})`)

  // Variations.
  const vars = (data.variations ?? []).map((v) => ({ ...v }))
  const unmatched = []
  const one = vars.length === 1 && inVars.length === 1
  for (const iv of inVars) {
    const v = one ? vars[0] : vars.find((x) => x.sku?.trim() && x.sku.trim() === iv.sku?.trim())
    if (!v) { unmatched.push(iv.option || iv.sku || '(no option)'); continue }
    if (blank(v.sku) && !blank(iv.sku)) v.sku = iv.sku
    if (blank(v.option) && !blank(iv.option)) v.option = iv.option
    const listingPrice = v.price?.amount, theirs = iv.price?.amount
    if (listingPrice == null && theirs != null) v.price = iv.price
    else if (theirs != null && theirs !== listingPrice) {
      // The shared price is Etsy's and the website's; eBay may differ.
      if (provider === 'ebay' && v.ebayPrice?.amount == null) v.ebayPrice = iv.price
      else if (provider === 'etsy' && v.ebayPrice?.amount == null) { v.ebayPrice = v.price; v.price = iv.price }
      else kept.push(`price of ${v.option || v.sku}`)
    }
  }
  if (!vars.length && inVars.length) { data.variations = inVars; filled.push('variations') }
  else data.variations = vars
  return { data, filled, kept, variationsNotMatched: unmatched }
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
