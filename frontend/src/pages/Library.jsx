// src/pages/Library.jsx
// Searchable Uranium Glass knowledge base. Content comes from /library.md
// (frontend/public/library.md) and is parsed client-side into sections keyed by
// their "## " headings. Layout: sticky sidebar (search + running index +
// most-viewed) beside a wide content column. View counts persist in
// localStorage so the most-consulted entries surface to the top.
//
// Wrapped in .sss-home[data-mode] so it inherits Home's daylight/blacklight
// design tokens, nav, and footer.

import React, { useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { useUvMode } from '@/context/UvMode'
import SiteHeader from '@/components/SiteHeader'
import SiteFooter from '@/components/SiteFooter'
import { API_BASE } from '@/lib/api'
import '@/styles/Library.css'

const VIEWS_KEY = 'sss-lib-views'

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

// Split the markdown into { id, title, body } sections on each "## " heading.
function parseSections(md) {
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
      return { id, title, body: block.slice(m[0].length).trim() }
    })
    .filter(Boolean)
}

function readViews() {
  try {
    return JSON.parse(window.localStorage.getItem(VIEWS_KEY)) || {}
  } catch {
    return {}
  }
}

const mdComponents = {
  img: ({ node, ...props }) => (
    <img className="lib-img" loading="lazy" {...props} />
  ),
}

export default function Library() {
  const { mode } = useUvMode()
  const [sections, setSections] = useState([])
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [query, setQuery] = useState('')
  const [views, setViews] = useState(readViews) // localStorage seed for instant paint
  const serverViews = useRef(false) // true once the backend counts load
  const contentRef = useRef(null)

  useEffect(() => {
    let active = true
    fetch('/library.md')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.text()
      })
      .then((text) => {
        if (!active) return
        setSections(parseSections(text))
        setStatus('ready')
      })
      .catch(() => active && setStatus('error'))
    return () => {
      active = false
    }
  }, [])

  // Pull global view counts from the backend; fall back to localStorage on error.
  useEffect(() => {
    let active = true
    fetch(`${API_BASE}/api/library/views`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((counts) => {
        if (!active || !counts || typeof counts !== 'object') return
        serverViews.current = true
        setViews(counts)
      })
      .catch(() => {
        /* backend/DB unavailable — keep the localStorage counts */
      })
    return () => {
      active = false
    }
  }, [])

  const recordView = (id) => {
    // Optimistic bump so the UI responds instantly.
    setViews((prev) => {
      const next = { ...prev, [id]: (prev[id] || 0) + 1 }
      if (!serverViews.current) {
        window.localStorage.setItem(VIEWS_KEY, JSON.stringify(next))
      }
      return next
    })

    if (!serverViews.current) return
    // Persist to the backend and reconcile with the authoritative count.
    fetch(`${API_BASE}/api/library/views/${encodeURIComponent(id)}`, {
      method: 'POST',
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && typeof data.count === 'number') {
          setViews((prev) => ({ ...prev, [id]: data.count }))
        }
      })
      .catch(() => {
        /* ignore — optimistic value stands */
      })
  }

  const goTo = (id) => {
    recordView(id)
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const q = query.trim().toLowerCase()
  const filtered = useMemo(() => {
    if (!q) return sections
    return sections.filter(
      (s) =>
        s.title.toLowerCase().includes(q) || s.body.toLowerCase().includes(q)
    )
  }, [q, sections])

  const mostViewed = useMemo(() => {
    return sections
      .filter((s) => views[s.id] > 0)
      .sort((a, b) => views[b.id] - views[a.id])
      .slice(0, 5)
  }, [sections, views])

  return (
    <div className="sss-home library-page" data-mode={mode}>
      <SiteHeader />

      {status === 'loading' && <p className="lib-msg">Loading the library…</p>}
      {status === 'error' && (
        <p className="lib-msg">Sorry — the library content failed to load.</p>
      )}

      {status === 'ready' && (
        <div className="lib-shell">
          {/* ---------- Sidebar: search + running index ---------- */}
          <aside className="lib-side">
            <div className="lib-side-inner">
              <label className="lib-search">
                <span className="lib-search-icon" aria-hidden="true">⌕</span>
                <input
                  type="search"
                  placeholder="Search the library…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label="Search the library"
                />
              </label>

              {mostViewed.length > 0 && !q && (
                <div className="lib-featured">
                  <p className="eyebrow">Most viewed</p>
                  <div className="lib-featured-list">
                    {mostViewed.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        className="lib-chip"
                        onClick={() => goTo(s.id)}
                      >
                        {s.title}
                        <span className="lib-chip-count">{views[s.id]}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <nav className="lib-toc" aria-label="Contents">
                <p className="eyebrow">
                  Contents
                  <span className="lib-toc-count">{filtered.length}</span>
                </p>
                <ol>
                  {filtered.map((s) => (
                    <li key={s.id}>
                      <button type="button" onClick={() => goTo(s.id)}>
                        {s.title}
                      </button>
                    </li>
                  ))}
                  {filtered.length === 0 && (
                    <li className="lib-toc-empty">No entries match “{query}”.</li>
                  )}
                </ol>
              </nav>
            </div>
          </aside>

          {/* ---------- Content ---------- */}
          <main className="lib-main" ref={contentRef}>
            <header className="lib-hero">
              <p className="eyebrow">Knowledge Base</p>
              <h1>Uranium Glass Library</h1>
              <p className="lib-hero-sub">
                {sections.length} entries on identifying, dating, and caring for
                uranium glass jewelry.
              </p>
            </header>

            {filtered.map((s) => (
              <article key={s.id} id={s.id} className="lib-entry">
                <h2>{s.title}</h2>
                <ReactMarkdown components={mdComponents}>{s.body}</ReactMarkdown>
              </article>
            ))}

            {filtered.length === 0 && (
              <p className="lib-msg">
                Nothing matches “{query}”. Try a different term.
              </p>
            )}
          </main>
        </div>
      )}

      <SiteFooter />
    </div>
  )
}
