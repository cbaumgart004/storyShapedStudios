// src/pages/Page.jsx
// A page written in the Edge of the Map console (its `page` type), at /<slug>.
// Its sections are the schema's blocks (Text section, Values grid, Daylight /
// blacklight photo), drawn with Home's classes so a written page looks like the
// rest of the site. While the owner edits, the draft renders live, and every
// section carries the console's click-to-edit marks (`marks`, data-eotm-*).

import React, { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useUvMode } from '@/context/UvMode'
import SiteHeader from '@/components/SiteHeader'
import SiteFooter from '@/components/SiteFooter'
import UvPhoto from '@/components/UvPhoto'
import { fetchPublished, useLiveDocuments } from '@/lib/siteConsole'
import '@/styles/Home.css'
import '@/styles/Page.css'

const NONE = []

function LinkTo({ url, className, children }) {
  if (url.startsWith('/')) return <Link to={url} className={className}>{children}</Link>
  return <a href={url} className={className} target="_blank" rel="noopener noreferrer">{children}</a>
}

function Prose({ block, marks }) {
  const { heading, body, link } = block
  return (
    <section className="section" {...marks}>
      <div className="prose-block">
        {heading && <h2>{heading}</h2>}
        {/* Sanitized by the console API on save; drafts come from the owner's
            own editor on this page. */}
        {body && <div className="page-rich" data-eotm-richtext="body" dangerouslySetInnerHTML={{ __html: body }} />}
        {link?.url && link?.label && (
          <LinkTo url={link.url} className="prose-link">
            {link.label}
            <span className="arrow" aria-hidden="true">→</span>
          </LinkTo>
        )}
      </div>
    </section>
  )
}

function Values({ block, marks }) {
  return (
    <section className="section" {...marks}>
      {block.heading && (
        <div className="section-head">
          <h2>{block.heading}</h2>
        </div>
      )}
      <div className="values-grid">
        {(block.items ?? []).map((v) => (
          <div className="value" key={v._id}>
            <h3>{v.title}</h3>
            {v.text && <p>{v.text}</p>}
          </div>
        ))}
      </div>
    </section>
  )
}

// The paired daylight/blacklight shot, or the one shot there is, toggled by a filter.
function PhotoFeature({ block, marks }) {
  const photos = block.photos ?? []
  const light = photos.find((p) => p.index === 'Light')
  const dark = photos.find((p) => p.index === 'Dark')
  const only = light ?? dark
  if (!only) return null
  return (
    <section className="section page-photo" {...marks}>
      <figure className="hero-figure deco-corners">
        {/* One shot or a pair, it toggles with the page; a lone shot is filtered (UvPhoto). */}
        <UvPhoto daylight={light?.src} blacklight={dark?.src} widths={[]} alt={only.alt ?? ''}
          sizes="(max-width: 820px) 92vw, 760px" loading="lazy" />
      </figure>
      {block.caption && <p className="hero-credit">{block.caption}</p>}
    </section>
  )
}

const RENDER = { prose: Prose, values: Values, photoFeature: PhotoFeature }

export default function Page() {
  const { mode } = useUvMode()
  const { slug } = useParams()
  const [published, setPublished] = useState(null)
  useEffect(() => {
    let active = true
    fetchPublished('page').then((docs) => active && setPublished(docs))
    return () => { active = false }
  }, [])
  const pages = useLiveDocuments('page', published ?? NONE)
  const page = pages.find((p) => p.slug === slug)

  useEffect(() => {
    if (page?.data?.title) document.title = `${page.data.title} | StoryShaped Studios`
  }, [page?.data?.title])

  const sections = (page?.data?.sections ?? []).filter((b) => RENDER[b._type])
  return (
    <div className="sss-home" data-mode={mode}>
      <SiteHeader />
      <main>
        {page ? (
          sections.map((b, i) => {
            const Block = RENDER[b._type]
            return (
              <React.Fragment key={b._id ?? i}>
                {i > 0 && <div className="deco-divider" aria-hidden="true" />}
                <Block block={b} marks={{ 'data-eotm-edit': `page:${page.id}`, 'data-eotm-item': b._id, 'data-eotm-label': b.heading || 'section' }} />
              </React.Fragment>
            )
          })
        ) : published === null ? null : (
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
        )}
      </main>
      <SiteFooter />
    </div>
  )
}
