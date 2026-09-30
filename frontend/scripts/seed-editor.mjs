// Puts everything the site shows into the Edge of the Map console, so the owner
// can edit all of it. Safe to re-run: what is already there is left alone.
//
//   - Pages (lib/builtInPages.js): Home, Meet the Artist, Library, Shop, created
//     and published when the console has no page with that slug.
//   - Pages saved with the retired components (Text section, Portrait row,
//     Artist story, Framed photo) are rewritten as Cards (lib/cards.js) with the
//     same section ids; a page that was live is published again, one with
//     unpublished edits is saved as a draft and named.
//   - Theme: created with the site's current colours (BUILT_IN_THEME) when there
//     is none.
//   - Site header and footer: created from the schema's defaults (the menu,
//     social and shop links as shipped) when there is none.
//
// The Glossary has its own script (import-glossary.mjs); Library entries were
// loaded by import-library.mjs.
//
//   EOTM_TOKEN=<editor token> node scripts/seed-editor.mjs             (bash)
//   $env:EOTM_TOKEN = '<editor token>'; node scripts/seed-editor.mjs   (PowerShell)
//
// The token: "Copy an editor token" on Manage (8 hours, this site only). Run it
// after the site's schema is reloaded on Manage.

import { BUILT_IN_PAGES, BUILT_IN_THEME } from '../src/lib/builtInPages.js'
import { toCard, RETIRED } from '../src/lib/cards.js'

const API = process.env.EOTM_API ?? 'https://admin.theedgeofthemap.com/api/sites/storyshaped'
const token = process.env.EOTM_TOKEN
if (!token) {
  console.error('Set EOTM_TOKEN to an editor token ("Copy an editor token" on Manage).')
  process.exit(1)
}

async function call(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  })
  const out = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${out.error ?? ''} ${(out.errors ?? []).join('; ')}`.trim())
  return out
}
const createAndPublish = async (input) => {
  const doc = await call('POST', '/documents', input)
  await call('POST', `/documents/${doc.id}/publish`, { baseVersion: doc.version })
  return doc
}

// Pages
const pages = await call('GET', '/documents?type=page')
for (const doc of pages) {
  const sections = doc.data?.sections ?? []
  if (!sections.some((b) => RETIRED.includes(b._type))) continue
  const saved = await call('PUT', `/documents/${doc.id}`, { baseVersion: doc.version, data: { ...doc.data, sections: sections.map(toCard) } })
  if (doc.status === 'published') {
    await call('POST', `/documents/${doc.id}/publish`, { baseVersion: saved.version })
    console.log(`page       ${doc.slug}: sections rewritten as Cards, published`)
  } else {
    console.log(`page       ${doc.slug}: sections rewritten as Cards, saved as a draft (it had unpublished edits)`)
  }
}
const slugs = new Set(pages.map((d) => d.slug))
for (const [slug, data] of Object.entries(BUILT_IN_PAGES)) {
  if (slugs.has(slug)) continue
  await createAndPublish({ type: 'page', slug, data })
  console.log(`page       ${slug}: created and published`)
}

// Theme, and the Site header and footer (one of each)
for (const [type, data, label] of [['theme', BUILT_IN_THEME, 'theme'], ['siteSettings', {}, 'header and footer']]) {
  if ((await call('GET', `/documents?type=${type}`)).length) {
    console.log(`${label.padEnd(10)} already there`)
    continue
  }
  await createAndPublish({ type, data })
  console.log(`${label.padEnd(10)} created and published`)
}
