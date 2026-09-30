// src/lib/api.js
// Base URL for the backend API. In production set VITE_API_URL to the deployed
// backend origin (e.g. https://xxx.up.railway.app); locally it defaults to the
// dev server on port 3000. VITE_API_URL=none builds a site with no backend
// (Go-Live): callers check HAS_BACKEND and skip the request instead of letting
// a visitor's browser try localhost.

// VITE_API_URL=same: the backend answers on the site's own address (Amplify
// forwards /api/*, /auth/* and /oauth/* to the backend Lambda, DEPLOY-MAP.md).
const configured = import.meta.env.VITE_API_URL
export const HAS_BACKEND = configured !== 'none'
export const API_BASE = !HAS_BACKEND || configured === 'same' ? '' : configured || 'http://localhost:3000'

// Small JSON fetch helper for pages that make repeated API calls (GET/POST/
// PATCH/DELETE) instead of hand-rolling fetch() at each call site.
export async function apiFetch(path, options = {}) {
  if (!HAS_BACKEND) throw new Error('This build has no backend.')
  const { body, headers, ...rest } = options
  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  const data = text ? JSON.parse(text) : null
  if (!res.ok) {
    const err = new Error(data?.error || `Request failed: ${res.status}`)
    err.status = res.status
    throw err
  }
  return data
}
