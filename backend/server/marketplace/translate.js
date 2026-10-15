// server/marketplace/translate.js
// One Listing (a console `listing` document, ADR-0008) into what each
// Marketplace takes (ADR-0004). Pure: no network, no database, so a Listing a
// Marketplace cannot represent is caught here as a problem, never by a failed
// push. The callers (sync.js) supply the Stock Items by SKU and what the
// Listing does not hold (Etsy taxonomy and section ids, the shop's default
// policies, eBay's required item specifics for the category).
//
// The two shapes differ: Etsy holds one listing with an inventory of products,
// eBay an inventory item per SKU with an offer each, grouped when there are
// several. Etsy's are checked against its OpenAPI spec (createDraftListing,
// updateListingInventory); eBay's follow its Sell Inventory documentation.
// Neither has been sent to a live Marketplace.

// Etsy's custom variation property; its second is 514. One property is all a
// Listing carries today (variationName).
export const ETSY_CUSTOM_PROPERTY = 513

const dollars = (money) => (money?.amount == null ? null : money.amount / 100)
const money = (m) => ({ value: dollars(m).toFixed(2), currency: m.currency ?? 'USD' })
// Etsy and eBay count whole units; a Stock Item's count may carry decimals.
export const units = (q) => Math.max(0, Math.floor(Number(q) || 0))
const num = (v) => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v))
// A Marketplace is offered unless its box is unticked (older Listings have no channels).
export const sellsOn = (listing, provider) => listing.channels?.[provider] !== false

// The checks both Marketplaces share: every Variation's SKU is a Stock Item
// (ADR-0008 leaves this to the push), and options are named when there are
// several.
export function shared(listing, stockBySku) {
  const problems = []
  const variations = listing.variations ?? []
  if (!variations.length) problems.push('No Variations: nothing to sell.')
  for (const v of variations) {
    if (!stockBySku.has(v.sku)) problems.push(`SKU ${v.sku} is not a Stock Item.`)
    if (dollars(v.price) == null) problems.push(`SKU ${v.sku} has no price.`)
  }
  if (variations.length > 1) {
    if (!listing.variationName?.trim()) problems.push('Several Variations need a Variation name (e.g. Ring size).')
    const options = variations.map((v) => v.option?.trim())
    if (options.some((o) => !o)) problems.push('Several Variations need an Option on each.')
    if (new Set(options).size !== options.length) problems.push('Two Variations share an Option.')
  }
  if (!(listing.photos ?? []).length) problems.push('No photos.')
  return problems
}

// opts: { taxonomyId, shopSectionId, defaults: { shippingProfileId, returnPolicyId, readinessStateId } }
// Returns { problems, listing, inventory }: the createDraftListing / updateListing
// body, and the updateListingInventory body.
export function toEtsy(listing, stockBySku, opts = {}) {
  const problems = shared(listing, stockBySku)
  const e = listing.etsy ?? {}
  const d = opts.defaults ?? {}
  const shippingProfileId = num(e.shippingProfileId) ?? num(d.shippingProfileId)
  if (!opts.taxonomyId) problems.push(`Etsy category "${listing.etsyCategory}" matches no Etsy taxonomy node.`)
  if (!opts.shopSectionId) problems.push(`Etsy shop section "${listing.section}" does not exist in the shop.`)
  // Etsy's spec: required on a physical listing.
  if (!shippingProfileId) problems.push('No Etsy shipping profile: set one under Etsy only, or ETSY_SHIPPING_PROFILE_ID.')
  const variations = listing.variations ?? []
  const qty = (v) => units(stockBySku.get(v.sku)?.quantity)
  const total = variations.reduce((n, v) => n + qty(v), 0)
  if (total < 1) problems.push('Nothing in stock: Etsy needs at least one unit to list.')
  // Etsy's spec: no parentheses in a property value.
  if (variations.length > 1) for (const v of variations) if (/[()]/.test(v.option ?? '')) problems.push(`Option "${v.option}": Etsy allows no parentheses.`)
  if (problems.length) return { problems }

  const several = variations.length > 1
  const p = listing.package ?? {}
  const body = {
    type: 'physical',
    title: listing.title,
    description: listing.description,
    quantity: total,
    price: Math.min(...variations.map((v) => dollars(v.price))),
    who_made: listing.whoMade,
    when_made: listing.whenMade,
    is_supply: Boolean(listing.isSupply),
    taxonomy_id: opts.taxonomyId,
    shop_section_id: opts.shopSectionId,
    shipping_profile_id: shippingProfileId,
    return_policy_id: num(e.returnPolicyId) ?? num(d.returnPolicyId),
    readiness_state_id: num(e.processingProfileId) ?? num(d.readinessStateId),
    tags: (listing.tags ?? []).map((t) => t.tag),
    materials: (listing.materials ?? []).map((m) => m.material),
    styles: (e.styles ?? []).map((s) => s.style),
    is_customizable: e.customizable === true,
    should_auto_renew: e.autoRenew !== false,
    item_weight: num(p.weight),
    item_weight_unit: num(p.weight) ? p.weightUnit ?? 'oz' : null,
    item_length: num(p.length),
    item_width: num(p.width),
    item_height: num(p.height),
    item_dimensions_unit: num(p.length) || num(p.width) || num(p.height) ? p.dimensionUnit ?? 'in' : null,
  }
  for (const k of Object.keys(body)) if (body[k] == null || (Array.isArray(body[k]) && !body[k].length)) delete body[k]

  const inventory = {
    products: variations.map((v) => ({
      sku: v.sku,
      property_values: several
        ? [{ property_id: ETSY_CUSTOM_PROPERTY, property_name: listing.variationName.trim(), value_ids: [], values: [v.option.trim()] }]
        : [],
      offerings: [{ price: dollars(v.price), quantity: qty(v), is_enabled: qty(v) > 0 }],
    })),
    price_on_property: several ? [ETSY_CUSTOM_PROPERTY] : [],
    quantity_on_property: several ? [ETSY_CUSTOM_PROPERTY] : [],
    sku_on_property: several ? [ETSY_CUSTOM_PROPERTY] : [],
  }
  return { problems, listing: body, inventory }
}

