// src/components/Blocks.jsx
// One renderer per component a page can be made of: the blocks in the console's
// schema/sites/storyshaped.json. Card is the general one (small heading,
// heading, rich text, images, links by title, a signature, a look); Hero, Values
// grid, Daylight / blacklight photo, Product card and Image pairs gallery are
// the particular ones.
// Each draws with the site's own classes, so a page written in the console
// looks like the rest of the site. `marks` are the console's click-to-edit
// attributes (data-eotm-*). Rich text is sanitized by the console API on save;
// drafts come from the owner's own editor on the page.

import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import UvPhoto from '@/components/UvPhoto'
import { fetchPublished, useLiveDocuments, useSchema } from '@/lib/siteConsole'
import { toCard } from '@/lib/cards'
import { Extras, FieldParts, LinkTo, money, lookFor } from '@/components/Extras'
import { frameOf } from '@/components/Frame'
import '@/styles/MeetTheArtist.css'

// The rect neon lockup is the logo variant without "Uranium Glass Jewelry"
// under it, which is the one Whitney wants carrying the hero (board #10).
import heroLogo from '/assets/StoryShapedStudiosNeonGlow_Rect.png'

// The pairs in a console photos field: the nth Light photo with the nth Dark
// (the console's src/pairs.js), either side possibly missing.
export function pairsOf(photos) {
  const light = (photos ?? []).filter((p) => p?.index === 'Light' && p.src)
  const dark = (photos ?? []).filter((p) => p?.index === 'Dark' && p.src)
  return Array.from({ length: Math.max(light.length, dark.length) }, (_, k) => ({ light: light[k], dark: dark[k] }))
}

// Each daylight / blacklight pair, or the one shot there is, toggled by a filter.
function Paired({ photos, fallback, sizes = '(max-width: 820px) 92vw, 760px' }) {
  const pairs = pairsOf(photos)
  if (!pairs.length) return fallback ?? null
  return pairs.map(({ light, dark }, k) => (
    <UvPhoto key={`${light?.src ?? ''}|${dark?.src ?? ''}|${k}`} daylight={light?.src} blacklight={dark?.src} widths={[]}
      alt={(light ?? dark).alt ?? ''} sizes={sizes} loading={k ? 'lazy' : 'eager'} />
  ))
}

// Order is Whitney's, from the notes doc: big logo, tagline, the two CTAs,
// then the paired daylight/blacklight photo, then her credit.
function Hero({ block, marks, extras }) {
  const schema = useSchema()
  const frame = frameOf(block)
  const buttons = (block.buttons ?? []).filter((b) => b.label && b.url)
  return (
    <section className="hero" {...marks}>
      <h1 className="hero-logo-wrap" {...frame.part('logo')}>
        <img className="hero-logo" src={block.logo?.src || heroLogo} alt={block.logo?.alt || 'StoryShaped Studios'} />
      </h1>
      {block.tagline && <p className="hero-tagline" data-eotm-text="tagline" {...frame.part('tagline')}>{block.tagline}</p>}
      {buttons.length > 0 && (
        <div className="hero-actions" {...frame.part('buttons')}>
          {buttons.map((b, i) => (
            <LinkTo key={b._id ?? b.label} url={b.url} className={`btn ${i === 0 ? 'btn-primary' : 'btn-ghost'}`} style={lookFor(schema, 'blocks.hero.buttons', b)}>{b.label}</LinkTo>
          ))}
        </div>
      )}
      {/* UvPhoto carries its own switch in the caption slot. Empty: the
          floral-drop necklace, whose files carry width suffixes (resize_asset.py). */}
      <figure className="hero-figure deco-corners" {...frame.part('photos')}>
        <Paired photos={block.photos} fallback={(
          <UvPhoto
            daylight="/assets/hero-necklace-daylight"
            blacklight="/assets/hero-necklace-blacklight"
            alt="Antique uranium glass floral-drop necklace, shown in daylight and glowing under blacklight"
            sizes="(max-width: 820px) 92vw, 760px"
          />
        )} />
      </figure>
      {block.credit && <p className="hero-credit" data-eotm-text="credit" {...frame.part('credit')}>{block.credit}</p>}
      {extras}
    </section>
  )
}

