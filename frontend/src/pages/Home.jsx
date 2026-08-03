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
import '@/styles/Home.css'

// The rect neon lockup is the logo variant without "Uranium Glass Jewelry"
// under it, which is the one Whitney wants carrying the hero (board #10).
import heroLogo from '/assets/StoryShapedStudiosNeonGlow_Rect.png'

// Pull the real product photography from the assets folder.
const photoImports = import.meta.glob('@/assets/coming-soon/PSX_*.jpg', {
  eager: true,
})
const photos = Object.entries(photoImports)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([, mod]) => mod.default)

const featured = [
  { name: 'The Marquise', tag: 'Uranium · Filigree' },
  { name: 'The Hexagon', tag: 'Faceted glass' },
  { name: 'The Drop', tag: 'Art Deco · c.1930s' },
]

const Home = () => {
  const { mode, lit, toggle } = useUvMode()

  return (
    <div className="sss-home" data-mode={mode}>
      <SiteHeader featured />

      <main>
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

        <div className="deco-divider" aria-hidden="true" />

        {/* ---------------- OUR STORY ----------------
            Copy is Whitney's, verbatim from the notes doc. Her draft trails off
            mid-word on a link ("More on Whitney's personal journey here (hy"),
            so that fragment is not rendered; the link below points at the
            Meet the Artist page, which is the assumed target. Confirm. */}
        <section className="section" id="our-story">
          <div className="prose-block">
            <p className="eyebrow">Our Story</p>
            <h2>Long before StoryShaped Studios existed</h2>
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

        <div className="deco-divider" aria-hidden="true" />

        {/* ---------------- A SPACE FOR MAKERS ----------------
            Copy verbatim from the notes doc. "Our Values" sits between this and
            Our Story in Whitney's running order, but its body is still marked
            "Text pending" (board #16), so it is not stubbed in here. */}
        <section className="section" id="makers">
          <div className="prose-block">
            <p className="eyebrow">A Space for Makers</p>
            <h2>Over 200 unique bead designs</h2>
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

        <div className="deco-divider" aria-hidden="true" />

        {/* ---------------- FEATURED ---------------- */}
        <section className="section">
          <div className="section-head">
            <p className="eyebrow">From the Collection</p>
            <h2>Pieces with a past</h2>
          </div>

          <div className="piece-grid">
            {featured.map((piece, i) => (
              <Link key={piece.name} to="/shop" className="piece-card deco-corners">
                <div className="frame">
                  <img
                    src={photos[(i + 1) % photos.length]}
                    alt={`${piece.name} — ${piece.tag}`}
                  />
                </div>
                <div className="piece-meta">
                  <h3>{piece.name}</h3>
                  <span>{piece.tag}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <div className="deco-divider" aria-hidden="true" />

        {/* ---------------- GLOW STORY ---------------- */}
        <section className="section" id="glow">
          <div className="glow-story">
            <figure className="story-img deco-corners">
              <img src={photos[photos.length - 1]} alt="Uranium glass beads glowing green" />
            </figure>
            <div className="story-copy">
              <p className="eyebrow">Why it glows</p>
              <h2>A trace of uranium, a century of light</h2>
              <p>
                Uranium glass carries a whisper of uranium oxide. Its most
                beloved form — <b>vaseline glass</b>, named for its soft, buttery
                daylight color — answers ultraviolet light with a green that looks
                lit from within. Every piece here is antique, hand-set, and
                unmistakably alive.
              </p>
              <button type="button" className="story-link" onClick={toggle}>
                {lit ? 'Return to daylight' : 'Flip the blacklight'}
                <span className="arrow" aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        </section>

        <div className="deco-divider" aria-hidden="true" />

        {/* ---------------- MEET THE ARTIST ---------------- */}
        <section className="section">
          <div className="artist-feature">
            <p className="eyebrow">The Maker</p>
            <h2>Meet the Artist</h2>
            <p>
              Every piece is hand-set by a single maker. Step behind the
              workbench and discover the story behind the glow.
            </p>
            <Link to="/meet-the-artist" className="btn btn-primary">
              Meet the Artist
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}

export default Home
