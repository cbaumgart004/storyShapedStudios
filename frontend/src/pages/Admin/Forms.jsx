// src/pages/Admin/Forms.jsx
// Forms, opened from the console's "Forms" tool. A form's template is the console
// schema's `forms.<name>`; what is filled in from it is filed in that form's own
// folder, a name made from its title (folderOf: "Sales Order" -> sales_orders).
//
//   /admin/forms                          the templates: start a new entry, or open a folder
//   /admin/forms/:folder                  one folder: every entry, drafts included, by date
//                                         or status, with Sent / Paid, Preview and Download
//   /admin/forms/:folder/:id              one entry. A Draft saves as it is typed; Generate
//                                         numbers it (backend utils/forms.js) and locks it
//   /admin/forms/:folder/:id?view=preview the finished page alone; &download=1 opens the
//                                         print dialog to save it as a PDF
//
// Only the Sales Order has an editor yet (SalesOrder below); building any form
// from its schema sections is the open item in .boards.
//
// Generate stays greyed until the entry is complete (problemsIn): a customer
// name and a price on every line in use. Pressed early, it marks what is missing.
// Customer name offers the customer list (/api/customers) and the folder's
// earlier customers, and fills their details; a name on neither list asks to be
// saved to the customer list. SKU is a dropdown of Stock Items whose last
// option starts a new SKU, which can then be added to Stock Items from here.
// On a phone the docked console covers the bottom of the page; useConsoleInset
// keeps that much room below the form so all of it can be scrolled into view.
// Preview lays the paper out at Letter width and cuts it into pages (Paged), each
// scaled to fit the screen, so a phone shows every page whole.
//
// Sales Order: SKUs come from Stock Items; picking one fills the description
// with its Listing title (else the Stock Item name) and retail with the Listing
// variation's price, both still editable. Price and discount are two ways into
// one number: type either and the other is worked out from retail. Generate asks
// for any missing retail; skipping sets retail to the price (0% off).
// Needs a console sign-in, as /admin/inventory does.

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { apiFetch as rawFetch, HAS_BACKEND } from '@/lib/api'
import { editorToken, signInThroughConsole, CONSOLE_API, useSchema } from '@/lib/siteConsole'
import '@/styles/AdminForms.css'

const API = '/api/forms'
const HOME = '/admin/forms'

let onSignedOut = () => {}
async function apiFetch(path, options = {}) {
  try {
    return await rawFetch(path, { ...options, headers: { ...options.headers, Authorization: `Bearer ${editorToken()}` } })
  } catch (err) {
    if (err.status === 401) onSignedOut()
    throw err
  }
}