function Values({ block, marks, extras }) {
  const schema = useSchema()
  const frame = frameOf(block)
  return (
    <section className="section" {...marks}>
      {block.heading && (
        <div className="section-head" {...frame.part('heading')}>
          <h2 data-eotm-text="heading">{block.heading}</h2>
        </div>
      )}
      <div className="values-grid" {...frame.part('items')}>
        {(block.items ?? []).map((v) => (
          <div className="value" key={v._id ?? v.title} style={lookFor(schema, 'blocks.values.items', v)}>
            <h3 data-eotm-text="title" data-eotm-in={v._id}>{v.title}</h3>
            {v.text && <p data-eotm-text="text" data-eotm-in={v._id}>{v.text}</p>}
            <Extras at="blocks.values.items" data={v} row={v._id} />
          </div>
        ))}
      </div>
      {extras}
    </section>
  )
}

function PhotoFeature({ block, marks, extras }) {
  const frame = frameOf(block)
  if (!block.photos?.length) return null
  return (
    <section className="section page-photo" {...marks}>
      <figure className="hero-figure deco-corners" {...frame.part('photos')}>
        <Paired photos={block.photos} />
      </figure>
      {block.caption && <p className="hero-credit" {...frame.part('caption')}>{block.caption}</p>}
      {extras}
    </section>
  )
}

// The general component. With images, the heading is the large centred one
// over them (a gallery, a framed photo); without, it heads the text column.
// Links show by title only. Look "story" is the longer read of Meet the Artist.
function Card({ block, marks, extras }) {
  const schema = useSchema()
  const frame = frameOf(block)
  const look = (l) => lookFor(schema, 'blocks.card.links', l)
  const { eyebrow, heading, body, byline, bylineNote } = block
  const images = (block.images ?? []).filter((i) => i?.src)
  const links = (block.links ?? []).filter((l) => l.url && l.title)
  const story = block.look === 'story'
  const head = (eyebrow || heading) && (
    <>
      {eyebrow && <p className="eyebrow" data-eotm-text="eyebrow" {...frame.part('eyebrow')}>{eyebrow}</p>}
      {heading && <h2 data-eotm-text="heading" {...frame.part('heading')}>{heading}</h2>}
    </>
  )
  const hasText = body || byline || links.length > 0
  return (
    <section className="section" {...marks}>
      {images.length > 0 && head && <div className="section-head" {...frame.wrap}>{head}</div>}
      {images.length === 1 && (
        <figure className="artist-cabinet deco-corners" {...frame.part('images')}>
          <img src={images[0].src} alt={images[0].alt ?? ''} />
        </figure>
      )}
      {images.length > 1 && (
        <div className="piece-grid artist-gallery" {...frame.part('images')}>
          {images.map((p, i) => (
            <figure key={p.src ?? i} className="piece-card deco-corners">
              <div className="frame"><img src={p.src} alt={p.alt ?? ''} /></div>
            </figure>
          ))}
        </div>
      )}
      {(hasText || (!images.length && head)) && (
        <div className={story ? 'artist-body' : 'prose-block'} {...frame.wrap}>
          {!images.length && head}
          {body && <div className="page-rich" data-eotm-richtext="body" dangerouslySetInnerHTML={{ __html: body }} {...frame.part('body')} />}
          {byline && (
            <p className="artist-sign" {...frame.part('byline')}>
              {byline}
              {bylineNote && <span data-eotm-text="bylineNote">{bylineNote}</span>}
            </p>
          )}
          {links.length > 0 && (story ? (
            <div className="artist-links" {...frame.part('links')}>
              {links.map((l) => <LinkTo key={l._id ?? l.url} url={l.url} style={look(l)}>{l.title}</LinkTo>)}
            </div>
          ) : (
            <div {...frame.group('links')}>
              {links.map((l) => (
                <LinkTo key={l._id ?? l.url} url={l.url} className="prose-link" style={look(l)}>
                  {l.title}
                  <span className="arrow" aria-hidden="true">→</span>
                </LinkTo>
              ))}
            </div>
          ))}
        </div>
      )}
      {extras}
    </section>
  )
}

// A Listing (the console's `listing`, ADR-0008) as a card: its first photo,
// title and lowest price. Published Listings only, plus the owner's drafts
// while editing.
const NONE = []
function useListings() {
  const [published, setPublished] = useState(NONE)
  useEffect(() => {
    let active = true
    fetchPublished('listing').then((docs) => active && setPublished(docs))
    return () => { active = false }
  }, [])
  return useLiveDocuments('listing', published)
}

