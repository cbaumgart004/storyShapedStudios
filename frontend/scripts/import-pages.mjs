// Copies the site's shipped pages (lib/builtInPages.js: Home and Meet the
// Artist) into the Edge of the Map console as published `page` documents, so
// the console becomes their one source. Home's slug is "home". Safe to re-run:
// a page whose slug the console already has is left alone.
//
//   node scripts/import-pages.mjs --dry-run
//   EOTM_TOKEN=<editor token> node scripts/import-pages.mjs      (bash)
//   $env:EOTM_TOKEN = '<editor token>'; node scripts/import-pages.mjs   (PowerShell)
//
// The token: "Copy an editor token" on the console's Manage page. It lasts 8
// hours and edits only this site. The site's schema must be reloaded on Manage
// first, so the console knows the Hero, Portrait row, Artist story and Framed
// photo components.

import { BUILT_IN_PAGES } from '../src/lib/builtInPages.js'

const API = process.env.EOTM_API ?? 'https://admin.theedgeofthemap.com/api/sites/storyshaped'
const dryRun = process.argv.includes('--dry-run')
const token = process.env.EOTM_TOKEN

if (dryRun) {
  for (const [slug, p] of Object.entries(BUILT_IN_PAGES)) console.log(`${slug}: "${p.title}", ${p.sections.map((b) => b._type).join(', ')}`)
  process.exit(0)
}
if (!token) {
  console.error('Set EOTM_TOKEN to an editor token (see the top of this file), or pass --dry-run.')
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

const have = new Set((await call('GET', '/documents?type=page')).map((d) => d.slug))
for (const [slug, data] of Object.entries(BUILT_IN_PAGES)) {
  if (have.has(slug)) {
    console.log(`skip       ${slug} (already in the console)`)
    continue
  }
  const doc = await call('POST', '/documents', { type: 'page', slug, data })
  await call('POST', `/documents/${doc.id}/publish`, { baseVersion: doc.version })
  console.log(`published  ${doc.slug}: "${data.title}"`)
}
