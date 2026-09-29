// server/utils/requireEditor.js
// Admin routes answer only a login the Edge of the Map console says can edit
// this site (ADR-0007): the console owns sign-in and site membership, so this
// backend keeps no users of its own. The request's bearer token goes to the
// console's GET /me; a yes is kept for a minute per token, so a busy admin page
// is not one round trip per call. A no is never kept, so a login added a moment
// ago works at once.
//
// Setting, by name: EOTM_SITE_API (default: StoryShaped's console API).

const DEFAULT_API = 'https://admin.theedgeofthemap.com/api/sites/storyshaped'
const KEEP_MS = 60_000

export function createRequireEditor({ api = process.env.EOTM_SITE_API ?? DEFAULT_API, fetchFn = fetch, now = Date.now } = {}) {
  const known = new Map() // token -> { user, until }

  return async function requireEditor(req, res, next) {
    const header = req.headers.authorization ?? ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : null
    if (!token) return res.status(401).json({ error: 'Sign in through the Edge of the Map console.' })

    const hit = known.get(token)
    if (hit && hit.until > now()) {
      req.editor = hit.user
      return next()
    }
    known.delete(token)

    let answer
    try {
      answer = await fetchFn(`${api}/me`, { headers: { authorization: `Bearer ${token}` } })
    } catch (err) {
      console.error('[auth] console unreachable:', err.message)
      return res.status(503).json({ error: 'Cannot check your sign-in right now. Try again shortly.' })
    }
    if (answer.status === 401 || answer.status === 403) {
      return res.status(answer.status).json({ error: answer.status === 401 ? 'Your sign-in has expired.' : 'This login cannot edit this site.' })
    }
    if (!answer.ok) {
      console.error(`[auth] console answered ${answer.status}`)
      return res.status(503).json({ error: 'Cannot check your sign-in right now. Try again shortly.' })
    }

    const user = await answer.json()
    if (known.size > 500) known.clear()
    known.set(token, { user, until: now() + KEEP_MS })
    req.editor = user
    next()
  }
}

export const requireEditor = createRequireEditor()
