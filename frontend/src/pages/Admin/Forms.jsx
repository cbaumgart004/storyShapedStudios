// src/pages/Admin/Forms.jsx
// Forms, opened from the console's "Forms" tool. A form's template is the console
// schema's `forms.<name>`; what is filled in from it is filed in that form's own
// folder, a name made from its title (folderOf: "Sales Order" -> sales_orders).
//
//   /admin/forms                          the templates: start a new entry, or open a folder
//   /admin/forms/:folder                  one folder: every entry, drafts included, by date
//                                         or status, with Sent / Paid, Preview and Download;
//                                         a box at the top hides Paid (In Full)
//   /admin/forms/:folder/:id              one entry. A Draft saves as it is typed; Generate
//                                         numbers it (backend utils/forms.js) and locks it
//   /admin/forms/:folder/:id?view=preview the finished page alone; &download=1 opens the
//                                         print dialog to save it as a PDF
//
// Only the Sales Order has an editor yet (SalesOrder below); building any form
// from its schema sections is the open item in .boards.
//
// A draft saves only on Save Work (top bar and below the page), into its folder
// under its file name; the template itself is never written. Leaving with
// unsaved changes asks Save / Don't Save / Cancel (LeavePrompt); Don't Save on
// a draft never saved removes it. Closing or reloading the tab gets the
// browser's own warning instead.
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
// scaled to fit the screen, so a phone shows every page whole. Preview drops
// empty optional fields so a short order fits one page.
//
// Email: "Generate & email", the editor's Email and the folder's Share open a
// mailto: (mailtoFor) carrying the customer's link, /invoice/<token>
// (SharedInvoice), then offer to tick Sent: a mailto cannot report whether the
// message went. The link opens only after a 6-digit code emailed to the
// customer email on the order (VerifyGate; utils/forms.js requestCode), so
// emailing needs that address; "Customer email" adds or corrects it on a
// generated order. "New link" replaces a leaked link. The wording of
// both emails is editable at /admin/emails (EmailTemplates, /api/emails).
//
// Versions: a signed order never changes. Revise starts a draft of it as the
// next version (same number, data.i.v; utils/forms.js revise); its Generate
// archives the signed one, and the customer's link opens the new version to
// sign again. The folder hides archived versions unless asked; files read
// <number>v<version>.
//
// Signing: the customer's link offers SignPanel (draw, type the printed name, or
// upload) after a consent box; the backend keeps the time, IP, browser and a
// SHA-256 of the order (utils/forms.js sign). A signed order shows the signature
// in the acceptance block and "Signed" in its folder. Getting past the code
// marks it "Viewed".
// Customer accounts (ContinueAs, /api/account) are built but hidden behind
// CUSTOMER_ACCOUNTS until inventory and payment are live; customers sign as guests.
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
    terms: 'Custom order. Pricing reflects quantity discount from retail. 50% deposit due to begin production; balance due before shipment. Full invoice is due within 30 days of signing unless otherwise arranged with the seller. Uranium glass is handmade; minor variation in color and fluorescence is expected.',
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
// Every new order's Notes & terms carry the payment term, whatever the schema's terms say.
const PAY_TERMS = 'Full invoice is due within 30 days of signing unless otherwise arranged with the seller.'
const withPayTerms = (terms) => {
  const t = String(terms ?? '').trim()
  return t.toLowerCase().includes('within 30 days of signing') ? t : [t, PAY_TERMS].filter(Boolean).join(' ')
}
// The seller's legal name, in the footer's copyright line.
const LEGAL_NAME = 'StoryShapedStudios, LLC'
const blankLine = () => ({ sku: '', desc: '', qty: '', retail: '', price: '', disc: '', mode: 'price' })
// What a new Sales Order starts from.
const salesOrderTemplate = (form) => ({
  c: { name: '', company: '', email: '', phone: '', bill: '', ship: '' },
  i: { no: '', date: today(), po: '' },
  lines: [blankLine()],
  p: { method: form.paymentMethods?.[0]?.name ?? '' },
  ship: '', taxPct: '', deposit: '', depositReq: '', depositDue: '', notes: withPayTerms(form.terms),
})
// Forms with an editor here, by schema name.
const EDITORS = { salesOrder: { template: salesOrderTemplate } }

const num = (v) => (v === '' || v == null || isNaN(+v) ? null : +v)
const r2 = (v) => Math.round(v * 100) / 100
// mm/dd/yy, the date format of the folder page and the status boxes.
const mdy = (at) => (at ? new Date(at).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }) : '')
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

// Paid toward the order: on a generated entry the backend's deposit_paid, which
// can change after Generate; on a draft the form's own Deposit paid.
const paidOf = (r) => (r?.status !== 'draft' && r?.deposit_paid != null ? r.deposit_paid : num(r?.data?.deposit))

// `paid` comes off the deposit required and the balance.
function sums(d, paid = num(d?.deposit)) {
  let retail = 0, sub = 0
  for (const l of d?.lines ?? []) {
    const q = num(l.qty) || 0, up = unitPrice(l)
    retail += q * (num(l.retail) || 0)
    if (up != null) sub += q * up
  }
  const tax = r2(sub * (num(d?.taxPct) || 0) / 100)
  const total = sub + (num(d?.ship) || 0) + tax
  const depositLeft = num(d?.depositReq) ? Math.max(0, r2(num(d.depositReq) - (paid || 0))) : null
  return { retail, sub, tax, total, paid: paid || 0, depositLeft, due: total - (paid || 0) }
}

// The invoice is due 30 days after the customer signs (PAY_TERMS).
const balanceDue = (r) => { const at = r?.signed_at ?? r?.signature?.signedAt; return at ? dueDate(String(at).slice(0, 10)) : '' }
function dueDate(date) {
  if (!date) return ''
  const d = new Date(date + 'T00:00:00')
  d.setDate(d.getDate() + 30)
  return d.toISOString().slice(0, 10)
}

// <yyyymmdd>_<number>[v<version>]_<customer>, the name a saved PDF takes (as utils/forms.js fileName).
const fileName = (d) => {
  const who = String(d.c?.name || d.c?.company || 'Customer').trim().replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const v = Number(d.i?.v) > 1 ? `v${Number(d.i.v)}` : ''
  return `${String(d.i?.date || '').replace(/-/g, '')}_${d.i?.no || 'draft'}${v}_${who || 'Customer'}`
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
// `emailing`: Generate & email, whose link sends its code to the customer email.
function problemsIn(d, emailing = false) {
  const p = {}
  if (!String(d.c?.name ?? '').trim()) p['c.name'] = 'Customer name'
  if (emailing && !String(d.c?.email ?? '').trim()) p['c.email'] = 'Customer email (the link emails a code there)'
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

// Where an entry stands, furthest last: Draft, Generated, Sent, Paid (Partial),
// Paid (In Full). Partial is any amount paid short of the box ticked In Full.
const STATUSES = ['draft', 'generated', 'sent', 'viewed', 'signed', 'partial', 'paid']
const STATUS_LABEL = { draft: 'Draft', generated: 'Generated', sent: 'Sent', viewed: 'Viewed', signed: 'Signed', partial: 'Paid (Partial)', paid: 'Paid (In Full)' }
const statusOf = (r) => (r.status === 'draft' ? 'draft' : r.paid ? 'paid' : paidOf(r) > 0 ? 'partial' : r.signed_at ? 'signed'
  : r.viewed_at ? 'viewed' : r.sent ? 'sent' : 'generated')

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

// The email templates (/api/emails, utils/emailTemplates.js), read once per visit.
let templatesLoad = null
const loadTemplates = () => (templatesLoad ??= apiFetch('/api/emails').catch((err) => { templatesLoad = null; throw err }))
// {{key}} -> vars[key]; an unknown key stays as typed, as on the server.
const fillIn = (text, vars) => String(text).replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k) => (k in vars ? String(vars[k] ?? '') : m))

