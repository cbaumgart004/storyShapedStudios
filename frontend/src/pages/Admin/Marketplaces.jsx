// src/pages/Admin/Marketplaces.jsx
// The Marketplaces part of the Stock page (ADR-0011): the site as the source of
// truth for itself, Etsy and eBay. A Listing is written in the editor pane
// (Listings, New listing: the console's own form from the site schema); here
// each one is checked against both Marketplaces, pushed, and the shops'
// current listings kept as snapshots. Same sign-in as the rest of the page.

import React, { useEffect, useState, useCallback } from 'react'
import { parseCsv } from '@/lib/csv'

const API = '/api/marketplace'
const STATUS = { draft: 'draft', published: 'live', changed: 'live, edited' }
const CHANNELS = [['site', 'Site'], ['etsy', 'Etsy'], ['ebay', 'eBay']]

// One Marketplace's answer, in her terms.
function Outcome({ name, r }) {
  if (!r) return null
  if (r.error) return <p className="ai-error">{name}: {r.error}</p>
  if (r.skipped) {
    return (
      <div><strong>{name}: not ready</strong>
        <ul className="ai-bom-list">{r.skipped.map((p) => <li key={p}>{p}</li>)}</ul>
        {(r.warnings ?? []).map((w) => <p key={w} className="ai-hint">{w}</p>)}
      </div>
    )
  }
  if (r.wouldSend) {
    return (
      <div><strong>{name}: ready</strong> <span className="ai-muted">(nothing sent)</span>
        {(r.warnings ?? []).map((w) => <p key={w} className="ai-hint">{w}</p>)}
        <details><summary className="ai-muted">What would be sent</summary><pre className="ai-pre">{JSON.stringify(r.wouldSend, null, 2)}</pre></details>
      </div>
    )
  }
  return <p><strong>{name}:</strong> {r.created ? 'created' : 'updated'} as listing {r.listingId}. {r.note}</p>
}

