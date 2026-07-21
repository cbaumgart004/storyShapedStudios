// src/context/UvMode.jsx
// Site-wide UV (blacklight/daylight) mode. Persists to localStorage and stamps
// data-mode on <html> so any page can react to it in CSS, while pages that need
// scoped styling (Home) can also read `mode` directly.

import React, { createContext, useContext, useEffect, useState } from 'react'

const STORAGE_KEY = 'sss-uv-mode'
const UvModeContext = createContext(null)

function readInitialMode() {
  if (typeof window === 'undefined') return 'blacklight'
  const saved = window.localStorage.getItem(STORAGE_KEY)
  return saved === 'daylight' || saved === 'blacklight' ? saved : 'blacklight'
}

export function UvModeProvider({ children }) {
  const [mode, setMode] = useState(readInitialMode)

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, mode)
    document.documentElement.dataset.mode = mode
  }, [mode])

  const toggle = () =>
    setMode((m) => (m === 'blacklight' ? 'daylight' : 'blacklight'))

  const value = { mode, setMode, toggle, lit: mode === 'blacklight' }
  return <UvModeContext.Provider value={value}>{children}</UvModeContext.Provider>
}

export function useUvMode() {
  const ctx = useContext(UvModeContext)
  if (!ctx) throw new Error('useUvMode must be used within a UvModeProvider')
  return ctx
}