// What the invoice email's {{placeholders}} stand for.
function invoiceVars(r, form) {
  const d = r.data ?? {}
  const m = (form?.paymentMethods ?? []).find((x) => x.name === d.p?.method)
  return {
    name: String(d.c?.name ?? '').trim() || 'there',
    number: r.number,
    link: `${window.location.origin}/invoice/${r.share}`,
    balance: money(sums(d, paidOf(r)).due),
    due: balanceDue(r) ? mdy(balanceDue(r) + 'T00:00:00') : '30 days after signing',
    deposit: num(d.depositReq) ? money(num(d.depositReq)) : '',
    deposit_due: d.depositDue ? mdy(d.depositDue + 'T00:00:00') : '',
    payment: m ? `Pay with ${m.name}: ${m.url}` : '',
  }
}
// The email for a generated entry: the customer's link, the balance and how to pay.
// The link email assigned to the entry's form on /admin/emails, else the invoice email.
const emailFor = (list, folder) => list.find((x) => x.forms?.includes(folder)) ?? list.find((x) => x.key === 'invoice')
async function mailtoFor(r, form) {
  const t = emailFor(await loadTemplates(), r.folder)
  const v = invoiceVars(r, form)
  const body = fillIn(t.body, v).replace(/\n{3,}/g, '\n\n')
  const to = String(r.data?.c?.email ?? '').trim()
  return `mailto:${to}?subject=${encodeURIComponent(fillIn(t.subject, v))}&body=${encodeURIComponent(body)}`
}
// Opens the email with the entry's link, making the link first if it predates links.
// One email per tap: a second tap, or a Generate & email that fires twice,
// within a few seconds of the first opens nothing more.
let lastMail = 0
async function openEmail(r, folder, form) {
  if (Date.now() - lastMail < 5000) return r.share
  lastMail = Date.now()
  if (!String(r.data?.c?.email ?? '').trim()) {
    throw new Error('This order has no customer email, and its link emails the customer a code. Open the order and use Customer email to add it.')
  }
  const linked = r.share ? r : await apiFetch(`${API}/${folder}/${r.id}/share`, { method: 'POST' })
  window.location.href = await mailtoFor({ ...r, share: linked.share }, form)
  return linked.share
}

function SentAsk({ onYes, onNo }) {
  return (
    <div className="sent-ask" role="status">
      <span>Email opened. Did it go out?</span>
      <span className="acts">
        <button type="button" className="yes" onClick={onYes}>Yes, mark Sent</button>
        <button type="button" onClick={onNo}>Not yet</button>
      </span>
    </div>
  )
}

const shortDate = (at) => mdy(at)
// Sent and Paid (In Full) are ticked by hand; Viewed and Signed tick themselves
// when the customer enters their code or signs, Paid (Partial) when a Deposit
// paid is entered on the order. Each shows the date it was ticked.
const AUTO_WHEN = { viewed: 'the customer enters their code', signed: 'the customer signs', partial: 'Deposit paid is entered on the order' }
function SentPaid({ r, onFlag }) {
  const locked = r.status === 'draft' || Boolean(r.superseded_at)
  const box = (field, label, checked, at, auto) => (
    <label className={`flag${auto && !locked ? ' auto' : ''}`}
      title={r.superseded_at ? 'Archived: a newer version replaced it' : locked ? 'Generate it first' : at ? `${label} ${new Date(at).toLocaleString()}` : auto ? `Ticks itself when ${AUTO_WHEN[field]}` : undefined}>
      <span><input type="checkbox" checked={Boolean(checked)} disabled={locked || auto} readOnly={auto}
        onChange={auto ? undefined : (e) => onFlag(r.id, field, e.target.checked)} /> {label}</span>
      <small>{shortDate(at)}</small>
    </label>
  )
  return (
    <>
      {box('sent', 'Sent', r.sent, r.sent_at, false)}
      {box('viewed', 'Viewed', r.viewed_at, r.viewed_at, true)}
      {box('signed', 'Signed', r.signed_at, r.signed_at, true)}
      {box('partial', 'Paid (Partial)', paidOf(r) > 0, r.deposit_paid_at, true)}
      {box('paid', 'Paid (In Full)', r.paid, r.paid_at, false)}
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
  const [emails, setEmails] = useState(null)
  useEffect(() => { apiFetch(API).then(setCounts).catch((err) => setError(err.message)) }, [setError])
  useEffect(() => { loadTemplates().then(setEmails).catch(() => setEmails(null)) }, [])

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
              {emails && <p className="inv-uses">Emails with <Link to="/admin/emails">{emailFor(emails, f.folder)?.label}</Link></p>}
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
        <div className="inv-tcard">
          <div>
            <h2>Emails</h2>
            <p>What customers receive, and which email each form sends. Add your own emails and assign them to forms.</p>
          </div>
          <div className="tools"><Link className="tool" to="/admin/emails">Edit emails</Link></div>
        </div>
      </div>
    </>
  )
}

// ---------- Email templates ----------

// Stand-ins for the placeholders, so a template reads as the customer will see it.
const SAMPLE = {
  name: 'Ann Lee', number: '4122', balance: '$12,250.00', due: '11/27/26', deposit: '$6,125.00', deposit_due: '11/04/26', code: '482913', minutes: 10,
  link: `${typeof window === 'undefined' ? '' : window.location.origin}/invoice/sample-link`,
  payment: 'Pay with PayPal: https://www.paypal.me/WVaught823 (StoryShapedStudios, LLC, @WVaught823)',
}

