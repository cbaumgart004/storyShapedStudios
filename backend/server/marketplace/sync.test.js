// Runs marketplace/sync.js against PGlite, with Etsy and eBay stubbed.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PGlite } from '@electric-sql/pglite'
import { createStock, resetStockTablesForTests } from '../utils/stock.js'
import { createSync } from './sync.js'

function poolFor(pg) {
  const query = async (text, params) => {
    const r = await pg.query(text, params)
    return { rows: r.rows, rowCount: r.affectedRows ?? r.rows.length }
  }
  return { query, connect: async () => ({ query, release() {} }) }
}

async function fresh(env, { etsy = {}, ebay = {} } = {}) {
  const pg = new PGlite()
  resetStockTablesForTests()
  const db = poolFor(pg)
  const stock = createStock(db)
  const sent = []
  const record = (name) => async (...args) => { sent.push([name, ...args]); return {} }
  const sync = createSync({
    db, stock, env,
    etsy: { receipts: async () => ({ results: [] }), setInventory: record('etsy.setInventory'), ...etsy },
    ebay: { orders: async () => ({ orders: [] }), setQuantities: record('ebay.setQuantities'), ...ebay },
  })
  return { db, stock, sync, sent }
}

const ORDER = { orders: [{ orderId: 'O1', lineItems: [{ lineItemId: 'L1', sku: 'RING-7', quantity: 1 }] }] }

test('an eBay sale lowers the Stock Item once, however often it is pulled, and is pushed to Etsy', async () => {
  const { db, stock, sync, sent } = await fresh({ MARKETPLACE_SYNC: 'on' }, {
    ebay: { orders: async () => ORDER },
    etsy: {
      receipts: async () => ({ results: [] }),
      inventory: async () => ({ products: [{ sku: 'RING-7', property_values: [], offerings: [{ quantity: 3, price: { amount: 14900, divisor: 100 } }] }], price_on_property: [], quantity_on_property: [], sku_on_property: [] }),
    },
  })
  const ring = await stock.create({ name: 'Ring 7', sku: 'RING-7', sellable: true, quantity: 3 })
  await sync.pushQuantities([]) // creates the tables
  await db.query(`INSERT INTO marketplace_links (provider, sku, listing_doc_id, external_id) VALUES ('etsy', 'RING-7', 'd1', '555')`)

  const first = await sync.pullSales()
  assert.deepEqual(first.ebay.map((l) => l.outcome), ['recorded'])
  assert.equal((await stock.get(ring.id)).quantity, 2)
  const [, listingId, body] = sent.find((s) => s[0] === 'etsy.setInventory')
  assert.equal(listingId, '555')
  assert.equal(body.products[0].offerings[0].quantity, 2)

  const again = await sync.pullSales()
  assert.deepEqual(again.ebay.map((l) => l.outcome), ['already recorded'])
  assert.equal((await stock.get(ring.id)).quantity, 2)
})

test('off, a sale is reported and nothing moves or is sent', async () => {
  const { stock, sync, sent } = await fresh({}, { ebay: { orders: async () => ORDER } })
  const ring = await stock.create({ name: 'Ring 7', sku: 'RING-7', sellable: true, quantity: 3 })
  const out = await sync.pullSales()
  assert.deepEqual(out.ebay.map((l) => l.outcome), ['dry run'])
  assert.equal((await stock.get(ring.id)).quantity, 3)
  assert.deepEqual(sent, [])
})

test('a sale of a SKU with no Stock Item is kept, not lost', async () => {
  const { stock, sync } = await fresh({ MARKETPLACE_SYNC: 'on' }, { ebay: { orders: async () => ORDER } })
  await stock.list() // creates the stock tables
  const out = await sync.pullSales()
  assert.deepEqual(out.ebay.map((l) => l.outcome), ['no stock item'])
})

test('a snapshot keeps only new or changed listings, and drops repeats left by earlier refreshes', async () => {
  const { db, sync } = await fresh({})
  const a = { listing_id: 1, title: 'Ring', views: 5 }
  const b = { listing_id: 2, title: 'Bead', views: 1 }
  assert.equal((await sync.snapshot('etsy', [a, b])).kept, 2)
  // A repeat stored the old way, before a refresh kept only changes.
  await db.query(`INSERT INTO import_snapshots (source, external_key, raw, outcome) VALUES ('etsy', '1', $1, 'snapshot')`, [JSON.stringify({ ...a, views: 9 })])
  const out = await sync.snapshot('etsy', [{ ...a, views: 40 }, { ...b, title: 'Glass bead' }, { listing_id: 3, title: 'New' }])
  assert.deepEqual([out.kept, out.unchanged], [2, 1])
  const { rows } = await db.query(`SELECT external_key, raw->>'title' AS title FROM import_snapshots ORDER BY id`)
  assert.deepEqual(rows.map((r) => `${r.external_key}:${r.title}`), ['1:Ring', '2:Bead', '2:Glass bead', '3:New'])
})

