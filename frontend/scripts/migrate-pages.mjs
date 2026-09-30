// Rewrites every console page saved with the retired components (Text section,
// Portrait row, Artist story, Framed photo) into Cards (src/lib/cards.js,
// toCard), keeping each section's id so its Page layout still applies. A page
// that was live with no unpublished edits is published again, so what visitors
// see stays the same; a page with unpublished edits is saved as a draft only
// and named, since publishing it would also publish those edits. Safe to
// re-run: a page with nothing retired is left alone.
//
//   EOTM_TOKEN=<editor token> node scripts/migrate-pages.mjs            (bash)
//   $env:EOTM_TOKEN = '<editor token>'; node scripts/migrate-pages.mjs  (PowerShell)
//
// Run after the site's schema is reloaded on Manage (the console must know Card).

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

for (const doc of await call('GET', '/documents?type=page')) {
  const sections = doc.data?.sections ?? []
  if (!sections.some((b) => RETIRED.includes(b._type))) {
    console.log(`ok         ${doc.slug}`)
    continue
  }
  const saved = await call('PUT', `/documents/${doc.id}`, { baseVersion: doc.version, data: { ...doc.data, sections: sections.map(toCard) } })
  if (doc.status === 'published') {
    await call('POST', `/documents/${doc.id}/publish`, { baseVersion: saved.version })
    console.log(`migrated   ${doc.slug} (published)`)
  } else {
    console.log(`migrated   ${doc.slug} (draft only: it had unpublished edits; publish it from the editor)`)
  }
}
