// src/components/SourceLink.jsx
// An outside source shown the way a reader wants it: a readable title as the
// link, and the site and address it goes to in small type beneath. The owner
// gives the title in the editor (a Reference Page Layout's Sources); left blank,
// one is made from the address, so a bare URL never has to be read. The address
// line wraps anywhere, so a long URL cannot push a card or a phone screen wide.

import React from 'react'
import { describeSource } from '@/lib/sources'

export default function SourceLink({ url, title, className = '' }) {
  const { title: shown, where } = describeSource(url, title)
  return (
    <a href={url} className={`source-link ${className}`.trim()} target="_blank" rel="noopener noreferrer">
      <span className="source-title">{shown}</span>
      {where && <span className="source-where">{where}</span>}
    </a>
  )
}
