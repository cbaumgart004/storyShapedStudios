// src/pages/Admin/EtsyReview.jsx
// Every active Etsy listing as Etsy holds it, laid beside the Listing model
// (console schema, type listing), so the shop can be reviewed in preview and the
// model's gaps found before any Listing is built from them.
//
// Reads the production API whichever address the page is on: the Etsy sign-in,
// its token and the snapshots live in the production database alone, and there
// is one shop. Refresh asks Etsy for every active listing and keeps each as a
// snapshot (import_snapshots, unmodified); nothing is written to Etsy.

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { editorToken } from '@/lib/siteConsole'
import { openAccount } from '@/lib/account'
import { useLogin } from '@/components/SignedIn'
import '@/styles/AdminInventory.css'
import '@/styles/EtsyReview.css'

const API = 'https://storyshapedstudios.com/api/marketplace/snapshots/etsy'
// Cards drawn at a time: the shop has several hundred listings.
const PAGE = 48

// Etsy's listing field -> where the Listing model keeps it.
const MAPPED = {
  title: 'title',
  description: 'description',
  images: 'photos',
  shop_section_id: 'section',
  taxonomy_id: 'etsyCategory',
  tags: 'tags[].tag',
  materials: 'materials[].material',
  who_made: 'whoMade',
  when_made: 'whenMade',
  is_supply: 'isSupply',
  item_weight: 'package.weight',
  item_weight_unit: 'package.weightUnit',
  item_length: 'package.length',
  item_width: 'package.width',
  item_height: 'package.height',
  item_dimensions_unit: 'package.dimensionUnit',
  inventory: 'variationName, variations[] (option, sku, price)',
  skus: 'variations[].sku',
  price: 'variations[].price',
  shipping_profile_id: 'etsy.shippingProfileId',
  readiness_state_id: 'etsy.processingProfileId',
  return_policy_id: 'etsy.returnPolicyId',
  style: 'etsy.styles[].style',
  is_customizable: 'etsy.customizable',
  should_auto_renew: 'etsy.autoRenew',
  listing_id: 'etsyListingId',
  quantity: 'stock (Stock Item count, not the Listing)',
}
// Etsy's bookkeeping: not shop content, so not a gap.
const IGNORED = new Set([
  'user_id', 'shop_id', 'state', 'creation_timestamp', 'created_timestamp', 'ending_timestamp',
  'original_creation_timestamp', 'last_modified_timestamp', 'updated_timestamp', 'state_timestamp',
  'url', 'views', 'num_favorers', 'featured_rank', 'listing_type', 'language', 'has_variations',
  'file_data', 'shipping_profile', 'shop', 'user', 'translations', 'videos', 'production_partners',
])
const money = (p) => (p?.amount != null ? `${(p.amount / (p.divisor || 100)).toFixed(2)} ${p.currency_code ?? ''}`.trim() : '')

