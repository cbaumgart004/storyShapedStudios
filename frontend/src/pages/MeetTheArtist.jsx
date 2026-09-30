// src/pages/MeetTheArtist.jsx
// "Meet the Artist": the console page whose slug is "meet-the-artist"
// (components/SitePage.jsx): a Portrait row, the Artist story with its press
// links, and a Framed photo of the cabinet. As shipped: lib/builtInPages.js.

import React from 'react'
import SitePage from '@/components/SitePage'

export default function MeetTheArtist() {
  return <SitePage slug="meet-the-artist" />
}