function EmailCard({ t, forms, onSaved, setError }) {
  const [subject, setSubject] = useState(t.subject)
  const [body, setBody] = useState(t.body)
  const [label, setLabel] = useState(t.label)
  const [uses, setUses] = useState(t.forms ?? [])
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const bodyRef = useRef(null)
  useEffect(() => { setSubject(t.subject); setBody(t.body); setLabel(t.label); setUses(t.forms ?? []) }, [t])
  const dirty = subject !== t.subject || body !== t.body || label !== t.label || String(uses) !== String(t.forms ?? [])
  const put = async (method) => {
    if (method === 'DELETE' && t.added && !window.confirm(`Delete the email "${t.label}"? Forms that used it go back to the Invoice link email.`)) return
    setBusy(true)
    setError('')
    try {
      await apiFetch(`/api/emails/${t.key}`, method === 'PUT' ? { method, body: { subject, body, label, forms: t.forms ? uses : undefined } } : { method })
      await onSaved()
      setNote(method === 'PUT' ? 'Saved.' : 'Back to the original wording.')
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  const toggle = (folder) => { setUses((u) => (u.includes(folder) ? u.filter((x) => x !== folder) : [...u, folder])); setNote('') }
  // A placeholder chip types itself in where the cursor is.
  const insert = (k) => {
    const el = bodyRef.current
    const at = el?.selectionStart ?? body.length
    const end = el?.selectionEnd ?? at
    setBody(body.slice(0, at) + `{{${k}}}` + body.slice(end))
    setTimeout(() => { el?.focus(); el?.setSelectionRange(at + k.length + 4, at + k.length + 4) }, 0)
  }
  return (
    <section className="email-card" aria-labelledby={`em-${t.key}`}>
      <header>
        <h2 id={`em-${t.key}`}>{t.label}</h2>
        <p>{t.help}{t.edited ? '' : ' Original wording.'}</p>
      </header>
      {t.added && (
        <label className="em-field"><span>Name</span>
          <input value={label} onChange={(e) => { setLabel(e.target.value); setNote('') }} />
        </label>
      )}
      {t.forms && (
        <div className="em-forms" role="group" aria-label="Sends for">
          <span>Sends for:</span>
          {forms.map((f) => (
            <label key={f.folder} className="flag"><span><input type="checkbox" checked={uses.includes(f.folder)} onChange={() => toggle(f.folder)} /> {f.label}</span></label>
          ))}
          {t.key === 'invoice' && <small>Also any form no other email is set to.</small>}
        </div>
      )}
      <label className="em-field"><span>Subject</span>
        <input value={subject} onChange={(e) => { setSubject(e.target.value); setNote('') }} />
      </label>
      <label className="em-field"><span>Message</span>
        <textarea ref={bodyRef} rows={Math.max(10, Math.ceil(body.split('\n').length * 1.5) + 1)} value={body} onChange={(e) => { setBody(e.target.value); setNote('') }} />
      </label>
      <div className="em-chips" aria-label="Fill-ins">
        <span>Fill-ins:</span>
        {t.placeholders.map((k) => <button type="button" key={k} onClick={() => insert(k)}>{`{{${k}}}`}</button>)}
      </div>
      <details className="em-preview">
        <summary>Preview with a sample order</summary>
        <p className="em-subject">{fillIn(subject, SAMPLE)}</p>
        <pre>{fillIn(body, SAMPLE).replace(/\n{3,}/g, '\n\n')}</pre>
      </details>
      <div className="tools">
        <button type="button" className="tool primary" disabled={!dirty || busy} onClick={() => put('PUT')}>Save</button>
        {dirty && <button type="button" className="tool" onClick={() => { setSubject(t.subject); setBody(t.body); setLabel(t.label); setUses(t.forms ?? []) }}>Undo changes</button>}
        {t.added
          ? <button type="button" className="tool" disabled={busy} onClick={() => put('DELETE')}>Delete email</button>
          : t.edited && <button type="button" className="tool" disabled={busy} onClick={() => put('DELETE')}>Reset to original</button>}
        {note && <span className="saving" role="status">{note}</span>}
      </div>
    </section>
  )
}

function EmailTemplates({ setError }) {
  const forms = useForms()
  const [list, setList] = useState(null)
  // Saving one email can move a form off another, so the whole list is read again.
  const reload = useCallback(async () => {
    templatesLoad = null
    try { setList(await loadTemplates()) } catch (err) { setError(err.message); setList((l) => l ?? []) }
  }, [setError])
  useEffect(() => { reload() }, [reload])
  const add = async () => {
    const label = window.prompt('Name the new email (for example, Wholesale invoice). It starts from the Invoice link wording.')
    if (!label?.trim()) return
    try { await apiFetch('/api/emails', { method: 'POST', body: { label } }); await reload() } catch (err) { setError(err.message) }
  }
  return (
    <>
      <BrandHead eyebrow="Forms / emails" title="Emails" back={<Link to={HOME} className="tool">← Forms</Link>} />
      <p className="inv-lede">What customers receive. Words in {'{{double braces}}'} fill in for each order; tap one below a message to add it. Under &ldquo;Sends for&rdquo;, pick which forms each email goes out with.</p>
      <div className="tools em-add"><button type="button" className="tool primary" onClick={add}>New email</button></div>
      {!list ? <p className="inv-empty">Loading…</p> : list.map((t) => <EmailCard key={t.key} t={t} forms={forms} onSaved={reload} setError={setError} />)}
    </>
  )
}

// ---------- One folder ----------

const dateOf = (r) => r.data?.i?.date || String(r.created_at).slice(0, 10)
// The folder's columns: tap one to sort by it, again to reverse. `dir` is the first direction.
const COLUMNS = [
  { key: 'order', label: 'Order', dir: -1, val: (r) => `${dateOf(r)} ${String(r.number ?? '').padStart(8, '0')}` },
  { key: 'customer', label: 'Customer', dir: 1, val: (r) => String(r.data?.c?.name || r.data?.c?.company || '~').toLowerCase() },
  { key: 'total', label: 'Total', dir: -1, val: (r) => sums(r.data).total },
  { key: 'due', label: 'Due', dir: 1, val: (r) => balanceDue(r) || '9999' },
  { key: 'updated', label: 'Last Updated', dir: -1, val: (r) => String(r.updated_at ?? '') },
  { key: 'status', label: 'Status', dir: 1, val: (r) => STATUSES.indexOf(statusOf(r)) },
]

// A gargoyle on a flying buttress, drawn in the console's uranium line. The
// folder's entries stand between two, the right one mirrored (AdminForms.css
// shows them only where the screen leaves room beside the list).
function Buttress({ side }) {
  return (
    <div className={`gothic is-${side}`} aria-hidden="true">
      <svg viewBox="0 0 120 420" fill="none" strokeLinejoin="round" strokeLinecap="round">
        {/* Pier and pinnacle */}
        <path className="stone" d="M8 420V140h4v-12h20v12h4v280z" />
        <path d="M4 420v-112l4-6M40 420v-112l-4-6" />
        <path className="stone" d="M12 128 22 84l10 44z" />
        <path d="M22 84v-10m-4 4h8M15 112l-3-2m17 2 3-2M17 98l-3-2m13 2 3-2" />
        <path d="M17 160v24a5 5 0 0 0 10 0v-24a5 5 0 0 0-10 0z" />
        {/* Flying buttresses: the upper carries the gargoyle */}
        <path className="stone" d="M36 168 120 128v62q-50 2-84 68z" />
        <circle cx="92" cy="160" r="6" />
        <path d="M92 152v16m-8-8h16" />
        <path className="stone" d="M36 318 120 288v48q-48 2-84 56z" />
        <circle cx="96" cy="310" r="4" />
        {/* Gargoyle, crouched on the upper flyer, facing out */}
        <path className="stone" d="M110 139c2-20-4-38-18-42l-8-5c-4-8-14-8-20-2l-8 4 8 4-4 6h12c6 4 8 12 6 22l-4 12z" />
        <path d="M96 98c8-22 20-28 22-36-6 10-12 12-18 12 4 8 0 16-4 24zM70 86c-2-8 2-14 8-16-2 6-2 12-2 16M80 88l6-8v10M72 139l-6 2m10-2-4 3M110 139c6 2 8-6 4-10" />
        <circle className="eye" cx="69" cy="91" r="1.6" />
        <path className="spout" d="M57 99q-8 22-10 64" />
      </svg>
    </div>
  )
}

function Folder({ folder, setError }) {
  const navigate = useNavigate()
  const form = useFormIn(folder)
  const [rows, setRows] = useState(null)
  const [show, setShow] = useState('all')
  const [hideFull, setHideFull] = useState(false) // leave out Paid (In Full)
  const [showArchived, setShowArchived] = useState(false) // versions a revision replaced
  const [sort, setSort] = useState({ key: 'order', dir: -1 })
  const [asking, setAsking] = useState(null) // id whose email was just opened

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
    try {
      const saved = await apiFetch(`${API}/${folder}/${id}`, { method: 'PATCH', body: { [field]: value } })
      setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...saved } : r)))
    } catch (err) { setError(err.message); load() }
  }

  const share = async (r) => {
    try {
      const token = await openEmail(r, folder, form)
      setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, share: token } : x)))
      setAsking(r.id)
    } catch (err) { setError(err.message) }
  }

  const head = <BrandHead eyebrow={`Forms / ${folder}`} title={folderTitle(folder)} back={<Link to={HOME} className="tool">← Forms</Link>} />
  if (!rows) return <>{head}<p className="inv-empty">Loading…</p></>
  const live = showArchived ? rows : rows.filter((r) => !r.superseded_at)
  const archived = rows.length - rows.filter((r) => !r.superseded_at).length
  const counts = Object.fromEntries(STATUSES.map((st) => [st, live.filter((r) => statusOf(r) === st).length]))
  const shown = live.filter((r) => (show === 'all' || statusOf(r) === show) && !(hideFull && statusOf(r) === 'paid'))
  const col = COLUMNS.find((c) => c.key === sort.key)
  const cmp = (x, y) => (typeof x === 'number' ? x - y : String(x).localeCompare(String(y)))
  const ordered = [...shown].sort((a, b) => sort.dir * cmp(col.val(a), col.val(b)) || dateOf(b).localeCompare(dateOf(a)))
  const sortBy = (c) => setSort((s) => (s.key === c.key ? { key: c.key, dir: -s.dir } : { key: c.key, dir: c.dir }))

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
        <label className="hide-full">
          <input type="checkbox" checked={hideFull} onChange={(e) => setHideFull(e.target.checked)} /> Exclude Paid (In Full)
        </label>
        <label className="hide-full">
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} /> Show archived versions <span>{archived}</span>
        </label>
        <div className="chips" role="group" aria-label="Show">
          {['all', ...STATUSES].map((st) => (
            <button type="button" key={st} aria-pressed={show === st} onClick={() => setShow(st)}>
              {st === 'all' ? 'All' : STATUS_LABEL[st]} <span>{st === 'all' ? live.length : counts[st]}</span>
            </button>
          ))}
        </div>
      </div>

      {!shown.length && <p className="inv-empty">{rows.length ? (hideFull && show === 'paid' ? 'Paid (In Full) is excluded.' : 'Nothing with this status.') : 'Nothing filed here yet.'}</p>}
      {shown.length > 0 && (
        <div className="frow-head" role="group" aria-label="Sort by">
          {COLUMNS.map((c) => (
            <button type="button" key={c.key} className={`c-${c.key}`} aria-pressed={sort.key === c.key} onClick={() => sortBy(c)}
              title={`Sort by ${c.label.toLowerCase()}`}>
              {c.label}<span aria-hidden="true">{sort.key === c.key ? (sort.dir > 0 ? ' ▲' : ' ▼') : ''}</span>
            </button>
          ))}
        </div>
      )}
      {shown.length > 0 && <div className="frows">
      <Buttress side="left" />
      <Buttress side="right" />
      {ordered.map((r) => {
        const st = statusOf(r)
        const at = `${HOME}/${folder}/${r.id}`
        const due = balanceDue(r)
        return (
          <div className="frow" key={r.id}>
            <button type="button" className="open c-order" onClick={() => navigate(at)}>
              <strong>{r.file}</strong>
              <small>{mdy(dateOf(r) + 'T00:00:00')}</small>
            </button>
            <span className="cell c-customer" data-label="Customer">{r.data?.c?.name || r.data?.c?.company || 'No customer yet'}</span>
            <span className="cell c-total" data-label="Total">{money(sums(r.data).total)}</span>
            <span className="cell c-due" data-label="Due" title={due ? undefined : '30 days after the customer signs'}>{due ? mdy(due + 'T00:00:00') : '-'}</span>
            <span className="cell c-updated" data-label="Last Updated" title={new Date(r.updated_at).toLocaleString()}>{shortDate(r.updated_at)}</span>
            <span className="cell c-status">
              {r.superseded_at ? <span className="pill is-archived" title={`Replaced ${new Date(r.superseded_at).toLocaleString()}`}>Archived</span>
                : <span className={`pill is-${st}`}>{STATUS_LABEL[st]}</span>}
              {r.version > 1 && !r.superseded_at && <span className="pill is-version" title="Revised after signing">v{r.version}</span>}
            </span>
            <div className="frow-foot">
              <span className="flags"><SentPaid r={r} onFlag={flag} /></span>
              <span className="row-actions">
                <Link className="act" to={`${at}?view=preview`}>Preview</Link>
                <Link className="act" to={`${at}?view=preview&download=1`}>Download PDF</Link>
                {r.status === 'generated' && !r.superseded_at && <button type="button" className="act" onClick={() => share(r)}>Share</button>}
              </span>
            </div>
            {asking === r.id && <SentAsk onYes={() => { flag(r.id, 'sent', true); setAsking(null) }} onNo={() => setAsking(null)} />}
          </div>
        )
      })}
      </div>}
    </>
  )
}