export default function Marketplaces({ apiFetch, listings }) {
  const [status, setStatus] = useState(null)
  const [results, setResults] = useState({}) // doc id -> answer
  const [busy, setBusy] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [source, setSource] = useState('etsy')
  const [suggested, setSuggested] = useState([])
  const [pick, setPick] = useState({}) // externalId -> approved pair
  const [manual, setManual] = useState({ provider: 'etsy', externalId: '', listing: '' })
  const [paired, setPaired] = useState(null)

  const loadStatus = useCallback(() => apiFetch(`${API}/status`).then(setStatus).catch((e) => setError(e.message)), [apiFetch])
  useEffect(() => { loadStatus() }, [loadStatus])

  const run = async (key, fn) => {
    setBusy(key); setError(''); setNote('')
    try { await fn() } catch (e) { setError(e.message) } finally { setBusy('') }
  }
  const check = (doc, push = false, only) => run(doc.id, async () => {
    const r = await apiFetch(`${API}/listings/${doc.id}/${push ? 'push' : 'check'}`, { method: 'POST', body: { only, ...(push ? { confirm: true } : {}) } })
    setResults((m) => ({ ...m, [doc.id]: r }))
    if (push) { setGate(null); loadStatus() }
  })
  // The push gate: which Marketplaces, then test (sends nothing) or send (live, confirmed).
  const [gate, setGate] = useState(null) // { id, etsy, ebay, sure }
  const openGate = (doc) => setGate({ id: doc.id, etsy: doc.data?.channels?.etsy !== false, ebay: doc.data?.channels?.ebay !== false, sure: false })
  const gateOnly = () => ['etsy', 'ebay'].filter((p) => gate?.[p])
  const linked = (doc, provider) => status?.links.find((l) => l.provider === provider && l.listing_doc_id === String(doc.id))

  // Changes Listing drafts; the editor's list shows them after a reload.
  // The review list comes from the server each time, so what was saved is
  // what drops off it.
  const [reviewFrom, setReviewFrom] = useState('ebay')
  const [choice, setChoice] = useState({}) // externalId -> Listing number, when not the best guess
  const loadSuggestions = useCallback((provider) => {
    setReviewFrom(provider); setBusy('suggest')
    return apiFetch(`${API}/suggestions/${provider}`)
      .then((r) => { setSuggested(r.suggested ?? []); setPick({}); setChoice({}) })
      .catch((e) => setError(e.message)).finally(() => setBusy(''))
  }, [apiFetch])
  useEffect(() => { loadSuggestions('ebay') }, [loadSuggestions])
  const pair = (pairs) => run('pair', async () => {
    const r = await apiFetch(`${API}/pair`, { method: 'POST', body: { pairs } })
    setPaired(r.results)
    await loadSuggestions(reviewFrom)
    const failed = r.results.filter((p) => p.error).length
    setNote(`${r.paired} paired and saved${failed ? `, ${failed} not (below)` : ''}. The list above is read back from the server.`)
  })

  const importCsv = (file) => run('csv', async () => {
    const rows = parseCsv(await file.text())
    const r = await apiFetch(`${API}/snapshots`, { method: 'POST', body: { source, rows } })
    setNote(`${r.kept} ${source === 'etsy' ? 'Etsy' : 'eBay'} rows kept as a snapshot${r.skipped ? `; ${r.skipped} had no listing number, SKU or title` : ''}.`)
  })

  return (
    <section className="ai-section">
      <h2>Marketplaces</h2>
      {status && (
        <p className="ai-hint">
          {status.live ? 'Live: pushes and sales reach Etsy and eBay.' : 'Dry run: nothing is sent to Etsy or eBay until MARKETPLACE_SYNC is on.'}
          {' '}Etsy {status.etsy.configured ? (status.etsy.signedIn ? 'connected' : 'not signed in') : 'not set up'};
          {' '}eBay {status.ebay.configured ? (status.ebay.signedIn ? `connected (${status.ebay.environment})` : 'not signed in') : 'not set up'}.
        </p>
      )}
      {error && <p className="ai-error">{error}</p>}
      {note && <p className="ai-hint">{note}</p>}

      <div className="ai-inline-form">
        <button type="button" onClick={() => window.EOTM?.open?.()}>Open the editor</button>
        <span className="ai-hint">New listing: in the editor, Listings, then New listing. Save it, then check it here.</span>
      </div>

      <table className="ai-table">
        <thead><tr><th>No.</th><th>Listing</th><th>Status</th><th>Sell on</th><th>Linked</th><th /></tr></thead>
        <tbody>
          {(listings ?? []).map((doc) => (
            <React.Fragment key={doc.id}>
              <tr>
                <td>{doc.data?.listingNumber ?? ''}</td>
                <td>{doc.data?.title || doc.slug}</td>
                <td>{STATUS[doc.status] ?? doc.status}</td>
                <td>{CHANNELS.filter(([k]) => doc.data?.channels?.[k] !== false).map(([, l]) => l).join(', ')}</td>
                <td>
                  {['etsy', 'ebay'].map((p) => linked(doc, p) && <div key={p}>{p === 'etsy' ? 'Etsy' : 'eBay'} {linked(doc, p).external_id}</div>)}
                </td>
                <td>
                  <button type="button" disabled={busy === doc.id} onClick={() => check(doc)}>{busy === doc.id ? 'Checking…' : 'Check'}</button>
                  {' '}
                  <button type="button" disabled={busy === doc.id} onClick={() => (gate?.id === doc.id ? setGate(null) : openGate(doc))}>Push…</button>
                </td>
              </tr>
              {gate?.id === doc.id && (
                <tr className="ai-bom-row"><td colSpan={6}>
                  <div className="ai-inline-form">
                    <strong>Push to</strong>
                    {[['etsy', 'Etsy'], ['ebay', 'eBay']].map(([p, l]) => (
                      <label key={p}><input type="checkbox" checked={gate[p]} onChange={(e) => setGate((g) => ({ ...g, [p]: e.target.checked, sure: false }))} /> {l}</label>
                    ))}
                    <button type="button" disabled={busy === doc.id || !gateOnly().length} onClick={() => check(doc, false, gateOnly())}>Test the update</button>
                    <span className="ai-hint">Tests the saved draft: what would be sent and anything that would be refused. Nothing is sent.</span>
                  </div>
                  <div className="ai-inline-form">
                    <label><input type="checkbox" checked={gate.sure} disabled={!status?.live || doc.status === 'draft'}
                      onChange={(e) => setGate((g) => ({ ...g, sure: e.target.checked }))} /> Change the live listing on {gateOnly().map((p) => (p === 'etsy' ? 'Etsy' : 'eBay')).join(' and ') || '…'} now</label>
                    <button type="button" disabled={busy === doc.id || !gate.sure || !gateOnly().length || !status?.live || doc.status === 'draft'}
                      onClick={() => check(doc, true, gateOnly())}>Send now</button>
                    <span className="ai-hint">
                      {doc.status === 'draft' ? 'Publish it in the editor first; the published version is what is sent.'
                        : !status?.live ? 'Sending is off (MARKETPLACE_SYNC): only a test is possible.' : 'Sends the published version. Test it first.'}
                    </span>
                  </div>
                </td></tr>
              )}
              {results[doc.id] && (
                <tr className="ai-bom-row"><td colSpan={6}>
                  {results[doc.id].error ? <p className="ai-error">{results[doc.id].error}</p> : (
                    <>
                      <Outcome name="Etsy" r={results[doc.id].etsy} />
                      <Outcome name="eBay" r={results[doc.id].ebay} />
                    </>
                  )}
                </td></tr>
              )}
            </React.Fragment>
          ))}
          {listings && listings.length === 0 && <tr><td colSpan={6}>No Listings yet. Open the editor to write the first.</td></tr>}
          {!listings && <tr><td colSpan={6}>…</td></tr>}
        </tbody>
      </table>

      <h3>Sales</h3>
      <div className="ai-inline-form">
        <button type="button" disabled={busy === 'sales'} onClick={() => run('sales', async () => {
          const r = await apiFetch(`${API}/sales/pull`, { method: 'POST' })
          const n = (p) => (Array.isArray(r[p]) ? r[p].filter((l) => l.outcome === 'recorded').length : 0)
          setNote(r.live ? `Sales recorded: Etsy ${n('etsy')}, eBay ${n('ebay')}.` : 'Dry run: sales were read, not recorded.')
        })}>Pull sales now</button>
        <span className="ai-hint">Each order line lowers its stock item once, then the new count goes to the other Marketplace.</span>
      </div>

      <h3>Snapshot of the shops as they are</h3>
      <p className="ai-hint">
        Kept unmodified, so Listings can be built from and checked against them. Etsy: Shop Manager, Settings,
        Options, Download Data, listings CSV. eBay: Seller Hub, Reports, Downloads, active listings.
      </p>
      <div className="ai-inline-form">
        <select value={source} onChange={(e) => setSource(e.target.value)} aria-label="Marketplace">
          <option value="etsy">Etsy</option>
          <option value="ebay">eBay</option>
        </select>
        <input type="file" accept=".csv,text/csv" disabled={busy === 'csv'}
          onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) importCsv(f) }} />
        <button type="button" disabled={busy === 'etsy-api' || !status?.etsy.signedIn} onClick={() => run('etsy-api', async () => {
          const r = await apiFetch(`${API}/snapshots/etsy`, { method: 'POST' })
          setNote(`${r.kept} Etsy listings kept as a snapshot through the API.`)
        })}>Snapshot Etsy through the API</button>
        <button type="button" disabled={busy === 'ebay-api' || !status?.ebay.signedIn} onClick={() => run('ebay-api', async () => {
          // A page per request: the whole shop in one ran past the API's time limit.
          let kept = 0
          for (let page = 1, pages = 1; page <= pages; page++) {
            setNote(`Reading eBay, page ${page}${pages > 1 ? ` of ${pages}` : ''}…`)
            const r = await apiFetch(`${API}/snapshots/ebay`, { method: 'POST', body: { page } })
            kept += r.kept
            pages = r.pages
          }
          setNote(`${kept} eBay listings kept as a snapshot through the API (read only).`)
        })}>Snapshot eBay through the API</button>
        <button type="button" disabled={busy === 'ebay-import'} onClick={() => run('ebay-import', async () => {
          const r = await apiFetch(`${API}/import/ebay`, { method: 'POST' })
          setReviewFrom('ebay'); setChoice({}); setSuggested(r.suggested ?? [])
          setPick({})
          setNote(`eBay: ${r.created} draft Listings made, ${r.existing} already paired, ${r.suggested?.length ?? 0} look like a Listing already made (below).`)
        })}>Import eBay snapshots as Listings</button>
      </div>

      <h3>Pair a Listing with its Etsy or eBay listing</h3>
      <p className="ai-hint">
        Pairing fills only what the Listing lacks. A title or description that differs is kept as that Marketplace&apos;s own;
        photos the Listing has stay; quantity is never changed, only shown where it differs from stock.
      </p>
      <div className="ai-inline-form mk-review-bar">
        <label>Review matches from{' '}
          <select value={reviewFrom} onChange={(e) => loadSuggestions(e.target.value)} aria-label="Marketplace to review">
            <option value="ebay">eBay</option>
            <option value="etsy">Etsy</option>
          </select>
        </label>
        <button type="button" disabled={busy === 'suggest'} onClick={() => loadSuggestions(reviewFrom)}>Reload</button>
        <button type="button" disabled={!suggested.length} onClick={() => setPick(Object.fromEntries(suggested
          .filter((s) => s.listings[0].score >= 0.9).map((s) => [s.externalId, { provider: s.provider, externalId: s.externalId, listing: (choice[s.externalId] ?? s.listings[0].number) }])))}>Approve every sure match</button>
        <button type="button" className="mk-save" disabled={busy === 'pair' || !Object.values(pick).some(Boolean)}
          onClick={() => pair(Object.values(pick).filter(Boolean))}>Save {Object.values(pick).filter(Boolean).length || ''} approved</button>
        <span className="ai-hint">{suggested.length} to review, best guess first. Saving pairs each approved one; it then drops off this list, read back from the server.</span>
      </div>
      {suggested.length > 0 && (
        <table className="ai-table">
          <thead><tr><th>Approve</th><th>{reviewFrom === 'etsy' ? 'Etsy' : 'eBay'} listing</th><th>Pair with Listing</th></tr></thead>
          <tbody>
            {suggested.map((s) => {
              const number = choice[s.externalId] ?? s.listings[0].number
              const l = s.listings.find((x) => x.number === number) ?? s.listings[0]
              return (
                <tr key={`${s.provider}:${s.externalId}`}>
                  <td><input type="checkbox" aria-label={`Approve ${s.externalId} with Listing ${l.number}`} checked={!!pick[s.externalId]}
                    onChange={(e) => setPick((m) => ({ ...m, [s.externalId]: e.target.checked ? { provider: s.provider, externalId: s.externalId, listing: l.number } : undefined }))} /></td>
                  <td>{s.externalId}: {s.title}{s.skus.length ? ` (${s.skus.join(', ')})` : ''}</td>
                  <td>
                    {s.listings.length > 1 ? (
                      <select value={l.number ?? ''} aria-label={`Listing for ${s.externalId}`} onChange={(e) => {
                        const n = Number(e.target.value)
                        setChoice((m) => ({ ...m, [s.externalId]: n }))
                        setPick((m) => (m[s.externalId] ? { ...m, [s.externalId]: { ...m[s.externalId], listing: n } } : m))
                      }}>
                        {s.listings.map((x) => <option key={x.number} value={x.number ?? ''}>{x.number}: {x.title || x.slug}</option>)}
                      </select>
                    ) : <>Listing {l.number}: {l.title || l.slug}</>}
                    {' '}{l === s.listings[0] && <span className="mk-badge">Suggested</span>}
                    {' '}<span className="ai-muted">{Math.round(l.score * 100)}% · same {l.by.map((b) => (b === 'words' ? 'wording' : b)).join(' and ')}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
      <div className="ai-inline-form">
        <select value={manual.provider} onChange={(e) => setManual((m) => ({ ...m, provider: e.target.value }))} aria-label="Marketplace to pair">
          <option value="etsy">Etsy</option>
          <option value="ebay">eBay</option>
        </select>
        <input value={manual.externalId} onChange={(e) => setManual((m) => ({ ...m, externalId: e.target.value }))}
          placeholder={manual.provider === 'etsy' ? 'Etsy listing ID' : 'eBay item ID'} aria-label="Marketplace listing ID" />
        <input type="number" min="1" value={manual.listing} onChange={(e) => setManual((m) => ({ ...m, listing: e.target.value }))}
          placeholder="Listing No." aria-label="Listing number" />
        <button type="button" disabled={busy === 'pair' || !manual.externalId.trim() || !manual.listing}
          onClick={() => pair([{ ...manual, listing: Number(manual.listing) }])}>Pair</button>
      </div>
      {paired && (
        <ul className="ai-bom-list">
          {paired.map((p) => (
            <li key={`${p.provider}:${p.externalId}:${p.listing}`}>
              {p.error ? <span className="ai-error">{p.error}</span> : (
                <>
                  <strong>Listing {p.listing} paired with {p.provider === 'etsy' ? 'Etsy' : 'eBay'} {p.externalId}.</strong>
                  {' '}Filled: {p.filled.length ? p.filled.join(', ') : 'nothing'}.
                  {p.kept.length > 0 && <> Kept the Listing&apos;s own: {p.kept.join(', ')}.</>}
                  {p.variationsNotMatched.length > 0 && <> Variations with no match: {p.variationsNotMatched.join(', ')}.</>}
                  {p.quantities.map((q) => <div key={q.sku} className="ai-hint">{q.sku}: {q[p.provider]} on {p.provider === 'etsy' ? 'Etsy' : 'eBay'}, {q.stock ?? 'no stock item'} in stock.</div>)}
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
