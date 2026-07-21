// src/pages/MeetTheArtist.jsx
// "Meet the Artist" page: three portrait images across the top, the artist's
// story in a text body, then the cabinet photo. Wrapped in .sss-home[data-mode]
// so it inherits the shared daylight/blacklight design tokens, nav, and footer.

import React, { useEffect } from 'react'
import { useUvMode } from '@/context/UvMode'
import SiteHeader from '@/components/SiteHeader'
import SiteFooter from '@/components/SiteFooter'
import '@/styles/Home.css'
import '@/styles/MeetTheArtist.css'

// The three portrait photos + the cabinet shot shown under the story.
import artist1 from '@/assets/artist/1000074267.jpg'
import artist2 from '@/assets/artist/1000074325.jpg'
import artist3 from '@/assets/artist/1000074345.jpg'
import cabinet from '@/assets/artist/cabinet.jpg'

const photos = [artist1, artist2, artist3]

export default function MeetTheArtist() {
  const { mode } = useUvMode()

  // Land at the top when navigating in (e.g. from the Home feature link).
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <div className="sss-home" data-mode={mode}>
      <SiteHeader />

      <main>
        {/* ---------------- THREE IMAGES ---------------- */}
        <section className="section">
          <div className="section-head">
            <p className="eyebrow">The Hands Behind the Glow</p>
            <h2>Meet the Artist</h2>
          </div>

          <div className="piece-grid artist-gallery">
            {photos.slice(0, 3).map((src, i) => (
              <figure key={i} className="piece-card deco-corners">
                <div className="frame">
                  <img
                    src={src}
                    alt={`Whitney Granger, creator of StoryShaped Studios (${i + 1})`}
                  />
                </div>
              </figure>
            ))}
          </div>
        </section>

        <div className="deco-divider" aria-hidden="true" />

        {/* ---------------- TEXT BODY ---------------- */}
        <section className="section artist-body">
          <p>
            I specialize in handmade <b>uranium glass</b> jewelry as well as the
            repair and restoration of antique and vintage uranium glass jewelry
            pieces. I am passionate about uranium glass and its wildly fascinating
            history. My knowledge is the result of thousands of hours of research,
            travel, and identification over the past 5 years. I am totally
            dedicated to furthering the knowledge and appreciation of this unusual
            type of jewelry.
          </p>
          <p>
            I came to Colorado several years ago and love my new home more every
            day, although many miles away from the cornfields of central Illinois
            where I grew up. I received a degree in Psychology with a minor in
            English Literature, and I worked for 10 years alongside adults with
            intellectual and developmental disabilities in residential settings. I
            also ran an international non-profit agency dedicated to assisting
            countries working toward the deinstitutionalization of their disabled
            citizens.
          </p>
          <p>
            In 2020 with the onset of the pandemic, my search for a career change
            intersected with being quarantined. I had always loved jewelry, and
            this was the perfect opportunity to try my hand at it. Today I am the
            largest uranium glass bead supplier in the US. I am world-renowned as
            an expert on all things uranium glass jewelry. I specialize in sourcing
            old art deco cabochons, faceted glass gems, old glass beads, and
            vintage and antique jewelry items. I travel the world to find these
            historic pieces. I incorporate contemporary glass components from the
            Czech Republic as well.
          </p>
          <p>
            I am also a rare book collector, a musician and multi-instrumentalist,
            the wife of a clever and magical woodland elf, and the devoted subject
            of two feline overlords.
          </p>
          <p>
            It is a true honor to promote the love and appreciation I have for
            uranium glass among jewelry collectors and I am proud to preserve and
            further the concept of an <b>‘Eternal Glow’</b>.
          </p>

          <p className="artist-sign">
            Whitney Granger
            <span>Creator and Designer of StoryShaped Studios</span>
          </p>

          <div className="artist-links">
            <a
              href="https://www.housebeautiful.com/design-inspiration/a45459335/uranium-glass-collecting-radioactive-glassware/"
              target="_blank"
              rel="noopener noreferrer"
            >
              My interview with House Beautiful magazine
            </a>
            <a
              href="https://www.denverpost.com/2023/10/26/uranium-glass-jewelry-halloween-colorado-collector-for-sale/"
              target="_blank"
              rel="noopener noreferrer"
            >
              My interview with The Denver Post
            </a>
          </div>
        </section>

        <div className="deco-divider" aria-hidden="true" />

        {/* ---------------- CABINET PHOTO ---------------- */}
        <section className="section">
          <figure className="artist-cabinet deco-corners">
            <img src={cabinet} alt="Whitney's uranium glass jewelry cabinet, glowing" />
          </figure>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