// ---------- One Sales Order ----------

// ---------- Signing (the customer's link) ----------

// A finger or mouse signature on a canvas; reports a PNG data URL, or null when cleared.
function DrawPad({ onChange }) {
  const canvas = useRef(null)
  const drawing = useRef(false)
  const used = useRef(false)
  useEffect(() => {
    const c = canvas.current
    const ratio = Math.min(window.devicePixelRatio || 1, 2)
    c.width = c.clientWidth * ratio
    c.height = c.clientHeight * ratio
    const g = c.getContext('2d')
    g.scale(ratio, ratio)
    g.lineWidth = 2.4
    g.lineCap = 'round'
    g.lineJoin = 'round'
    g.strokeStyle = '#10301A'
  }, [])
  const at = (e) => { const r = canvas.current.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top] }
  const down = (e) => {
    canvas.current.setPointerCapture(e.pointerId)
    drawing.current = true
    const g = canvas.current.getContext('2d')
    g.beginPath(); g.moveTo(...at(e)); g.lineTo(...at(e)); g.stroke()
  }
  const move = (e) => {
    if (!drawing.current) return
    const g = canvas.current.getContext('2d')
    g.lineTo(...at(e)); g.stroke()
    used.current = true
  }
  const up = () => {
    if (!drawing.current) return
    drawing.current = false
    if (used.current) onChange(canvas.current.toDataURL('image/png'))
  }
  const clear = () => {
    const c = canvas.current
    c.getContext('2d').clearRect(0, 0, c.width, c.height)
    used.current = false
    onChange(null)
  }
  return (
    <div className="pad">
      <canvas ref={canvas} aria-label="Sign here with your finger or mouse" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} />
      <span className="pad-x" aria-hidden="true">×</span>
      <button type="button" className="link" onClick={clear}>Clear</button>
    </div>
  )
}

// An uploaded picture of a signature, shrunk to fit 600 × 200.
function readSignatureFile(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const k = Math.min(1, 600 / img.width, 200 / img.height)
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * k)
      c.height = Math.round(img.height * k)
      const g = c.getContext('2d')
      g.drawImage(img, 0, 0, c.width, c.height)
      // The paper goes clear so only the ink shows on the order: light pixels
      // fade out, darker ones keep their colour.
      const px = g.getImageData(0, 0, c.width, c.height)
      const d = px.data
      for (let i = 0; i < d.length; i += 4) {
        const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
        d[i + 3] = Math.round(d[i + 3] * Math.min(1, Math.max(0, (215 - lum) / 75)))
      }
      g.putImageData(px, 0, 0)
      URL.revokeObjectURL(img.src)
      resolve(c.toDataURL('image/png'))
    }
    img.onerror = () => reject(new Error('That file is not a picture this browser can read.'))
    img.src = URL.createObjectURL(file)
  })
}

const sameName = (a, b) => String(a ?? '').trim().replace(/\s+/g, ' ').toLowerCase() === String(b ?? '').trim().replace(/\s+/g, ' ').toLowerCase()

