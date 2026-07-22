// src/pages/Admin/Inventory.jsx
// Minimal internal admin page for the inventory foundation: manage sellable
// items and raw components/supplies, link them via a bill-of-materials
// (BOM), and adjust quantities. No auth yet — see docs/CURRENT_WORK.md.

import React, { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '@/lib/api'
import '@/styles/AdminInventory.css'

function isLowStock(component) {
  return Number(component.quantity_on_hand) <= Number(component.low_stock_threshold)
}

export default function AdminInventory() {
  const [items, setItems] = useState([])
  const [components, setComponents] = useState([])
  const [error, setError] = useState('')

  const [newItem, setNewItem] = useState({ name: '', sku: '', description: '' })
  const [newComponent, setNewComponent] = useState({
    name: '',
    sku: '',
    unit: 'unit',
    quantity_on_hand: 0,
    low_stock_threshold: 0,
  })

  const [deltaByItem, setDeltaByItem] = useState({})
  const [expandedItemId, setExpandedItemId] = useState(null)
  const [bomByItem, setBomByItem] = useState({})
  const [newBomLine, setNewBomLine] = useState({ component_id: '', quantity_per_unit: '' })

  const load = useCallback(async () => {
    try {
      const [itemsData, componentsData] = await Promise.all([
        apiFetch('/api/inventory/items'),
        apiFetch('/api/inventory/components'),
      ])
      setItems(itemsData)
      setComponents(componentsData)
    } catch (err) {
      setError(err.message)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const loadBom = async (itemId) => {
    try {
      const bom = await apiFetch(`/api/inventory/items/${itemId}/bom`)
      setBomByItem((prev) => ({ ...prev, [itemId]: bom }))
    } catch (err) {
      setError(err.message)
    }
  }

  const toggleExpanded = (itemId) => {
    const next = expandedItemId === itemId ? null : itemId
    setExpandedItemId(next)
    if (next != null && !bomByItem[next]) loadBom(next)
  }

  const handleAddItem = async (e) => {
    e.preventDefault()
    if (!newItem.name.trim()) return
    try {
      await apiFetch('/api/inventory/items', {
        method: 'POST',
        body: {
          name: newItem.name.trim(),
          sku: newItem.sku.trim() || null,
          description: newItem.description.trim() || null,
        },
      })
      setNewItem({ name: '', sku: '', description: '' })
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleAddComponent = async (e) => {
    e.preventDefault()
    if (!newComponent.name.trim()) return
    try {
      await apiFetch('/api/inventory/components', {
        method: 'POST',
        body: {
          name: newComponent.name.trim(),
          sku: newComponent.sku.trim() || null,
          unit: newComponent.unit.trim() || 'unit',
          quantity_on_hand: Number(newComponent.quantity_on_hand) || 0,
          low_stock_threshold: Number(newComponent.low_stock_threshold) || 0,
        },
      })
      setNewComponent({ name: '', sku: '', unit: 'unit', quantity_on_hand: 0, low_stock_threshold: 0 })
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleAdjustQuantity = async (itemId) => {
    const delta = Number(deltaByItem[itemId])
    if (!delta) return
    try {
      await apiFetch(`/api/inventory/items/${itemId}/quantity`, {
        method: 'PATCH',
        body: { delta, reason: 'manual' },
      })
      setDeltaByItem((prev) => ({ ...prev, [itemId]: '' }))
      load()
      if (bomByItem[itemId]) loadBom(itemId)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleComponentQuantityChange = async (componentId, value) => {
    try {
      await apiFetch(`/api/inventory/components/${componentId}`, {
        method: 'PATCH',
        body: { quantity_on_hand: Number(value) || 0 },
      })
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleAddBomLine = async (e, itemId) => {
    e.preventDefault()
    if (!newBomLine.component_id || !newBomLine.quantity_per_unit) return
    try {
      await apiFetch(`/api/inventory/items/${itemId}/bom`, {
        method: 'POST',
        body: {
          component_id: Number(newBomLine.component_id),
          quantity_per_unit: Number(newBomLine.quantity_per_unit),
        },
      })
      setNewBomLine({ component_id: '', quantity_per_unit: '' })
      loadBom(itemId)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleRemoveBomLine = async (itemId, componentId) => {
    try {
      await apiFetch(`/api/inventory/items/${itemId}/bom/${componentId}`, { method: 'DELETE' })
      loadBom(itemId)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="admin-inventory">
      <header className="ai-header">
        <div>
          <p className="eyebrow">Internal tool</p>
          <h1>Inventory admin</h1>
        </div>
        <Link to="/" className="ai-back-link">← Back to site</Link>
      </header>

      {error && <p className="ai-error">{error}</p>}

      <section className="ai-section">
        <h2>Items</h2>
        <table className="ai-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>SKU</th>
              <th>On hand</th>
              <th>Adjust</th>
              <th>Recipe</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <React.Fragment key={item.id}>
                <tr>
                  <td>{item.name}</td>
                  <td>{item.sku || '—'}</td>
                  <td>{item.quantity_on_hand}</td>
                  <td>
                    <input
                      type="number"
                      className="ai-delta-input"
                      placeholder="±qty"
                      value={deltaByItem[item.id] ?? ''}
                      onChange={(e) =>
                        setDeltaByItem((prev) => ({ ...prev, [item.id]: e.target.value }))
                      }
                    />
                    <button type="button" onClick={() => handleAdjustQuantity(item.id)}>
                      Apply
                    </button>
                  </td>
                  <td>
                    <button type="button" onClick={() => toggleExpanded(item.id)}>
                      {expandedItemId === item.id ? 'Hide' : 'Manage'}
                    </button>
                  </td>
                </tr>
                {expandedItemId === item.id && (
                  <tr className="ai-bom-row">
                    <td colSpan={5}>
                      <h3>Recipe (components consumed per unit sold)</h3>
                      <ul className="ai-bom-list">
                        {(bomByItem[item.id] || []).map((line) => (
                          <li key={line.component_id}>
                            {line.quantity_per_unit} {line.unit} of {line.name}
                            <button
                              type="button"
                              className="ai-remove-link"
                              onClick={() => handleRemoveBomLine(item.id, line.component_id)}
                            >
                              Remove
                            </button>
                          </li>
                        ))}
                        {(bomByItem[item.id] || []).length === 0 && <li>No components linked yet.</li>}
                      </ul>
                      <form className="ai-inline-form" onSubmit={(e) => handleAddBomLine(e, item.id)}>
                        <select
                          value={newBomLine.component_id}
                          onChange={(e) => setNewBomLine((prev) => ({ ...prev, component_id: e.target.value }))}
                        >
                          <option value="">Select component…</option>
                          {components.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                        <input
                          type="number"
                          step="0.001"
                          placeholder="qty per unit"
                          value={newBomLine.quantity_per_unit}
                          onChange={(e) => setNewBomLine((prev) => ({ ...prev, quantity_per_unit: e.target.value }))}
                        />
                        <button type="submit">Add to recipe</button>
                      </form>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={5}>No items yet.</td></tr>
            )}
          </tbody>
        </table>

        <form className="ai-inline-form" onSubmit={handleAddItem}>
          <input
            placeholder="Item name"
            value={newItem.name}
            onChange={(e) => setNewItem((prev) => ({ ...prev, name: e.target.value }))}
          />
          <input
            placeholder="SKU (optional)"
            value={newItem.sku}
            onChange={(e) => setNewItem((prev) => ({ ...prev, sku: e.target.value }))}
          />
          <input
            placeholder="Description (optional)"
            value={newItem.description}
            onChange={(e) => setNewItem((prev) => ({ ...prev, description: e.target.value }))}
          />
          <button type="submit">Add item</button>
        </form>
      </section>

      <section className="ai-section">
        <h2>Components / supplies</h2>
        <table className="ai-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>SKU</th>
              <th>Unit</th>
              <th>On hand</th>
              <th>Low-stock threshold</th>
            </tr>
          </thead>
          <tbody>
            {components.map((c) => (
              <tr key={c.id} className={isLowStock(c) ? 'ai-low-stock' : ''}>
                <td>{c.name}{isLowStock(c) && <span className="ai-low-badge">Low</span>}</td>
                <td>{c.sku || '—'}</td>
                <td>{c.unit}</td>
                <td>
                  <input
                    type="number"
                    step="0.001"
                    defaultValue={c.quantity_on_hand}
                    onBlur={(e) => handleComponentQuantityChange(c.id, e.target.value)}
                  />
                </td>
                <td>{c.low_stock_threshold}</td>
              </tr>
            ))}
            {components.length === 0 && (
              <tr><td colSpan={5}>No components yet.</td></tr>
            )}
          </tbody>
        </table>

        <form className="ai-inline-form" onSubmit={handleAddComponent}>
          <input
            placeholder="Component name"
            value={newComponent.name}
            onChange={(e) => setNewComponent((prev) => ({ ...prev, name: e.target.value }))}
          />
          <input
            placeholder="SKU (optional)"
            value={newComponent.sku}
            onChange={(e) => setNewComponent((prev) => ({ ...prev, sku: e.target.value }))}
          />
          <input
            placeholder="Unit (e.g. beads, grams)"
            value={newComponent.unit}
            onChange={(e) => setNewComponent((prev) => ({ ...prev, unit: e.target.value }))}
          />
          <input
            type="number"
            step="0.001"
            placeholder="Starting qty"
            value={newComponent.quantity_on_hand}
            onChange={(e) => setNewComponent((prev) => ({ ...prev, quantity_on_hand: e.target.value }))}
          />
          <input
            type="number"
            step="0.001"
            placeholder="Low-stock threshold"
            value={newComponent.low_stock_threshold}
            onChange={(e) => setNewComponent((prev) => ({ ...prev, low_stock_threshold: e.target.value }))}
          />
          <button type="submit">Add component</button>
        </form>
      </section>
    </div>
  )
}
