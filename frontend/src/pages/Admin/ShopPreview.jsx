/* eslint-disable react/prop-types */
// src/pages/Admin/ShopPreview.jsx
// The shop as it would read once matched Listings go live: every Listing that
// holds both an Etsy and an eBay ID, grouped by its shop section, drafts
// included. A roadmap, not the shop: nothing here publishes.
//
// It also holds the daylight / blacklight guess. Each photo is read through
// /api/marketplace/photo (Etsy's image host sends no CORS header) and a photo
// that is mostly near-black is guessed a blacklight shot ("Dark"). The guess
// only turns Light into Dark, never back, and saves Listing drafts; the owner
// checks every one in the editor before anything is published.
//
// Review status: every Listing is New until someone marks it Reviewed here
// (data.photoReview = { status, at }, saved as a draft, not in the console
// schema). A guess that changes a Listing's photos sets it back to New, and the
// guess skips Reviewed Listings, so a checked Listing is never re-guessed.

import React, { useMemo, useState } from 'react'
import { API_BASE } from '@/lib/api'
import { editorToken, CONSOLE_API } from '@/lib/siteConsole'
import { shown } from '@/lib/shown'

const money = (amount, currency = 'USD') => (amount == null ? null
  : new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount / 100))

// Small copies to read: Etsy and eBay both serve sizes by name in the URL.
const small = (src) => src.replace(/\/il_fullxfull\./, '/il_340x270.')

// Share of near-black pixels, mean luminance, and the share of lit pixels that
// are uranium green. Blacklight shots are mostly black around a glow.
async function readPhoto(src) {
  const res = await fetch(`${API_BASE}/api/marketplace/photo?src=${encodeURIComponent(small(src))}`,
    // Read once per run, so nothing to gain from the browser cache, and a bad
    // response kept there would fail every later run.
    { headers: { Authorization: `Bearer ${editorToken()}` }, cache: 'no-store' })
  if (!res.ok) throw new Error(`photo ${res.status}`)
  const bmp = await createImageBitmap(await res.blob())
  const canvas = new OffscreenCanvas(64, 64)
  const ctx = canvas.getContext('2d')
  ctx.drawImage(bmp, 0, 0, 64, 64)
  const px = ctx.getImageData(0, 0, 64, 64).data
  let lum = 0, dark = 0, lit = 0, green = 0
  for (let i = 0; i < px.length; i += 4) {
    const [r, g, b] = [px[i], px[i + 1], px[i + 2]]
    const l = 0.299 * r + 0.587 * g + 0.114 * b
    lum += l
    if (l < 45) dark++
    else { lit++; if (g > r * 1.25 && g > b * 1.05) green++ }
  }
  const n = px.length / 4
  return { lum: lum / n, dark: dark / n, green: lit ? green / lit : 0 }
}
export const isBlacklight = ({ lum, dark, green }) =>
  dark >= 0.4 || (lum < 70 && dark >= 0.3) || (green >= 0.3 && dark >= 0.25)

async function pool(items, size, fn) {
  let next = 0
  await Promise.all(Array.from({ length: size }, async () => {
    while (next < items.length) { const i = next++; await fn(items[i], i) }
  }))
}

export const reviewOf = (doc) => (doc.data?.photoReview?.status === 'Reviewed' ? 'Reviewed' : 'New')
const when = (iso) => (iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '')

