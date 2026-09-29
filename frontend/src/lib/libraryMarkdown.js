// src/lib/libraryMarkdown.js
// library.md split into entries, shared by the Library page and
// scripts/import-library.mjs, which copies the entries into the console. Plain
// JS with relative imports, so Node can run it without Vite.

import { slugify } from './librarySlug.js'

// Whitney's source doc has bare URLs sitting in the prose, and CommonMark
// leaves those as plain text — react-markdown only links them if remark-gfm's
// autolink literals are enabled, which would also switch on tables, task lists
// and strikethrough and change how the rest of her copy parses. Wrapping each
// bare URL in CommonMark's own `<...>` autolink syntax gets the links without
// the dependency or the parsing side effects.
//
// The first alternative swallows a URL that is already a markdown link target
// or an autolink and hands it back untouched, so only genuinely bare URLs reach
// the second. Consuming them rather than testing the preceding character means
// a URL written inside plain parentheses — which Whitney does, citing sources —
// still gets linked. `)` is excluded from the URL itself, so the closing paren
// stays in the prose. No lookbehind: iOS Safari before 16.4 has none, and this
// site is read on phones.
export const URL_SCAN =
  /(\]\(\s*<?https?:\/\/[^\s)]+>?\s*\)|<https?:\/\/[^\s>]+>)|(https?:\/\/[^\s<>()[\]"']+)/g

export function linkifyUrls(md) {
  return md.replace(URL_SCAN, (match, alreadyLinked, bare) => {
    if (alreadyLinked) return alreadyLinked
    // A URL that ends a sentence shouldn't drag the full stop into its href.
    const trailing = bare.match(/[.,;:!?]+$/)
    const href = trailing ? bare.slice(0, -trailing[0].length) : bare
    return `<${href}>${trailing ? trailing[0] : ''}`
  })
}

// Split the markdown into { id, title, body } sections on each "## " heading.
export function parseSections(md) {
  const withoutTitle = md.replace(/^#\s+.*(\r?\n)?/, '')
  const blocks = withoutTitle.split(/\n(?=##\s)/)
  const seen = {}
  return blocks
    .map((block) => {
      const m = block.match(/^##\s+(.*)/)
      if (!m) return null
      const title = m[1].trim()
      let id = slugify(title)
      seen[id] = (seen[id] || 0) + 1
      if (seen[id] > 1) id = `${id}-${seen[id]}`
      return { id, title, body: linkifyUrls(block.slice(m[0].length).trim()) }
    })
    .filter(Boolean)
}