function SignPanel({ token, session, defaultName, consent, onSigned, customer }) {
  const [method, setMethod] = useState('draw')
  const [name, setName] = useState(defaultName || '')
  const [typed, setTyped] = useState('')
  const [drawn, setDrawn] = useState(null)
  const [uploaded, setUploaded] = useState(null)
  const [agree, setAgree] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const image = method === 'draw' ? drawn : method === 'upload' ? uploaded : null
  const mark = method === 'type' ? typed.trim() && sameName(typed, name) : Boolean(image)
  const ready = name.trim() && mark && agree
  const submit = async () => {
    if (!ready || busy) return
    setBusy(true)
    setError('')
    try {
      onSigned(await rawFetch(`/api/shared/${encodeURIComponent(token)}/sign`, {
        method: 'POST', headers: { 'X-Invoice-Session': session, ...(customer ? { Authorization: `Bearer ${customer.token}` } : {}) }, body: { method, name: name.trim(), typed: method === 'type' ? typed : undefined, image: image ?? undefined, consent: agree },
      }))
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  const upload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try { setUploaded(await readSignatureFile(file)) } catch (err) { setError(err.message) }
  }
  return (
    <section className="inv-signpanel" id="sign" aria-labelledby="sign-h">
      <h2 id="sign-h">Sign this order</h2>
      <label className="sp-field">
        <span>Printed name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Your full name" />
      </label>
      <div className="sp-tabs" role="tablist" aria-label="How to sign">
        {[['draw', 'Draw'], ['type', 'Type'], ['upload', 'Upload']].map(([k, label]) => (
          <button type="button" role="tab" key={k} aria-selected={method === k} onClick={() => setMethod(k)}>{label}</button>
        ))}
      </div>
      {method === 'draw' && <DrawPad onChange={setDrawn} />}
      {method === 'type' && (
        <div className="sp-type">
          <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Type your name exactly as printed" aria-label="Typed signature" />
          <div className="typed-sig" aria-hidden="true">{typed || name || ' '}</div>
          {typed.trim() && !sameName(typed, name) && <p className="sp-warn">Must match your printed name.</p>}
        </div>
      )}
      {method === 'upload' && (
        <div className="sp-upload">
          <input type="file" accept="image/png,image/jpeg" onChange={upload} aria-label="Picture of your signature" />
          {uploaded && <img src={uploaded} alt="Your uploaded signature" />}
        </div>
      )}
      <label className="sp-consent">
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
        <span>{consent}</span>
      </label>
      {error && <p className="sp-warn" role="alert">{error}</p>}
      <button type="button" className="tool primary" aria-disabled={!ready || busy} onClick={submit}>{busy ? 'Signing…' : 'Sign order'}</button>
      <p className="sp-note">Recorded with your signature: the date and time, your IP address and browser, and a fingerprint of this order.</p>
    </section>
  )
}

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
          <option value="" aria-label="No SKU" />
          <option value="TBD">TBD | Custom, not created yet</option>
          {!known && !typingNew && <option value={l.sku}>{l.sku} | Not in Stock Items</option>}
          {skus.map((s) => <option key={s.sku} value={s.sku}>{s.sku} | {s.name} | {s.price != null ? money(s.price) : 'No retail'}</option>)}
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
        {onAddSku
          ? <textarea className="f" rows={2} id={id('desc')} value={l.desc} placeholder="Describe the item" onChange={(e) => set('desc', e.target.value)} />
          : <div className="f ro" id={id('desc')}>{l.desc}</div>}
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

// `shared`: the customer's link (SharedInvoice), shown as the finished pages only.
function SalesOrder({ folder, id, form, setError, shared = null }) {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const preview = Boolean(shared) || params.get('view') === 'preview'
  const download = params.get('download') === '1'
  const [rec, setRec] = useState(shared ? { ...shared, status: 'generated' } : null) // the stored entry
  const [doc, setDoc] = useState(shared?.data ?? null) // the form as typed
  const [askSent, setAskSent] = useState(false) // email opened; ask whether it went
  const emailAfter = useRef(false) // Generate was pressed as "Generate & email"
  const [note, setNote] = useState('')
  const [skus, setSkus] = useState([])
  const [saving, setSaving] = useState('') // '', 'Saving…', 'Saved', 'Unsaved changes'
  const [dirty, setDirty] = useState(false) // edits not yet saved with Save Work
  const [leaving, setLeaving] = useState(null) // where a link would go while the draft is unsaved
  const [ask, setAsk] = useState(null) // { [line index]: typed retail } while Generate waits on missing retail
  const [busy, setBusy] = useState(false)
  const [tried, setTried] = useState(false) // Generate pressed while something was missing
  const [known, setKnown] = useState([]) // earlier customers in this folder, newest first
  const [customers, setCustomers] = useState(null) // the customer list; null until loaded
  const [nameDone, setNameDone] = useState(false) // customer name left, so a new one may be offered for saving
  const [skipSave, setSkipSave] = useState([]) // names answered "Not now"
  const [savingCustomer, setSavingCustomer] = useState(false)
  const at = `${API}/${folder}/${id}`

  useEffect(() => {
    if (shared) return
    // A draft shows its order number from the start: the next free one unless one was typed.
    Promise.all([apiFetch(at), apiFetch(`${API}/${folder}/next`).catch(() => null)]).then(([r, next]) => {
      setRec(r)
      setDoc(r.status === 'draft' && !String(r.data?.i?.no ?? '').trim() && next ? { ...r.data, i: { ...r.data.i, no: next.number } } : r.data)
    }).catch((err) => setError(err.message))
  }, [at, folder, setError, shared])
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

  // Unsaved: the browser warns on close or reload, and links on the page ask first.
  useEffect(() => {
    if (!dirty) return undefined
    const warn = (e) => { e.preventDefault(); e.returnValue = '' }
    const intercept = (e) => {
      const a = e.target.closest?.('a[href]')
      if (!a || a.target === '_blank' || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey) return
      const url = new URL(a.href, window.location.href)
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return
      e.preventDefault()
      e.stopPropagation()
      setLeaving(url.pathname + url.search)
    }
    window.addEventListener('beforeunload', warn)
    document.addEventListener('click', intercept, true)
    return () => { window.removeEventListener('beforeunload', warn); document.removeEventListener('click', intercept, true) }
  }, [dirty])

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

  // Edits stay on the page until Save Work.
  const edit = (next) => {
    setDoc(next)
    setDirty(true)
    setSaving('Unsaved changes')
  }
  const save = async () => {
    setSaving('Saving…')
    try {
      setRec(await apiFetch(at, { method: 'PUT', body: doc }))
      setDirty(false)
      setSaving('Saved')
      return true
    } catch (err) {
      setSaving('Unsaved changes')
      setError(`Not saved: ${err.message}`)
      return false
    }
  }
  // Never saved: still exactly as the template made it.
  const neverSaved = rec.created_at === rec.updated_at
  const leave = async (choice) => {
    const to = leaving
    if (choice === 'cancel') return setLeaving(null)
    if (choice === 'save' && !(await save())) return setLeaving(null)
    if (choice === 'discard' && neverSaved) await apiFetch(at, { method: 'DELETE' }).catch(() => {})
    setDirty(false)
    setLeaving(null)
    setTimeout(() => navigate(to), 0)
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
  const generating = useRef(false)
  const generate = async (typed) => {
    if (generating.current) return
    setNameDone(true)
    if (Object.keys(problemsIn(doc, emailAfter.current)).length) {
      setTried(emailAfter.current ? 'email' : 'plain')
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
    generating.current = true
    try {
      setError('')
      const g = await apiFetch(`${at}/generate`, { method: 'POST', body: { ...doc, lines } })
      setRec(g); setDoc(g.data); setSaving(''); setDirty(false)
      if (emailAfter.current) {
        emailAfter.current = false
        await email(g)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      generating.current = false
      setBusy(false)
    }
  }

  // Adds or corrects the customer email on a generated order; the link stays,
  // but anyone who opened it needs a new code, sent to this address.
  const changeEmail = async () => {
    const was = String(rec.data?.c?.email ?? '').trim()
    const typed = window.prompt(was ? 'Customer email. Changing it ends any open views of the link; the next code goes to the new address.' : 'Customer email (the link emails a code there):', was)
    if (typed === null || typed.trim() === was) return null
    try {
      const r = await apiFetch(`${at}/email`, { method: 'POST', body: { email: typed.trim() } })
      setRec(r); setDoc(r.data)
      setNote(`Customer email is now ${r.data.c.email}.`)
      return r
    } catch (err) { setError(err.message); return null }
  }

  // What the customer has paid on a generated order; it comes off the deposit
  // required and the balance, and ticks Paid (Partial).
  const changeDeposit = async () => {
    const was = rec.deposit_paid ?? num(doc.deposit)
    const typed = window.prompt('Deposit paid so far (leave blank to clear):', was == null ? '' : String(was))
    if (typed === null) return
    try {
      setRec(await apiFetch(`${at}/deposit`, { method: 'POST', body: { amount: typed.trim().replace(/[$,]/g, '') } }))
    } catch (err) { setError(err.message) }
  }

  // A signed order is never changed: its next version starts as a draft here.
  const revise = async () => {
    if (!window.confirm(`Revise order ${rec.number}? A draft of version ${(rec.version ?? 1) + 1} opens to change. Generating it archives this signed version, and the customer's link then shows the new one to sign.`)) return
    try {
      const d = await apiFetch(`${at}/revise`, { method: 'POST' })
      navigate(`${HOME}/${folder}/${d.id}`)
    } catch (err) { setError(err.message) }
  }

  const email = async (r = rec) => {
    try {
      if (!String(r.data?.c?.email ?? '').trim() && !(r = await changeEmail())) return
      const token = await openEmail(r, folder, form)
      setRec((x) => ({ ...x, share: token }))
      setAskSent(true)
    } catch (err) { setError(err.message) }
  }

  // A new customer link; the old one, and anyone it was opened by, stops working.
  const relink = async () => {
    if (!window.confirm('Make a new link for this order? The link already sent stops working, and the customer needs the new email.')) return
    try {
      setRec(await apiFetch(`${at}/relink`, { method: 'POST' }))
      setNote('New link made. Use Email to send it.')
    } catch (err) { setError(err.message) }
  }

  const flag = async (_, field, value) => {
    setRec({ ...rec, [field]: value })
    try { setRec(await apiFetch(at, { method: 'PATCH', body: { [field]: value } })) } catch (err) { setError(err.message) }
  }

  const remove = async () => {
    try {
      await apiFetch(at, { method: 'DELETE' })
      setDirty(false)
      setTimeout(() => navigate(`${HOME}/${folder}`), 0)
    } catch (err) { setError(err.message) }
  }

  const copy = async () => {
    try {
      const d = await apiFetch(`${API}/${folder}`, { method: 'POST', body: { ...doc, i: { ...doc.i, no: '', v: undefined, date: today() } } })
      navigate(`${HOME}/${folder}/${d.id}`)
    } catch (err) { setError(err.message) }
  }

  const setView = (v) => {
    if (v) params.set('view', v); else params.delete('view')
    setParams(params, { replace: true })
  }

  const ready = !Object.keys(problemsIn(doc)).length
  const problems = problemsIn(doc, tried === 'email')
  const shownProblems = tried ? problems : {}
  const s = sums(doc, locked ? paidOf(rec) : num(doc.deposit))
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
    const value = (b ? doc[a]?.[b] : doc[a]) ?? ''
    if (blank(value)) return null
    if (props.rows && readOnly) {
      return <><span className="label">{label}</span><div className="f ro" id={fid}>{value}</div></>
    }
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
    <>
      <button type="button" className={`tool primary${ready ? '' : ' is-waiting'}`} aria-disabled={!ready || busy}
        title={ready ? 'Number and lock this order' : 'Fill in the marked fields first'} onClick={() => { if (!busy) { emailAfter.current = false; generate() } }} data-where={where}>
        {busy ? 'Generating…' : 'Generate'}
      </button>
      <button type="button" className={`tool primary${ready ? '' : ' is-waiting'}`} aria-disabled={!ready || busy}
        title={ready ? 'Number and lock it, then email the customer a link' : 'Fill in the marked fields first'}
        onClick={() => { if (!busy) { emailAfter.current = true; generate() } }}>
        Generate &amp; email
      </button>
    </>
  )
  // The PDF always prints from the finished pages.
  const downloadPdf = () => {
    if (!preview) { params.set('view', 'preview') }
    params.set('download', '1')
    setParams(params, { replace: true })
  }
  // Read-only, an empty optional field is left off the page.
  const blank = (v) => readOnly && !String(v ?? '').trim()
  const sig = rec.signature
  const archived = Boolean(rec.superseded_at)

  return (
    <>
      {shared ? (
      <div className="inv-bar">
        <div className="tools"><span className="saving">Invoice {rec.number} from StoryShaped Studios</span></div>
        <div className="tools">
          {!rec.signature && <a className="tool primary" href="#sign">Sign</a>}
          <button type="button" className="tool" onClick={() => printAs(fileName(doc))}>Download PDF</button>
        </div>
      </div>
      ) : (
      <div className="inv-bar">
        <div className="tools">
          <Link to={`${HOME}/${folder}`} className="tool">← {folder}</Link>
          {!readOnly && <span className={`saving${dirty ? ' is-dirty' : ''}`} aria-live="polite">{saving}</span>}
        </div>
        <div className="tools">
          {preview ? (
            <button type="button" className="tool" onClick={() => setView(null)}>{locked ? 'Details' : 'Edit'}</button>
          ) : (
            <button type="button" className="tool" onClick={() => setView('preview')}>Preview</button>
          )}
          {locked && <span className="tool-flags"><SentPaid r={rec} onFlag={flag} /></span>}
          {locked && !preview && sig && !archived && <button type="button" className="tool" onClick={revise} title="Signed orders do not change: make the next version">Revise</button>}
          {locked && !preview && <button type="button" className="tool" onClick={copy}>Copy to new draft</button>}
          {!locked && <button type="button" className="tool" onClick={save} disabled={!dirty}>Save Work</button>}
          {!readOnly && <button type="button" className="tool" onClick={remove}>Delete draft</button>}
          <button type="button" className="tool" onClick={downloadPdf}>Download PDF</button>
          {locked && !archived && !sig && <button type="button" className="tool" onClick={changeEmail}>Customer email</button>}
          {locked && !archived && rec.share && <button type="button" className="tool" onClick={relink} title="Replace the customer's link if it went to the wrong person">New link</button>}
          {locked && !archived && <button type="button" className="tool primary" onClick={() => email()}>Email</button>}
          {!locked && !preview && generateButton('top')}
        </div>
      </div>
      )}
      {note && !shared && <p className="inv-note" role="status">{note}</p>}
      {archived && !shared && (
        <p className="inv-note" role="status">
          Archived version {rec.version ?? 1}, kept as signed.{' '}
          {rec.superseded_by && <Link to={`${HOME}/${folder}/${rec.superseded_by}`}>Open the newest version</Link>}
        </p>
      )}
      {!locked && rec.supersedes_id && !shared && (
        <p className="inv-note" role="status">
          Version {rec.version} of order {doc.i?.no}. Generating it archives the signed version and the customer signs again.{' '}
          <Link to={`${HOME}/${folder}/${rec.supersedes_id}`}>Open the signed version</Link>
        </p>
      )}
      {askSent && !rec.sent && !shared && (
        <SentAsk onYes={() => { flag(null, 'sent', true); setAskSent(false) }} onNo={() => setAskSent(false)} />
      )}

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
            <button type="button" className="tool" onClick={() => { emailAfter.current = false; setAsk(null) }}>Cancel</button>
          </div>
        </section>
      )}

      {preview && <p className="inv-print-note">Each sheet is one Letter page of the PDF, scaled to fit. Pinch to zoom.</p>}
      <Paged on={preview} render={(copy) => (
      <article className={`inv-paper${preview ? ' is-preview' : ''}`} {...(copy ? { 'aria-hidden': true, inert: '' } : {})}>
        <header className="inv-head">
          <img alt="StoryShaped Studios" src="/assets/StoryShapedStudiosNeonGlow_Rect.png" />
          <div className="meta">
            <h1>INVOICE{Number(doc.i?.v) > 1 && <span className="state">v{doc.i.v}</span>}{!locked && <span className="state">(Draft)</span>}</h1>
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
                {field('i.no', 'Order #', doc.i?.v ? { readOnly: true, title: `Version ${doc.i.v} keeps the order's number` } : { title: 'The next free number; Generate keeps it unless another order took it first' })}
                {field('i.date', 'Date', { type: 'date' })}
                <span className="label">Due</span><span className="calc">{balanceDue(rec) ? mdy(balanceDue(rec) + 'T00:00:00') : '30 days after signing'}</span>
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
                  {method && <a href={method.url} target="_blank" rel="noopener noreferrer">{method.label}</a>}
                </span>
              </div>
              {!blank(doc.notes) && <>
                <h3 className="gap">Notes &amp; terms</h3>
                {readOnly ? <div className="f ro">{doc.notes}</div>
                  : <textarea className="f" rows={4} aria-label="Notes and terms" value={doc.notes ?? ''} onChange={(e) => setField('notes', e.target.value)} />}
              </>}
            </div>
            <div className="totals" aria-live="polite">
              <span className="k">Retail value</span><span className="num">{money(s.retail)}</span>
              <span className="k save">Your savings</span><span className="num save">{s.retail - s.sub > 0 ? '−' + money(s.retail - s.sub) : money(0)}</span>
              <span className="k">Subtotal</span><span className="num">{money(s.sub)}</span>
              {!blank(doc.ship) && <>
                <label className="k" htmlFor="f-ship">Shipping</label>
                <input className="f num" id="f-ship" type="number" step="0.01" min="0" inputMode="decimal" value={doc.ship} onChange={(e) => setField('ship', e.target.value)} />
              </>}
              {!blank(doc.taxPct) && <>
                <label className="k" htmlFor="f-tax">Tax rate %</label>
                <input className="f num" id="f-tax" type="number" step="0.01" min="0" inputMode="decimal" value={doc.taxPct} onChange={(e) => setField('taxPct', e.target.value)} />
                <span className="k">Tax</span><span className="num">{money(s.tax)}</span>
              </>}
              <span className="k total-line">Total</span><span className="num total-line">{money(s.total)}</span>
              {!(preview && blank(doc.depositReq)) && <>
                <label className="k" htmlFor="f-depreq">Deposit required</label>
                {readOnly ? <span className="num">{num(doc.depositReq) ? money(num(doc.depositReq)) : 'None'}</span>
                  : <input className="f num" id="f-depreq" type="number" step="0.01" min="0" inputMode="decimal" value={doc.depositReq ?? ''}
                    placeholder={s.total ? money(r2(s.total / 2)) + ' is 50%' : ''} onChange={(e) => setField('depositReq', e.target.value)} />}
              </>}
              {!blank(doc.depositDue) && <>
                <label className="k" htmlFor="f-depdue">Deposit due by</label>
                <input className="f num" id="f-depdue" type="date" value={doc.depositDue ?? ''} onChange={(e) => setField('depositDue', e.target.value)} />
              </>}
              {!locked ? <>
                <label className="k" htmlFor="f-dep">Deposit paid</label>
                <input className="f num" id="f-dep" type="number" step="0.01" min="0" inputMode="decimal" value={doc.deposit} onChange={(e) => setField('deposit', e.target.value)} />
              </> : (s.paid > 0 || !preview) && <>
                <span className="k">Deposit paid</span>
                {/* Not an input: the locked fieldset disables every control inside it. */}
                <span className="num">{money(s.paid)}{!preview && !archived && (
                  <a href="#deposit" role="button" className="dep-edit" title="Record what the customer has paid"
                    onClick={(e) => { e.preventDefault(); changeDeposit() }}>Edit</a>
                )}</span>
              </>}
              {s.depositLeft != null && s.paid > 0 && <>
                <span className="k">Deposit still due</span><span className="num">{money(s.depositLeft)}</span>
              </>}
              <div className="due"><span>Balance due</span><strong>{money(s.due)}</strong></div>
            </div>
          </section>
        </fieldset>

        {/* Blank lines to sign in ink, or the customer's electronic signature. */}
        <section className={`inv-sign${sig ? ' is-signed' : ''}`} aria-label="Customer acceptance">
          <h3>Customer acceptance</h3>
          <p>{acceptance?.text}</p>
          <div className="sign-lines">
            <div className="sign wide"><span className="line">
              {sig && (sig.image ? <img src={sig.image} alt={`Signature of ${sig.name}`} /> : <span className="typed-sig">{sig.typed}</span>)}
            </span><span className="label">Signature</span></div>
            <div className="sign"><span className="line">{sig && <span className="sig-val">{new Date(sig.signedAt).toLocaleDateString('en-CA')}</span>}</span><span className="label">Date</span></div>
            <div className="sign wide"><span className="line">{sig && <span className="sig-val">{sig.name}</span>}</span><span className="label">Printed name</span></div>
          </div>
          {sig && (
            <p className="sig-audit">
              Signed electronically {new Date(sig.signedAt).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })}
              {' · '}{sig.method === 'type' ? 'typed' : sig.method === 'draw' ? 'drawn' : 'uploaded'}
              {sig.account ? ` · account ${sig.account.email}` : sig.verifiedEmail ? ` · code sent to ${sig.verifiedEmail}` : ' · as guest'}
              {sig.ip ? ` · IP ${sig.ip}` : ''} · ref {sig.hash.slice(0, 12)}
            </p>
          )}
        </section>

        <footer className="inv-foot">
          <div className="tag">{footer.tagline}</div>
          <div className="links">{(footer.lines ?? []).join(' · ')}</div>
          <div className="legal">© {new Date(doc.i?.date ? doc.i.date + 'T00:00:00' : Date.now()).getFullYear()} {LEGAL_NAME}. All rights reserved.</div>
        </footer>
      </article>
      )} />

      {shared && !rec.signature && (
        <SignPanel token={shared.token} session={shared.session} defaultName={doc.c?.name || shared.customer?.account.name} consent={shared.consent} customer={shared.customer}
          onSigned={(r) => { setRec((x) => ({ ...x, signature: r.signature })); window.scrollTo({ top: 0, behavior: 'smooth' }) }} />
      )}
      {shared && rec.signature && <p className="inv-signed-note" role="status">Signed. Thank you! Download PDF keeps a copy.</p>}

      {!locked && !preview && (
        <div className="inv-generate">
          {tried && Object.keys(problems).length ? (
            <p className="inv-missing" role="alert"><Warn show>Missing</Warn> {Object.values(problems).join(', ')}.</p>
          ) : (
            <p className="hint">{ready ? 'Ready. Generate numbers this order and locks it.' : 'Generate turns on once the customer name and every price are filled in.'}</p>
          )}
          <span className="gen-acts">
            <button type="button" className="tool save-work" onClick={save} disabled={!dirty}>{dirty ? 'Save Work' : 'Saved'}</button>
            {generateButton('bottom')}
          </span>
        </div>
      )}

      {leaving && (
        <div className="inv-modal" role="presentation">
          <section className="inv-leave" role="alertdialog" aria-modal="true" aria-labelledby="inv-leave-h">
            <h2 id="inv-leave-h">{form.label}</h2>
            <p>Do you want to save changes to <strong>{fileName(doc)}</strong>?</p>
            <div className="tools">
              <button type="button" className="tool primary" autoFocus onClick={() => leave('save')}>Save</button>
              <button type="button" className="tool" onClick={() => leave('discard')}>Don&rsquo;t Save</button>
              <button type="button" className="tool" onClick={() => leave('cancel')}>Cancel</button>
            </div>
          </section>
        </div>
      )}
    </>
  )
}

