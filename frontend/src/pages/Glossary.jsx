// src/pages/Glossary.jsx
// Searchable glossary of uranium-glass terms, sourced from the studio's
// "Glossary of Terms" reference (see src/data/glossaryTerms.js), plus a curated
// index into the Library. The search box filters term titles, definitions, and
// sub-definitions live; a category rail jumps to each section. Library links
// point at /library/<slug> (shared slugify) — each Library entry's own
// shareable URL — so the Library scrolls to that article on arrival. Wrapped
// in .sss-home[data-mode] to inherit
// Home's daylight/blacklight design tokens.

import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useUvMode } from '@/context/UvMode'
import SiteHeader from '@/components/SiteHeader'
import SiteFooter from '@/components/SiteFooter'
import { slugify } from '@/lib/librarySlug'
import { GLOSSARY_TERMS, CATEGORY_ORDER } from '@/data/glossaryTerms'
import '@/styles/Glossary.css'

// Curated jump-in points into the Library. Each string is the EXACT Library
// heading; slugify() turns it into the same anchor the Library page assigns.
const LIBRARY_INDEX = [
  {
    group: 'Start here',
    items: [
      'What is uranium glass?',
      'Why does uranium glass jewelry matter?',
      'Is uranium glass still made?',
    ],
  },
  {
    group: 'Is it safe?',
    items: [
      'Is uranium glass radioactive?',
      'Is wearing uranium glass safe?',
      'Is uranium the same thing as radium? Have you heard of the Radium Girls?',
    ],
  },
  {
    group: 'Identifying & hunting',
    items: [
      'Are your pieces real uranium glass?',
      'What kind of blacklight do I use when I go hunting?',
      'Should I use a Geiger counter to identify uranium glass?',
      'Which Geiger counter should I get?',
      'How do I know if a gems or beads in a piece of jewelry are made of glass?',
    ],
  },
  {
    group: 'Dating & makers',
    items: [
      'How can I date a piece of uranium glass jewelry?',
      'How do I identify the maker of my vintage uranium glass jewelry pieces?',
      'How old are my uranium glass beads?',
    ],
  },
  {
    group: 'Caring for your piece',
    items: [
      'How do I care for my uranium glass jewelry?',
      'How do I determine my ring size?',
    ],
  },
]

const libLink = (title) => `/library/${slugify(title)}`
const termId = (term) => `term-${slugify(term)}`

function matches(term, q) {
  if (!q) return true
  if (term.term.toLowerCase().includes(q)) return true
  if (term.def.toLowerCase().includes(q)) return true
  if (term.sub) {
    return term.sub.some(
      (s) =>
        s.label.toLowerCase().includes(q) || s.text.toLowerCase().includes(q)
    )
  }
  return false
}

export default function Glossary() {
  const { mode } = useUvMode()
  const [query, setQuery] = useState('')

  const q = query.trim().toLowerCase()

  // Group matching terms by category, preserving CATEGORY_ORDER.
  const grouped = useMemo(() => {
    const filtered = GLOSSARY_TERMS.filter((t) => matches(t, q))
    return CATEGORY_ORDER.map((cat) => ({
      category: cat,
      terms: filtered.filter((t) => t.category === cat),
    })).filter((g) => g.terms.length > 0)
  }, [q])

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

      <div className="gl-shell">
        <header className="gl-hero">
          <p className="eyebrow">Reference</p>
          <h1>Glossary of Terms</h1>
          <p className="gl-hero-sub">
            {GLOSSARY_TERMS.length} terms on uranium glass, jewelry, gems, and
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
                <article className="gl-card" id={termId(t.term)} key={t.term}>
                  <h2>{t.term}</h2>
                  <p>{t.def}</p>
                  {t.sub && (
                    <ul className="gl-sub">
                      {t.sub.map((s) => (
                        <li key={s.label + s.text}>
                          {s.label && <strong>{s.label}: </strong>}
                          {s.text}
                        </li>
                      ))}
                    </ul>
                  )}
                  {t.links && (
                    <ul className="gl-links">
                      {t.links.map((href) => (
                        <li key={href}>
                          <a href={href} target="_blank" rel="noreferrer">
                            {href.replace(/^https?:\/\/(www\.)?/, '').slice(0, 42)}
                            …
                          </a>
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
        {!q && (
          <section className="gl-section" aria-labelledby="gl-index-head">
            <p className="eyebrow" id="gl-index-head">
              Library index
            </p>
            <div className="gl-index-grid">
              {LIBRARY_INDEX.map((col) => (
                <div className="gl-index-col" key={col.group}>
                  <h3>{col.group}</h3>
                  <ul>
                    {col.items.map((title) => (
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