const EBAY_WEIGHT = { oz: 'OUNCE', lb: 'POUND', g: 'GRAM', kg: 'KILOGRAM' }
const EBAY_LENGTH = { in: 'INCH', cm: 'CENTIMETER' }

// The Listing's item specifics as eBay aspects: { Metal: ['Sterling Silver'] }.
export function aspectsOf(listing) {
  const out = {}
  for (const s of listing.ebay?.itemSpecifics ?? []) {
    const name = s.name?.trim()
    if (name) out[name] = String(s.value ?? '').split(',').map((v) => v.trim()).filter(Boolean)
  }
  return out
}

// opts: { imageUrls, groupKey, requiredAspects: [names], defaults: { condition,
// fulfillmentPolicyId, paymentPolicyId, returnPolicyId }, merchantLocationKey, marketplaceId }
// Returns { problems, warnings, items: [{ sku, body }], group?: { key, body }, offers: [{ sku, body }] }.
// Several Variations become one inventory item group, published as one listing.
export function toEbay(listing, stockBySku, opts = {}) {
  const problems = shared(listing, stockBySku)
  const b = listing.ebay ?? {}
  const d = opts.defaults ?? {}
  if (!listing.ebayCategoryId) problems.push('No eBay category id.')
  const policies = {
    fulfillmentPolicyId: b.fulfillmentPolicyId || d.fulfillmentPolicyId,
    paymentPolicyId: b.paymentPolicyId || d.paymentPolicyId,
    returnPolicyId: b.returnPolicyId || d.returnPolicyId,
  }
  if (!policies.fulfillmentPolicyId || !policies.paymentPolicyId || !policies.returnPolicyId) {
    problems.push('eBay business policies missing: set them under eBay only, or EBAY_*_POLICY_ID.')
  }
  if (!opts.merchantLocationKey) problems.push('No eBay inventory location (EBAY_LOCATION_KEY).')
  const condition = listing.condition || d.condition
  if (!condition) problems.push('No condition.')
  const imageUrls = (opts.imageUrls ?? []).filter((u) => /^https:\/\//.test(u))
  if (!imageUrls.length) problems.push('eBay needs photos at https addresses (PUBLIC_SITE_URL).')

  const variations = listing.variations ?? []
  const several = variations.length > 1
  const name = listing.variationName?.trim()
  const aspects = aspectsOf(listing)
  // The variation aspect is per item, not shared.
  const missing = (opts.requiredAspects ?? []).filter((a) => !aspects[a]?.length && !(several && a === name))
  if (missing.length) problems.push(`eBay requires these item specifics for category ${listing.ebayCategoryId}: ${missing.join(', ')}.`)
  if (problems.length) return { problems }

  const title = (b.title?.trim() || listing.title).slice(0, 80)
  const warnings = !b.title?.trim() && listing.title.length > 80 ? [`eBay titles stop at 80 characters; "${title}" is used. Set an eBay title to choose the words.`] : []
  const p = listing.package ?? {}
  const pkg = {}
  if (num(p.weight)) pkg.weight = { value: num(p.weight), unit: EBAY_WEIGHT[p.weightUnit ?? 'oz'] }
  if (num(p.length) && num(p.width) && num(p.height)) {
    pkg.dimensions = { length: num(p.length), width: num(p.width), height: num(p.height), unit: EBAY_LENGTH[p.dimensionUnit ?? 'in'] }
  }
  const marketplaceId = opts.marketplaceId ?? 'EBAY_US'
  const items = variations.map((v) => ({
    sku: v.sku,
    body: {
      availability: { shipToLocationAvailability: { quantity: units(stockBySku.get(v.sku)?.quantity) } },
      condition,
      ...(listing.conditionNote?.trim() && condition !== 'NEW' ? { conditionDescription: listing.conditionNote.trim() } : {}),
      ...(Object.keys(pkg).length ? { packageWeightAndSize: pkg } : {}),
      product: {
        title,
        description: listing.description,
        imageUrls: imageUrls.slice(0, 24),
        aspects: several ? { ...aspects, [name]: [v.option.trim()] } : aspects,
      },
    },
  }))
  const offers = variations.map((v) => ({
    sku: v.sku,
    body: {
      sku: v.sku,
      marketplaceId,
      format: 'FIXED_PRICE',
      availableQuantity: units(stockBySku.get(v.sku)?.quantity),
      categoryId: listing.ebayCategoryId,
      listingDescription: listing.description,
      listingPolicies: { ...policies, ...(b.bestOffer ? { bestOfferTerms: { bestOfferEnabled: true } } : {}) },
      merchantLocationKey: opts.merchantLocationKey,
      pricingSummary: { price: money(v.ebayPrice?.amount != null ? v.ebayPrice : v.price) },
    },
  }))
  const group = several
    ? {
        key: opts.groupKey,
        body: {
          title,
          description: listing.description,
          imageUrls: imageUrls.slice(0, 24),
          aspects,
          variantSKUs: variations.map((v) => v.sku),
          variesBy: { specifications: [{ name, values: variations.map((v) => v.option.trim()) }] },
        },
      }
    : undefined
  return { problems, warnings, items, group, offers }
}
