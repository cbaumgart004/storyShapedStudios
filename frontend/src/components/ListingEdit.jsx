/* eslint-disable react/prop-types */
// src/components/ListingEdit.jsx
// A listing's own editing on the page, while the editor is open in Edit (not
// View): the description and tags show under the card, and each variation's
// stock count has − and + beside a number box (a phone opens its number pad).
// Title and description are edited where they stand (data-eotm-text, the
// console's Targets.jsx); tags open in the pane as chips. A count is saved as
// a Physical Count (ADR-0002) through POST /api/inventory/stock/:id/movements,
// so every change is logged; it is stock, not page content, so it is real at
// once rather than waiting for Review changes. Marketplace sends happen at
// Review changes (the console's release.push).

import React, { useEffect, useRef, useState } from 'react'
import { API_BASE } from '@/lib/api'
import { editorToken } from '@/lib/siteConsole'

// Open in Edit: the console is open and not showing the page as a visitor sees it.
export function useEditing() {
  const read = () => Boolean(window.EOTM?.editing) && !window.EOTM?.previewing
  const [on, setOn] = useState(read)
  useEffect(() => {
    let unsubscribe = null
    const wire = () => { if (window.EOTM?.subscribe && !unsubscribe) unsubscribe = window.EOTM.subscribe(() => setOn(read())) }
    wire()
    // Opening and closing the editor are not changes the bridge announces.
    const timer = setInterval(() => { wire(); setOn(read()) }, 1000)
    return () => { clearInterval(timer); if (unsubscribe) unsubscribe() }
  }, [])
  return on
}

async function call(path, options = {}) {
  const token = editorToken()
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error ?? `The inventory answered ${res.status}.`)
  return body
}

// Stock items by SKU, read once per page while editing.
let stockOnce = null
function useStockBySku(on) {
  const [bySku, setBySku] = useState(null)
  useEffect(() => {
    if (!on) return undefined
    let active = true
    stockOnce = stockOnce ?? call('/api/inventory/stock').catch((e) => { stockOnce = null; throw e })
    stockOnce.then((rows) => active && setBySku(new Map((Array.isArray(rows) ? rows : []).filter((r) => r.sku).map((r) => [r.sku, r]))))
      .catch((e) => console.warn('[listing] inventory not read:', e.message))
    return () => { active = false }
  }, [on])
  return bySku
}

function Count({ item, label }) {
  const [value, setValue] = useState(String(item.quantity ?? 0))
  const [said, setSaid] = useState('')
  const saved = useRef(Number(item.quantity ?? 0))
  const timer = useRef(null)
  const save = (n) => {
    clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      if (n === saved.current) return
      setSaid('Saving…')
      try {
        const r = await call(`/api/inventory/stock/${item.id}/movements`, { method: 'POST', body: { kind: 'count', quantity: n, note: 'Counted on the page' } })
        saved.current = Number(r.item?.quantity ?? r.quantity ?? n)
        setSaid('Counted')
      } catch (e) {
        setSaid(e.message)
      }
    }, 700)
  }
  useEffect(() => () => clearTimeout(timer.current), [])
  const set = (n) => {
    const v = Math.max(0, Math.round(n))
    setValue(String(v))
    save(v)
  }
  return (
    <div className="listing-count">
      <span className="listing-count-name">{label}</span>
      <button type="button" aria-label={`One fewer ${label}`} onClick={() => set(Number(value || 0) - 1)}>−</button>
      <input type="number" inputMode="numeric" pattern="[0-9]*" min="0" aria-label={`${label} in stock`} value={value}
        onChange={(e) => { setValue(e.target.value); if (e.target.value !== '') save(Math.max(0, Math.round(Number(e.target.value)))) }}
        onFocus={(e) => e.target.select()} />
      <button type="button" aria-label={`One more ${label}`} onClick={() => set(Number(value || 0) + 1)}>+</button>
      <span className="listing-count-said" aria-live="polite">{said}</span>
    </div>
  )
}

export default function ListingEdit({ data }) {
  const on = useEditing()
  const bySku = useStockBySku(on)
  if (!on) return null
  const variations = (data.variations ?? []).filter((v) => v.sku)
  const tags = (data.tags ?? []).map((t) => t.tag).filter(Boolean)
  return (
    <div className="listing-edit">
      <p className="listing-edit-description" data-eotm-text="description" data-eotm-multiline>{data.description || 'Add a description'}</p>
      <p className="listing-edit-tags" data-eotm-field="tags">{tags.length ? tags.map((t) => <span key={t}>{t}</span>) : <span>Add tags</span>}</p>
      {variations.length > 0 && (
        <div className="listing-counts">
          {variations.map((v) => {
            const item = bySku?.get(v.sku)
            const label = variations.length > 1 ? v.option || v.sku : 'In stock'
            return item ? <Count key={v.sku} item={item} label={label} />
              : <p key={v.sku} className="listing-count">{label}: {bySku ? `no stock item for ${v.sku}` : 'reading stock…'}</p>
          })}
        </div>
      )}
    </div>
  )
}
