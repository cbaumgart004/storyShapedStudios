// src/context/UvMode.jsx
// Site-wide UV (blacklight/daylight) mode. Stamps data-mode on <html> so any
// page can react to it in CSS, while pages that need scoped styling (Home) can
// also read `mode` directly. Which mode a visit opens in is the Theme's to say
// (below).

import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { fetchPublished, useLiveDocuments } from '@/lib/siteConsole'

const STORAGE_KEY = 'sss-uv-mode'
const UvModeContext = createContext(null)
const NONE = []
const valid = (m) => (m === 'daylight' || m === 'blacklight' ? m : null)
const saved = () => {
  try { return valid(window.localStorage.getItem(STORAGE_KEY)) } catch { return null }
}

// The look a visit opens in is the Theme's "Opens in" (the console's theme,
// defaultMode; blacklight until it says otherwise). With "Remember each
// visitor's last choice" on, a returning visitor gets what they last chose
// instead; off, every visit opens in the Theme's look and nothing is kept
// (board #38). Blacklight shows first while the Theme loads, so a site whose
// Theme also says blacklight never flashes.
export function UvModeProvider({ children }) {
  const [published, setPublished] = useState(NONE)
  useEffect(() => {
    let active = true
    fetchPublished('theme').then((docs) => active && setPublished(docs))
    return () => { active = false }
  }, [])
  const theme = useLiveDocuments('theme', published)[0]?.data
  const remember = Boolean(theme?.rememberChoice)
  const opensIn = valid(theme?.defaultMode) ?? 'blacklight'

  const [mode, setMode] = useState('blacklight')
  const chosen = useRef(false) // the visitor has toggled on this visit
  useEffect(() => {
    if (chosen.current) return
    setMode(remember ? saved() ?? opensIn : opensIn)
  }, [remember, opensIn])

  useEffect(() => {
    document.documentElement.dataset.mode = mode
    try {
      if (remember && chosen.current) window.localStorage.setItem(STORAGE_KEY, mode)
      else if (!remember) window.localStorage.removeItem(STORAGE_KEY)
    } catch { /* private mode: nothing kept */ }
  }, [mode, remember])

  // While the owner edits the Daylight or Blacklight theme, the console asks
  // the page to show that look ({ type: '$mode' }, console bridge 5+). It is
  // not the visitor's choice, so nothing is remembered.
  useEffect(() => {
    let unsubscribe = null
    let timer = null
    const wire = () => {
      if (!window.EOTM) { timer = setTimeout(wire, 50); return }
      unsubscribe = window.EOTM.subscribe((c) => c.type === '$mode' && valid(c.mode) && setMode(c.mode))
    }
    wire()
    return () => {
      clearTimeout(timer)
      if (unsubscribe) unsubscribe()
    }
  }, [])

  const toggle = () => {
    chosen.current = true
    setMode((m) => (m === 'blacklight' ? 'daylight' : 'blacklight'))
  }

  const value = { mode, setMode, toggle, lit: mode === 'blacklight' }
  return <UvModeContext.Provider value={value}>{children}</UvModeContext.Provider>
}

export function useUvMode() {
  const ctx = useContext(UvModeContext)
  if (!ctx) throw new Error('useUvMode must be used within a UvModeProvider')
  return ctx
}
