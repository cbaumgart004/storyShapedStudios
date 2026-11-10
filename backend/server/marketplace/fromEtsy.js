// server/marketplace/fromEtsy.js
// One Etsy listing, as Etsy sent it (an import_snapshots row), as the data of
// a draft Listing (console schema, type listing): the reverse of toEtsy in
// translate.js. Values are carried as Etsy has them, so one the Listing model
// does not accept (a when_made range Etsy has since renamed, a SKU with a
// space) stays visible and Publish names it, rather than being dropped here.
//
// Not filled, because Etsy does not hold them: condition (eBay's), every eBay
// field, Dark photos. Every photo comes in as Light; which is the blacklight
// one is the review's to say.

import { randomUUID } from 'node:crypto'

const id = () => randomUUID()
const text = (v) => (v == null ? '' : String(v))
const cents = (p) => (p?.amount != null ? { amount: Math.round((p.amount * 100) / (p.divisor || 100)), currency: p.currency_code || 'USD' } : { amount: null, currency: 'USD' })

// names: { sections: {id: title}, paths: {id: "A < B < C"} }, from Etsy.
export function fromEtsy(raw, names = {}) {
  const products = raw.inventory?.products ?? []
  const propNames = [...new Set(products.flatMap((p) => (p.property_values ?? []).map((v) => v.property_name)))]
  const variations = (products.length ? products : [{ sku: raw.skus?.[0] ?? '', offerings: [{ price: raw.price }] }]).map((p) => ({
    _id: id(),
    option: propNames.map((n) => (p.property_values ?? []).find((v) => v.property_name === n)?.values?.join(', ') ?? '').filter(Boolean).join(' / '),
    sku: text(p.sku),
    price: cents(p.offerings?.[0]?.price ?? raw.price),
    ebayPrice: { amount: null, currency: 'USD' },
    etsyListingId: '',
    ebayItemId: '',
  }))
  const dims = raw.item_length || raw.item_width || raw.item_height
  return {
    title: text(raw.title),
    description: text(raw.description),
    photos: (raw.images ?? []).slice(0, 10).map((m) => ({ src: m.url_fullxfull ?? m.url_570xN, index: 'Light', ...(m.alt_text ? { alt: m.alt_text } : {}) })),
    channels: { site: false, etsy: true, ebay: false },
    section: text(names.sections?.[raw.shop_section_id]),
    etsyCategory: text(names.paths?.[raw.taxonomy_id]),
    ebayCategoryId: '',
    condition: '',
    conditionNote: '',
    tags: (raw.tags ?? []).map((tag) => ({ _id: id(), tag })),
    materials: (raw.materials ?? []).map((material) => ({ _id: id(), material })),
    whoMade: text(raw.who_made),
    whenMade: text(raw.when_made),
    isSupply: !!raw.is_supply,
    package: {
      weight: raw.item_weight || null,
      weightUnit: raw.item_weight ? text(raw.item_weight_unit) : '',
      length: raw.item_length || null,
      width: raw.item_width || null,
      height: raw.item_height || null,
      dimensionUnit: dims ? text(raw.item_dimensions_unit) : '',
    },
    variationName: propNames.join(' / '),
    variations,
    etsy: {
      shippingProfileId: text(raw.shipping_profile_id),
      processingProfileId: text(raw.readiness_state_id),
      returnPolicyId: text(raw.return_policy_id),
      styles: (raw.style ?? []).map((style) => ({ _id: id(), style })),
      customizable: !!raw.is_customizable,
      autoRenew: !!raw.should_auto_renew,
    },
    ebay: { title: '', itemSpecifics: [], bestOffer: false, fulfillmentPolicyId: '', paymentPolicyId: '', returnPolicyId: '' },
    etsyListingId: text(raw.listing_id),
    ebayItemId: '',
  }
}

// The console's slug rule (schema.js slugify), so a Listing made here is
// named as one made in the editor would be.
export function slugify(t) {
  return String(t ?? '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}
