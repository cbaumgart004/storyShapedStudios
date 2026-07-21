// src/pages/Library.jsx
// Searchable Uranium Glass knowledge base, structured as an index + per-article
// pages. Content comes from /library.md (frontend/public/library.md), parsed
// client-side into sections keyed by their "## " headings.
//
// Routing (see App.jsx):
//   /library         -> index: hero + a browsable list of every entry
//   /library/<slug>  -> that ONE article on its own shareable page
// Both render the same shell: a persistent sidebar (search + Most viewed +
// Contents rail) beside a single content column, so the reader can always hop
// between articles. Rendering one article at a time keeps the DOM small and
// removes any need for deep-link scrolling — each entry IS its own short page.
//
// Every entry carries "Copy link" affordances (a button on the article and an
// icon in the Contents rail). Legacy /library#<slug> hash links (older shared /
// Glossary links) redirect to /library/<slug>. View counts persist in Neon via
// the backend, falling back to localStorage.
//
// Wrapped in .sss-home[data-mode] so it inherits Home's daylight/blacklight
// design tokens, nav, and footer.

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { useUvMode } from '@/context/UvMode'
import SiteHeader from '@/components/SiteHeader'
import SiteFooter from '@/components/SiteFooter'
import { API_BASE } from '@/lib/api'
import { slugify } from '@/lib/librarySlug'
import '@/styles/Library.css'

const VIEWS_KEY = 'sss-lib-views'

// Copy text to the clipboard, with a fallback for non-secure contexts where
// navigator.clipboard is unavailable.
async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* fall through to the execCommand path */
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'absolute'
    ta.style.left = '-9999px'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
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
  const { slug } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [sections, setSections] = useState([])
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [query, setQuery] = useState('')
  const [views, setViews] = useState(readViews) // localStorage seed for instant paint
  const [copiedId, setCopiedId] = useState(null) // entry showing copied feedback
  const serverViews = React.useRef(false) // true once the backend counts load

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

  const recordView = useCallback((id) => {
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
  }, [])

  // Legacy /library#<slug> hash links (older shared / Glossary links) → redirect
  // to the article's own page so there's a single canonical URL per entry.
  useEffect(() => {
    if (slug || !location.hash) return
    const target = decodeURIComponent(location.hash.replace(/^#/, ''))
    if (target) navigate(`/library/${encodeURIComponent(target)}`, { replace: true })
  }, [slug, location.hash, navigate])

  const current = useMemo(
    () => (slug ? sections.find((s) => s.id === slug) : null),
    [slug, sections]
  )

  // Count a visit whenever a valid article page is shown.
  useEffect(() => {
    if (status === 'ready' && current) recordView(current.id)
  }, [status, current, recordView])

  const goTo = (id) => navigate(`/library/${encodeURIComponent(id)}`)

  const copyLink = async (id) => {
    const url = `${window.location.origin}/library/${encodeURIComponent(id)}`
    const ok = await copyToClipboard(url)
    if (ok) {
      setCopiedId(id)
      setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 1600)
    }
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

  // Previous / next entry in library order, for sequential reading.
  const { prev, next } = useMemo(() => {
    if (!current) return { prev: null, next: null }
    const i = sections.findIndex((s) => s.id === current.id)
    return {
      prev: i > 0 ? sections[i - 1] : null,
      next: i >= 0 && i < sections.length - 1 ? sections[i + 1] : null,
    }
  }, [current, sections])

  return (
    <div className="sss-home library-page" data-mode={mode}>
      <SiteHeader />

      {status === 'loading' && <p className="lib-msg">Loading the library…</p>}
      {status === 'error' && (
        <p className="lib-msg">Sorry — the library content failed to load.</p>
      )}

      {status === 'ready' && (
        <div className="lib-shell">
          {/* ---------- Sidebar: search + most viewed + Contents rail ---------- */}
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
                      <button
                        type="button"
                        className={`lib-toc-link${
                          current && current.id === s.id ? ' is-active' : ''
                        }`}
                        onClick={() => goTo(s.id)}
                        aria-current={
                          current && current.id === s.id ? 'page' : undefined
                        }
                      >
                        {s.title}
                      </button>
                      <button
                        type="button"
                        className="lib-toc-copy"
                        onClick={() => copyLink(s.id)}
                        aria-label={`Copy link to “${s.title}”`}
                        title="Copy link to this entry"
                      >
                        {copiedId === s.id ? '✓' : '🔗'}
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

          {/* ---------- Content: index (no slug) or a single article ---------- */}
          <main className="lib-main">
            {/* ---- Index landing ---- */}
            {!slug && (
              <>
                <header className="lib-hero">
                  <p className="eyebrow">Knowledge Base</p>
                  <h1>Uranium Glass Library</h1>
                  <p className="lib-hero-sub">
                    {sections.length} entries on identifying, dating, and caring
                    for uranium glass jewelry. Pick an entry to begin.
                  </p>
                </header>

                <ol className="lib-index-list">
                  {sections.map((s) => (
                    <li key={s.id}>
                      <Link
                        to={`/library/${encodeURIComponent(s.id)}`}
                        className="lib-index-link"
                      >
                        {s.title}
                      </Link>
                      <button
                        type="button"
                        className="lib-toc-copy"
                        onClick={() => copyLink(s.id)}
                        aria-label={`Copy link to “${s.title}”`}
                        title="Copy link to this entry"
                      >
                        {copiedId === s.id ? '✓' : '🔗'}
                      </button>
                    </li>
                  ))}
                </ol>
              </>
            )}

            {/* ---- Single article ---- */}
            {slug && current && (
              <article className="lib-entry lib-entry--solo" id={current.id}>
                <Link to="/library" className="lib-back">
                  ← Library
                </Link>
                <div className="lib-entry-head">
                  <h2>{current.title}</h2>
                  <button
                    type="button"
                    className="lib-copy"
                    onClick={() => copyLink(current.id)}
                    aria-label={`Copy link to “${current.title}”`}
                    title="Copy link to this entry"
                  >
                    <span aria-hidden="true">🔗</span>
                    {copiedId === current.id ? 'Copied!' : 'Copy link'}
                  </button>
                </div>
                <ReactMarkdown components={mdComponents}>
                  {current.body}
                </ReactMarkdown>

                <nav className="lib-prevnext" aria-label="More entries">
                  {prev ? (
                    <Link
                      to={`/library/${encodeURIComponent(prev.id)}`}
                      className="lib-prevnext-link lib-prevnext-prev"
                    >
                      <span className="lib-prevnext-dir">← Previous</span>
                      <span className="lib-prevnext-title">{prev.title}</span>
                    </Link>
                  ) : (
                    <span />
                  )}
                  {next ? (
                    <Link
                      to={`/library/${encodeURIComponent(next.id)}`}
                      className="lib-prevnext-link lib-prevnext-next"
                    >
                      <span className="lib-prevnext-dir">Next →</span>
                      <span className="lib-prevnext-title">{next.title}</span>
                    </Link>
                  ) : (
                    <span />
                  )}
                </nav>
              </article>
            )}

            {/* ---- Unknown slug ---- */}
            {slug && !current && (
              <div className="lib-notfound">
                <p className="lib-msg">
                  That entry doesn’t exist (it may have been renamed).
                </p>
                <Link to="/library" className="lib-back">
                  ← Back to the Library
                </Link>
              </div>
            )}
          </main>
        </div>
      )}

      <SiteFooter />
    </div>
  )
}
