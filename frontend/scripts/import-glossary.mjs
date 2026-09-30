// Copies the shipped Glossary into the Edge of the Map console as its Reference
// Page Layout for /glossary, published, so the console becomes the Glossary's
// one source. Each source gets the readable title the page would make from its
// address, so the owner sees it in the editor and can change it. Safe to re-run:
// a Reference Page Layout for /glossary already there is left alone.
//
//   node scripts/import-glossary.mjs --dry-run          # build and count only
//   EOTM_TOKEN=<editor token> node scripts/import-glossary.mjs
//
// The token: "Copy an editor token" on the console's Manage page, or on the site
// with the editor open, sessionStorage.getItem('eotm:token:storyshaped') in the
// browser's developer console. It lasts 8 hours and edits only this site.

import { randomUUID } from 'node:crypto'
import { BUILT_IN } from '../src/lib/glossaryPage.js'
import { describeSource } from '../src/lib/sources.js'

const API = process.env.EOTM_API ?? 'https://admin.theedgeofthemap.com/api/sites/storyshaped'
const dryRun = process.argv.includes('--dry-run')
const token = process.env.EOTM_TOKEN

// Every list row the console stores carries an _id (its click-to-edit key).
const rows = (list, map = (x) => x) => list.map((x) => ({ _id: randomUUID(), ...map(x) }))
const data = {
  ...BUILT_IN,
  sections: rows(BUILT_IN.sections, (sec) => ({
    ...sec,
    terms: rows(sec.terms, (t) => ({
      ...t,
      details: rows(t.details),
      sources: rows(t.sources, (src) => ({ ...src, title: describeSource(src.url, src.title).title })),
    })),
  })),
  libraryIndex: rows(BUILT_IN.libraryIndex, (g) => ({ ...g, entries: rows(g.entries) })),
}

const terms = data.sections.reduce((n, s) => n + s.terms.length, 0)
if (dryRun) {
  console.log(`${data.sections.length} sections, ${terms} terms, ${data.libraryIndex.length} Library index groups; nothing sent.`)
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

const existing = (await call('GET', '/documents?type=referencePage')).find((d) => d.data?.path === '/glossary')
if (existing) {
  console.log(`skip: a Reference Page Layout for /glossary is already in the console ("${existing.data.title}").`)
  process.exit(0)
}
const doc = await call('POST', '/documents', { type: 'referencePage', data })
await call('POST', `/documents/${doc.id}/publish`, { baseVersion: doc.version })
console.log(`published "${data.title}": ${data.sections.length} sections, ${terms} terms.`)
