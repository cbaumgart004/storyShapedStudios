// src/pages/Glossary.jsx
// The page is the console's Reference Page Layout for /glossary (edited in the
// Edge of the Map console; drafts render live). Until one exists, or when the
// console cannot be reached, it is built from the data below in the same shape.
//
// Searchable glossary of uranium-glass terms, sourced from the studio's
// "Glossary of Terms" reference (see src/data/glossaryTerms.js), plus a curated
// index into the Library. The search box filters term titles, definitions, and
// sub-definitions live; a category rail jumps to each section. Library links
// point at /library/<slug> (shared slugify) — each Library entry's own
// shareable URL — so the Library scrolls to that article on arrival. Wrapped
// in .sss-home[data-mode] to inherit
// Home's daylight/blacklight design tokens.

import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useUvMode } from '@/context/UvMode'
import SiteHeader from '@/components/SiteHeader'
import SiteFooter from '@/components/SiteFooter'
import { slugify } from '@/lib/librarySlug'
import { BUILT_IN } from '@/lib/glossaryPage'
import { fetchPublished, useLiveDocuments, textOf } from '@/lib/siteConsole'
import SourceLink from '@/components/SourceLink'
import '@/styles/Glossary.css'

const libLink = (title) => `/library/${slugify(title)}`
const termId = (term) => `term-${slugify(term)}`

function matches(term, q) {
  if (!q) return true
  const has = (v) => String(v ?? '').toLowerCase().includes(q)
  return has(term.term) || has(textOf(term.definition)) || (term.details ?? []).some((d) => has(d.label) || has(d.text))
}

const NONE = []

// A definition is rich text from the console (sanitized by its API on save),
// or plain text from the built-in glossary and the first import.
function Definition({ html }) {
  if (!html) return null
  if (!/^\s*</.test(html)) return <p>{html}</p>
  return <div className="gl-def" dangerouslySetInnerHTML={{ __html: html }} />
}

export default function Glossary() {
  const { mode } = useUvMode()
  const [query, setQuery] = useState('')
  const [published, setPublished] = useState(NONE)
  useEffect(() => {
    let active = true
    fetchPublished('referencePage').then((docs) => active && setPublished(docs))
    return () => { active = false }
  }, [])
  const doc = useLiveDocuments('referencePage', published).find((d) => d.data?.path === '/glossary')
  const page = doc?.data ?? BUILT_IN
  const allTerms = useMemo(() => (page.sections ?? []).flatMap((sec) => sec.terms ?? []), [page])

  const q = query.trim().toLowerCase()

  // Matching terms, section by section in the page's order.
  const grouped = useMemo(() => (page.sections ?? [])
    .map((sec) => ({ category: sec.heading, terms: (sec.terms ?? []).filter((t) => matches(t, q)) }))
    .filter((g) => g.terms.length > 0), [page, q])

  const total = useMemo(
    () => grouped.reduce((n, g) => n + g.terms.length, 0),
    [grouped]
  )

  const jumpTo = (id) => {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="sss-home glossary-page" data-mode={mode}>
      <SiteHeader />

      <div className="gl-shell" {...(doc ? { 'data-eotm-edit': `referencePage:${doc.id}`, 'data-eotm-label': page.title } : {})}>
        <header className="gl-hero">
          {page.eyebrow && <p className="eyebrow">{page.eyebrow}</p>}
          <h1>{page.title}</h1>
          {page.intro && <p className="gl-hero-sub">{page.intro}</p>}
          <p className="gl-hero-sub">
            {allTerms.length} terms on uranium glass, jewelry, gems, and
            metals — search or browse by category. Looking for the how-to
            articles? Visit the{' '}
            <Link to="/library" className="gl-inline-link">
              Library
            </Link>
            .
          </p>
        </header>

        {/* ---------- Search ---------- */}
        <div className="gl-controls">
          <label className="gl-search">
            <span className="gl-search-icon" aria-hidden="true">⌕</span>
            <input
              type="search"
              placeholder="Search terms and definitions…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search the glossary"
            />
            {q && (
              <button
                type="button"
                className="gl-search-clear"
                onClick={() => setQuery('')}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </label>
          <p className="gl-count" aria-live="polite">
            {total} {total === 1 ? 'term' : 'terms'}
            {q && ' match'}
          </p>
        </div>

        {/* ---------- Category rail (hidden while searching) ---------- */}
        {!q && (
          <nav className="gl-catrail" aria-label="Jump to category">
            {grouped.map((g) => (
              <button
                key={g.category}
                type="button"
                className="gl-cat-chip"
                onClick={() => jumpTo(`cat-${slugify(g.category)}`)}
              >
                {g.category}
                <span className="gl-cat-chip-count">{g.terms.length}</span>
              </button>
            ))}
          </nav>
        )}

        {/* ---------- Terms ---------- */}
        {grouped.map((g) => (
          <section
            key={g.category}
            className="gl-section"
            id={`cat-${slugify(g.category)}`}
            aria-labelledby={`h-${slugify(g.category)}`}
          >
            <p className="eyebrow" id={`h-${slugify(g.category)}`}>
              {g.category}
            </p>
            <div className="gl-term-grid">
              {g.terms.map((t) => (
                <article className="gl-card" id={termId(t.term)} key={t._id ?? t.term}
                  {...(doc ? { 'data-eotm-edit': `referencePage:${doc.id}`, 'data-eotm-item': t._id, 'data-eotm-label': t.term } : {})}>
                  <h2>{t.term}</h2>
                  <Definition html={t.definition} />
                  {t.details?.length > 0 && (
                    <ul className="gl-sub">
                      {t.details.map((s) => (
                        <li key={s.label + s.text}>
                          {s.label && <strong>{s.label}: </strong>}
                          {s.text}
                        </li>
                      ))}
                    </ul>
                  )}
                  {t.sources?.length > 0 && (
                    <ul className="gl-links">
                      {t.sources.filter((src) => src.url).map((src) => (
                        <li key={src._id ?? src.url}>
                          <SourceLink url={src.url} title={src.title} />
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              ))}
            </div>
          </section>
        ))}

        {total === 0 && (
          <p className="gl-empty">
            No terms match “{query}”. Try a shorter or different word.
          </p>
        )}

        {/* ---------- Index into the Library ---------- */}
        {!q && page.libraryIndex?.length > 0 && (
          <section className="gl-section" aria-labelledby="gl-index-head">
            <p className="eyebrow" id="gl-index-head">
              Library index
            </p>
            <div className="gl-index-grid">
              {(page.libraryIndex ?? []).map((col) => (
                <div className="gl-index-col" key={col._id ?? col.group}>
                  <h3>{col.group}</h3>
                  <ul>
                    {(col.entries ?? []).map(({ title }) => (
                      <li key={title}>
                        <Link to={libLink(title)}>{title}</Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      <SiteFooter />
    </div>
  )
}
