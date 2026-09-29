// src/pages/Home.jsx
// Live home page for StoryShaped Studios.
// Signature: the UV (blacklight) toggle flips the whole page between
// daylight (pale vaseline glass) and blacklight (full uranium glow).

import React from 'react'
import { Link } from 'react-router-dom'
import { useUvMode } from '@/context/UvMode'
import SiteHeader from '@/components/SiteHeader'
import SiteFooter from '@/components/SiteFooter'
import UvPhoto from '@/components/UvPhoto'
import { usePageLayout } from '@/lib/siteConsole'
import '@/styles/Home.css'

// The rect neon lockup is the logo variant without "Uranium Glass Jewelry"
// under it, which is the one Whitney wants carrying the hero (board #10).
import heroLogo from '/assets/StoryShapedStudiosNeonGlow_Rect.png'

// Whitney's seven values, copy verbatim from the notes doc (board #16). The
// heading is "What We Believe", not the "Our Values" the board item was opened
// under. Seven is a lot of stacked text and three of them overlap, but that is
// a copy call for her, not one to make here — raised under board #41.
const values = [
  {
    title: 'Preserving History',
    body:
      'Every piece of uranium glass carries a story. We are committed to the ' +
      'stewardship of an extraordinary artistic heritage, preserving it for ' +
      'those who will discover it next.',
  },
  {
    title: 'Education Through Research',
    body:
      'Knowledge should be shared. Through ongoing research, historical ' +
      'documentation, and educational resources, we strive to be the world’s ' +
      'most trusted source for uranium glass jewelry.',
  },
  {
    title: 'Honoring the Material',
    body:
      'Remarkable materials deserve exceptional craftsmanship. Every piece is ' +
      'thoughtfully designed and handcrafted to become tomorrow’s heirloom.',
  },
  {
    title: 'Restoration & Renewal',
    body:
      'Some stories aren’t finished yet. Through careful repair and ' +
      'restoration, we breathe new life into vintage and antique uranium ' +
      'glass jewelry, honoring the hands that created it so it can continue ' +
      'to be loved across generations.',
  },
  {
    title: 'Authenticity',
    body:
      'We believe every piece deserves an honest story. From age and origin ' +
      'to materials and craftsmanship, we are committed to representing every ' +
      'piece with accuracy and integrity.',
  },
  {
    title: 'Curiosity & Discovery',
    body:
      'Whether it’s an overlooked antique necklace, a forgotten Czech bead, ' +
      'or a rare cabochon, we believe the thrill of discovery is part of the ' +
      'journey. We are always searching for remarkable pieces and the stories ' +
      'they carry.',
  },
  {
    title: 'Caring for Every Collector',
    body:
      'Whether you’re purchasing your first glowing pendant or your hundredth ' +
      'antique bead, we want every interaction to be welcoming, educational, ' +
      'and genuinely enjoyable.',
  },
]

