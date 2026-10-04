// src/components/SitePage.jsx
// Every page of the site is a console `page` document: a title and its
// sections, each one of the components in components/Blocks.jsx. Home is the
// page whose slug is "home" and it shows at "/"; the rest show at /<slug>.
// While the owner edits, the draft renders live. A page with no document yet
// renders from lib/builtInPages.js, the same shape.
//
// Sections sit on a 12-column grid, ordered and sized by the page's Page layout
// (the console's pageLayout whose address is this page's), keyed by section id;
// unarranged they stack in the page's order, and below 820px always stack.
// Each section opens its page for click-to-edit; the space around it opens the
// layout.

import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useUvMode } from '@/context/UvMode'
import SiteHeader from '@/components/SiteHeader'
import SiteFooter from '@/components/SiteFooter'
import { BLOCKS, CustomSection, current, labelOf } from '@/components/Blocks'
import { Extras, lookFor } from '@/components/Extras'
import { frameOf } from '@/components/Frame'
import { BUILT_IN_PAGES } from '@/lib/builtInPages'
import { fetchPublished, useLiveDocuments, usePageLayout, useOwnerDrafts, useSchema } from '@/lib/siteConsole'
import '@/styles/Home.css'
import '@/styles/Page.css'

const NONE = []

// What a section's outermost element takes from its data: its added Style
// fields (the console's "+ Add a field") and, when Free, its frame (ADR-0010).
const rootOf = (schema, block) => {
  const { root } = frameOf(block)
  const style = { ...lookFor(schema, `blocks.${block._type}`, block), ...root.style }
  return { ...root, ...(Object.keys(style).length ? { style } : {}) }
}

// A zigzag rule opens every row after the first, so blocks set side by side
// share one. A block that joins a row is marked, so it takes its own rule when
// the grid stacks on a phone.
function arrange(layout, sections, pageMark, schema) {
  const byId = new Map(sections.map((b) => [b._id, b]))
  const cells = []
  let used = 12
  layout.forEach(({ key, span }, i) => {
    const block = byId.get(key)
    // A built-in section, or one of the owner's own types drawn from its fields.
    const def = block && !BLOCKS[block._type] ? schema?.blocks?.[block._type] : null
    const Block = block && (BLOCKS[block._type] ?? (def ? CustomSection : null))
    if (!Block) return
    const joins = used + span <= 12
    if (!joins) {
      if (i > 0) cells.push(<div key={`rule-${key}`} className="deco-divider sss-rule" aria-hidden="true" />)
      used = 0
    }
    used += span
    // The owner's own type is named by its label ("Testimonial"), not its id.
    const label = def ? def.label : labelOf(block)
    cells.push(
      <div key={key} className={`sss-block${joins ? ' is-joined' : ''}`} style={{ '--span': span }}
        data-eotm-block={key} data-eotm-label={label} data-eotm-span={span}
        {...(layout.docId ? { 'data-eotm-edit': `pageLayout:${layout.docId}` } : {})}>
        <Block block={block} def={def} marks={{ 'data-eotm-edit': pageMark, 'data-eotm-item': block._id, 'data-eotm-label': label, ...rootOf(schema, block) }}
          extras={<Extras at={`blocks.${block._type}`} data={block} className="extras section-extras" frame={frameOf(block)} />} />
      </div>
    )
  })
  return cells
}

export default function SitePage({ slug, path = `/${slug}`, featured = false }) {
  const { mode } = useUvMode()
  const [published, setPublished] = useState(null)
  useEffect(() => {
    let active = true
    fetchPublished('page').then((docs) => active && setPublished(docs))
    return () => { active = false }
  }, [])
  const pages = useLiveDocuments('page', published ?? NONE)
  // A draft page opens for the Owner (a dimmed menu link); visitors never get one.
  const drafts = useOwnerDrafts('page')
  const doc = pages.find((p) => p.slug === slug) ?? drafts.find((p) => p.slug === slug)
  const page = doc?.data ?? BUILT_IN_PAGES[slug]
  const schema = useSchema()
  const sections = useMemo(() => (page?.sections ?? []).map(current).filter((b) => BLOCKS[b._type] || schema?.blocks?.[b._type]), [page, schema])
  const idsKey = sections.map((b) => b._id).join('|')
  const keys = useMemo(() => (idsKey ? idsKey.split('|') : []), [idsKey])
  const layout = usePageLayout(path, keys)

  useEffect(() => {
    if (page?.title && slug !== 'home') document.title = `${page.title} | StoryShaped Studios`
  }, [page?.title, slug])

  return (
    <div className="sss-home" data-mode={mode}>
      <SiteHeader featured={featured} />
      {page ? (
        <main className="sss-layout" data-eotm-layout>
          {arrange(layout, sections, `page:${doc?.id ?? slug}`, schema)}
        </main>
      ) : published === null ? <main /> : (
        <main>
          <section className="section">
            <div className="prose-block">
              <h2>Page not found</h2>
              <p>There is no page at this address.</p>
              <Link to="/" className="prose-link">
                Back to the home page
                <span className="arrow" aria-hidden="true">→</span>
              </Link>
            </div>
          </section>
        </main>
      )}
      <SiteFooter brand={!featured} />
    </div>
  )
}