test("the editor's choices are the shop's section titles and every category path, or null without Etsy", async () => {
  const etsy = {
    sections: async () => ({ results: [{ shop_section_id: 2, title: 'Rings' }, { shop_section_id: 1, title: 'Beads' }] }),
    taxonomy: async () => ({ results: [{ id: 1, name: 'Jewelry', children: [{ id: 2, name: 'Rings', children: [] }] }] }),
  }
  const { sync } = await fresh({}, { etsy })
  assert.deepEqual(await sync.etsyChoices('sections'), [{ value: 'Beads', label: 'Beads' }, { value: 'Rings', label: 'Rings' }])
  assert.deepEqual((await sync.etsyChoices('categories')).map((o) => o.value), ['Jewelry', 'Jewelry < Rings'])

  const down = await fresh({}, { etsy: { sections: async () => { throw new Error('no sign-in') }, taxonomy: etsy.taxonomy } })
  assert.equal(await down.sync.etsyChoices('sections'), null)
})

test('the import makes a draft Listing per Etsy listing once, mapped field by field, and leaves Listings already made', async () => {
  const etsy = {
    sections: async () => ({ results: [{ shop_section_id: 7, title: 'Uranium Glass Rings' }] }),
    taxonomy: async () => ({ results: [{ id: 1, name: 'Jewelry', children: [{ id: 2, name: 'Rings', children: [] }] }] }),
  }
  const { db, sync } = await fresh({}, { etsy })
  // The console's own table (its migration 001), as in each site's database.
  await db.query(`CREATE TABLE documents (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), type text NOT NULL, slug text NOT NULL,
    status text NOT NULL, version integer NOT NULL, data jsonb NOT NULL, published_data jsonb, published_at timestamptz,
    updated_at timestamptz NOT NULL DEFAULT now(), updated_by text, UNIQUE (type, slug))`)
  await db.query(`CREATE TABLE document_revisions (id bigserial PRIMARY KEY, document_id uuid NOT NULL, version integer NOT NULL,
    data jsonb NOT NULL, author text, created_at timestamptz NOT NULL DEFAULT now())`)
  const ring = {
    listing_id: 11, title: 'Blue Ring', description: 'Glows.', shop_section_id: 7, taxonomy_id: 2,
    tags: ['uranium glass'], materials: ['silver'], who_made: 'i_did', when_made: 'made_to_order', is_supply: false,
    item_weight: 2, item_weight_unit: 'oz', shipping_profile_id: 555, style: ['Art Deco'], should_auto_renew: true,
    images: [{ url_fullxfull: 'https://i.etsystatic.com/a.jpg', alt_text: 'Ring' }],
    inventory: { products: [
      { sku: 'RING-7', property_values: [{ property_name: 'Ring size', values: ['7'] }], offerings: [{ price: { amount: 14900, divisor: 100, currency_code: 'USD' } }] },
      { sku: '', property_values: [{ property_name: 'Ring size', values: ['8'] }], offerings: [{ price: { amount: 15900, divisor: 100, currency_code: 'USD' } }] },
    ] },
  }
  await sync.snapshot('etsy', [ring, { listing_id: 12, title: 'Blue Ring', price: { amount: 500, divisor: 100, currency_code: 'USD' } }])
  // One made in the editor already holds listing 12.
  await db.query(`INSERT INTO documents (type, slug, status, version, data) VALUES ('listing', 'mine', 'draft', 1, '{"etsyListingId":"12"}')`)

  const out = await sync.importEtsyListings({ id: 'u1' })
  assert.deepEqual([out.created, out.existing, out.withoutSku], [1, 1, 1])
  const { rows: [doc] } = await db.query(`SELECT slug, status, published_data, data FROM documents WHERE data->>'etsyListingId' = '11'`)
  assert.equal(doc.slug, 'blue-ring')
  assert.equal(doc.status, 'draft')
  assert.equal(doc.published_data, null)
  const d = doc.data
  assert.deepEqual([d.section, d.etsyCategory, d.variationName, d.etsy.shippingProfileId], ['Uranium Glass Rings', 'Jewelry < Rings', 'Ring size', '555'])
  assert.deepEqual(d.variations.map((v) => [v.option, v.sku, v.price.amount]), [['7', 'RING-7', 14900], ['8', '', 15900]])
  assert.deepEqual(d.photos, [{ src: 'https://i.etsystatic.com/a.jpg', index: 'Light', alt: 'Ring' }])
  assert.deepEqual([d.tags[0].tag, d.etsy.styles[0].style, d.package.weight], ['uranium glass', 'Art Deco', 2])
  assert.equal((await db.query('SELECT count(*)::int AS n FROM document_revisions')).rows[0].n, 1)

  // Again: nothing new.
  assert.equal((await sync.importEtsyListings()).created, 0)
})

