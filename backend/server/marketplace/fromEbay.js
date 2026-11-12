// server/marketplace/fromEbay.js
// One eBay listing, as the Trading API's GetSellerList sent it (an
// import_snapshots row), as the data of a draft Listing (console schema, type
// listing): the eBay counterpart of fromEtsy.js. Values are carried as eBay has
// them, so one the Listing model does not accept stays visible and Publish
// names it, rather than being dropped here.
//
// Not filled, because eBay does not hold them: section, Etsy category, tags,
// materials, who/when made, every Etsy field, Dark photos. The description is
// eBay's HTML as written.

import { randomUUID } from 'node:crypto'

const id = () => randomUUID()
const text = (v) => (v == null ? '' : String(v['#text'] ?? v))
const num = (v) => (v == null || text(v) === '' ? null : Number(text(v)) || null)
const cents = (p) => (num(p) != null ? { amount: Math.round(num(p) * 100), currency: p['@currencyID'] || 'USD' } : { amount: null, currency: 'USD' })

// Trading API ConditionID as the Inventory API condition the Listing holds.
const CONDITIONS = {
  1000: 'NEW', 1500: 'NEW_OTHER', 1750: 'NEW_WITH_DEFECTS', 2000: 'CERTIFIED_REFURBISHED', 2500: 'SELLER_REFURBISHED',
  2750: 'LIKE_NEW', 3000: 'USED_EXCELLENT', 4000: 'USED_VERY_GOOD', 5000: 'USED_GOOD', 6000: 'USED_ACCEPTABLE', 7000: 'FOR_PARTS_OR_NOT_WORKING',
}
const LENGTH = { inches: 'in', centimeters: 'cm' }

const values = (nv) => (nv.Value ?? []).map(text)

export function fromEbay(raw) {
  const vars = raw.Variations?.Variation ?? []
  const names = (raw.Variations?.VariationSpecificsSet?.NameValueList ?? []).map((nv) => text(nv.Name))
  const variations = (vars.length ? vars : [{ SKU: raw.SKU, StartPrice: raw.StartPrice ?? raw.SellingStatus?.CurrentPrice }]).map((v) => ({
    _id: id(),
    option: names.map((n) => values((v.VariationSpecifics?.NameValueList ?? []).find((nv) => text(nv.Name) === n) ?? {}).join(', ')).filter(Boolean).join(' / '),
    sku: text(v.SKU),
    price: cents(v.StartPrice),
    ebayPrice: { amount: null, currency: 'USD' },
    etsyListingId: '',
    ebayItemId: '',
  }))
  const pkg = raw.ShippingPackageDetails ?? {}
  const lb = num(pkg.WeightMajor), oz = num(pkg.WeightMinor)
  const dims = num(pkg.PackageLength) || num(pkg.PackageWidth) || num(pkg.PackageDepth)
  const profiles = raw.SellerProfiles ?? {}
  const condition = text(raw.ConditionID)
  return {
    title: text(raw.Title),
    description: text(raw.Description),
    photos: (raw.PictureDetails?.PictureURL ?? []).slice(0, 10).map((src) => ({ src: text(src), index: 'Light' })),
    channels: { site: false, etsy: false, ebay: true },
    section: '',
    etsyCategory: '',
    ebayCategoryId: text(raw.PrimaryCategory?.CategoryID),
    condition: CONDITIONS[condition] ?? condition,
    conditionNote: text(raw.ConditionDescription),
    tags: [],
    materials: [],
    whoMade: '',
    whenMade: '',
    isSupply: false,
    package: {
      // eBay holds pounds and ounces apart; the Listing holds one weight.
      weight: lb || oz ? (lb ?? 0) * 16 + (oz ?? 0) : null,
      weightUnit: lb || oz ? 'oz' : '',
      length: num(pkg.PackageLength),
      width: num(pkg.PackageWidth),
      height: num(pkg.PackageDepth),
      dimensionUnit: dims ? LENGTH[pkg.PackageLength?.['@unit']] ?? text(pkg.PackageLength?.['@unit']) : '',
    },
    variationName: names.join(' / '),
    variations,
    etsy: { shippingProfileId: '', processingProfileId: '', returnPolicyId: '', styles: [], customizable: false, autoRenew: false },
    ebay: {
      title: '',
      itemSpecifics: (raw.ItemSpecifics?.NameValueList ?? []).map((nv) => ({ _id: id(), name: text(nv.Name), value: values(nv).join(', ') })),
      bestOffer: text(raw.BestOfferDetails?.BestOfferEnabled) === 'true',
      fulfillmentPolicyId: text(profiles.SellerShippingProfile?.ShippingProfileID),
      paymentPolicyId: text(profiles.SellerPaymentProfile?.PaymentProfileID),
      returnPolicyId: text(profiles.SellerReturnProfile?.ReturnProfileID),
    },
    etsyListingId: '',
    ebayItemId: text(raw.ItemID),
  }
}
