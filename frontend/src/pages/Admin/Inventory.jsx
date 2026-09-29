// src/pages/Admin/Inventory.jsx
// Minimal internal admin page for Stock Items (ADR-0002; terms in CONTEXT.md):
// one list, where a Product is an item marked sellable and a Component is one
// used in another's Bill of Materials. Counts change only through the four
// actions (Build, Sale, Restock, Physical Count), each logged. No auth yet —
// see docs/CURRENT_WORK.md.

import React, { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '@/lib/api'
import '@/styles/AdminInventory.css'

const API = '/api/inventory/stock'
const EMPTY_ITEM = { name: '', sku: '', unit: 'each', sellable: false, quantity: '', low_stock_threshold: '' }

const isLow = (s) => Number(s.quantity) <= Number(s.low_stock_threshold)

const ACTIONS = [
  ['build', 'Build', 'Units made from the Bill of Materials; their Components leave stock now.'],
  ['sale', 'Sale', 'Units sold; lowers this item only.'],
  ['restock', 'Restock', 'Units bought or received.'],
  ['count', 'Physical Count', 'What is on the shelf (Actual); the difference is logged as a Count Correction.'],
]
const KIND_TEXT = { opening: 'Opening count', restock: 'Restock', sale: 'Sale', build: 'Build', consume: 'Used in a build', count: 'Count Correction' }

function Detail({ id, all, onChanged, setError }) {
  const [item, setItem] = useState(null)
  const [line, setLine] = useState({ component_id: '', quantity_per_unit: '' })
  const [move, setMove] = useState({ kind: 'build', quantity: '' })
  const [armed, setArmed] = useState(false) // delete takes a second click

  const load = useCallback(async () => {
    try {
      setItem(await apiFetch(`${API}/${id}`))
    } catch (err) {
      setError(err.message)
    }
  }, [id, setError])
  useEffect(() => { load() }, [load])

  const act = async (fn) => {
    try {
      setError('')
      await fn()
      await load()
      onChanged()
    } catch (err) {
      setError(err.message)
    }
  }

  if (!item) return <p>Loading…</p>
  const others = all.filter((s) => s.id !== id && !item.bom.some((b) => b.component_id === s.id))
  const hint = ACTIONS.find(([k]) => k === move.kind)[2]

  return (
    <div className="ai-detail">
      <h3>Change the count</h3>
      <form className="ai-inline-form" onSubmit={(e) => {
        e.preventDefault()
        act(async () => {
          await apiFetch(`${API}/${id}/movements`, { method: 'POST', body: { kind: move.kind, quantity: Number(move.quantity) } })
          setMove((m) => ({ ...m, quantity: '' }))
        })
      }}>
        <select value={move.kind} onChange={(e) => setMove((m) => ({ ...m, kind: e.target.value }))}>
          {ACTIONS.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
        </select>
        <input type="number" step="0.001" min="0" required placeholder={move.kind === 'count' ? 'Actual' : 'Units'}
          value={move.quantity} onChange={(e) => setMove((m) => ({ ...m, quantity: e.target.value }))} />
        <button type="submit">Record</button>
      </form>
      <p className="ai-hint">{hint}</p>
      {move.kind === 'build' && item.bom.length === 0 && <p className="ai-hint">No Bill of Materials yet, so a build uses nothing.</p>}

      <h3>Bill of Materials (per unit made)</h3>
      <ul className="ai-bom-list">
        {item.bom.map((b) => (
          <li key={b.component_id}>
            {b.quantity_per_unit} {b.unit} of {b.name} <span className="ai-muted">({b.quantity} on hand)</span>
            <button type="button" className="ai-remove-link"
              onClick={() => act(() => apiFetch(`${API}/${id}/bom/${b.component_id}`, { method: 'DELETE' }))}>Remove</button>
          </li>
        ))}
        {item.bom.length === 0 && <li>Not made from other stock items.</li>}
      </ul>
      <form className="ai-inline-form" onSubmit={(e) => {
        e.preventDefault()
        act(async () => {
          await apiFetch(`${API}/${id}/bom/${line.component_id}`, { method: 'PUT', body: { quantity_per_unit: Number(line.quantity_per_unit) } })
          setLine({ component_id: '', quantity_per_unit: '' })
        })
      }}>
        <select required value={line.component_id} onChange={(e) => setLine((l) => ({ ...l, component_id: e.target.value }))}>
          <option value="">Select a stock item…</option>
          {others.map((s) => <option key={s.id} value={s.id}>{s.name}{s.sku ? ` (${s.sku})` : ''}</option>)}
        </select>
        <input type="number" step="0.001" min="0" required placeholder="qty per unit"
          value={line.quantity_per_unit} onChange={(e) => setLine((l) => ({ ...l, quantity_per_unit: e.target.value }))} />
        <button type="submit">Add</button>
      </form>

      {item.used_in.length > 0 && (
        <>
          <h3>Used in</h3>
          <ul className="ai-bom-list">
            {item.used_in.map((u) => <li key={u.item_id}>{u.name}: {u.quantity_per_unit} {item.unit} each</li>)}
          </ul>
        </>
      )}

      <h3>History</h3>
      <p className="ai-hint">
        Previous (last Physical Count): {item.counted_quantity ?? '—'}
        {item.counted_at && ` on ${new Date(item.counted_at).toLocaleDateString()}`}
      </p>
      <table className="ai-table ai-history">
        <thead><tr><th>When</th><th>Change</th><th>Amount</th><th>After</th></tr></thead>
        <tbody>
          {item.movements.map((m) => (
            <tr key={m.id}>
              <td>{new Date(m.created_at).toLocaleString()}</td>
              <td>{KIND_TEXT[m.kind] ?? m.kind}{m.note && <span className="ai-muted"> · {m.note}</span>}</td>
              <td>{m.delta > 0 ? `+${m.delta}` : m.delta}</td>
              <td>{m.resulting_quantity}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <button type="button" className="ai-remove-link" onBlur={() => setArmed(false)} onClick={() => (armed
        ? act(() => apiFetch(`${API}/${id}`, { method: 'DELETE' }))
        : setArmed(true))}>
        {armed ? 'Click again to delete it and its history' : 'Delete this stock item'}
      </button>
    </div>
  )
}

export default function AdminInventory() {
  const [stock, setStock] = useState([])
  const [error, setError] = useState('')
  const [open, setOpen] = useState(null)
  const [filter, setFilter] = useState('all')
  const [newItem, setNewItem] = useState(EMPTY_ITEM)

  const load = useCallback(async () => {
    try {
      setStock(await apiFetch(API))
    } catch (err) {
      setError(err.message)
    }
  }, [])
  useEffect(() => { load() }, [load])

  const shown = stock.filter((s) =>
    filter === 'products' ? s.sellable : filter === 'components' ? s.is_component : filter === 'low' ? isLow(s) : true)

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!newItem.name.trim()) return
    try {
      setError('')
      await apiFetch(API, { method: 'POST', body: newItem })
      setNewItem(EMPTY_ITEM)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  const toggleSellable = async (s) => {
    try {
      await apiFetch(`${API}/${s.id}`, { method: 'PATCH', body: { sellable: !s.sellable } })
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="admin-inventory">
      <header className="ai-header">
        <div>
          <p className="eyebrow">Internal tool</p>
          <h1>Stock</h1>
        </div>
        <Link to="/" className="ai-back-link">← Back to site</Link>
      </header>

      {error && <p className="ai-error">{error}</p>}

      <section className="ai-section">
        <div className="ai-inline-form">
          <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Show">
            <option value="all">All stock items</option>
            <option value="products">Products (sellable)</option>
            <option value="components">Components (in a Bill of Materials)</option>
            <option value="low">Low stock</option>
          </select>
        </div>
        <table className="ai-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>SKU</th>
              <th>Calculated</th>
              <th>Low at</th>
              <th>Sellable</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {shown.map((s) => (
              <React.Fragment key={s.id}>
                <tr className={isLow(s) ? 'ai-low-stock' : ''}>
                  <td>{s.name}{isLow(s) && <span className="ai-low-badge">Low</span>}</td>
                  <td>{s.sku || '—'}</td>
                  <td>{s.quantity} {s.unit}</td>
                  <td>{s.low_stock_threshold}</td>
                  <td><input type="checkbox" checked={s.sellable} onChange={() => toggleSellable(s)} aria-label={`${s.name} is sellable`} /></td>
                  <td>
                    <button type="button" onClick={() => setOpen(open === s.id ? null : s.id)}>
                      {open === s.id ? 'Hide' : 'Manage'}
                    </button>
                  </td>
                </tr>
                {open === s.id && (
                  <tr className="ai-bom-row">
                    <td colSpan={6}>
                      <Detail id={s.id} all={stock} onChanged={load} setError={setError} />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
            {shown.length === 0 && <tr><td colSpan={6}>No stock items here yet.</td></tr>}
          </tbody>
        </table>

        <h2>Add a stock item</h2>
        <form className="ai-inline-form" onSubmit={handleAdd}>
          <input placeholder="Name" required value={newItem.name} onChange={(e) => setNewItem((p) => ({ ...p, name: e.target.value }))} />
          <input placeholder="SKU (optional)" value={newItem.sku} onChange={(e) => setNewItem((p) => ({ ...p, sku: e.target.value }))} />
          <input placeholder="Unit (each, beads, grams)" value={newItem.unit} onChange={(e) => setNewItem((p) => ({ ...p, unit: e.target.value }))} />
          <input type="number" step="0.001" min="0" placeholder="Counted now" value={newItem.quantity}
            onChange={(e) => setNewItem((p) => ({ ...p, quantity: e.target.value }))} />
          <input type="number" step="0.001" min="0" placeholder="Low-stock threshold" value={newItem.low_stock_threshold}
            onChange={(e) => setNewItem((p) => ({ ...p, low_stock_threshold: e.target.value }))} />
          <label className="ai-check">
            <input type="checkbox" checked={newItem.sellable} onChange={(e) => setNewItem((p) => ({ ...p, sellable: e.target.checked }))} />
            Sellable
          </label>
          <button type="submit">Add</button>
        </form>
      </section>
    </div>
  )
}
