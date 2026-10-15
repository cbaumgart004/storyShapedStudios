// src/lib/csv.js
// A CSV file (Etsy's and eBay's listing exports) into one object per row,
// keyed by the header row. Quoted fields may hold commas, quotes ("") and line
// breaks. Blank lines are dropped.

export function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let quoted = false
  const s = text.replace(/^﻿/, '')
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (quoted) {
      if (c === '"' && s[i + 1] === '"') { field += '"'; i++ }
      else if (c === '"') quoted = false
      else field += c
    } else if (c === '"') quoted = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++
      row.push(field); rows.push(row); row = []; field = ''
    } else field += c
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row) }
  const [header, ...body] = rows.filter((r) => r.some((v) => v.trim() !== ''))
  if (!header) return []
  return body.map((r) => Object.fromEntries(header.map((h, i) => [h.trim(), r[i] ?? ''])))
}
