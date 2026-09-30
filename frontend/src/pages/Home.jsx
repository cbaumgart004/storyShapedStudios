// src/pages/Home.jsx
// The home page: the console page whose slug is "home", shown at "/" with the
// featured header (components/SitePage.jsx). Its sections as shipped are in
// lib/builtInPages.js. The UV (blacklight) toggle flips the whole page between
// daylight (pale vaseline glass) and blacklight (full uranium glow).

import React from 'react'
import SitePage from '@/components/SitePage'

export default function Home() {
  return <SitePage slug="home" path="/" featured />
}
