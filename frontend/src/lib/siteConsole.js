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
    const saved = docs.find((d) => d.data?.path === path)?.data?.blocks ?? []
    const out = saved.filter((b) => keys.includes(b.key))
    for (const key of keys) if (!out.some((b) => b.key === key)) out.push({ key, span: 12 })
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

// Visible text of a rich-text field, for search. DOMParser builds an inert
// document: unlike innerHTML on a detached element, nothing in it loads or runs.
export function textOf(html) {
  return new DOMParser().parseFromString(html ?? '', 'text/html').body.textContent ?? ''
}
