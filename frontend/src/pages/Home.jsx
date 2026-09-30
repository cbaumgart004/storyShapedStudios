// src/pages/Home.jsx
// Live home page for StoryShaped Studios.
// Signature: the UV (blacklight) toggle flips the whole page between
// daylight (pale vaseline glass) and blacklight (full uranium glow).

import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useUvMode } from '@/context/UvMode'
import SiteHeader from '@/components/SiteHeader'
import SiteFooter from '@/components/SiteFooter'
import UvPhoto from '@/components/UvPhoto'
import { usePageLayout, fetchPublished, useLiveDocuments } from '@/lib/siteConsole'
import '@/styles/Home.css'

// The rect neon lockup is the logo variant without "Uranium Glass Jewelry"
// under it, which is the one Whitney wants carrying the hero (board #10).
import heroLogo from '/assets/StoryShapedStudiosNeonGlow_Rect.png'

// Home's words and pictures are the console's `home` document (one per site,
// edited in the Edge of the Map console); while the owner edits, the draft
// renders live. BUILT_IN is the copy that shipped before, used field by field
// wherever the document is missing or blank, so an unreachable console API
// still shows a whole page. It is also the console's default for a new `home`
// (schema/sites/storyshaped.json), so the two must be changed together.
//
// Whitney's seven values, copy verbatim from the notes doc (board #16). The
// heading is "What We Believe", not the "Our Values" the board item was opened
// under. Seven is a lot of stacked text and three of them overlap, but that is
// a copy call for her, not one to make here; raised under board #41.
const BUILT_IN = {
  hero: {
    tagline: 'The World’s Largest Resource for Uranium Glass Jewelry',
    primary: { label: 'Learn about Uranium Glass', url: '/library' },
    secondary: { label: 'Shop the Collection', url: '/shop' },
    photos: [],
    credit: 'Created by Whitney Granger, internationally recognized uranium glass jewelry artist and historian',
  },
  believe: {
    heading: 'What We Believe',
    items: [
      ['Preserving History', 'Every piece of uranium glass carries a story. We are committed to the stewardship of an extraordinary artistic heritage, preserving it for those who will discover it next.'],
      ['Education Through Research', 'Knowledge should be shared. Through ongoing research, historical documentation, and educational resources, we strive to be the world’s most trusted source for uranium glass jewelry.'],
      ['Honoring the Material', 'Remarkable materials deserve exceptional craftsmanship. Every piece is thoughtfully designed and handcrafted to become tomorrow’s heirloom.'],
      ['Restoration & Renewal', 'Some stories aren’t finished yet. Through careful repair and restoration, we breathe new life into vintage and antique uranium glass jewelry, honoring the hands that created it so it can continue to be loved across generations.'],
      ['Authenticity', 'We believe every piece deserves an honest story. From age and origin to materials and craftsmanship, we are committed to representing every piece with accuracy and integrity.'],
      ['Curiosity & Discovery', 'Whether it’s an overlooked antique necklace, a forgotten Czech bead, or a rare cabochon, we believe the thrill of discovery is part of the journey. We are always searching for remarkable pieces and the stories they carry.'],
      ['Caring for Every Collector', 'Whether you’re purchasing your first glowing pendant or your hundredth antique bead, we want every interaction to be welcoming, educational, and genuinely enjoyable.'],
    ].map(([title, text], i) => ({ _id: `value-${i + 1}`, title, text })),
  },
  // Her Our Story draft trails off mid-word on a link ("More on Whitney's
  // personal journey here (hy"), so that fragment is not rendered; the link
  // points at Meet the Artist, the assumed target (board #40).
  story: {
    heading: 'Our Story',
    body:
      '<p>Long before StoryShaped Studios existed, artisans were crafting jewelry from uranium glass. ' +
      'Whitney discovered that forgotten history in 2018 through a Neiger Brothers necklace, and it was love at first sight. ' +
      'Thousands of hours of research, an international community of collectors, and a passion for preserving these remarkable ' +
      'artifacts eventually led her to teach herself jewelry making during the 2020 pandemic. What began as a personal fascination ' +
      'grew into the world’s leading authority on uranium glass jewelry and beads. Today, StoryShaped Studios preserves the history ' +
      'of uranium glass jewelry while creating heirloom-quality pieces that carry that story forward.</p>',
    link: { label: 'More on Whitney’s personal journey', url: '/meet-the-artist' },
  },
  jewelry: {
    heading: 'Our Jewelry',
    body:
      '<p>Every StoryShaped Studios piece begins with genuine uranium glass, from rare antique treasures to newly crafted Czech glass. ' +
      'Whether creating an original design or carefully restoring a historic piece, our work is guided by a deep respect for the history, ' +
      'artistry, and enduring beauty of uranium glass.</p>',
  },
  makers: {
    heading: 'A Space for Makers',
    body:
      '<p>StoryShaped Studios is the largest retailer of uranium glass beads in the world, with over 200 unique bead designs both vintage ' +
      'and newly made. All of our beads are the highest quality Czech glass.</p>' +
      '<p>We also specialize in uranium glass cabochons, pendants, and faceted gems.</p>',
  },
}

