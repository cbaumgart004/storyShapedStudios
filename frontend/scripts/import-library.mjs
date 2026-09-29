// Copies every library.md entry into the Edge of the Map console as a published
// Library entry, in library.md's order, so the console becomes the Library's one
// source. A question with no answer yet arrives as a draft, since publishing
// needs a body. Safe to re-run: a title the console already has is skipped.
//
//   node scripts/import-library.mjs --dry-run          # parse and render only
//   EOTM_TOKEN=<editor token> node scripts/import-library.mjs
//
// The token is the editor token the console keeps for this tab: on the site with
// the editor open, run sessionStorage.getItem('eotm:token:storyshaped') in the
// browser's developer console. It lasts 8 hours and edits only this site.
//
// Each entry's body is rendered to HTML the way the Library renders library.md
// (bare URLs linked, external links opening a new tab); the API sanitizes it on
// save like any edit. Images stay at their /library-media/ paths in the build.

import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ReactMarkdown from 'react-markdown'
import { parseSections } from '../src/lib/libraryMarkdown.js'
import { slugify } from '../src/lib/librarySlug.js'

const API = process.env.EOTM_API ?? 'https://admin.theedgeofthemap.com/api/sites/storyshaped'
const dryRun = process.argv.includes('--dry-run')
const token = process.env.EOTM_TOKEN

const components = {
  a: ({ node, href = '', children }) =>
    createElement('a', /^https?:\/\//i.test(href) ? { href, target: '_blank', rel: 'noopener noreferrer' } : { href }, children),
}
const toHtml = (md) => (md.trim() ? renderToStaticMarkup(createElement(ReactMarkdown, { components }, md)) : '')

const sections = parseSections(readFileSync(new URL('../public/library.md', import.meta.url), 'utf8'))
// "^" puts the first at the start; each later one follows the one before it,
// keyed as the Library keys entries (slugify of the title).
const entries = sections.map((s, i) => ({
  title: s.title,
  body: toHtml(s.body),
  after: i === 0 ? '^' : slugify(sections[i - 1].title),
}))

if (dryRun) {
  for (const e of entries) console.log(`${e.after.padEnd(40)} → ${e.title} (${e.body.length} chars)`)
  console.log(`${entries.length} entries parsed; nothing sent.`)
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
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${data.error ?? ''} ${(data.errors ?? []).join('; ')}`.trim())
  return data
}

const existing = new Set((await call('GET', '/documents?type=libraryArticle')).map((d) => (d.data?.title ?? '').trim()))
let published = 0
let drafted = 0
for (const e of entries) {
  if (existing.has(e.title)) {
    console.log(`skip  ${e.title} (already in the console)`)
    continue
  }
  const doc = await call('POST', '/documents', { type: 'libraryArticle', data: { title: e.title, body: e.body, after: e.after } })
  if (e.body) {
    await call('POST', `/documents/${doc.id}/publish`, { baseVersion: doc.version })
    published++
    console.log(`published  ${e.title}`)
  } else {
    drafted++
    console.log(`draft      ${e.title} (no answer yet)`)
  }
}
console.log(`${published} published, ${drafted} drafts, ${entries.length - published - drafted} skipped.`)