function ProductCard({ block, marks, extras }) {
  const schema = useSchema()
  const frame = frameOf(block)
  const listing = useListings().find((d) => d.id === block.listing)
  if (!listing) return null
  const l = listing.data ?? {}
  const photo = (l.photos ?? []).find((p) => p.index === 'Light') ?? l.photos?.[0]
  const prices = (l.variations ?? []).map((v) => v.price?.amount).filter((a) => a != null)
  const price = prices.length ? money({ amount: Math.min(...prices), currency: l.variations[0].price.currency }) : null
  return (
    <section className="section" {...marks}>
      <figure className="piece-card deco-corners product-card" {...frame.part('listing', lookFor(schema, 'types.listing', l))}>
        {photo && <div className="frame"><img src={photo.src} alt={photo.alt ?? l.title ?? ''} /></div>}
        <figcaption>
          <strong>{l.title}</strong>
          {price && <span>{prices.length > 1 ? `from ${price}` : price}</span>}
          {block.note && <em>{block.note}</em>}
          <Extras at="types.listing" data={l} />
        </figcaption>
      </figure>
      {extras}
    </section>
  )
}

// Every Image pair (the console's imagePair documents, kept in its Images view):
// the Images page's gallery, in the order they were added, drafts included
// while the owner edits.
function useImagePairs() {
  const [published, setPublished] = useState([])
  useEffect(() => {
    let active = true
    fetchPublished('imagePair').then((d) => active && setPublished(d))
    return () => { active = false }
  }, [])
  return useLiveDocuments('imagePair', published)
}

function PairGallery({ block, marks, extras }) {
  const schema = useSchema()
  const frame = frameOf(block)
  const pairs = useImagePairs().filter((d) => pairsOf(d.data?.photos).length)
  return (
    <section className="section" {...marks}>
      {block.heading && (
        <div className="section-head" {...frame.part('heading')}>
          <h2 data-eotm-text="heading">{block.heading}</h2>
        </div>
      )}
      {block.intro && <p className="pair-gallery-intro" data-eotm-text="intro" {...frame.part('intro')}>{block.intro}</p>}
      <div className="pair-gallery" {...frame.part('gallery')}>
        {pairs.map((d) => (
          <figure key={d.id} className="pair-gallery-item deco-corners" data-eotm-edit={`imagePair:${d.id}`} data-eotm-label={d.data.title}
            style={lookFor(schema, 'types.imagePair', d.data)}>
            <Paired photos={d.data.photos} sizes="(max-width: 820px) 92vw, 380px" />
            {(d.data.title || d.data.caption) && (
              <figcaption>
                {d.data.title && <strong>{d.data.title}</strong>}
                {d.data.caption && <span>{d.data.caption}</span>}
              </figcaption>
            )}
            <Extras at="types.imagePair" data={d.data} />
          </figure>
        ))}
      </div>
      {extras}
    </section>
  )
}

export const BLOCKS = { hero: Hero, card: Card, values: Values, photoFeature: PhotoFeature, productCard: ProductCard, pairGallery: PairGallery }

// A section as the page renders it: one saved in a retired shape becomes a Card.
export const current = (block) => toCard(block)

// A name for the page layout's Arrange boxes and the Edit button.
export function labelOf(block) {
  return block.heading || (block._type === 'hero' && 'Hero') || block.byline || block.eyebrow || (block._type === 'card' && 'Card') || block._type
}

// A section type the owner designed in the console (Types and names), drawn
// from its fields in the Card's style until it is given a design of its own.
// The rules follow Spirit Seeds' CustomSection: the first short text is the
// heading, formatted text is HTML, a photo is framed, a link is an arrow link
// (labelled by the text field just before it, if any), a list repeats its own
// fields. Text fields can be changed where they stand (data-eotm-text).
export function CustomSection({ block, def, marks, extras }) {
  const frame = frameOf(block)
  const fields = def?.fields ?? []
  const headingIndex = fields.findIndex((f) => f.kind === 'text')
  const heading = headingIndex >= 0 ? block[fields[headingIndex].name] : null
  // Colour fields become custom properties the site's CSS (or a later design) can use.
  const colours = Object.fromEntries(fields.filter((f) => f.kind === 'color' && block[f.name]).map((f) => [`--${f.name}`, block[f.name]]))
  return (
    <section className="section custom-section" {...marks} style={{ ...marks?.style, ...colours }}>
      <div className="prose-block" {...frame.wrap}>
        {heading && <h2 data-eotm-text={fields[headingIndex].name} {...frame.part(fields[headingIndex].name)}>{heading}</h2>}
        <FieldParts fields={fields} data={block} headingIndex={headingIndex} frame={frame} />
      </div>
      {extras}
    </section>
  )
}