// /invoice/:token, the link in the customer's email: no login, generated entries only.
// Customer sign-in on the invoice link. Off until inventory and payment are live.
const CUSTOMER_ACCOUNTS = false
// The customer's sign-in on this browser: { token, account }, or null.
const CUSTOMER_KEY = 'sss:customer'
function storedCustomer() {
  try { return JSON.parse(localStorage.getItem(CUSTOMER_KEY)) } catch { return null }
}
function storeCustomer(c) {
  try { if (c) localStorage.setItem(CUSTOMER_KEY, JSON.stringify(c)); else localStorage.removeItem(CUSTOMER_KEY) } catch { /* private mode */ }
}

// Sign in, create an account, or continue as a guest.
function ContinueAs({ invoice, onDone }) {
  const [mode, setMode] = useState('signin') // choose | signin | create
  const [name, setName] = useState(invoice?.c?.name ?? '')
  const [email, setEmail] = useState(invoice?.c?.email ?? '')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const body = mode === 'create' ? { name, email, password } : { email, password }
      onDone(await rawFetch(`/api/account/${mode === 'create' ? 'register' : 'login'}`, { method: 'POST', body }))
    } catch (err) {
      setError(err.message)
      if (err.status === 409) setMode('signin')
    } finally { setBusy(false) }
  }
  return (
    <div className="inv-modal" role="presentation">
      <section className="inv-leave inv-continue" role="dialog" aria-modal="true" aria-labelledby="continue-h">
        <img alt="StoryShaped Studios" src="/assets/StoryShapedStudiosNeonGlow_Rect.png" />
        <h2 id="continue-h">{mode === 'create' ? 'Create your account' : mode === 'signin' ? 'Sign in' : 'Your invoice is ready'}</h2>
        {mode === 'choose' ? (
          <>
            <p>Sign in to keep this order with your account, or continue as a guest.</p>
            <div className="continue-acts">
              <button type="button" className="tool primary" onClick={() => setMode('signin')}>Sign in</button>
              <button type="button" className="tool" onClick={() => setMode('create')}>Create account</button>
              <button type="button" className="tool" onClick={() => onDone(null)}>Continue as guest</button>
            </div>
          </>
        ) : (
          <form onSubmit={submit} className="continue-form">
            {mode === 'create' && <label><span>Full name</span><input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required /></label>}
            <label><span>Email</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required /></label>
            <label><span>Password</span><input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'create' ? 'new-password' : 'current-password'} minLength={mode === 'create' ? 8 : undefined} required /></label>
            {error && <p className="sp-warn" role="alert">{error}</p>}
            <div className="tools">
              <button type="submit" className="tool primary" disabled={busy}>{busy ? 'One moment…' : mode === 'create' ? 'Create account' : 'Sign in'}</button>
              <button type="button" className="tool" onClick={() => onDone(null)}>Cancel</button>
            </div>
            <p className="continue-switch">
              {mode === 'create'
                ? <>Have an account? <button type="button" className="link" onClick={() => { setError(''); setMode('signin') }}>Sign in</button></>
                : <>No account yet? <button type="button" className="link" onClick={() => { setError(''); setMode('create') }}>Create one</button></>}
            </p>
          </form>
        )}
      </section>
    </div>
  )
}