function Variations({ inventory }) {
  const products = inventory?.products ?? []
  if (!products.length) return null
  const names = [...new Set(products.flatMap((p) => (p.property_values ?? []).map((v) => v.property_name)))]
  return (
    <table className="ai-table er-variations">
      <thead><tr>{names.map((n) => <th key={n}>{n}</th>)}<th>SKU</th><th>Price</th><th>Qty</th></tr></thead>
      <tbody>
        {products.map((p) => (
          <tr key={p.product_id ?? p.sku}>
            {names.map((n) => <td key={n}>{(p.property_values ?? []).find((v) => v.property_name === n)?.values?.join(', ') ?? ''}</td>)}
            <td>{p.sku || <span className="ai-error">none</span>}</td>
            <td>{money(p.offerings?.[0]?.price)}</td>
            <td>{p.offerings?.[0]?.quantity ?? ''}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// raw: the listing cut to what the card shows; fetchRaw reads it whole.
// names: { sections, categories }, id to name, from the same GET.
function Card({ raw, fetchRaw, names }) {
  const [full, setFull] = useState(null)
  const images = raw.images ?? []
  const [shown, setShown] = useState(0)
  const img = images[shown]
  return (
    <article className="er-card">
      <div className="er-photos">
        {img ? <img src={img.url_570xN ?? img.url_fullxfull} alt={img.alt_text || raw.title} loading="lazy" /> : <div className="er-nophoto">No photo</div>}
        {images.length > 1 && (
          <div className="er-thumbs">
            {images.map((m, i) => (
              <button key={m.listing_image_id ?? i} type="button" className={i === shown ? 'er-on' : ''} onClick={() => setShown(i)} aria-label={`Photo ${i + 1}`}>
                <img src={m.url_75x75} alt="" loading="lazy" />
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="er-body">
        <h2>{raw.title}</h2>
        <p className="ai-muted">
          {money(raw.price)} · {raw.quantity} available · listing {raw.listing_id}
          {raw.url && <> · <a href={raw.url} target="_blank" rel="noreferrer">on Etsy</a></>}
        </p>
        <dl className="er-facts">
          <dt>Section</dt><dd>{raw.shop_section_id == null ? 'none' : names.sections?.[raw.shop_section_id] ?? raw.shop_section_id}</dd>
          <dt>Category</dt><dd>{raw.taxonomy_id == null ? 'none' : names.categories?.[raw.taxonomy_id] ?? raw.taxonomy_id}</dd>
          <dt>Who made, when</dt><dd>{[raw.who_made, raw.when_made].filter(Boolean).join(', ') || 'not set'}{raw.is_supply ? ' (supply)' : ''}</dd>
          <dt>SKUs</dt><dd>{(raw.skus ?? []).join(', ') || <span className="ai-error">none</span>}</dd>
          <dt>Tags</dt><dd>{(raw.tags ?? []).join(', ') || 'none'}</dd>
          <dt>Materials</dt><dd>{(raw.materials ?? []).join(', ') || 'none'}</dd>
          <dt>Package</dt><dd>{raw.item_weight ? `${raw.item_weight} ${raw.item_weight_unit ?? ''}` : 'no weight'}{raw.item_length ? `, ${raw.item_length} x ${raw.item_width} x ${raw.item_height} ${raw.item_dimensions_unit ?? ''}` : ''}</dd>
        </dl>
        <Variations inventory={raw.inventory} />
        <details><summary>Description</summary><p className="er-description">{raw.description}</p></details>
        <details onToggle={(e) => { if (e.currentTarget.open && !full) fetchRaw(raw.listing_id).then((d) => setFull(d.raw ?? d), (err) => setFull({ error: err.message })) }}>
          <summary className="ai-muted">As Etsy sent it</summary>
          <pre className="ai-pre">{full ? JSON.stringify(full, null, 2) : 'Loading…'}</pre>
        </details>
      </div>
    </article>
  )
}

// Every field Etsy filled on at least one listing that the model has no place
// for. filled: field -> how many listings fill it, counted by the backend.
function Gaps({ filled: counts, total }) {
  const gaps = useMemo(() => Object.entries(counts ?? {})
    .filter(([k]) => !(k in MAPPED) && !IGNORED.has(k))
    .sort((a, b) => b[1] - a[1]), [counts])
  return (
    <section className="ai-section">
      <h2>Model gaps</h2>
      {gaps.length ? (
        <>
          <p>Etsy fields filled on these listings that the Listing model has no field for:</p>
          <ul className="ai-bom-list">{gaps.map(([k, n]) => <li key={k}><code>{k}</code> <span className="ai-muted">on {n} of {total}</span></li>)}</ul>
        </>
      ) : <p>None: every filled Etsy field has a place in the Listing model.</p>}
      <details><summary className="ai-muted">Where each Etsy field goes</summary>
        <ul className="ai-bom-list">{Object.entries(MAPPED).map(([k, v]) => <li key={k}><code>{k}</code> to {v}</li>)}</ul>
      </details>
    </section>
  )
}

export default function EtsyReview() {
  const login = useLogin()
  const [listings, setListings] = useState(null)
  const [filled, setFilled] = useState(null)
  const [limit, setLimit] = useState(PAGE)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState(null)
  const [names, setNames] = useState({})
  const [query, setQuery] = useState('')

  const call = useCallback(async (method, path = '') => {
    // A request that runs out of time comes back with no CORS header, which
    // the browser reports only as a failed fetch.
    const res = await fetch(API + path, { method, headers: { Authorization: `Bearer ${editorToken()}` } })
      .catch(() => { throw new Error('The request did not finish. It may have run too long; try again, and if it repeats, say so.') })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`)
    return data
  }, [])
  const load = useCallback(() => call('GET').then((d) => { setListings(d.listings); setFilled(d.filled); setNames({ sections: d.sections, categories: d.categories }) }).catch((e) => setError(e.message)), [call])
  const refresh = async () => {
    setBusy(true); setError(null)
    try {
      const out = await call('POST')
      setNote(`Etsy read: ${out.kept ?? 0} new or changed, ${out.unchanged ?? 0} unchanged.`)
      await load()
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  // The token decides; the login only re-renders the page when it changes.
  const signedIn = Boolean(editorToken())
  useEffect(() => { if (signedIn) load() }, [signedIn, login, load])

  const matching = (listings ?? []).filter(({ listing: raw }) => !query || `${raw.title} ${(raw.skus ?? []).join(' ')} ${(raw.tags ?? []).join(' ')}`.toLowerCase().includes(query.toLowerCase()))

  return (
    <div className="admin-inventory er-page">
      <header className="ai-header">
        <div>
          <p className="eyebrow">Internal tool</p>
          <h1>Etsy listings</h1>
        </div>
        <Link to="/admin/inventory" className="ai-back-link">← Stock</Link>
      </header>
      {!signedIn ? (
        <section className="ai-section">
          <p>The Etsy review is for the studio only. Sign in to see it.</p>
          <button type="button" onClick={() => openAccount()}>Sign in</button>
        </section>
      ) : (
        <>
          {error && <p className="ai-error">{error}</p>}
          <section className="ai-section ai-inline-form">
            <button type="button" onClick={refresh} disabled={busy}>{busy ? 'Reading Etsy…' : 'Refresh from Etsy'}</button>
            <input type="search" value={query} onChange={(e) => { setQuery(e.target.value); setLimit(PAGE) }} placeholder="Title, SKU or tag" aria-label="Filter" />
            <span className="ai-muted">{listings ? `${matching.length} of ${listings.length} listings` : 'Loading…'}</span>
            {note && <span className="ai-muted">{note}</span>}
          </section>
          {listings && !listings.length && <p>No snapshot yet. Refresh from Etsy to read the shop.</p>}
          {listings?.length > 0 && <Gaps filled={filled} total={listings.length} />}
          <div className="er-grid">{matching.slice(0, limit).map((l) => <Card key={l.external_key} raw={l.listing} names={names} fetchRaw={(key) => call('GET', `/${encodeURIComponent(key)}`)} />)}</div>
          {matching.length > limit && (
            <p><button type="button" onClick={() => setLimit(limit + PAGE)}>Show {Math.min(PAGE, matching.length - limit)} more</button></p>
          )}
        </>
      )}
    </div>
  )
}