async function saveData(d, data) {
  const res = await fetch(`${CONSOLE_API}/documents/${d.id}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', Authorization: `Bearer ${editorToken()}` },
    body: JSON.stringify({ baseVersion: d.version, slug: d.slug, data }),
  }).catch((e) => ({ ok: false, statusText: e.message }))
  if (res.ok) return { doc: await res.json() }
  return { status: res.status, error: (await res.json?.().catch(() => null))?.error ?? res.statusText ?? res.status }
}

function Card({ doc, uv, busy, onReview }) {
  const l = doc.data ?? {}
  const review = reviewOf(doc)
  const photos = shown(l, 'photos') ?? []
  const want = uv ? 'Dark' : 'Light'
  const photo = photos.find((p) => p.index === want) ?? photos[0]
  const dark = photos.filter((p) => p.index === 'Dark').length
  const prices = (l.variations ?? []).map((v) => v.price?.amount).filter((a) => a != null)
  const price = prices.length ? money(Math.min(...prices), l.variations[0].price?.currency) : null
  return (
    <figure className={`sp-card ${review === 'Reviewed' ? 'is-reviewed' : 'is-new'}`}>
      <div className="sp-frame">
        {photo ? <img src={photo.src} alt={photo.alt ?? ''} loading="lazy" /> : <span className="ai-muted">No photo</span>}
        <span className="sp-status">{review === 'Reviewed' ? `✓ Reviewed ${when(l.photoReview?.at)}` : 'New'}</span>
      </div>
      <figcaption>
        <strong>{shown(l, 'title') || doc.slug}</strong>
        {price && <span>{prices.length > 1 ? `from ${price}` : price}</span>}
        <span className="ai-muted">
          Listing {l.listingNumber} · {photos.length - dark} daylight, {dark} blacklight
          {uv && !dark && photos.length > 0 && ' (no blacklight photo yet)'}
        </span>
        <code className="mk-id">Etsy {l.etsyListingId || '–'} · eBay {l.ebayItemId || '–'}</code>
        <button type="button" className="sp-review" disabled={busy} onClick={() => onReview(doc, review === 'Reviewed' ? 'New' : 'Reviewed')}>
          {busy ? 'Saving…' : review === 'Reviewed' ? 'Back to New' : 'Mark reviewed'}
        </button>
      </figcaption>
    </figure>
  )
}

export default function ShopPreview({ docs: loaded, reload }) {
  const [uv, setUv] = useState(false)
  const [scope, setScope] = useState('matched') // matched | all
  const [show, setShow] = useState('all') // all | New | Reviewed
  const [saving, setSaving] = useState(() => new Set())
  const [saved, setSaved] = useState(() => new Map()) // id -> doc as saved here, until a reload catches up
  const [reviewError, setReviewError] = useState('')
  const [guess, setGuess] = useState(null) // { busy, read, total, failed, listings, photos, error }

  const docs = useMemo(() => (loaded ?? []).map((d) => {
    const mine = saved.get(d.id)
    return mine && mine.version > d.version ? mine : d
  }), [loaded, saved])

  const inScope = useMemo(() => docs.filter((d) => (scope === 'all'
    ? (d.data?.photos ?? []).length > 0
    : d.data?.etsyListingId && d.data?.ebayItemId)), [docs, scope])
  const reviewed = inScope.filter((d) => reviewOf(d) === 'Reviewed').length

  const sections = useMemo(() => {
    const by = new Map()
    for (const d of inScope) {
      if (show !== 'all' && reviewOf(d) !== show) continue
      const name = String(d.data.section ?? '').trim() || 'No shop section'
      by.set(name, [...(by.get(name) ?? []), d])
    }
    return [...by.entries()].sort(([a], [b]) => (a === 'No shop section') - (b === 'No shop section') || a.localeCompare(b))
      .map(([name, list]) => [name, list.sort((a, b) => (shown(a.data, 'title') ?? '').localeCompare(shown(b.data, 'title') ?? ''))])
  }, [inScope, show])

  const setReview = async (d, status) => {
    setSaving((s) => new Set(s).add(d.id))
    setReviewError('')
    const r = await saveData(d, { ...d.data, photoReview: { status, at: new Date().toISOString() } })
    if (r.doc) setSaved((m) => new Map(m).set(d.id, r.doc))
    else {
      setReviewError(`Listing ${d.data?.listingNumber} not marked ${status}: ${r.error}.${r.status === 409 ? ' It changed elsewhere; reloaded, try again.' : ''}`)
      if (r.status === 409) reload?.()
    }
    setSaving((s) => { const n = new Set(s); n.delete(d.id); return n })
  }

  // Every Listing with photos still all Light; a Listing that already has a
  // Dark photo was set by hand, and a Reviewed one was checked: both left alone.
  const runGuess = async () => {
    const todo = docs.filter((d) => (d.data?.photos ?? []).length && reviewOf(d) !== 'Reviewed'
      && !d.data.photos.some((p) => p.index === 'Dark'))
    const srcs = [...new Set(todo.flatMap((d) => d.data.photos.map((p) => p.src)))]
    const read = new Map()
    let failed = 0
    setGuess({ busy: true, read: 0, total: srcs.length, failed: 0 })
    await pool(srcs, 8, async (src) => {
      try { read.set(src, isBlacklight(await readPhoto(src))) } catch { failed++ }
      setGuess((g) => ({ ...g, read: read.size + failed, failed }))
    })
    const changes = todo.map((d) => {
      const photos = d.data.photos.map((p) => (read.get(p.src) ? { ...p, index: 'Dark' } : p))
      return { d, photos, n: photos.filter((p, i) => p.index !== d.data.photos[i].index).length }
    }).filter((c) => c.n)
    let done = 0, photos = 0
    const errors = []
    await pool(changes, 4, async ({ d, photos: next, n }) => {
      const r = await saveData(d, { ...d.data, photos: next, photoReview: { status: 'New', at: new Date().toISOString(), guessed: true } })
      if (r.doc) { done++; photos += n } else errors.push(`Listing ${d.data.listingNumber}: ${r.error}`)
      setGuess((g) => ({ ...g, listings: done, photos }))
    })
    setGuess({ busy: false, read: srcs.length, total: srcs.length, failed, listings: done, photos, errors })
    reload?.()
  }

  return (
    <section className="ai-section">
      <h2>Shop preview</h2>
      <p className="ai-hint">
        {inScope.length} {scope === 'all' ? 'Listings with photos' : 'matched Listings (on Etsy and eBay)'} by shop section, drafts included,
        as the shop would group them. Titles and photos follow each Listing&apos;s &quot;Shown on the site&quot; choice. Nothing here publishes.
      </p>
      <div className="sp-progress" role="status">
        <strong>{reviewed} of {inScope.length} reviewed</strong>
        <span className="ai-muted">{inScope.length - reviewed} New</span>
        <progress max={inScope.length || 1} value={reviewed} aria-label="Reviewed" />
      </div>
      {reviewError && <p className="ai-error">{reviewError}</p>}
      <div className="ai-inline-form mk-review-bar">
        <div className="mk-tabs" role="group" aria-label="Which Listings">
          <button type="button" className={scope === 'matched' ? 'is-on' : ''} aria-pressed={scope === 'matched'} onClick={() => setScope('matched')}>Matched</button>
          <button type="button" className={scope === 'all' ? 'is-on' : ''} aria-pressed={scope === 'all'} onClick={() => setScope('all')}>All with photos</button>
        </div>
        <div className="mk-tabs" role="group" aria-label="Review status">
          {['all', 'New', 'Reviewed'].map((k) => (
            <button key={k} type="button" className={show === k ? 'is-on' : ''} aria-pressed={show === k} onClick={() => setShow(k)}>
              {k === 'all' ? 'Any status' : k}
            </button>
          ))}
        </div>
        <div className="mk-tabs" role="group" aria-label="Light">
          <button type="button" className={!uv ? 'is-on' : ''} aria-pressed={!uv} onClick={() => setUv(false)}>Daylight</button>
          <button type="button" className={uv ? 'is-on' : ''} aria-pressed={uv} onClick={() => setUv(true)}>Blacklight</button>
        </div>
        <button type="button" disabled={guess?.busy} onClick={runGuess}>
          {guess?.busy ? `Reading photos ${guess.read} of ${guess.total}…` : 'Guess daylight and blacklight photos'}
        </button>
        <nav className="sp-jump" aria-label="Sections">
          {sections.map(([name, list]) => <a key={name} href={`#sp-${encodeURIComponent(name)}`}>{name} ({list.length})</a>)}
        </nav>
      </div>
      <p className="ai-hint">
        The guess reads every photo of each Listing that has no blacklight photo yet, marks mostly-dark ones as blacklight, and saves
        the drafts, marking each Listing it changes New. It never turns a blacklight photo back to daylight and skips Reviewed Listings.
        Check each, fix it in the editor, then Mark reviewed.
      </p>
      {guess && !guess.busy && (
        <p className="ai-hint">
          {guess.photos} photos on {guess.listings} Listings marked blacklight and saved as drafts.
          {guess.failed > 0 && ` ${guess.failed} photos did not load and were left as they were.`}
          {guess.errors?.length > 0 && ` ${guess.errors.length} Listings not saved: ${guess.errors.slice(0, 5).join('; ')}.`}
        </p>
      )}
      {sections.map(([name, list]) => (
        <div key={name} id={`sp-${encodeURIComponent(name)}`} className="sp-section">
          <h3>{name} <span className="ai-muted">{list.length} · {list.filter((d) => reviewOf(d) === 'Reviewed').length} reviewed</span></h3>
          <div className="sp-grid">
            {list.map((d) => <Card key={d.id} doc={d} uv={uv} busy={saving.has(d.id)} onReview={setReview} />)}
          </div>
        </div>
      ))}
    </section>
  )
}
