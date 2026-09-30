// src/components/Blocks.jsx
// One renderer per component a page can be made of: the blocks in the console's
// schema/sites/storyshaped.json (Hero, Text section, Values grid, Daylight /
// blacklight photo, Portrait row, Artist story, Framed photo). Each draws with
// the site's own classes, so a page written in the console looks like the rest
// of the site. `marks` are the console's click-to-edit attributes (data-eotm-*).
// Rich text is sanitized by the console API on save; drafts come from the
// owner's own editor on the page.

import React from 'react'
import { Link } from 'react-router-dom'
import UvPhoto from '@/components/UvPhoto'
import SourceLink from '@/components/SourceLink'
import '@/styles/MeetTheArtist.css'

// The rect neon lockup is the logo variant without "Uranium Glass Jewelry"
// under it, which is the one Whitney wants carrying the hero (board #10).
import heroLogo from '/assets/StoryShapedStudiosNeonGlow_Rect.png'

function LinkTo({ url, className, children }) {
  if (url.startsWith('/')) return <Link to={url} className={className}>{children}</Link>
  return <a href={url} className={className} target="_blank" rel="noopener noreferrer">{children}</a>
}

// A daylight / blacklight pair, or the one shot there is, toggled by a filter.
function Paired({ photos, fallback }) {
  const light = photos?.find((p) => p.index === 'Light')
  const dark = photos?.find((p) => p.index === 'Dark')
  if (!light && !dark) return fallback ?? null
  return <UvPhoto daylight={light?.src} blacklight={dark?.src} widths={[]} alt={(light ?? dark).alt ?? ''} sizes="(max-width: 820px) 92vw, 760px" />
}

// Order is Whitney's, from the notes doc: big logo, tagline, the two CTAs,
// then the paired daylight/blacklight photo, then her credit.
function Hero({ block, marks }) {
  const buttons = (block.buttons ?? []).filter((b) => b.label && b.url)
  return (
    <section className="hero" {...marks}>
      <h1 className="hero-logo-wrap">
        <img className="hero-logo" src={block.logo?.src || heroLogo} alt={block.logo?.alt || 'StoryShaped Studios'} />
      </h1>
      {block.tagline && <p className="hero-tagline">{block.tagline}</p>}
      {buttons.length > 0 && (
        <div className="hero-actions">
          {buttons.map((b, i) => (
            <LinkTo key={b._id ?? b.label} url={b.url} className={`btn ${i === 0 ? 'btn-primary' : 'btn-ghost'}`}>{b.label}</LinkTo>
          ))}
        </div>
      )}
      {/* UvPhoto carries its own switch in the caption slot. Empty: the
          floral-drop necklace, whose files carry width suffixes (resize_asset.py). */}
      <figure className="hero-figure deco-corners">
        <Paired photos={block.photos} fallback={(
          <UvPhoto
            daylight="/assets/hero-necklace-daylight"
            blacklight="/assets/hero-necklace-blacklight"
            alt="Antique uranium glass floral-drop necklace, shown in daylight and glowing under blacklight"
            sizes="(max-width: 820px) 92vw, 760px"
          />
        )} />
      </figure>
      {block.credit && <p className="hero-credit">{block.credit}</p>}
    </section>
  )
}

function Prose({ block, marks }) {
  const { heading, body, link } = block
  return (
    <section className="section" {...marks}>
      <div className="prose-block">
        {heading && <h2>{heading}</h2>}
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
          <div className="value" key={v._id ?? v.title}>
            <h3>{v.title}</h3>
            {v.text && <p>{v.text}</p>}
          </div>
        ))}
      </div>
    </section>
  )
}

function PhotoFeature({ block, marks }) {
  if (!block.photos?.length) return null
  return (
    <section className="section page-photo" {...marks}>
      <figure className="hero-figure deco-corners">
        <Paired photos={block.photos} />
      </figure>
      {block.caption && <p className="hero-credit">{block.caption}</p>}
    </section>
  )
}

function Portraits({ block, marks }) {
  return (
    <section className="section" {...marks}>
      {(block.eyebrow || block.heading) && (
        <div className="section-head">
          {block.eyebrow && <p className="eyebrow">{block.eyebrow}</p>}
          {block.heading && <h2>{block.heading}</h2>}
        </div>
      )}
      <div className="piece-grid artist-gallery">
        {(block.photos ?? []).slice(0, 3).map((p, i) => (
          <figure key={p.src ?? i} className="piece-card deco-corners">
            <div className="frame">
              <img src={p.src} alt={p.alt ?? ''} />
            </div>
          </figure>
        ))}
      </div>
    </section>
  )
}

function ArtistStory({ block, marks }) {
  const links = (block.links ?? []).filter((l) => l.url)
  return (
    <section className="section artist-body" {...marks}>
      {block.body && <div data-eotm-richtext="body" dangerouslySetInnerHTML={{ __html: block.body }} />}
      {block.signature && (
        <p className="artist-sign">
          {block.signature}
          {block.signatureTitle && <span>{block.signatureTitle}</span>}
        </p>
      )}
      {links.length > 0 && (
        <div className="artist-links">
          {links.map((l) => <SourceLink key={l._id ?? l.url} url={l.url} title={l.title} />)}
        </div>
      )}
    </section>
  )
}

function FramedPhoto({ block, marks }) {
  if (!block.image?.src) return null
  return (
    <section className="section" {...marks}>
      <figure className="artist-cabinet deco-corners">
        <img src={block.image.src} alt={block.image.alt ?? ''} />
      </figure>
      {block.caption && <p className="hero-credit">{block.caption}</p>}
    </section>
  )
}

export const BLOCKS = { hero: Hero, prose: Prose, values: Values, photoFeature: PhotoFeature, portraits: Portraits, artistStory: ArtistStory, framedPhoto: FramedPhoto }

// A heading for the page layout's Arrange boxes and the Edit button.
export function labelOf(block) {
  return block.heading || (block.tagline && 'Hero') || (block.signature && 'Artist story') || block.caption || block._type
}
