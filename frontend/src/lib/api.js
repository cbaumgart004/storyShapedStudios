// src/lib/api.js
// Base URL for the backend API. In production set VITE_API_URL to the deployed
// backend origin (e.g. https://xxx.up.railway.app); locally it defaults to the
// dev server on port 3000.

export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000'

// Small JSON fetch helper for pages that make repeated API calls (GET/POST/
// PATCH/DELETE) instead of hand-rolling fetch() at each call site.
export async function apiFetch(path, options = {}) {
  const { body, headers, ...rest } = options
  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  const data = text ? JSON.parse(text) : null
  if (!res.ok) {
    throw new Error(data?.error || `Request failed: ${res.status}`)
  }
  return data
}