test('a check finds the category and section on Etsy without ETSY_SHOP_ID, and says so when Etsy cannot be asked', async () => {
  const etsy = {
    sections: async () => ({ results: [{ shop_section_id: 7, title: 'Uranium Gems and Cabs' }] }),
    taxonomy: async () => ({ results: [{ id: 1, name: 'Craft Supplies & Tools', children: [{ id: 2, name: 'Cabochons', children: [] }] }] }),
  }
  const listing = {
    title: 'Cab', section: 'Uranium Gems and Cabs', etsyCategory: 'Craft Supplies & Tools < Cabochons',
    variations: [{ sku: 'B6F', price: 14.99 }], photos: [{ src: 'https://example.test/a.jpg' }],
  }
  const check = async (etsyStub) => {
    const { db, stock, sync } = await fresh({}, { etsy: etsyStub })
    await stock.create({ name: 'Cab', sku: 'B6F', sellable: true, quantity: 7 })
    await db.query(`CREATE TABLE documents (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), type text NOT NULL, slug text NOT NULL,
      status text NOT NULL, version integer NOT NULL, data jsonb NOT NULL, published_data jsonb)`)
    const { rows: [doc] } = await db.query(`INSERT INTO documents (type, slug, status, version, data) VALUES ('listing', 'cab', 'draft', 1, $1) RETURNING id`, [JSON.stringify(listing)])
    return (await sync.pushListing(doc.id, { check: true })).etsy
  }

  const found = await check(etsy)
  const problems = found.skipped ?? []
  assert.ok(!problems.some((p) => /category|shop section/.test(p)), problems.join(' | '))

  const down = await check({ ...etsy, sections: async () => { throw new Error('no sign-in') } })
  assert.ok(down.skipped.some((p) => p.startsWith('Etsy could not be asked') && p.includes('no sign-in')))
  assert.ok(!down.skipped.some((p) => /matches no Etsy taxonomy node|does not exist in the shop/.test(p)))
})

test('GetSellerList XML is read as text, lists stay lists, and a Failure Ack throws', async () => {
  const { createEbay } = await import('./ebay.js')
  const sent = []
  const xml = (body) => async (url, init) => { sent.push([url, init]); return { ok: true, status: 200, text: async () => body } }
  const tokens = { loadToken: async () => ({ access_token: 'T' }), saveToken: async () => {} }
  const page = `<?xml version="1.0"?><GetSellerListResponse xmlns="urn:ebay:apis:eBLBaseComponents"><Ack>Warning</Ack>
    <PaginationResult><TotalNumberOfPages>2</TotalNumberOfPages></PaginationResult>
    <ItemArray><Item><ItemID>110</ItemID><SKU>007</SKU><StartPrice currencyID="USD">12.50</StartPrice></Item></ItemArray></GetSellerListResponse>`
  const ebay = createEbay({ fetch: xml(page), env: { EBAY_ENVIRONMENT: 'production' }, tokens })
  const { items, pages } = await ebay.sellerList(1)
  assert.equal(pages, 2)
  assert.deepEqual(items, [{ ItemID: '110', SKU: '007', StartPrice: { '#text': '12.50', '@currencyID': 'USD' } }])
  assert.equal(sent[0][0], 'https://api.ebay.com/ws/api.dll')
  assert.equal(sent[0][1].headers['x-ebay-api-iaf-token'], 'T')
  assert.match(sent[0][1].body, /<GetSellerListRequest[^>]*>.*<IncludeVariations>true<\/IncludeVariations>/)

  const failed = createEbay({ fetch: xml(`<GetSellerListResponse><Ack>Failure</Ack><Errors><SeverityCode>Error</SeverityCode><LongMessage>Auth token is invalid.</LongMessage></Errors></GetSellerListResponse>`), env: {}, tokens })
  await assert.rejects(failed.sellerList(1), /Auth token is invalid/)
})