// The link shows nothing until the customer enters the code emailed to the
// address on the order (utils/forms.js requestCode / verify).
function VerifyGate({ token, gate, onOpened }) {
  const [sentTo, setSentTo] = useState(null)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const at = `/api/shared/${encodeURIComponent(token)}`
  const sending = useRef(false) // one code email per tap
  const send = async () => {
    if (sending.current) return
    sending.current = true
    setBusy(true)
    setError('')
    try { setSentTo((await rawFetch(`${at}/code`, { method: 'POST' })).sentTo); setCode('') } catch (err) { setError(err.message) } finally { sending.current = false; setBusy(false) }
  }
  const check = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try { onOpened(await rawFetch(`${at}/verify`, { method: 'POST', body: { code } })) } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  return (
    <div className="inv-gate inv-verify">
      <img alt="StoryShaped Studios" src="/assets/StoryShapedStudiosNeonGlow_Rect.png" />
      <h1>Invoice {gate.number}</h1>
      {!gate.sentTo ? (
        <p>This invoice has no email on file, so it cannot be opened here. Please contact info@storyshapedstudios.com.</p>
      ) : !sentTo ? (
        <>
          <p>To keep your order private, we&rsquo;ll email a 6-digit code to <strong>{gate.sentTo}</strong>.</p>
          <button type="button" className="tool primary" disabled={busy} onClick={send}>{busy ? 'Sending…' : 'Email me a code'}</button>
        </>
      ) : (
        <form onSubmit={check} className="verify-form">
          <p>We sent a code to <strong>{sentTo}</strong>. It works for 10 minutes.</p>
          <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric"
            autoComplete="one-time-code" placeholder="123456" aria-label="6-digit code" autoFocus />
          <button type="submit" className="tool primary" disabled={busy || code.length !== 6}>{busy ? 'Checking…' : 'Open invoice'}</button>
          <button type="button" className="link" disabled={busy} onClick={send}>Send a new code</button>
        </form>
      )}
      {error && <p className="sp-warn" role="alert">{error}</p>}
      <p className="sp-note">Once opened, this browser keeps your invoice for 30 days.</p>
    </div>
  )
}