// A field from the document, or the built-in one when it is missing or blank.
const pick = (value, fallback) => (value == null || value === '' || (Array.isArray(value) && !value.length) ? fallback : value)
function contentOf(data) {
  const out = {}
  for (const [section, fields] of Object.entries(BUILT_IN)) {
    out[section] = {}
    for (const [name, fallback] of Object.entries(fields)) {
      const v = data?.[section]?.[name]
      out[section][name] = fallback && typeof fallback === 'object' && !Array.isArray(fallback)
        ? { label: pick(v?.label, fallback.label), url: pick(v?.url, fallback.url) }
        : pick(v, fallback)
    }
  }
  return out
}

function LinkTo({ link, className, children }) {
  if (!link.url.startsWith('/')) return <a href={link.url} className={className} target="_blank" rel="noopener noreferrer">{children}</a>
  return <Link to={link.url} className={className}>{children}</Link>
}

// The hero's paired shot: the owner's photos when there are any, else the
// floral-drop necklace, whose files carry width suffixes (resize_asset.py).
function HeroPhoto({ photos }) {
  const light = photos.find((p) => p.index === 'Light')
  const dark = photos.find((p) => p.index === 'Dark')
  if (light || dark) {
    return <UvPhoto daylight={light?.src} blacklight={dark?.src} widths={[]} alt={(light ?? dark).alt ?? ''} sizes="(max-width: 820px) 92vw, 760px" />
  }
  return (
    <UvPhoto
      daylight="/assets/hero-necklace-daylight"
      blacklight="/assets/hero-necklace-blacklight"
      alt="Antique uranium glass floral-drop necklace, shown in daylight and glowing under blacklight"
      sizes="(max-width: 820px) 92vw, 760px"
    />
  )
}

// Sanitized by the console API on save; drafts come from the owner's own
// editor on this page.
const Rich = ({ html }) => <div dangerouslySetInnerHTML={{ __html: html }} />