test('eBay listings like a Listing are suggested, not made; a pair by Listing number fills what the Listing lacks', async () => {
  const items = [
    { ItemID: '201', Title: 'Blue Uranium Ring', Description: '<p>eBay words.</p>', SKU: 'RING-7', Quantity: '5', StartPrice: { '#text': '159.00', '@currencyID': 'USD' },
      ConditionID: '1000', PrimaryCategory: { CategoryID: '1234' }, PictureDetails: { PictureURL: ['https://i.ebayimg.com/r.jpg'] },
      ItemSpecifics: { NameValueList: [{ Name: 'Metal', Value: ['Silver'] }] }, SellingStatus: { ListingStatus: 'Active', QuantitySold: '1' } },
    { ItemID: '202', Title: 'Vaseline Bowl', Description: '<p>Glows.</p>', ConditionID: '3000', ConditionDescription: 'Chip on rim',
      PictureDetails: { PictureURL: ['https://i.ebayimg.com/b.jpg'] },
      ShippingPackageDetails: { WeightMajor: { '#text': '1', '@unit': 'lbs' }, WeightMinor: { '#text': '4', '@unit': 'oz' } },
      SellerProfiles: { SellerShippingProfile: { ShippingProfileID: '9' } },
      Variations: {
        VariationSpecificsSet: { NameValueList: [{ Name: 'Size', Value: ['S', 'L'] }] },
        Variation: [
          { SKU: 'BOWL-S', StartPrice: { '#text': '20', '@currencyID': 'USD' }, VariationSpecifics: { NameValueList: [{ Name: 'Size', Value: ['S'] }] } },
          { SKU: 'BOWL-L', StartPrice: { '#text': '30', '@currencyID': 'USD' }, VariationSpecifics: { NameValueList: [{ Name: 'Size', Value: ['L'] }] } },
        ],
      },
      SellingStatus: { ListingStatus: 'Active' } },
    { ItemID: '203', Title: 'Green Marble', SKU: 'NEW-SKU', ConditionID: '1000', SellingStatus: { ListingStatus: 'Active' } },
    { ItemID: '204', Title: 'Ended', SKU: 'OLD', SellingStatus: { ListingStatus: 'Completed' } },
  ]
  const { db, stock, sync } = await fresh({}, { ebay: { sellerList: async () => ({ items, pages: 1 }) } })
  await db.query(`CREATE TABLE documents (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), type text NOT NULL, slug text NOT NULL,
    status text NOT NULL, version integer NOT NULL, data jsonb NOT NULL, published_data jsonb, published_at timestamptz,
    updated_at timestamptz NOT NULL DEFAULT now(), updated_by text, UNIQUE (type, slug))`)
  await db.query(`CREATE TABLE document_revisions (id bigserial PRIMARY KEY, document_id uuid NOT NULL, version integer NOT NULL,
    data jsonb NOT NULL, author text, created_at timestamptz NOT NULL DEFAULT now())`)
  const ring = { title: 'Blue Ring', description: 'Etsy words.', tags: [{ tag: 'uranium glass' }], photos: [{ src: 'https://i.etsystatic.com/a.jpg', index: 'Light' }],
    channels: { site: true, etsy: true, ebay: false }, etsyListingId: '11', ebayItemId: '', condition: '', ebay: { title: '', itemSpecifics: [] },
    variations: [{ sku: 'RING-7', option: '', price: { amount: 14900, currency: 'USD' }, ebayPrice: { amount: null, currency: 'USD' } }] }
  await db.query(`INSERT INTO documents (type, slug, status, version, data, published_data) VALUES ('listing', 'blue-ring', 'published', 3, $1, $1)`, [JSON.stringify(ring)])
  await db.query(`INSERT INTO documents (type, slug, status, version, data) VALUES ('listing', 'vaseline-bowl', 'draft', 1, '{"title":"Vaseline  bowl!","variations":[]}')`)
  await stock.create({ name: 'Ring 7', sku: 'RING-7', sellable: true, quantity: 3 })

  assert.equal((await sync.snapshotEbay()).kept, 3)
  const out = await sync.importEbayListings({ id: 'u1' })
  assert.deepEqual([out.created, out.existing, out.withoutSku], [1, 0, 0])
  assert.deepEqual(out.suggested.map((s) => [s.externalId, s.listings.map((l) => [l.number, l.slug, l.by.join('+')])]),
    [['201', [[1, 'blue-ring', 'sku']]], ['202', [[2, 'vaseline-bowl', 'title']]]])

  // Every Listing has a number, in the order made, copied into its draft and published data.
  const { rows: numbered } = await db.query(`SELECT slug, data->'listingNumber' AS n, published_data->'listingNumber' AS p FROM documents ORDER BY (data->>'listingNumber')::int`)
  assert.deepEqual(numbered.map((r) => [r.slug, r.n]), [['blue-ring', 1], ['vaseline-bowl', 2], ['green-marble', 3]])
  assert.equal(numbered[0].p, 1)

  const paired = await sync.pairListings([
    { provider: 'ebay', externalId: '201', listing: 1 },
    { provider: 'ebay', externalId: '202', listing: '2' },
    { provider: 'ebay', externalId: '202', listing: 3 },
    { provider: 'ebay', externalId: '201', listing: 99 },
  ], { id: 'u1' })
  assert.equal(paired.paired, 2)
  assert.match(paired.results[2].error, /Listing 3 is already paired with ebay 203/)
  assert.match(paired.results[3].error, /No Listing number 99/)

  const { rows: [r] } = await db.query(`SELECT version, data, published_data FROM documents WHERE slug = 'blue-ring'`)
  const d = r.data
  assert.equal(r.version, 4)
  assert.deepEqual([d.ebayItemId, d.title, d.description, d.ebay.title, d.ebay.description], ['201', 'Blue Ring', 'Etsy words.', 'Blue Uranium Ring', '<p>eBay words.</p>'])
  assert.deepEqual([d.condition, d.ebayCategoryId, d.channels.ebay, d.tags[0].tag, d.photos.length], ['NEW', '1234', true, 'uranium glass', 1])
  assert.deepEqual(d.ebay.itemSpecifics.map(({ name, value }) => [name, value]), [['Metal', 'Silver']])
  assert.deepEqual([d.variations[0].price.amount, d.variations[0].ebayPrice.amount], [14900, 15900])
  assert.equal(r.published_data.ebayItemId, '', 'the published copy waits for Publish')
  assert.deepEqual(paired.results[0].quantities, [{ sku: 'RING-7', ebay: 4, stock: 3 }])
  assert.ok(paired.results[0].kept.includes('photos (ebay has 1)'))

  const { rows: [bowl] } = await db.query(`SELECT data FROM documents WHERE slug = 'vaseline-bowl'`)
  const b = bowl.data
  assert.deepEqual([b.title, b.ebay.title, b.description, b.photos[0].src, b.package.weight, b.ebay.fulfillmentPolicyId],
    ['Vaseline  bowl!', 'Vaseline Bowl', '<p>Glows.</p>', 'https://i.ebayimg.com/b.jpg', 20, '9'])
  assert.deepEqual(b.variations.map((v) => [v.option, v.sku, v.price.amount]), [['S', 'BOWL-S', 2000], ['L', 'BOWL-L', 3000]])

  // Again: all held, nothing suggested, and a number an editor save dropped comes back.
  await db.query(`UPDATE documents SET data = data - 'listingNumber' WHERE slug = 'blue-ring'`)
  items[0].SellingStatus = { ListingStatus: 'Active', QuantitySold: '2' }
  assert.equal((await sync.snapshotEbay()).kept, 0)
  const again = await sync.importEbayListings()
  assert.deepEqual([again.created, again.existing, again.suggested.length], [0, 3, 0])
  assert.equal((await db.query(`SELECT data->'listingNumber' AS n FROM documents WHERE slug = 'blue-ring'`)).rows[0].n, 1)
})

test('pairing with Etsy makes its price the shared one and keeps the other as the eBay price; quantity is never written', async () => {
  const { fillListing } = await import('./pairing.js')
  const listing = { title: 'Ring', variations: [{ sku: 'R', price: { amount: 15900 }, ebayPrice: { amount: null }, quantity: 9 }], etsy: { title: 'Old Etsy title' } }
  const incoming = { title: 'Ring for Etsy', tags: [{ tag: 'glow' }], etsyListingId: '11', etsy: {}, variations: [{ sku: 'R', price: { amount: 14900 } }] }
  const { data, filled, kept } = fillListing(listing, incoming, 'etsy')
  assert.deepEqual([data.variations[0].price.amount, data.variations[0].ebayPrice.amount, data.variations[0].quantity], [14900, 15900, 9])
  assert.deepEqual([data.etsyListingId, data.tags[0].tag, data.etsy.title, data.channels.etsy], ['11', 'glow', 'Old Etsy title', true])
  assert.ok(filled.includes('tags') && kept.includes('etsy.title'))
})
