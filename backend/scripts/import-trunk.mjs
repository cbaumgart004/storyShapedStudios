// Sends rows read off Trunk's Inventory list to the backend's Trunk import
// (POST /api/inventory/import/trunk, utils/stock.js importTrunk). Every row is
// kept as an Import Snapshot; only SKUs the site does not have yet become Stock
// Items, and variant groups are skipped (their variants become a Listing's
// Variations).
//
//   API_URL=https://<backend> EOTM_TOKEN=<editor token> node scripts/import-trunk.mjs trunk.json
//   (trunk.json as saved from Trunk on 2026-09-30: 496 products, 2,043 variants)
//
// trunk.json: [{ "title", "sku", "stock", "variants"?, ... }], one row per Trunk variant;
// any other field (option, product, the raw Trunk record) is kept in the snapshot.
// EOTM_TOKEN: "Copy an editor token" on the console's Manage page (8 hours, this
// site only). Pass it in the command, never in a file.

import { readFile } from 'node:fs/promises'

const [file] = process.argv.slice(2)
const api = process.env.API_URL
const token = process.env.EOTM_TOKEN
if (!file || !api || !token) {
  console.error('usage: API_URL=... EOTM_TOKEN=... node scripts/import-trunk.mjs trunk.json')
  process.exit(1)
}

// Either rows as below, or Trunk's own products as read from its app (each with
// a `variants` array): those become one row per variant, the Stock Item a
// Listing Variation names, with the raw Trunk record kept for the snapshot.
const read = JSON.parse(await readFile(file, 'utf8'))
const rows = Array.isArray(read?.[0]?.variants)
  ? read.flatMap(({ variants, ...product }) => variants.map((v) => ({
    title: variants.length > 1 ? `${product.name} (${v.name})` : product.name,
    sku: v.sku, stock: v.onHand, option: variants.length > 1 ? v.name : null,
    product: product.sku, trunk: { product, variant: v },
  })))
  : read
// In batches: the server's JSON body limit is Express's default 100 KB, and a
// row carries its raw Trunk record for the snapshot.
const BATCH = 50
const totals = { created: [], existing: [], groups: [], invalid: [] }
for (let i = 0; i < rows.length; i += BATCH) {
  const res = await fetch(`${api.replace(/\/$/, '')}/api/inventory/import/trunk`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify(rows.slice(i, i + BATCH)),
  })
  const out = await res.json().catch(() => ({}))
  if (!res.ok) {
    console.error(`Import refused at row ${i} (${res.status}): ${out.error ?? 'no detail'}. Rows before it are in; rerunning skips them as existing.`)
    process.exit(1)
  }
  for (const k of Object.keys(totals)) totals[k].push(...(out[k] ?? []))
  process.stdout.write(`
${Math.min(i + BATCH, rows.length)} of ${rows.length}`)
}
console.log()
for (const [what, skus] of Object.entries(totals)) console.log(`${what}: ${skus.length}${skus.length ? ` (${skus.slice(0, 10).join(', ')}${skus.length > 10 ? ', …' : ''})` : ''}`)
