// src/components/ScrollToTop.jsx
// Resets scroll to the top on every route change, so navigating between pages
// always lands at the top (React Router doesn't do this by default). Render
// once inside <Router>.

import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

export default function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return null
}
