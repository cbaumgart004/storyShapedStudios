// Puts everything the site shows into the Edge of the Map console, so the owner
// can edit all of it. Safe to re-run: what is already there is left alone.
//
//   - Pages (lib/builtInPages.js): Home, Meet the Artist, Library, Shop, created
//     and published when the console has no page with that slug.
//   - Pages saved with the retired components (Text section, Portrait row,
//     Artist story, Framed photo) are rewritten as Cards (lib/cards.js) with the
//     same section ids; a page that was live is published again, one with
//     unpublished edits is saved as a draft and named.
//   - Theme: created blank when there is none. Blank is the site's own look
//     exactly; the editor shows each current value as the field's hint.
//   - Site header and footer: created from the schema's defaults (social and
//     shop links, copyright) when there is none; given the copyright fields when
//     it has none yet.
//   - Draft pages (DRAFT_PAGES: Shop, Images): created as drafts, never
//     published by this script; a Shop page already live goes back to a draft.
//   - Menu: created when there is none, from the menu as shipped, each item
//     naming its Page (Glossary by address); Shop's item is hidden from
//     visitors until the Shop page is published.
//
// The Glossary has its own script (import-glossary.mjs); Library entries were
// loaded by import-library.mjs.
//
//   EOTM_TOKEN=<editor token> node scripts/seed-editor.mjs             (bash)
//   $env:EOTM_TOKEN = '<editor token>'; node scripts/seed-editor.mjs   (PowerShell)
//
// The token: "Copy an editor token" on Manage (8 hours, this site only). Run it
// after the site's schema is reloaded on Manage.

import { BUILT_IN_PAGES, DRAFT_PAGES } from '../src/lib/builtInPages.js'
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

// Pages not ready for visitors: drafts the owner publishes when satisfied.
const after = await call('GET', '/documents?type=page')
for (const [slug, data] of Object.entries(DRAFT_PAGES)) {
  const doc = after.find((d) => d.slug === slug)
  if (!doc) {
    await call('POST', '/documents', { type: 'page', slug, data })
    console.log(`page       ${slug}: created as a draft`)
  } else if (doc.status !== 'draft') {
    await call('POST', `/documents/${doc.id}/unpublish`, { baseVersion: doc.version })
    console.log(`page       ${slug}: taken back to a draft`)
  }
}

// Theme, and the Site header and footer (one of each)
for (const [type, data, label] of [['theme', {}, 'theme'], ['siteSettings', {}, 'header and footer']]) {
  if ((await call('GET', `/documents?type=${type}`)).length) {
    console.log(`${label.padEnd(10)} already there`)
    continue
  }
  await createAndPublish({ type, data })
  console.log(`${label.padEnd(10)} created and published`)
}

// The copyright line, for a Site header and footer made before it existed.
const [settings] = await call('GET', '/documents?type=siteSettings')
if (settings && settings.data?.copyrightOwner == null) {
  const saved = await call('PUT', `/documents/${settings.id}`, {
    baseVersion: settings.version,
    data: { ...settings.data, copyrightOwner: 'StoryShaped Studios', copyrightNotice: 'All rights reserved.' },
  })
  if (settings.status === 'published') await call('POST', `/documents/${settings.id}/publish`, { baseVersion: saved.version })
  console.log('copyright  added to the header and footer')
}

// The Menu, from the menu as shipped, each item naming its Page.
if (!(await call('GET', '/documents?type=menu')).length) {
  const pages = new Map((await call('GET', '/documents?type=page')).map((d) => [d.slug, d.id]))
  const item = (_id, label, slug, extra = {}) => ({ _id, page: pages.get(slug) ?? null, label, url: '', soon: false, ...extra })
  const items = [
    item('nav-1', 'Home', 'home'),
    item('nav-2', 'Library', 'library'),
    { _id: 'nav-3', page: null, label: 'Glossary', url: '/glossary', soon: false },
    item('nav-4', 'Images', 'images', { soon: true }),
    item('nav-5', 'Meet the Artist', 'meet-the-artist'),
    item('nav-6', 'Shop', 'shop'),
  ]
  await createAndPublish({ type: 'menu', data: { items } })
  console.log('menu       created and published (Shop hidden until its page is published)')
}
