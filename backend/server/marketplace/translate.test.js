import { test } from 'node:test'
import assert from 'node:assert/strict'
import { toEtsy, toEbay, ETSY_CUSTOM_PROPERTY } from './translate.js'
import { taxonomyId } from './etsy.js'

const RING = {
  title: 'Sterling Blue Uranium Glass Ring Solitaire',
  description: 'A sapphire blue uranium glass gem in a 925 sterling silver solitaire ring.',
  photos: [{ src: '/assets/ring-day.webp', index: 'Light' }],
  section: 'Uranium Glass Rings',
  etsyCategory: 'Jewelry < Rings < Statement Rings',
  ebayCategoryId: '164343',
  tags: [{ tag: 'uranium glass ring' }],
  materials: [{ material: 'sterling silver' }],
  whoMade: 'i_did', whenMade: 'made_to_order', isSupply: false,
  variationName: 'Ring size',
  variations: [
    { option: '7 US', sku: 'RING-7', price: { amount: 14900, currency: 'USD' } },
    { option: '8 US', sku: 'RING-8', price: { amount: 14900, currency: 'USD' }, ebayPrice: { amount: 15900, currency: 'USD' } },
  ],
}
const STOCK = new Map([['RING-7', { quantity: 2 }], ['RING-8', { quantity: 0.5 }]])
const ETSY = { taxonomyId: 1234, shopSectionId: 9, defaults: { shippingProfileId: '77' } }
const EBAY = {
  imageUrls: ['https://storyshapedstudios.com/assets/ring-day.webp'], groupKey: 'ring',
  defaults: { condition: 'NEW', fulfillmentPolicyId: 'f', paymentPolicyId: 'p', returnPolicyId: 'r' }, merchantLocationKey: 'studio',
}

test('Etsy: one listing, a product per Variation on the custom property, whole units only', () => {
  const { problems, listing, inventory } = toEtsy(RING, STOCK, ETSY)
  assert.deepEqual(problems, [])
  assert.equal(listing.quantity, 2)
  assert.equal(listing.price, 149)
  assert.deepEqual(inventory.products.map((p) => [p.sku, p.property_values[0].values[0], p.offerings[0].quantity, p.offerings[0].is_enabled]),
    [['RING-7', '7 US', 2, true], ['RING-8', '8 US', 0, false]])
  assert.deepEqual(inventory.sku_on_property, [ETSY_CUSTOM_PROPERTY])
})

test('a SKU with no Stock Item, an unnamed option or no Etsy ids is a problem, not a push', () => {
  const { problems } = toEtsy({ ...RING, variations: [...RING.variations, { option: '', sku: 'NOPE', price: { amount: 100 } }] }, STOCK, {})
  assert.ok(problems.includes('SKU NOPE is not a Stock Item.'))
  assert.ok(problems.includes('Several Variations need an Option on each.'))
  assert.ok(problems.some((p) => p.startsWith('Etsy category')))
  assert.ok(problems.some((p) => p.startsWith('No Etsy shipping profile')))
})

test('Etsy refuses a Listing with nothing in stock', () => {
  const { problems } = toEtsy(RING, new Map([['RING-7', { quantity: 0 }], ['RING-8', { quantity: 0 }]]), ETSY)
  assert.deepEqual(problems, ['Nothing in stock: Etsy needs at least one unit to list.'])
})

test('eBay: an item and offer per Variation, grouped by the Variation name, eBay price when set', () => {
  const { problems, items, group, offers } = toEbay(RING, STOCK, EBAY)
  assert.deepEqual(problems, [])
  assert.deepEqual(items[0].body.product.aspects, { 'Ring size': ['7 US'] })
  assert.deepEqual(group.body.variesBy.specifications, [{ name: 'Ring size', values: ['7 US', '8 US'] }])
  assert.deepEqual(offers.map((o) => o.body.pricingSummary.price.value), ['149.00', '159.00'])
})

test('eBay needs a category, policies and https photos', () => {
  const { problems } = toEbay({ ...RING, ebayCategoryId: '' }, STOCK, { ...EBAY, defaults: { condition: 'NEW' }, imageUrls: ['/assets/x.webp'] })
  assert.deepEqual(problems, ['No eBay category id.', 'eBay business policies missing: set them under eBay only, or EBAY_*_POLICY_ID.', 'eBay needs photos at https addresses (PUBLIC_SITE_URL).'])
})

test('an Etsy category path finds its taxonomy node by name', () => {
  const nodes = [{ id: 1, name: 'Jewelry', children: [{ id: 2, name: 'Rings', children: [{ id: 3, name: 'Statement Rings', children: [] }] }] }]
  assert.equal(taxonomyId(nodes, 'Jewelry < Rings < Statement Rings'), 3)
  assert.equal(taxonomyId(nodes, 'Jewelry < Necklaces'), null)
})

test("the Listing's own Etsy and eBay details win over the shop's defaults", () => {
  const listing = {
    ...RING, condition: 'USED_EXCELLENT', conditionNote: 'Light wear.',
    package: { weight: 2, weightUnit: 'oz', length: 4, width: 3, height: 1, dimensionUnit: 'in' },
    etsy: { shippingProfileId: '555', styles: [{ style: 'Art Deco' }], autoRenew: false },
    ebay: { title: 'Blue Uranium Glass Ring', paymentPolicyId: 'p2', bestOffer: true, itemSpecifics: [{ name: 'Metal', value: 'Sterling Silver' }] },
  }
  const etsy = toEtsy(listing, STOCK, ETSY).listing
  assert.equal(etsy.shipping_profile_id, 555)
  assert.deepEqual(etsy.styles, ['Art Deco'])
  assert.equal(etsy.should_auto_renew, false)
  assert.deepEqual([etsy.item_weight, etsy.item_weight_unit, etsy.item_dimensions_unit], [2, 'oz', 'in'])
  const ebay = toEbay(listing, STOCK, EBAY)
  assert.equal(ebay.items[0].body.condition, 'USED_EXCELLENT')
  assert.equal(ebay.items[0].body.conditionDescription, 'Light wear.')
  assert.deepEqual(ebay.items[0].body.packageWeightAndSize.weight, { value: 2, unit: 'OUNCE' })
  assert.deepEqual(ebay.items[1].body.product.aspects, { Metal: ['Sterling Silver'], 'Ring size': ['8 US'] })
  assert.equal(ebay.group.body.title, 'Blue Uranium Glass Ring')
  assert.equal(ebay.offers[0].body.listingPolicies.paymentPolicyId, 'p2')
  assert.deepEqual(ebay.offers[0].body.listingPolicies.bestOfferTerms, { bestOfferEnabled: true })
})

test("eBay's required item specifics are named when missing; the variation aspect counts", () => {
  const { problems } = toEbay(RING, STOCK, { ...EBAY, requiredAspects: ['Brand', 'Ring size'] })
  assert.deepEqual(problems, ['eBay requires these item specifics for category 164343: Brand.'])
})