export function SharedInvoice() {
  const { token } = useParams()
  const forms = useForms()
  const [entry, setEntry] = useState(null)
  const [error, setError] = useState('')
  const [customer, setCustomer] = useState(() => (CUSTOMER_ACCOUNTS ? storedCustomer() : null))
  // The session from the emailed code, kept in this browser per link.
  const sessionKey = `sss:invoice:${token}`
  const [session, setSession] = useState(() => { try { return localStorage.getItem(sessionKey) } catch { return null } })
  const [gate, setGate] = useState(null) // { number, sentTo } while a code is needed
  const opened = ({ session: s, ...e }) => {
    try { localStorage.setItem(sessionKey, s) } catch { /* private mode: asks again next visit */ }
    setSession(s)
    setGate(null)
    setEntry(e)
  }
  const [signingIn, setSigningIn] = useState(false)
  // A remembered sign-in is checked once; an expired one is forgotten.
  useEffect(() => {
    if (!customer) return
    rawFetch('/api/account/me', { headers: { Authorization: `Bearer ${customer.token}` } })
      .catch((err) => { if (err.status === 401) { storeCustomer(null); setCustomer(null) } })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const chosen = (c) => {
    if (c) { storeCustomer(c); setCustomer(c) }
    setSigningIn(false)
  }
  const signOut = () => {
    rawFetch('/api/account/logout', { method: 'POST', headers: { Authorization: `Bearer ${customer.token}` } }).catch(() => {})
    storeCustomer(null)
    setCustomer(null)
  }
  useEffect(() => {
    rawFetch(`/api/shared/${encodeURIComponent(token)}`, { headers: session ? { 'X-Invoice-Session': session } : undefined }).then(setEntry)
      .catch((err) => {
        if (err.status === 401 && err.data?.verify) {
          try { localStorage.removeItem(sessionKey) } catch { /* private mode */ }
          setGate(err.data)
        } else setError(err.status === 404 ? 'This invoice link is not valid. Please contact info@storyshapedstudios.com.' : err.message)
      })
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps
  const form = entry && forms.find((f) => f.folder === entry.folder)
  return (
    <div className="admin-invoices is-shared">
      {customer ? (
        <p className="inv-account">Signed in as <strong>{customer.account.name}</strong> ({customer.account.email})
          {' · '}<button type="button" className="link" onClick={signOut}>Sign out</button></p>
      ) : CUSTOMER_ACCOUNTS && entry && !entry.signature && (
        <p className="inv-account">Have an account? <button type="button" className="link" onClick={() => setSigningIn(true)}>Sign in</button></p>
      )}
      {error ? <p className="inv-error" role="alert">{error}</p>
        : gate ? <VerifyGate token={token} gate={gate} onOpened={opened} />
        : form ? <SalesOrder shared={{ ...entry, token, customer, session }} folder={entry.folder} form={form} setError={setError} />
          : <p className="inv-empty">Loading your invoice…</p>}
      {signingIn && <ContinueAs invoice={entry?.data} onDone={chosen} />}
    </div>
  )
}

function Entry({ folder, id, setError }) {
  const form = useFormIn(folder)
  if (!form) return <p className="inv-empty">No form files into {folder}. <Link to={HOME}>Back to Forms</Link></p>
  if (form.name !== 'salesOrder') return <p className="inv-empty">The {form.label} has no editor yet. <Link to={`${HOME}/${folder}`}>Back to {folder}</Link></p>
  return <SalesOrder folder={folder} id={id} form={form} setError={setError} />
}

export default function AdminForms({ page }) {
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
      {page === 'emails' ? <EmailTemplates setError={setError} />
        : id ? <Entry key={`${folder}/${id}`} folder={folder} id={id} setError={setError} />
        : folder ? <Folder key={folder} folder={folder} setError={setError} />
          : <Templates setError={setError} />}
    </div>
  )
}