// A folder name from a form's title: lower case, words joined by _, plural.
export function folderOf(title) {
  const base = String(title ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
  return !base ? '' : base.endsWith('s') ? base : `${base}s`
}
const folderTitle = (folder) => folder.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')

// The Sales Order's words (company lines, tagline, payment methods, terms,
// acceptance) are the schema's `forms.salesOrder`, so the owner changes them
// there. FALLBACK is only for a visit while the console cannot be reached.
const FALLBACK = {
  salesOrder: {
    label: 'Sales Order',
    help: 'Custom and wholesale orders: SKUs, retail and discount, payment, customer signature.',
    document: {
      company: { kind: 'Uranium Glass Jewelry', lines: ['info@storyshapedstudios.com', 'storyshapedstudios.com'] },
      footer: { tagline: "The World's Largest Resource for Uranium Glass Jewelry", lines: ['storyshapedstudios.com', 'info@storyshapedstudios.com', 'Thank you for supporting handmade glass'] },
    },
    paymentMethods: [{ name: 'PayPal', label: 'StoryShapedStudios, LLC', handle: '@WVaught823', url: 'https://www.paypal.me/WVaught823' }],
    terms: 'Custom order. Pricing reflects quantity discount from retail. 50% deposit due to begin production; balance due before shipment. Uranium glass is handmade; minor variation in color and fluorescence is expected.',
    sections: [{ name: 'acceptance', fields: [], text: 'By signing, the customer accepts this order, its pricing and the terms above.' }],
  },
}
// Every form template, each with its folder.
function useForms() {
  const forms = useSchema()?.forms ?? FALLBACK
  return Object.entries(forms).map(([name, f]) => ({ name, ...f, folder: folderOf(f.label) }))
}
const useFormIn = (folder) => useForms().find((f) => f.folder === folder)

const today = () => new Date().toISOString().slice(0, 10)
const blankLine = () => ({ sku: '', desc: '', qty: '', retail: '', price: '', disc: '', mode: 'price' })
// What a new Sales Order starts from.
const salesOrderTemplate = (form) => ({
  c: { name: '', company: '', email: '', phone: '', bill: '', ship: '' },
  i: { no: '', date: today(), po: '' },
  lines: [blankLine()],
  p: { method: form.paymentMethods?.[0]?.name ?? '' },
  ship: '', taxPct: '', deposit: '', notes: form.terms ?? '',
})
// Forms with an editor here, by schema name.
const EDITORS = { salesOrder: { template: salesOrderTemplate } }

const num = (v) => (v === '' || v == null || isNaN(+v) ? null : +v)
const r2 = (v) => Math.round(v * 100) / 100
const money = (v) => (v == null ? '' : '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))

function unitPrice(l) {
  const retail = num(l.retail)
  if (l.mode === 'disc' && num(l.disc) != null && retail != null) return r2(retail * (1 - num(l.disc) / 100))
  if (num(l.price) != null) return num(l.price)
  return retail
}

// The field the user typed drives; the other is filled from retail.
function settle(l) {
  const retail = num(l.retail), up = unitPrice(l)
  if (l.mode === 'disc') return { ...l, price: up == null ? '' : up.toFixed(2) }
  if (retail) return { ...l, disc: up == null ? '' : String(r2((1 - up / retail) * 100)) }
  return l
}

function sums(d) {
  let retail = 0, sub = 0
  for (const l of d?.lines ?? []) {
    const q = num(l.qty) || 0, up = unitPrice(l)
    retail += q * (num(l.retail) || 0)
    if (up != null) sub += q * up
  }
  const tax = r2(sub * (num(d?.taxPct) || 0) / 100)
  const total = sub + (num(d?.ship) || 0) + tax
  return { retail, sub, tax, total, due: total - (num(d?.deposit) || 0) }
}

function dueDate(date) {
  if (!date) return ''
  const d = new Date(date + 'T00:00:00')
  d.setDate(d.getDate() + 30)
  return d.toISOString().slice(0, 10)
}

// <yyyymmdd>_<customer>_<number>, the name a saved PDF takes.
const fileName = (d) => {
  const who = String(d.c?.name || d.c?.company || 'Customer').trim().replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return `${String(d.i?.date || '').replace(/-/g, '')}_${who || 'Customer'}_${d.i?.no || 'draft'}`
}

// The browser names a saved PDF after the page title.
function printAs(name) {
  const before = document.title
  document.title = name
  window.addEventListener('afterprint', () => { document.title = before }, { once: true })
  window.print()
}

// What stops an entry from being generated, by field: { 'c.name': text, 'line.2': text }.
const lineInUse = (l) => Boolean(l.sku || String(l.desc ?? '').trim() || num(l.qty) || num(l.price) != null || num(l.retail) != null)
function problemsIn(d) {
  const p = {}
  if (!String(d.c?.name ?? '').trim()) p['c.name'] = 'Customer name'
  const used = d.lines.map((l, i) => [l, i]).filter(([l]) => lineInUse(l))
  if (!used.length) p.lines = 'At least one line'
  for (const [l, i] of used) if (num(l.price) == null) p[`line.${i}`] = `Price on line ${i + 1}`
  return p
}

function Warn({ show, children = 'Required' }) {
  return show ? <span className="warn-tag" role="alert"><span aria-hidden="true">!</span> {children}</span> : null
}

// Height of the docked console (fixed to the bottom of the screen), so the page
// can leave that much room and nothing of the form stays hidden under it.
function useConsoleInset() {
  const [h, setH] = useState(0)
  useEffect(() => {
    let ro = null
    let timer = null
    const attach = () => {
      const el = document.querySelector('.eotm-root')
      if (!el) { timer = setTimeout(attach, 600); return }
      const measure = () => setH(Math.round(el.getBoundingClientRect().height))
      ro = new ResizeObserver(measure)
      ro.observe(el)
      measure()
    }
    attach()
    return () => { clearTimeout(timer); ro?.disconnect() }
  }, [])
  return h
}

// US Letter at 96 px to the inch, inside the 0.4in margins @page sets in AdminForms.css.
const PAGE = { w: 816, h: 1056, pad: 38 }
// Preview: the paper drawn once per page, each copy shifted up by a page and
// clipped, then scaled to the screen's width. Copies after the first are inert.
// A page ends before the last block (section, line, signature, footer) that
// would not fit whole. Close to the PDF, not exact: the print dialog chooses its own.
const BLOCKS = '.inv-head, .inv-body > section, .inv-line, .inv-sign, .inv-foot'
function Paged({ on, render }) {
  const box = useRef(null)
  const first = useRef(null)
  const [fit, setFit] = useState(1)
  const [starts, setStarts] = useState([0])
  useEffect(() => {
    if (!on) return undefined
    const inner = PAGE.h - 2 * PAGE.pad
    const measure = () => {
      if (box.current) setFit(Math.min(1, box.current.clientWidth / PAGE.w))
      const el = first.current
      if (!el) return
      const top = el.getBoundingClientRect().top
      const zoom = el.getBoundingClientRect().height / el.offsetHeight || 1
      const cuts = [...el.querySelectorAll(BLOCKS)].map((b) => Math.round((b.getBoundingClientRect().top - top) / zoom))
      const next = [0]
      while (el.offsetHeight - next.at(-1) > inner + 2) {
        const at = next.at(-1)
        const fits = cuts.filter((c) => c > at && c <= at + inner)
        next.push(fits.length ? Math.max(...fits) : at + inner)
      }
      setStarts((was) => (was.join() === next.join() ? was : next))
    }
    const ro = new ResizeObserver(measure)
    if (box.current) ro.observe(box.current)
    if (first.current) ro.observe(first.current)
    measure()
    return () => ro.disconnect()
  }, [on])
  if (!on) return <div className="inv-sheetbox">{render(0)}</div>
  return (
    <div className="inv-pages" ref={box}>
      {starts.map((at, i) => (
        <figure className="inv-sheet" key={i}>
          <div className="inv-sheet-page" style={{ zoom: fit }}>
            <div className="inv-sheet-clip" style={i < starts.length - 1 ? { height: starts[i + 1] - at } : null}>
              <div className="inv-sheetbox" ref={i === 0 ? first : null} style={i ? { marginTop: -at } : null}>{render(i)}</div>
            </div>
          </div>
          <figcaption>Page {i + 1} of {starts.length}</figcaption>
        </figure>
      ))}
    </div>
  )
}

// A line that charges something but has no retail to measure the discount from.
const needsRetail = (l) => num(l.retail) == null && (num(l.price) != null || Boolean(num(l.qty)))

// Where an entry stands, furthest last: Draft, Generated, Sent, Paid.
const STATUSES = ['draft', 'generated', 'sent', 'paid']
const STATUS_LABEL = { draft: 'Draft', generated: 'Generated', sent: 'Sent', paid: 'Paid' }
const statusOf = (r) => (r.status === 'draft' ? 'draft' : r.paid ? 'paid' : r.sent ? 'sent' : 'generated')

// Listing variations by SKU: { title, price }. Drafts included; same read as /admin/inventory.
async function loadListingPrices() {
  const res = await fetch(`${CONSOLE_API}/documents?type=listing`, { headers: { Authorization: `Bearer ${editorToken()}` } })
  if (!res.ok) throw new Error(`Listings did not load (${res.status}).`)
  const bySku = new Map()
  for (const doc of await res.json()) {
    for (const v of doc.data?.variations ?? []) {
      const sku = String(v.sku ?? '').trim()
      if (sku && !bySku.has(sku)) bySku.set(sku, { title: doc.data?.title || '', price: num(v.price) })
    }
  }
  return bySku
}

function SentPaid({ r, onFlag }) {
  const locked = r.status === 'draft'
  const title = locked ? 'Generate it first' : undefined
  return (
    <>
      <label className="flag" title={title}><input type="checkbox" checked={r.sent} disabled={locked} onChange={(e) => onFlag(r.id, 'sent', e.target.checked)} /> Sent</label>
      <label className="flag" title={title}><input type="checkbox" checked={r.paid} disabled={locked} onChange={(e) => onFlag(r.id, 'paid', e.target.checked)} /> Paid</label>
    </>
  )
}

function BrandHead({ eyebrow, title, back }) {
  return (
    <header className="inv-folder-head">
      <img alt="StoryShaped Studios" src="/assets/StoryShapedStudiosNeonGlow_Rect.png" />
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
      </div>
      {back}
    </header>
  )
}

// ---------- The templates ----------

function Templates({ setError }) {
  const navigate = useNavigate()
  const forms = useForms()
  const [counts, setCounts] = useState({})
  useEffect(() => { apiFetch(API).then(setCounts).catch((err) => setError(err.message)) }, [setError])

  const startNew = async (f) => {
    try {
      const d = await apiFetch(`${API}/${f.folder}`, { method: 'POST', body: EDITORS[f.name].template(f) })
      navigate(`${HOME}/${f.folder}/${d.id}`)
    } catch (err) { setError(err.message) }
  }

  return (
    <>
      <BrandHead eyebrow="Uranium Glass Jewelry" title="Forms" back={<Link to="/" className="tool">← Site</Link>} />
      <p className="inv-lede">Start a new form from its template, or open its folder to review, preview and download what has been filled in.</p>
      <div className="inv-templates">
        {forms.map((f) => (
          <div className="inv-tcard" key={f.name}>
            <div>
              <h2>{f.label}</h2>
              {f.help && <p>{f.help}</p>}
            </div>
            <div className="tools">
              {EDITORS[f.name]
                ? <button type="button" className="tool primary" onClick={() => startNew(f)}>New {f.label}</button>
                : <span className="soon">Editor not built yet</span>}
              <Link className="tool" to={`${HOME}/${f.folder}`}>
                Open {f.folder} <span className="count">{counts[f.folder] ?? 0}</span>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

// ---------- One folder ----------

const dateOf = (r) => r.data?.i?.date || String(r.created_at).slice(0, 10)
const monthOf = (r) => new Date(dateOf(r).slice(0, 7) + '-01T00:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

function Folder({ folder, setError }) {
  const navigate = useNavigate()
  const form = useFormIn(folder)
  const [rows, setRows] = useState(null)
  const [show, setShow] = useState('all')
  const [sort, setSort] = useState('newest')

  const load = useCallback(async () => {
    try { setRows(await apiFetch(`${API}/${folder}`)) } catch (err) { setError(err.message); setRows([]) }
  }, [folder, setError])
  useEffect(() => { load() }, [load])

  const startNew = async () => {
    try {
      const d = await apiFetch(`${API}/${folder}`, { method: 'POST', body: EDITORS[form.name].template(form) })
      navigate(`${HOME}/${folder}/${d.id}`)
    } catch (err) { setError(err.message) }
  }
  const flag = async (id, field, value) => {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, [field]: value } : r)))
    try { await apiFetch(`${API}/${folder}/${id}`, { method: 'PATCH', body: { [field]: value } }) } catch (err) { setError(err.message); load() }
  }

  const head = <BrandHead eyebrow={`Forms / ${folder}`} title={folderTitle(folder)} back={<Link to={HOME} className="tool">← Forms</Link>} />
  if (!rows) return <>{head}<p className="inv-empty">Loading…</p></>
  const counts = Object.fromEntries(STATUSES.map((st) => [st, rows.filter((r) => statusOf(r) === st).length]))
  const shown = rows.filter((r) => show === 'all' || statusOf(r) === show)
  const ordered = [...shown].sort((a, b) =>
    sort === 'status' ? STATUSES.indexOf(statusOf(a)) - STATUSES.indexOf(statusOf(b)) || dateOf(b).localeCompare(dateOf(a))
      : sort === 'oldest' ? dateOf(a).localeCompare(dateOf(b)) : dateOf(b).localeCompare(dateOf(a)))
  const groupOf = (r) => (sort === 'status' ? STATUS_LABEL[statusOf(r)] : monthOf(r))
  const groups = []
  for (const r of ordered) {
    const g = groupOf(r)
    if (groups.at(-1)?.name !== g) groups.push({ name: g, rows: [] })
    groups.at(-1).rows.push(r)
  }

  return (
    <>
      {head}
      {form && EDITORS[form.name] && (
        <button type="button" className="inv-template" onClick={startNew}>
          <strong>New {form.label}</strong>
          <span>Starts from the {form.label} template and saves here as a Draft while you type.</span>
        </button>
      )}

      <div className="inv-filters">
        <div className="chips" role="group" aria-label="Show">
          {['all', ...STATUSES].map((st) => (
            <button type="button" key={st} aria-pressed={show === st} onClick={() => setShow(st)}>
              {st === 'all' ? 'All' : STATUS_LABEL[st]} <span>{st === 'all' ? rows.length : counts[st]}</span>
            </button>
          ))}
        </div>
        <label className="sort">Sort
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="newest">Date, newest first</option>
            <option value="oldest">Date, oldest first</option>
            <option value="status">Status</option>
          </select>
        </label>
      </div>

      {!shown.length && <p className="inv-empty">{rows.length ? 'Nothing with this status.' : 'Nothing filed here yet.'}</p>}
      {groups.map((g) => (
        <section key={g.name} className="inv-group" aria-label={g.name}>
          <h2>{g.name}</h2>
          {g.rows.map((r) => {
            const st = statusOf(r)
            const at = `${HOME}/${folder}/${r.id}`
            return (
              <div className="frow" key={r.id}>
                <button type="button" className="open" onClick={() => navigate(at)}>
                  <strong>{r.file}</strong>
                  <small>{dateOf(r)} · {r.data?.c?.name || r.data?.c?.company || 'No customer yet'} · {money(sums(r.data).total)}</small>
                </button>
                <span className={`pill is-${st}`}>{STATUS_LABEL[st]}</span>
                <SentPaid r={r} onFlag={flag} />
                <span className="row-actions">
                  <Link className="act" to={`${at}?view=preview`}>Preview</Link>
                  <Link className="act" to={`${at}?view=preview&download=1`}>Download PDF</Link>
                </span>
              </div>
            )
          })}
        </section>
      ))}
    </>
  )
}

// ---------- One Sales Order ----------

const NEW_SKU = '+new'
function Line({ l, idx, skus, onChange, onRemove, warn, onAddSku }) {
  const [typingNew, setTypingNew] = useState(false)
  const [adding, setAdding] = useState(false)
  const set = (field, value) => {
    const next = { ...l, [field]: value }
    if (field === 'price') next.mode = 'price'
    if (field === 'disc') next.mode = 'disc'
    if (field === 'sku') {
      const hit = skus.find((s) => s.sku === value)
      const was = skus.find((s) => s.sku === l.sku)
      if (hit) {
        // The title fills the description only while it is empty or still the last SKU's title.
        if (!String(l.desc ?? '').trim() || l.desc === was?.name) next.desc = hit.name
        if (hit.price != null) next.retail = String(hit.price)
      }
    }
    onChange(settle(next))
  }
  const pickSku = (value) => {
    setTypingNew(value === NEW_SKU)
    set('sku', value === NEW_SKU ? '' : value)
  }
  const addSku = async () => {
    setAdding(true)
    try { if (await onAddSku(l.sku.trim(), l.desc)) setTypingNew(false) } finally { setAdding(false) }
  }
  const up = unitPrice(l), qty = num(l.qty), retail = num(l.retail)
  const saves = retail && up != null && qty ? (retail - up) * qty : 0
  const known = !l.sku || l.sku === 'TBD' || skus.some((s) => s.sku === l.sku)
  const showNew = typingNew || !known
  const id = (f) => `l${idx}-${f}`
  return (
    <div className={`inv-line${warn ? ' has-warn' : ''}`}>
      <div className="cell c-sku">
        <label className="label" htmlFor={id('sku')}>SKU</label>
        {!onAddSku ? <span className="f sku-text" id={id('sku')}>{l.sku}</span> : (
        <select className="f" id={id('sku')} value={typingNew ? NEW_SKU : l.sku} onChange={(e) => pickSku(e.target.value)}>
          <option value="">Choose SKU…</option>
          <option value="TBD">TBD · custom, not created yet</option>
          {!known && !typingNew && <option value={l.sku}>{l.sku} · not in Stock Items</option>}
          {skus.map((s) => <option key={s.sku} value={s.sku}>{s.sku} · {s.name}</option>)}
          <option value={NEW_SKU}>+ New SKU…</option>
        </select>
        )}
        {showNew && onAddSku && (
          <span className="new-sku">
            <input className="f" aria-label="New SKU" placeholder="New SKU code" value={l.sku} autoComplete="off"
              onChange={(e) => set('sku', e.target.value)} autoFocus={typingNew && !l.sku} />
            <button type="button" className="add-sku" disabled={adding || !l.sku.trim()} onClick={addSku}
              title="Creates a sellable Stock Item with this SKU, named from the description">
              {adding ? 'Adding…' : '+ Add to Stock Items'}
            </button>
          </span>
        )}
      </div>
      <div className="cell c-desc">
        <label className="label" htmlFor={id('desc')}>Description</label>
        <textarea className="f" rows={2} id={id('desc')} value={l.desc} placeholder="Describe the item" onChange={(e) => set('desc', e.target.value)} />
      </div>
      <div className="cell">
        <label className="label" htmlFor={id('qty')}>Qty</label>
        <input className="f num" type="number" min="0" step="1" inputMode="numeric" id={id('qty')} value={l.qty} onChange={(e) => set('qty', e.target.value)} />
      </div>
      <div className="cell">
        <label className="label" htmlFor={id('retail')}>Retail</label>
        <input className="f num" type="number" min="0" step="0.01" inputMode="decimal" id={id('retail')} value={l.retail} onChange={(e) => set('retail', e.target.value)} />
      </div>
      <div className="cell">
        <label className="label" htmlFor={id('price')}>Price <Warn show={warn} /></label>
        <input className={`f num${l.mode === 'price' && num(l.price) != null ? ' driver' : ''}${warn ? ' is-missing' : ''}`} type="number" min="0" step="0.01" inputMode="decimal" id={id('price')} value={l.price} onChange={(e) => set('price', e.target.value)} />
      </div>
      <div className="cell">
        <label className="label" htmlFor={id('disc')}>Discount %</label>
        <input className={`f num${l.mode === 'disc' && num(l.disc) != null ? ' driver' : ''}`} type="number" step="0.1" inputMode="decimal" id={id('disc')} value={l.disc} onChange={(e) => set('disc', e.target.value)} />
        {saves > 0 && <span className="off">saves {money(saves)}</span>}
      </div>
      <div className="cell num tot">
        <span className="label">Line total</span>
        <span>{qty != null && up != null ? money(qty * up) : ''}</span>
      </div>
      <button type="button" className="x" aria-label="Remove line" title="Remove line" onClick={onRemove}>×</button>
    </div>
  )
}

function SalesOrder({ folder, id, form, setError }) {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const preview = params.get('view') === 'preview'
  const download = params.get('download') === '1'
  const [rec, setRec] = useState(null) // the stored entry
  const [doc, setDoc] = useState(null) // the form as typed
  const [skus, setSkus] = useState([])
  const [saving, setSaving] = useState('') // '', 'Saving…', 'Saved'
  const [ask, setAsk] = useState(null) // { [line index]: typed retail } while Generate waits on missing retail
  const [busy, setBusy] = useState(false)
  const [tried, setTried] = useState(false) // Generate pressed while something was missing
  const [known, setKnown] = useState([]) // earlier customers in this folder, newest first
  const [customers, setCustomers] = useState(null) // the customer list; null until loaded
  const [nameDone, setNameDone] = useState(false) // customer name left, so a new one may be offered for saving
  const [skipSave, setSkipSave] = useState([]) // names answered "Not now"
  const [savingCustomer, setSavingCustomer] = useState(false)
  const timer = useRef(null)
  const pending = useRef(null)
  const at = `${API}/${folder}/${id}`

  useEffect(() => {
    apiFetch(at).then((r) => { setRec(r); setDoc(r.data) }).catch((err) => setError(err.message))
  }, [at, setError])
  useEffect(() => {
    if (preview) return
    apiFetch(`${API}/${folder}`).then((rows) => {
      const seen = new Map()
      for (const r of rows) {
        const c = r.data?.c
        const key = String(c?.name ?? '').trim().toLowerCase()
        if (key && r.id !== Number(id) && !seen.has(key)) seen.set(key, c)
      }
      setKnown([...seen.values()])
    }).catch(() => {})
    apiFetch('/api/customers').then(setCustomers).catch(() => setCustomers(null))
  }, [folder, id, preview])
  useEffect(() => {
    if (preview) return
    Promise.all([
      apiFetch('/api/inventory/stock'),
      loadListingPrices().catch((err) => { setError(`${err.message} SKUs show without retail.`); return new Map() }),
    ])
      .then(([rows, listed]) => setSkus(rows.filter((s) => s.sku).map((s) => {
        const l = listed.get(s.sku)
        return { sku: s.sku, name: l?.title || s.name, price: l?.price ?? null }
      }).sort((a, b) => a.name.localeCompare(b.name))))
      .catch((err) => setError(`SKUs did not load: ${err.message}`))
  }, [preview, setError])

  // Download: the print dialog opens once the page has drawn, then the URL drops the flag.
  useEffect(() => {
    if (!download || !doc) return
    const t = setTimeout(() => {
      printAs(fileName(doc))
      params.delete('download')
      setParams(params, { replace: true })
    }, 400)
    return () => clearTimeout(t)
  }, [download, doc, params, setParams])

  const flush = useCallback(async () => {
    clearTimeout(timer.current)
    const d = pending.current
    if (!d) return
    pending.current = null
    setSaving('Saving…')
    try {
      await apiFetch(at, { method: 'PUT', body: d })
      setSaving(pending.current ? 'Saving…' : 'Saved')
    } catch (err) {
      setSaving('')
      setError(`Not saved: ${err.message}`)
    }
  }, [at, setError])
  useEffect(() => () => { flush() }, [flush]) // leaving the form saves what is pending

  if (!rec || !doc) return <p className="inv-empty">Loading…</p>
  const locked = rec.status !== 'draft'
  const readOnly = locked || preview
  const keyOf = (name) => String(name ?? '').trim().toLowerCase()
  const listed = customers ?? []
  // The customer list first, then earlier customers in this folder not on it.
  const lookup = [...listed, ...known.filter((c) => !listed.some((x) => keyOf(x.name) === keyOf(c.name)))]
  const customerName = String(doc.c?.name ?? '').trim()
  const offerSave = !readOnly && customers !== null && nameDone && customerName
    && !listed.some((x) => keyOf(x.name) === keyOf(customerName)) && !skipSave.includes(keyOf(customerName))

  // Drafts save shortly after typing stops.
  const edit = (next) => {
    setDoc(next)
    pending.current = next
    setSaving('Saving…')
    clearTimeout(timer.current)
    timer.current = setTimeout(flush, 700)
  }
  const setField = (path, value) => {
    const [a, b] = path.split('.')
    edit(b ? { ...doc, [a]: { ...doc[a], [b]: value } } : { ...doc, [a]: value })
  }
  const setLine = (i, l) => edit({ ...doc, lines: doc.lines.map((x, j) => (j === i ? l : x)) })
  // Picking a known customer fills the details still empty here.
  const setCustomerName = (value) => {
    const hit = lookup.find((c) => c.name?.trim().toLowerCase() === value.trim().toLowerCase())
    const c = { ...doc.c, name: value }
    if (hit) for (const k of ['company', 'email', 'phone', 'bill', 'ship']) if (!String(c[k] ?? '').trim() && hit[k]) c[k] = hit[k]
    edit({ ...doc, c })
  }
  const addLine = () => edit({ ...doc, lines: [...doc.lines, blankLine()] })
  // A new SKU typed on a line becomes a sellable Stock Item named from the description.
  const addSku = async (sku, desc) => {
    try {
      setError('')
      const name = String(desc ?? '').split('\n')[0].trim() || sku
      const item = await apiFetch('/api/inventory/stock', { method: 'POST', body: { sku, name, sellable: true } })
      setSkus((all) => [...all, { sku: item.sku, name: item.name, price: null }].sort((a, b) => a.name.localeCompare(b.name)))
      return true
    } catch (err) {
      setError(`${sku} was not added to Stock Items: ${err.message}`)
      return false
    }
  }
  const saveCustomer = async () => {
    setSavingCustomer(true)
    try {
      setError('')
      const saved = await apiFetch('/api/customers', { method: 'POST', body: doc.c })
      setCustomers((all) => [...(all ?? []), saved])
    } catch (err) {
      if (err.status === 409) setCustomers((all) => [...(all ?? []), { ...doc.c }])
      else setError(`Customer not saved: ${err.message}`)
    } finally {
      setSavingCustomer(false)
    }
  }

  // Missing retail: ask first. `typed` holds what was entered; a line left blank
  // (or every line, when skipped) takes its price as retail, so 0% off.
  const generate = async (typed) => {
    setNameDone(true)
    if (Object.keys(problemsIn(doc)).length) {
      setTried(true)
      setTimeout(() => document.querySelector('.warn-tag')?.closest('.inv-line, .fields > *, .inv-generate')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50)
      return
    }
    const missing = doc.lines.map((l, i) => (needsRetail(l) ? i : -1)).filter((i) => i >= 0)
    if (missing.length && typed === undefined) {
      setAsk(Object.fromEntries(missing.map((i) => [i, ''])))
      return
    }
    const lines = doc.lines.map((l, i) => {
      if (!needsRetail(l)) return l
      const r = num(typed?.[i])
      return r != null ? settle({ ...l, retail: String(r) }) : { ...l, retail: l.price, disc: '0', mode: 'price' }
    })
    setAsk(null)
    setBusy(true)
    try {
      setError('')
      clearTimeout(timer.current)
      pending.current = null
      const g = await apiFetch(`${at}/generate`, { method: 'POST', body: { ...doc, lines } })
      setRec(g); setDoc(g.data); setSaving('')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const flag = async (_, field, value) => {
    setRec({ ...rec, [field]: value })
    try { setRec(await apiFetch(at, { method: 'PATCH', body: { [field]: value } })) } catch (err) { setError(err.message) }
  }

  const remove = async () => {
    try {
      clearTimeout(timer.current)
      pending.current = null
      await apiFetch(at, { method: 'DELETE' })
      navigate(`${HOME}/${folder}`)
    } catch (err) { setError(err.message) }
  }

  const copy = async () => {
    try {
      const d = await apiFetch(`${API}/${folder}`, { method: 'POST', body: { ...doc, i: { ...doc.i, no: '', date: today() } } })
      navigate(`${HOME}/${folder}/${d.id}`)
    } catch (err) { setError(err.message) }
  }

  const setView = (v) => {
    if (v) params.set('view', v); else params.delete('view')
    setParams(params, { replace: true })
  }

  const problems = problemsIn(doc)
  const ready = !Object.keys(problems).length
  const shownProblems = tried ? problems : {}
  const s = sums(doc)
  const methods = form.paymentMethods ?? []
  const method = methods.find((m) => m.name === doc.p?.method)
  const company = form.document?.company ?? {}
  const footer = form.document?.footer ?? {}
  const acceptance = form.sections?.find((x) => x.name === 'acceptance')
  const field = (path, label, props = {}, extra = null) => {
    const [a, b] = path.split('.')
    const fid = `f-${path.replace('.', '-')}`
    const Tag = props.rows ? 'textarea' : 'input'
    const missing = Boolean(shownProblems[path])
    return (
      <>
        <label className="label" htmlFor={fid}>{label} <Warn show={missing} /></label>
        <span className="fwrap">
          <Tag className={`f${missing ? ' is-missing' : ''}`} id={fid} value={(b ? doc[a]?.[b] : doc[a]) ?? ''}
            onChange={(e) => setField(path, e.target.value)} autoComplete="off" {...props} />
          {extra}
        </span>
      </>
    )
  }
  const generateButton = (where) => (
    <button type="button" className={`tool primary${ready ? '' : ' is-waiting'}`} aria-disabled={!ready || busy}
      title={ready ? 'Number and lock this order' : 'Fill in the marked fields first'} onClick={() => !busy && generate()} data-where={where}>
      {busy ? 'Generating…' : 'Generate invoice'}
    </button>
  )

  return (
    <>
      <div className="inv-bar">
        <div className="tools">
          <Link to={`${HOME}/${folder}`} className="tool" onClick={flush}>← {folder}</Link>
          {!readOnly && <span className="saving" aria-live="polite">{saving}</span>}
        </div>
        <div className="tools">
          {preview ? (
            <button type="button" className="tool" onClick={() => setView(null)}>{locked ? 'Details' : 'Edit'}</button>
          ) : (
            <button type="button" className="tool" onClick={() => setView('preview')}>Preview</button>
          )}
          {locked && <span className="tool-flags"><SentPaid r={rec} onFlag={flag} /></span>}
          {locked && !preview && <button type="button" className="tool" onClick={copy}>Copy to new draft</button>}
          {!readOnly && <button type="button" className="tool" onClick={addLine}>Add line</button>}
          {!readOnly && <button type="button" className="tool" onClick={remove}>Delete draft</button>}
          <button type="button" className="tool" onClick={() => printAs(fileName(doc))}>Download PDF</button>
          {!locked && !preview && generateButton('top')}
        </div>
      </div>

      {ask && (
        <section className="inv-ask" role="dialog" aria-labelledby="inv-ask-h">
          <h2 id="inv-ask-h">Add a retail price?</h2>
          <p>Retail is what the discount is measured from. Leave a line blank, or skip, and its retail becomes its price (0% off).</p>
          {Object.keys(ask).map((i) => (
            <label key={i} className="ask-row">
              <span>{doc.lines[i].sku || 'No SKU'} · {doc.lines[i].desc || 'No description'}{num(doc.lines[i].price) != null && <> · price {money(num(doc.lines[i].price))}</>}</span>
              <input className="f num" type="number" min="0" step="0.01" inputMode="decimal" placeholder="Retail each"
                value={ask[i]} onChange={(e) => setAsk({ ...ask, [i]: e.target.value })} />
            </label>
          ))}
          <div className="tools">
            <button type="button" className="tool primary" onClick={() => generate(ask)}>Generate invoice</button>
            <button type="button" className="tool" onClick={() => generate({})}>Skip: retail = price</button>
            <button type="button" className="tool" onClick={() => setAsk(null)}>Cancel</button>
          </div>
        </section>
      )}

      {preview && <p className="inv-print-note">Each sheet is one Letter page of the PDF, scaled to fit. Pinch to zoom.</p>}
      <Paged on={preview} render={(copy) => (
      <article className={`inv-paper${preview ? ' is-preview' : ''}`} {...(copy ? { 'aria-hidden': true, inert: '' } : {})}>
        <header className="inv-head">
          <img alt="StoryShaped Studios" src="/assets/StoryShapedStudiosNeonGlow_Rect.png" />
          <div className="meta">
            <h1>INVOICE{!locked && <span className="state">(Draft)</span>}</h1>
            <span className="kind">{company.kind}</span>
            {(company.lines ?? []).map((t) => <span key={t}>{t}</span>)}
          </div>
        </header>
        <div className="inv-deco" />

        <fieldset className="inv-body" disabled={readOnly}>
          <section className="two">
            <div>
              <h3>Customer</h3>
              <div className="fields">
                {field('c.name', 'Name', { list: 'known-customers', onChange: (e) => setCustomerName(e.target.value), onBlur: () => setNameDone(true), placeholder: lookup.length ? 'Type, or pick a customer' : '' })}
                <datalist id="known-customers">
                  {lookup.map((c) => <option key={c.name} value={c.name}>{[c.company, c.email].filter(Boolean).join(' · ')}</option>)}
                </datalist>
                {field('c.company', 'Company')}
                {field('c.email', 'Email', { type: 'email' })}
                {field('c.phone', 'Phone', { type: 'tel' })}
                {field('c.bill', 'Billing address', { rows: 2 })}
                {field('c.ship', 'Ship to', { rows: 2 }, !readOnly && doc.c?.bill && doc.c.ship !== doc.c.bill && (
                  <button type="button" className="same-as" onClick={() => setField('c.ship', doc.c.bill)}>Same as billing</button>
                ))}
              </div>
              {offerSave && (
                <div className="cust-save" role="status">
                  <span><strong>{customerName}</strong> is not in your customers. Save them for next time?</span>
                  <span className="cust-save-acts">
                    <button type="button" className="yes" disabled={savingCustomer} onClick={saveCustomer}>{savingCustomer ? 'Saving…' : 'Save customer'}</button>
                    <button type="button" onClick={() => setSkipSave([...skipSave, keyOf(customerName)])}>Not now</button>
                  </span>
                </div>
              )}
            </div>
            <div>
              <h3>Invoice details</h3>
              <div className="fields">
                {field('i.no', 'Order #', { placeholder: 'Numbered on Generate' })}
                {field('i.date', 'Date', { type: 'date' })}
                <span className="label">Due</span><span className="calc">{dueDate(doc.i.date)}</span>
                {field('i.po', 'Customer PO')}
              </div>
            </div>
          </section>

          <section className="inv-lines" aria-label="Line items">
            <div className="inv-lhead" aria-hidden="true">
              <span>SKU</span><span>Description</span><span>Qty</span><span>Retail</span><span>Price</span><span>Discount %</span><span>Line total</span><span />
            </div>
            {doc.lines.map((l, i) => (
              <Line key={i} l={l} idx={i} skus={skus} warn={Boolean(shownProblems[`line.${i}`])} onAddSku={readOnly ? null : addSku} onChange={(next) => setLine(i, next)}
                onRemove={() => edit({ ...doc, lines: doc.lines.filter((_, j) => j !== i) })} />
            ))}
            {shownProblems.lines && <Warn show>Add at least one line</Warn>}
            {!readOnly && <button type="button" className="inv-add-line" onClick={addLine}>+ Add line</button>}
          </section>

          <section className="two">
            <div>
              <h3>Payment</h3>
              <div className="fields">
                <label className="label" htmlFor="f-p-method">Method</label>
                <select className="f" id="f-p-method" value={doc.p?.method ?? ''} onChange={(e) => setField('p.method', e.target.value)}>
                  {methods.map((m) => <option key={m.name}>{m.name}</option>)}
                </select>
                <span className="label">Pay to</span>
                <span className="calc payto">
                  {method && <><a href={method.url} target="_blank" rel="noopener noreferrer">{method.label}</a>
                    <span className="handle"> {method.name} {method.handle}</span></>}
                </span>
              </div>
              <h3 className="gap">Notes &amp; terms</h3>
              <textarea className="f" rows={4} aria-label="Notes and terms" value={doc.notes ?? ''} onChange={(e) => setField('notes', e.target.value)} />
            </div>
            <div className="totals" aria-live="polite">
              <span className="k">Retail value</span><span className="num">{money(s.retail)}</span>
              <span className="k save">Your savings</span><span className="num save">{s.retail - s.sub > 0 ? '−' + money(s.retail - s.sub) : money(0)}</span>
              <span className="k">Subtotal</span><span className="num">{money(s.sub)}</span>
              <label className="k" htmlFor="f-ship">Shipping</label>
              <input className="f num" id="f-ship" type="number" step="0.01" min="0" inputMode="decimal" value={doc.ship} onChange={(e) => setField('ship', e.target.value)} />
              <label className="k" htmlFor="f-tax">Tax rate %</label>
              <input className="f num" id="f-tax" type="number" step="0.01" min="0" inputMode="decimal" value={doc.taxPct} onChange={(e) => setField('taxPct', e.target.value)} />
              <span className="k">Tax</span><span className="num">{money(s.tax)}</span>
              <span className="k total-line">Total</span><span className="num total-line">{money(s.total)}</span>
              <label className="k" htmlFor="f-dep">Deposit paid</label>
              <input className="f num" id="f-dep" type="number" step="0.01" min="0" inputMode="decimal" value={doc.deposit} onChange={(e) => setField('deposit', e.target.value)} />
              <div className="due"><span>Balance due</span><strong>{money(s.due)}</strong></div>
            </div>
          </section>
        </fieldset>

        {/* Signed in ink on the printed copy, so these stay blank lines, not fields. */}
        <section className="inv-sign" aria-label="Customer acceptance">
          <h3>Customer acceptance</h3>
          <p>{acceptance?.text}</p>
          <div className="sign-lines">
            <div className="sign wide"><span className="line" /><span className="label">Signature</span></div>
            <div className="sign"><span className="line" /><span className="label">Date</span></div>
            <div className="sign wide"><span className="line" /><span className="label">Printed name</span></div>
          </div>
        </section>

        <footer className="inv-foot">
          <div className="tag">{footer.tagline}</div>
          <div className="links">{(footer.lines ?? []).join(' · ')}</div>
        </footer>
      </article>
      )} />

      {!locked && !preview && (
        <div className="inv-generate">
          {tried && !ready ? (
            <p className="inv-missing" role="alert"><Warn show>Missing</Warn> {Object.values(problems).join(', ')}.</p>
          ) : (
            <p className="hint">{ready ? 'Ready. Generate numbers this order and locks it.' : 'Generate turns on once the customer name and every price are filled in.'}</p>
          )}
          {generateButton('bottom')}
        </div>
      )}
    </>
  )
}

function Entry({ folder, id, setError }) {
  const form = useFormIn(folder)
  if (!form) return <p className="inv-empty">No form files into {folder}. <Link to={HOME}>Back to Forms</Link></p>
  if (form.name !== 'salesOrder') return <p className="inv-empty">The {form.label} has no editor yet. <Link to={`${HOME}/${folder}`}>Back to {folder}</Link></p>
  return <SalesOrder folder={folder} id={id} form={form} setError={setError} />
}

export default function AdminForms() {
  const { folder, id } = useParams()
  const inset = useConsoleInset()
  const [signedIn, setSignedIn] = useState(() => Boolean(editorToken()))
  const [error, setError] = useState('')
  onSignedOut = () => setSignedIn(false)
  useEffect(() => { setError('') }, [folder, id])

  if (!HAS_BACKEND || !signedIn) {
    return (
      <div className="admin-invoices">
        <div className="inv-gate">
          {!HAS_BACKEND
            ? <p>Forms are not connected on this copy of the site. They are stored in the site&rsquo;s database, which this build does not reach.</p>
            : <><p>Forms are for the studio only. Sign in with your Edge of the Map login.</p>
              <button type="button" className="tool primary" onClick={signInThroughConsole}>Sign in</button></>}
          <Link to="/" className="inv-back">← Back to site</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-invoices" style={{ '--console-inset': `${inset}px` }}>
      {error && <p className="inv-error" role="alert">{error}</p>}
      {id ? <Entry key={`${folder}/${id}`} folder={folder} id={id} setError={setError} />
        : folder ? <Folder key={folder} folder={folder} setError={setError} />
          : <Templates setError={setError} />}
    </div>
  )
}