// Home's sections, in Whitney's running order. Each is a block the owner can
// move and resize from the Edge of the Map console (a pageLayout for "/"); with
// no layout published they stack in this order at full width. Each section
// opens the `home` document for click-to-edit; the space around it opens the
// layout (arrange, below).
const EDIT = { 'data-eotm-edit': 'home:home' }
const BLOCKS = {
  hero: {
    label: 'Hero',
    render: ({ hero }) => (
      /* Order is Whitney's, from the notes doc: big logo, tagline, the two
         CTAs, then the paired daylight/blacklight photo, then her credit. */
      <section className="hero" {...EDIT} data-eotm-label="Hero">
        <h1 className="hero-logo-wrap">
          <img className="hero-logo" src={heroLogo} alt="StoryShaped Studios" />
        </h1>
        <p className="hero-tagline">{hero.tagline}</p>
        <div className="hero-actions">
          <LinkTo link={hero.primary} className="btn btn-primary">{hero.primary.label}</LinkTo>
          <LinkTo link={hero.secondary} className="btn btn-ghost">{hero.secondary.label}</LinkTo>
        </div>
        {/* UvPhoto carries its own switch in the caption slot, so there is no
            separate figcaption to fall out of sync with a per-image flip. */}
        <figure className="hero-figure deco-corners">
          <HeroPhoto photos={hero.photos} />
        </figure>
        <p className="hero-credit">{hero.credit}</p>
      </section>
    ),
  },
  believe: {
    label: 'What We Believe',
    render: ({ believe }) => (
      <section className="section" id="what-we-believe" {...EDIT} data-eotm-label="What We Believe">
        <div className="section-head">
          <h2>{believe.heading}</h2>
        </div>
        <div className="values-grid">
          {believe.items.map((v) => (
            <div className="value" key={v._id ?? v.title}>
              <h3>{v.title}</h3>
              {v.text && <p>{v.text}</p>}
            </div>
          ))}
        </div>
      </section>
    ),
  },
  story: {
    label: 'Our Story',
    render: ({ story }) => (
      <section className="section" id="our-story" {...EDIT} data-eotm-label="Our Story">
        <div className="prose-block">
          <h2>{story.heading}</h2>
          <Rich html={story.body} />
          {story.link.label && story.link.url && (
            <LinkTo link={story.link} className="prose-link">
              {story.link.label}
              <span className="arrow" aria-hidden="true">→</span>
            </LinkTo>
          )}
        </div>
      </section>
    ),
  },
  jewelry: {
    label: 'Our Jewelry',
    render: ({ jewelry }) => (
      <section className="section" id="our-jewelry" {...EDIT} data-eotm-label="Our Jewelry">
        <div className="prose-block">
          <h2>{jewelry.heading}</h2>
          <Rich html={jewelry.body} />
        </div>
      </section>
    ),
  },
  makers: {
    label: 'A Space for Makers',
    render: ({ makers }) => (
      <section className="section" id="makers" {...EDIT} data-eotm-label="A Space for Makers">
        <div className="prose-block">
          <h2>{makers.heading}</h2>
          <Rich html={makers.body} />
        </div>
      </section>
    ),
  },
}
const KEYS = Object.keys(BLOCKS)
const NONE = []

// A zigzag rule opens every row after the first, so blocks set side by side
// share one. A block that joins a row is marked, so it takes its own rule when
// the grid stacks on a phone.
function arrange(layout, content) {
  const cells = []
  let used = 12
  layout.forEach(({ key, span }, i) => {
    const joins = used + span <= 12
    if (!joins) {
      if (i > 0) cells.push(<div key={`rule-${key}`} className="deco-divider sss-rule" aria-hidden="true" />)
      used = 0
    }
    used += span
    cells.push(
      <div key={key} className={`sss-block${joins ? ' is-joined' : ''}`} style={{ '--span': span }}
        data-eotm-block={key} data-eotm-label={BLOCKS[key].label} data-eotm-span={span}
        /* Click-to-edit opens the page layout (Arrange); the blocks text is built in. */
        data-eotm-edit={`pageLayout:${layout.docId ?? 'home'}`}>
        {BLOCKS[key].render(content)}
      </div>
    )
  })
  return cells
}

const Home = () => {
  const { mode } = useUvMode()
  const layout = usePageLayout('/', KEYS)
  const [published, setPublished] = useState(NONE)
  useEffect(() => {
    let active = true
    fetchPublished('home').then((docs) => active && setPublished(docs))
    return () => { active = false }
  }, [])
  const home = useLiveDocuments('home', published)[0]?.data
  const content = useMemo(() => contentOf(home), [home])

  return (
    <div className="sss-home" data-mode={mode}>
      <SiteHeader featured />

      <main className="sss-layout" data-eotm-layout>
        {arrange(layout, content)}
      </main>

      <SiteFooter brand={false} />
    </div>
  )
}

export default Home
