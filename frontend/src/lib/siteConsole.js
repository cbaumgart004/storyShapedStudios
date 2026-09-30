// src/lib/siteConsole.js
// The site's half of the Edge of the Map console (edgeOfTheMap/console, ADR-0007).
// index.html loads the console's loader, which installs window.EOTM. Published
// documents come from the console's public API; while an owner edits, the loader
// pushes drafts through window.EOTM and useLiveDocuments re-renders with them,
// which is the live preview.

import { useEffect, useMemo, useState } from 'react'

export const CONSOLE_API = 'https://admin.theedgeofthemap.com/api/sites/storyshaped'

// Published documents of one type. An unreachable API yields [] so pages keep
// working from their built-in content.
export async function fetchPublished(type) {
  try {
    const res = await fetch(`${CONSOLE_API}/public/${encodeURIComponent(type)}`)
    if (!res.ok) return []
    return await res.json()
  } catch {
    return []
  }
}

// Published documents with the owner's unsaved drafts on top. Re-renders on
// every draft change while the editor is open.
export function useLiveDocuments(type, published) {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    let unsubscribe = null
    let timer = null
    const wire = () => {
      if (window.EOTM) unsubscribe = window.EOTM.subscribe((c) => c.type === type && !c.order && setTick((t) => t + 1))
      else timer = setTimeout(wire, 50)
    }
    wire()
    return () => {
      clearTimeout(timer)
      if (unsubscribe) unsubscribe()
    }
  }, [type])
  // A stable array between draft changes, so pages can memoize on it.
  return useMemo(
    () => (window.EOTM ? window.EOTM.merge(type, published) : published),
    [type, published, tick] // eslint-disable-line react-hooks/exhaustive-deps
  )
}

// The owner's arrangement of one page (the console's pageLayout type, whose
// `blocks` is [{ key, span }]: page order, width in columns of 12). Blocks it
// does not name follow in their built-in order at full width; names the page no
// longer has are ignored. `keys` must be a stable array.
export function usePageLayout(path, keys) {
  const [published, setPublished] = useState([])
  useEffect(() => {
    let active = true
    fetchPublished('pageLayout').then((docs) => active && setPublished(docs))
    return () => { active = false }
  }, [])
  const docs = useLiveDocuments('pageLayout', published)
  return useMemo(() => {
    const doc = docs.find((d) => d.data?.path === path)
    const saved = doc?.data?.blocks ?? []
    const out = saved.filter((b) => keys.includes(b.key))
    for (const key of keys) if (!out.some((b) => b.key === key)) out.push({ key, span: 12 })
    // Which console document to open when a block is clicked (click-to-edit).
    out.docId = doc?.id ?? null
    return out
  }, [docs, path, keys])
}

// Tells the console the order a type is shown in, so its placement fields
// offer "after <title>" for every entry, built-in ones included.
export function useConsoleOrder(type, entries) {
  useEffect(() => {
    const order = entries.map((e) => ({ key: e.id, title: e.title, docId: e.docId }))
    let timer = null
    const send = () => {
      if (window.EOTM?.setOrder) window.EOTM.setOrder(type, order)
      else if (!window.EOTM) timer = setTimeout(send, 50)
    }
    send()
    return () => clearTimeout(timer)
  }, [type, entries])
}

export function isDraft(doc) {
  return !!window.EOTM?.draft(doc.type, doc.id)
}

// The console asks the site to show a document's page; route it through React
// Router instead of the console's full-history fallback.
export function useConsoleNavigation(navigate) {
  useEffect(() => {
    const onNavigate = (e) => {
      e.preventDefault()
      navigate(e.detail.path)
    }
    window.addEventListener('eotm:navigate', onNavigate)
    return () => window.removeEventListener('eotm:navigate', onNavigate)
  }, [navigate])
}

// The editor token the console's loader keeps after single sign-on
// (#eotm-token from the admin page), or null when there is none or it is about
// to run out. The site's own admin pages send it to the backend, which asks the
// console who it is (backend/server/utils/requireEditor.js).
const TOKEN_KEY = 'eotm:token:storyshaped'
export function editorToken() {
  try {
    // The browser's copy (the loader keeps it until it runs out), else this tab's.
    const token = localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY)
    if (!token) return null
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return payload.exp * 1000 - Date.now() > 60_000 ? token : null
  } catch {
    return null
  }
}

// Sign in on the admin page, which hands a fresh token back to this path and
// opens the editor there. Already signed in on the admin page, it passes
// straight through; a first sign-in on an operator's temporary password asks
// for her own password first, then carries on. The site it opens is the
// console's first allowed origin for StoryShaped (the preview), so /preview
// on the production domain lands on the preview with the editor open.
export function signInThroughConsole(back = location.pathname + location.search) {
  // origin: come back to this address when the console lists it (the preview,
  // say); an address it does not list falls back to its first.
  location.replace(`${new URL(CONSOLE_API).origin}/?handoff=storyshaped&return=${encodeURIComponent(back)}&origin=${encodeURIComponent(location.origin)}`)
}

// The site's header and footer (the console's `siteSettings`, one per site):
// its name, menu, social and shop links, and the toggle's labels. Null until
// one exists; the header and footer then use their built-in values.
let settingsPromise = null
export function useSiteSettings() {
  const [published, setPublished] = useState([])
  useEffect(() => {
    let active = true
    settingsPromise ??= fetchPublished('siteSettings')
    settingsPromise.then((docs) => active && setPublished(docs))
    return () => { active = false }
  }, [])
  const doc = useLiveDocuments('siteSettings', published)[0]
  return doc ? { ...doc.data, docId: doc.id } : null
}

// Whether this browser belongs to the site's owner. The console is the judge:
// after any sign-in here, GET /me with the editor token answers the login's role
// on this site, and only 'owner' is remembered (localStorage, so it outlasts the
// 8-hour token and the tab). A token for any other role clears it. The nav's
// sign-in icon reads this, so visitors never meet the owner's sign-in; customer
// accounts will have their own.
const OWNER_KEY = 'sss:owner'
export function isRememberedOwner() {
  try { return localStorage.getItem(OWNER_KEY) === '1' } catch { return false }
}
export function useOwner() {
  const [owner, setOwner] = useState(isRememberedOwner)
  useEffect(() => {
    let active = true
    let timer = null
    // The loader stores a handed-off token asynchronously; look for it a few
    // times before deciding this tab has none.
    const check = (tries) => {
      const token = editorToken()
      if (!token) {
        if (tries > 0) timer = setTimeout(() => check(tries - 1), 500)
        return
      }
      fetch(`${CONSOLE_API}/me`, { headers: { Authorization: `Bearer ${token}` } })
        .then((res) => (res.ok ? res.json() : null))
        .then((me) => {
          if (!active || !me) return
          const yes = me.role === 'owner'
          try { yes ? localStorage.setItem(OWNER_KEY, '1') : localStorage.removeItem(OWNER_KEY) } catch { /* private mode */ }
          setOwner(yes)
        })
        .catch(() => {})
    }
    check(6)
    return () => { active = false; clearTimeout(timer) }
  }, [])
  return owner
}

// The owner's way into the editor: open it here when this tab already holds a
// token, otherwise sign in through the console, which brings her back with it.
export function openEditor() {
  if (editorToken() && window.EOTM?.open) window.EOTM.open()
  else signInThroughConsole()
}

// Visible text of a rich-text field, for search. DOMParser builds an inert
// document: unlike innerHTML on a detached element, nothing in it loads or runs.
export function textOf(html) {
  return new DOMParser().parseFromString(html ?? '', 'text/html').body.textContent ?? ''
}
