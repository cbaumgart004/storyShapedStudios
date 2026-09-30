// src/pages/MeetTheArtist.jsx
// "Meet the Artist" page: three portrait images across the top, the artist's
// story in a text body, then the cabinet photo. Wrapped in .sss-home[data-mode]
// so it inherits the shared daylight/blacklight design tokens, nav, and footer.
//
// Its words, links and photos are the console's `artistPage` document (one per
// site); while the owner edits, the draft renders live. BUILT_IN is the page as
// shipped, used field by field wherever the document is missing or blank, and
// is also the console's default for a new `artistPage`
// (schema/sites/storyshaped.json), so the two change together.

import React, { useEffect, useState } from 'react'
import { useUvMode } from '@/context/UvMode'
import SiteHeader from '@/components/SiteHeader'
import SiteFooter from '@/components/SiteFooter'
import SourceLink from '@/components/SourceLink'
import { fetchPublished, useLiveDocuments } from '@/lib/siteConsole'
import '@/styles/Home.css'
import '@/styles/MeetTheArtist.css'

// The three portrait photos + the cabinet shot shown under the story.
import artist1 from '@/assets/artist/1000074267.jpg'
import artist2 from '@/assets/artist/1000074325.jpg'
import artist3 from '@/assets/artist/1000074345.jpg'
import cabinet from '@/assets/artist/cabinet.jpg'

const BUILT_IN = {
  eyebrow: 'The Hands Behind the Glow',
  heading: 'Meet the Artist',
  photos: [artist1, artist2, artist3].map((src, i) => ({ src, alt: `Whitney Granger, creator of StoryShaped Studios (${i + 1})` })),
  body:
    '<p>I specialize in handmade <b>uranium glass</b> jewelry as well as the repair and restoration of antique and vintage uranium glass jewelry pieces. ' +
    'I am passionate about uranium glass and its wildly fascinating history. My knowledge is the result of thousands of hours of research, travel, and ' +
    'identification over the past 5 years. I am totally dedicated to furthering the knowledge and appreciation of this unusual type of jewelry.</p>' +
    '<p>I came to Colorado several years ago and love my new home more every day, although many miles away from the cornfields of central Illinois ' +
    'where I grew up. I received a degree in Psychology with a minor in English Literature, and I worked for 10 years alongside adults with intellectual ' +
    'and developmental disabilities in residential settings. I also ran an international non-profit agency dedicated to assisting countries working toward ' +
    'the deinstitutionalization of their disabled citizens.</p>' +
    '<p>In 2020 with the onset of the pandemic, my search for a career change intersected with being quarantined. I had always loved jewelry, and this was ' +
    'the perfect opportunity to try my hand at it. Today I am the largest uranium glass bead supplier in the US. I am world-renowned as an expert on all ' +
    'things uranium glass jewelry. I specialize in sourcing old art deco cabochons, faceted glass gems, old glass beads, and vintage and antique jewelry ' +
    'items. I travel the world to find these historic pieces. I incorporate contemporary glass components from the Czech Republic as well.</p>' +
    '<p>I am also a rare book collector, a musician and multi-instrumentalist, the wife of a clever and magical woodland elf, and the devoted subject of ' +
    'two feline overlords.</p>' +
    '<p>It is a true honor to promote the love and appreciation I have for uranium glass among jewelry collectors and I am proud to preserve and further ' +
    'the concept of an <b>‘Eternal Glow’</b>.</p>',
  signature: 'Whitney Granger',
  signatureTitle: 'Creator and Designer of StoryShaped Studios',
  links: [
    { title: 'My interview with House Beautiful magazine', url: 'https://www.housebeautiful.com/design-inspiration/a45459335/uranium-glass-collecting-radioactive-glassware/' },
    { title: 'My interview with The Denver Post', url: 'https://www.denverpost.com/2023/10/26/uranium-glass-jewelry-halloween-colorado-collector-for-sale/' },
  ],
  cabinet: { src: cabinet, alt: 'Whitney’s uranium glass jewelry cabinet, glowing' },
}

const blank = (v) => v == null || v === '' || (Array.isArray(v) && !v.length) || (typeof v === 'object' && !Array.isArray(v) && !v.src)
const NONE = []
// Every section opens the page's document for click-to-edit.
const EDIT = { 'data-eotm-edit': 'artistPage:artistpage' }

export default function MeetTheArtist() {
  const { mode } = useUvMode()
  const [published, setPublished] = useState(NONE)
  useEffect(() => {
    let active = true
    fetchPublished('artistPage').then((docs) => active && setPublished(docs))
    return () => { active = false }
  }, [])
  const data = useLiveDocuments('artistPage', published)[0]?.data ?? {}
  const page = Object.fromEntries(Object.entries(BUILT_IN).map(([k, v]) => [k, blank(data[k]) ? v : data[k]]))

  return (
    <div className="sss-home" data-mode={mode}>
      <SiteHeader />

      <main>
        {/* ---------------- THREE IMAGES ---------------- */}
        <section className="section" {...EDIT} data-eotm-label="Portraits">
          <div className="section-head">
            {page.eyebrow && <p className="eyebrow">{page.eyebrow}</p>}
            <h2>{page.heading}</h2>
          </div>

          <div className="piece-grid artist-gallery">
            {page.photos.slice(0, 3).map((p, i) => (
              <figure key={p.src ?? i} className="piece-card deco-corners">
                <div className="frame">
                  <img src={p.src} alt={p.alt ?? ''} />
                </div>
              </figure>
            ))}
          </div>
        </section>

        <div className="deco-divider" aria-hidden="true" />

        {/* ---------------- TEXT BODY ----------------
            Sanitized by the console API on save; drafts come from the owner's
            own editor on this page. */}
        <section className="section artist-body" {...EDIT} data-eotm-label="Story">
          <div dangerouslySetInnerHTML={{ __html: page.body }} />

          <p className="artist-sign">
            {page.signature}
            {page.signatureTitle && <span>{page.signatureTitle}</span>}
          </p>

          {page.links.length > 0 && (
            <div className="artist-links">
              {page.links.filter((l) => l.url).map((l) => (
                <SourceLink key={l._id ?? l.url} url={l.url} title={l.title} />
              ))}
            </div>
          )}
        </section>

        <div className="deco-divider" aria-hidden="true" />

        {/* ---------------- CABINET PHOTO ---------------- */}
        <section className="section" {...EDIT} data-eotm-label="Photo">
          <figure className="artist-cabinet deco-corners">
            <img src={page.cabinet.src} alt={page.cabinet.alt ?? ''} />
          </figure>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
