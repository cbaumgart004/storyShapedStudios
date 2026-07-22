// server/utils/notifyLowStock.js
// Phase 1 stub: log only. Hook point for a real admin notification (e.g.
// email) once low-stock alerts need to leave the app.

export function notifyLowStock(components) {
  const summary = components
    .map((c) => `${c.name} (${c.quantity_on_hand}/${c.low_stock_threshold} ${c.unit})`)
    .join(', ')
  console.warn(`[inventory] low stock: ${summary}`)
}