// Home's sections, in Whitney's running order. Each is a block the owner can
// move and resize from the Edge of the Map console (a pageLayout for "/"); with
// no layout published they stack in this order at full width.
const BLOCKS = {
  hero: {
    label: 'Hero',
    content: (
      <>
        {/* ---------------- HERO ----------------
            Order is Whitney's, from the notes doc: big logo, tagline, the two
            CTAs, then the paired daylight/blacklight photo, then her credit. */}
        <section className="hero">
          <h1 className="hero-logo-wrap">
            <img className="hero-logo" src={heroLogo} alt="StoryShaped Studios" />
          </h1>

          <p className="hero-tagline">
            The World&rsquo;s Largest Resource for Uranium Glass Jewelry
          </p>

          <div className="hero-actions">
            <Link to="/library" className="btn btn-primary">
              Learn about Uranium Glass
            </Link>
            <Link to="/shop" className="btn btn-ghost">
              Shop the Collection
            </Link>
          </div>

          {/* UvPhoto carries its own switch in the caption slot, so there is no
              separate figcaption to fall out of sync with a per-image flip. */}
          <figure className="hero-figure deco-corners">
            <UvPhoto
              daylight="/assets/hero-necklace-daylight"
              blacklight="/assets/hero-necklace-blacklight"
              alt="Antique uranium glass floral-drop necklace, shown in daylight and glowing under blacklight"
              sizes="(max-width: 820px) 92vw, 760px"
            />
          </figure>

          <p className="hero-credit">
            Created by Whitney Granger, internationally recognized uranium glass
            jewelry artist and historian
          </p>
        </section>
      </>
    ),
  },
  believe: {
    label: 'What We Believe',
    content: (
      <>
        {/* Everything below the credit is Whitney's writing from the notes doc,
            in her running order: What We Believe, Our Story, Our Jewelry, A
            Space for Makers. Each section's name is now the heading itself —
            the old eyebrow-plus-pulled-phrase pairing is gone at her request. */}

        {/* ---------------- WHAT WE BELIEVE ---------------- */}
        <section className="section" id="what-we-believe">
          <div className="section-head">
            <h2>What We Believe</h2>
          </div>
          <div className="values-grid">
            {values.map((v) => (
              <div className="value" key={v.title}>
                <h3>{v.title}</h3>
                <p>{v.body}</p>
              </div>
            ))}
          </div>
        </section>
      </>
    ),
  },
  story: {
    label: 'Our Story',
    content: (
      <>
        {/* ---------------- OUR STORY ----------------
            Copy is Whitney's, verbatim from the notes doc. Her draft trails off
            mid-word on a link ("More on Whitney's personal journey here (hy"),
            so that fragment is not rendered; the link below points at the
            Meet the Artist page, which is the assumed target (board #40). */}
        <section className="section" id="our-story">
          <div className="prose-block">
            <h2>Our Story</h2>
            <p>
              Long before StoryShaped Studios existed, artisans were crafting
              jewelry from uranium glass. Whitney discovered that forgotten
              history in 2018 through a Neiger Brothers necklace, and it was
              love at first sight. Thousands of hours of research, an
              international community of collectors, and a passion for
              preserving these remarkable artifacts eventually led her to teach
              herself jewelry making during the 2020 pandemic. What began as a
              personal fascination grew into the world&rsquo;s leading authority
              on uranium glass jewelry and beads. Today, StoryShaped Studios
              preserves the history of uranium glass jewelry while creating
              heirloom-quality pieces that carry that story forward.
            </p>
            <Link to="/meet-the-artist" className="prose-link">
              More on Whitney&rsquo;s personal journey
              <span className="arrow" aria-hidden="true">→</span>
            </Link>
          </div>
        </section>
      </>
    ),
  },
  jewelry: {
    label: 'Our Jewelry',
    content: (
      <>
        {/* ---------------- OUR JEWELRY ---------------- */}
        <section className="section" id="our-jewelry">
          <div className="prose-block">
            <h2>Our Jewelry</h2>
            <p>
              Every StoryShaped Studios piece begins with genuine uranium glass,
              from rare antique treasures to newly crafted Czech glass. Whether
              creating an original design or carefully restoring a historic
              piece, our work is guided by a deep respect for the history,
              artistry, and enduring beauty of uranium glass.
            </p>
          </div>
        </section>
      </>
    ),
  },
  makers: {
    label: 'A Space for Makers',
    content: (
      <>
        {/* ---------------- A SPACE FOR MAKERS ---------------- */}
        <section className="section" id="makers">
          <div className="prose-block">
            <h2>A Space for Makers</h2>
            <p>
              StoryShaped Studios is the largest retailer of uranium glass beads
              in the world, with over 200 unique bead designs both vintage and
              newly made. All of our beads are the highest quality Czech glass.
            </p>
            <p>
              We also specialize in uranium glass cabochons, pendants, and
              faceted gems.
            </p>
          </div>
        </section>
      </>
    ),
  },
}
const KEYS = Object.keys(BLOCKS)

// A zigzag rule opens every row after the first, so blocks set side by side
// share one. A block that joins a row is marked, so it takes its own rule when
// the grid stacks on a phone.
function arrange(layout) {
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
        {BLOCKS[key].content}
      </div>
    )
  })
  return cells
}

const Home = () => {
  const { mode } = useUvMode()
  const layout = usePageLayout('/', KEYS)

  return (
    <div className="sss-home" data-mode={mode}>
      <SiteHeader featured />

      <main className="sss-layout" data-eotm-layout>
        {arrange(layout)}
      </main>

      <SiteFooter brand={false} />
    </div>
  )
}

export default Home
