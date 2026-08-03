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
//
// On a phone the sidebar stacks above the article, so the three rails would
// otherwise push the thing you came to read a screen and a half down. Three
// mobile affordances handle that (board #25):
//   * the search box offers an autocomplete list and jumps straight to an entry,
//   * Most viewed + Contents collapse once an article is open, behind a toggle,
//   * a floating "Back to top" overlay returns you to the search box.
// All three are harmless on desktop: the toggle and the overlay are hidden by
// the media query, and the sidebar is never collapsed above 820px.

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
const URL_SCAN =
  /(\]\(\s*<?https?:\/\/[^\s)]+>?\s*\)|<https?:\/\/[^\s>]+>)|(https?:\/\/[^\s<>()[\]"']+)/g

function linkifyUrls(md) {
  return md.replace(URL_SCAN, (match, alreadyLinked, bare) => {
    if (alreadyLinked) return alreadyLinked
    // A URL that ends a sentence shouldn't drag the full stop into its href.
    const trailing = bare.match(/[.,;:!?]+$/)
    const href = trailing ? bare.slice(0, -trailing[0].length) : bare
    return `<${href}>${trailing ? trailing[0] : ''}`
  })
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
      return { id, title, body: linkifyUrls(block.slice(m[0].length).trim()) }
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
  // Own class rather than styling `.lib-entry a`, which would also catch the
  // "← Library" back link and the prev/next cards inside the same article.
  a: ({ node, href = '', children, ...props }) => {
    const external = /^https?:\/\//i.test(href)
    return (
      <a
        className="lib-link"
        href={href}
        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : null)}
        {...props}
      >
        {children}
      </a>
    )
  },
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
  const [suggestOpen, setSuggestOpen] = useState(false) // autocomplete visible
  const [activeSuggestion, setActiveSuggestion] = useState(-1) // keyboard cursor
  // Mobile: each rail collapses on its own, so opening the contents list
  // doesn't drag Most viewed onto the screen with it.
  const [featuredOpen, setFeaturedOpen] = useState(false)
  const [contentsOpen, setContentsOpen] = useState(false)
  const [showTop, setShowTop] = useState(false) // mobile: back-to-top visible

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

  // Autocomplete for the search box. Title matches rank above body-only matches,
  // because a title hit is almost always the entry the reader meant.
  const suggestions = useMemo(() => {
    if (!q) return []
    const byTitle = []
    const byBody = []
    for (const s of sections) {
      if (s.title.toLowerCase().includes(q)) byTitle.push(s)
      else if (s.body.toLowerCase().includes(q)) byBody.push(s)
    }
    return [...byTitle, ...byBody].slice(0, 8)
  }, [q, sections])

  // A fresh query means the old keyboard cursor is meaningless.
  useEffect(() => setActiveSuggestion(-1), [q])

  // Picking a suggestion opens that entry. The query is cleared on the way out:
  // the box sits at the top of a phone screen, and leaving text in it reads as
  // "you are still looking at filtered results" when you are now on an article.
  const chooseSuggestion = (s) => {
    setQuery('')
    setSuggestOpen(false)
    setActiveSuggestion(-1)
    goTo(s.id)
  }

  const onSearchKeyDown = (e) => {
    if (!suggestions.length) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSuggestOpen(true)
      setActiveSuggestion((i) => (i + 1) % suggestions.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSuggestOpen(true)
      setActiveSuggestion((i) => (i <= 0 ? suggestions.length - 1 : i - 1))
    } else if (e.key === 'Enter') {
      // No cursor moved yet: Enter takes the top match, which is what a reader
      // who typed and hit go expects.
      const pick = suggestions[activeSuggestion] || suggestions[0]
      e.preventDefault()
      chooseSuggestion(pick)
    } else if (e.key === 'Escape') {
      setSuggestOpen(false)
    }
  }

  // Opening an entry re-collapses both rails, so on a phone the article is what
  // you land on rather than the bottom of a 35-item contents list.
  useEffect(() => {
    setFeaturedOpen(false)
    setContentsOpen(false)
  }, [slug])

  // On the index there is nothing to collapse — the rails are the page.
  const railShown = (open) => !slug || open

  const renderRailToggle = (label, panelId, open, setOpen, count) =>
    slug ? (
      <button
        type="button"
        className="lib-side-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
      >
        <span>
          {label}
          {count != null && <span className="lib-toc-count">{count}</span>}
        </span>
        <span className="lib-side-toggle-caret" aria-hidden="true">
          {open ? '▲' : '▼'}
        </span>
      </button>
    ) : null

  useEffect(() => {
    // Appears as soon as the page moves, not after some arbitrary distance —
    // on a phone the search box is off screen almost immediately.
    const onScroll = () => setShowTop(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const backToTop = () => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
  }

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
              <div className="lib-search-wrap">
                <label className="lib-search">
                  <span className="lib-search-icon" aria-hidden="true">⌕</span>
                  <input
                    type="search"
                    placeholder="Search the library…"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value)
                      setSuggestOpen(true)
                    }}
                    onFocus={() => setSuggestOpen(true)}
                    // Options preventDefault on mousedown, so the input keeps
                    // focus through a click and this only fires on a real blur.
                    onBlur={() => setSuggestOpen(false)}
                    onKeyDown={onSearchKeyDown}
                    aria-label="Search the library"
                    role="combobox"
                    aria-expanded={suggestOpen && suggestions.length > 0}
                    aria-controls="lib-suggestions"
                    aria-autocomplete="list"
                    aria-activedescendant={
                      activeSuggestion >= 0
                        ? `lib-sug-${suggestions[activeSuggestion].id}`
                        : undefined
                    }
                  />
                </label>

                {suggestOpen && suggestions.length > 0 && (
                  <ul className="lib-suggestions" id="lib-suggestions" role="listbox">
                    {suggestions.map((s, i) => (
                      <li key={s.id} role="presentation">
                        <button
                          type="button"
                          id={`lib-sug-${s.id}`}
                          role="option"
                          aria-selected={i === activeSuggestion}
                          className={`lib-suggestion${
                            i === activeSuggestion ? ' is-active' : ''
                          }`}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => chooseSuggestion(s)}
                        >
                          {s.title}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Phone-only: with an article open each rail starts collapsed
                  behind its own toggle, so the article is what you land on and
                  either list can be opened without dragging the other along.
                  Both toggles are hidden by the media query above 820px, where
                  the sidebar is a column of its own and nothing collapses. */}
              {mostViewed.length > 0 && !q && (
                <>
                  {renderRailToggle(
                    'Most viewed',
                    'lib-rail-featured',
                    featuredOpen,
                    setFeaturedOpen
                  )}
                  <div
                    id="lib-rail-featured"
                    className={`lib-side-browse${
                      railShown(featuredOpen) ? ' is-open' : ''
                    }`}
                  >
                    <div className="lib-featured">
                      <p className="eyebrow lib-rail-heading">Most viewed</p>
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
                  </div>
                </>
              )}

              {renderRailToggle(
                'Contents',
                'lib-rail-contents',
                contentsOpen,
                setContentsOpen,
                filtered.length
              )}
              <div
                id="lib-rail-contents"
                className={`lib-side-browse${
                  railShown(contentsOpen) ? ' is-open' : ''
                }`}
              >
              <nav className="lib-toc" aria-label="Contents">
                <p className="eyebrow lib-rail-heading">
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

      {/* Phone-only overlay (hidden by the media query on desktop, where the
          sidebar is sticky and the search box never leaves the screen). */}
      {showTop && (
        <button type="button" className="lib-totop" onClick={backToTop}>
          ↑ Back to Top
        </button>
      )}

      <SiteFooter />
    </div>
  )
}
