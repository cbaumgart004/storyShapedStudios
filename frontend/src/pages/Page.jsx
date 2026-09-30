// src/pages/Page.jsx
// Any other page written in the console, at /<slug> (components/SitePage.jsx).
// Named routes in App.jsx win over this one.

import React from 'react'
import { useParams } from 'react-router-dom'
import SitePage from '@/components/SitePage'

export default function Page() {
  const { slug } = useParams()
  return <SitePage key={slug} slug={slug} />
}
