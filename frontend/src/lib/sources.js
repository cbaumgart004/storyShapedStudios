// src/lib/sources.js
// A readable title and a short address for an outside link (components/SourceLink.jsx,
// scripts/import-glossary.mjs). No React here, so Node can import it.

const WORDS = /[-_+]+/g

// { title, where } for one source. `where` is the host without www, then the
// path, with no scheme, query or trailing slash.
export function describeSource(url, title) {
  let u
  try {
    u = new URL(url)
  } catch {
    return { title: title?.trim() || url, where: '' }
  }
  const host = u.hostname.replace(/^www\./, '').replace(/^en\.m\./, 'en.')
  const path = decodeURIComponent(u.pathname).replace(/\/+$/, '')
  const where = `${host}${path}`
  if (title?.trim()) return { title: title.trim(), where }
  // The last path segment that reads as words, e.g. /wiki/Victorian_jewellery.
  const segment = path.split('/').filter(Boolean).reverse()
    .map((s) => s.replace(/\.(html?|php|aspx?)$/i, '').replace(WORDS, ' ').trim())
    .find((s) => /[a-z]{3}/i.test(s))
  const made = segment ? segment.charAt(0).toUpperCase() + segment.slice(1) : host
  return { title: made, where }
}
