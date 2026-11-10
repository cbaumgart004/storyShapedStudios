// src/lib/account.js
// Visitor accounts on the site's own address, and the owner's way into the
// editor from them.
//
// Sign-in and sign-up go to Neon Auth through the site's /_edit/auth rewrite
// (the console's auth proxy), so the session cookie is the site's own. The
// console then says whether that login edits this site: a member gets an
// editor token, kept where the console's loader looks for it, and the editor
// can open; anyone else stays a signed-in visitor.
//
// Not the customer accounts of backend/server/utils/accounts.js, which only
// sign an invoice link (/invoice/<token>).

import { CONSOLE_API } from './siteConsole'

const AUTH = '/_edit/auth'
export const SITE = 'storyshaped'
const TOKEN_KEY = `eotm:token:${SITE}`
// siteConsole.js remembers a browser the console confirmed as the owner's.
const OWNER_KEY = 'sss:owner'

// Editing happens on the preview address, never on the live one. An owner who
// signs in on the live address is sent there with the editor token in the
// address's #fragment (never sent to a server; the console's loader keeps it
// and takes it out of the address bar), the same hand-off the console's admin
// page uses. The live address keeps no token, so it never shows Edit site.
const EDIT_ORIGIN = 'https://preview.storyshapedstudios.com'
const LIVE_ORIGIN = 'https://storyshapedstudios.com'
export const isLive = () => /^(www\.)?storyshapedstudios\.com$/.test(location.hostname)
// The preview address signs in only through the live one: its editor token is
// handed over from the live session, and signing out here ends that session.
// The Amplify branch address (preview.<app>.amplifyapp.com) counts too, as the
// index.html gate does.
export const isPreview = () => typeof location !== 'undefined' && /^preview\./.test(location.hostname)
// replace: Back from the live sign-in does not land on a page that leaves again.
const toLive = (hash) => location.replace(`${LIVE_ORIGIN}${location.pathname}#${hash}`)
if (typeof location !== 'undefined' && isLive()) {
  try {
    localStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(OWNER_KEY)
  } catch { /* private mode */ }
}

async function post(path, body) {
  const res = await fetch(`${AUTH}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error(data?.message || 'That did not work. Please try again.')
  return data
}

// The signed-in login, with the JWT the console accepts, or null. Where Neon
// Auth puts the JWT is tried in the same order as the console's auth.js.
export async function currentLogin() {
  try {
    const res = await fetch(`${AUTH}/get-session`, { credentials: 'include' })
    const data = await res.json().catch(() => null)
    if (!res.ok || !data?.user) return null
    let jwt = res.headers.get('set-auth-jwt') ?? data.session?.access_token ?? null
    if (!jwt) {
      const t = await fetch(`${AUTH}/token`, { credentials: 'include' }).then((r) => (r.ok ? r.json() : null)).catch(() => null)
      jwt = t?.token ?? null
    }
    return { email: data.user.email, name: data.user.name, jwt }
  } catch {
    return null
  }
}

// keep: "Keep me signed in". Better Auth's rememberMe: true keeps the session
// cookie for the auth server's session length (7 days by Better Auth's default;
// UNVERIFIED what Neon Auth sets), false ends it when the browser closes.
export async function signIn(email, password, keep = true) {
  const r = await post('/sign-in/email', { email, password, rememberMe: keep })
  keepHint(keep)
  return r
}
export async function signUp(name, email, password, keep = true) {
  const r = await post('/sign-up/email', { name: name || email.split('@')[0], email, password, rememberMe: keep })
  keepHint(keep)
  return r
}

export async function signOut() {
  forgetEditor()
  setLogin(null)
  await post('/sign-out', {}).catch(() => {})
  // The live address holds the session; it is ended there (#eotm-signout).
  if (isPreview()) toLive('eotm-signout')
}
// The editor's own Sign out (console App.jsx) asks first; here it is ours.
if (typeof window !== 'undefined' && isPreview()) {
  window.addEventListener('eotm:signout', (e) => { e.preventDefault(); signOut() })
}

// Who is signed in, for the header's Welcome and the live address's Edit site
// button: { name, editor } or null. A hint in storage (localStorage when kept,
// else this tab's sessionStorage) says a session may exist, so a visitor who
// never signed in costs no request to the auth server on page load.
const HINT = 'sss:login'
export const LOGIN_EVENT = 'sss:login'
let login = null
function keepHint(keep) {
  try {
    localStorage.removeItem(HINT)
    sessionStorage.removeItem(HINT)
    ;(keep ? localStorage : sessionStorage).setItem(HINT, '1')
  } catch { /* private mode */ }
}
function hinted() {
  try { return localStorage.getItem(HINT) === '1' || sessionStorage.getItem(HINT) === '1' } catch { return false }
}
export function getLogin() { return login }
export function setLogin(next) {
  login = next
  if (!next) {
    try { localStorage.removeItem(HINT); sessionStorage.removeItem(HINT) } catch { /* private mode */ }
  }
  window.dispatchEvent(new CustomEvent(LOGIN_EVENT, { detail: next }))
}
export const firstName = (who) => {
  const name = String(who?.name ?? '').trim()
  // A name made from the email (sign-up without one) is not a name.
  if (!name || (who.email && name === who.email.split('@')[0])) return ''
  return name.split(/\s+/)[0]
}

// Whether this login edits the site, without keeping a token (the live
// address keeps none; its Edit site button asks claimEditor for the hand-off).
async function edits(jwt) {
  if (!jwt) return false
  const res = await fetch(`${CONSOLE_API}/handoff`, { method: 'POST', headers: { authorization: `Bearer ${jwt}` } }).catch(() => null)
  await noteRefusal(res)
  return Boolean(res?.ok)
}

// Why the console refused an owner's login, for the account window to say:
// a member whose password must be changed first, an expired sign-in, the
// console unreachable. A visitor's refusal ("cannot edit this site") is not one.
let refusal = ''
export const editorRefusal = () => refusal
async function noteRefusal(res) {
  refusal = ''
  if (res?.ok) return
  if (!res) { refusal = 'The editor could not be reached. Please try again.'; return }
  const msg = (await res.clone().json().catch(() => null))?.message ?? ''
  if (!/cannot edit this site/i.test(msg)) refusal = msg || `The editor answered ${res.status}.`
}

// On every page load with a hint: the session is checked once. On the preview
// address an owner's expired editor token is traded for a new one, so the
// loader's Edit site button stays while she is signed in (the token lasts 8
// hours, the session up to 7 days). On the live address she gets the site's
// own Edit site button, which hands her to the preview address.
//
// The preview address has no sign-in of its own after a hand-off, only the
// editor token, so the token counts as signed in there. When it runs out the
// owner is sent to the live address with #eotm-renew, where her session (up
// to 7 days) trades for a fresh token and hands her straight back; with no
// session there she is asked to sign in. Each address keeps its own sign-in,
// so carrying it over is the only way to keep it.
const HANDED = 'sss:handed'
const RENEWING = 'sss:renewing'
export async function restoreLogin() {
  if (isLive()) return restoreLive()
  // A token arriving in the address counts now: the loader (async) may not
  // have kept it yet, and sending her back to renew would cost a round trip.
  const arriving = location.hash.match(/(?:^#|&)eotm-token=([\w.-]+)/)
  if (arriving) try { localStorage.setItem(TOKEN_KEY, arriving[1]) } catch { /* private mode: the loader keeps it in this tab */ }
  if (hasEditor()) {
    try { localStorage.setItem(HANDED, '1'); sessionStorage.removeItem(RENEWING) } catch { /* private mode */ }
    return setLogin({ ...tokenLogin(), editor: true })
  }
  // Anywhere but the preview address (a dev server): its own session, as before.
  if (!isPreview()) {
    const who = hinted() ? await currentLogin() : null
    if (who) return setLogin({ ...who, editor: await claimEditor(who.jwt) })
  }
  // A customer's invoice link is open to anyone holding it (index.html).
  if (/^\/invoice\//.test(location.pathname)) return setLogin(null)
  // No editor token on the preview address (never handed one, run out, signed
  // out): it is reached only through the live sign-in, which hands one back.
  // Elsewhere (a dev server) only after a hand-off. Once a minute at most.
  let handed = false
  try {
    handed = (isPreview() || localStorage.getItem(HANDED) === '1') && Date.now() - Number(sessionStorage.getItem(RENEWING) ?? 0) > 60_000
    if (handed) { sessionStorage.setItem(RENEWING, String(Date.now())); localStorage.removeItem(HANDED) }
  } catch { /* private mode */ }
  if (handed) return toLive('eotm-renew')
  setLogin(null)
}
async function restoreLive() {
  // Signed out on the preview address: end the session here too.
  if (/(?:^#|&)eotm-signout/.test(location.hash)) {
    history.replaceState(history.state, '', location.pathname + location.search)
    return signOut()
  }
  const renew = /(?:^#|&)eotm-renew/.test(location.hash)
  if (renew) history.replaceState(history.state, '', location.pathname + location.search)
  if (!renew && !hinted()) return
  const who = await currentLogin()
  if (!who) {
    setLogin(null)
    if (renew) openAccount({ mode: 'in' })
    return
  }
  const editor = await edits(who.jwt)
  setLogin({ ...who, editor })
  if (renew && editor) await claimEditor(who.jwt)
}
// Who the editor token names (email and name), for the Welcome line on the preview address.
function tokenLogin() {
  try {
    const token = localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY)
    const p = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return { email: p.email ?? null, name: p.name ?? '', jwt: null }
  } catch {
    return { email: null, name: '', jwt: null }
  }
}
export const openEditorFromLogin = () => (login?.jwt ? claimEditor(login.jwt) : Promise.resolve(false))

// The loader shows its Edit site button while this browser holds an editor
// token; it rereads on a storage event, which another tab's write fires and
// this tab's does not, so this tab announces its own.
function tokenChanged() {
  try { window.dispatchEvent(new StorageEvent('storage', { key: TOKEN_KEY })) } catch { /* old browser: the loader rechecks within a minute */ }
}

// Asks the console whether this login edits the site. True when it does (and
// the editor token is now kept), false for a visitor.
export async function claimEditor(jwt) {
  if (!jwt) return false
  const res = await fetch(`${CONSOLE_API}/handoff`, { method: 'POST', headers: { authorization: `Bearer ${jwt}` } }).catch(() => null)
  await noteRefusal(res)
  if (!res?.ok) return false
  const { token } = await res.json()
  if (isLive()) {
    location.replace(`${EDIT_ORIGIN}${location.pathname}${location.search}#eotm-token=${token}`)
    return true
  }
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch {
    sessionStorage.setItem(TOKEN_KEY, token)
  }
  tokenChanged()
  return true
}

// An unexpired editor token for this site in this browser, as the loader reads it.
export function hasEditor() {
  try {
    const token = localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY)
    const p = token && JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return Boolean(p && p.site === SITE && p.exp * 1000 > Date.now())
  } catch {
    return false
  }
}

function forgetEditor() {
  try {
    localStorage.removeItem(HANDED)
    localStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(OWNER_KEY)
  } catch { /* private mode */ }
  window.EOTM?.close?.()
  tokenChanged()
}

// The password link: Neon Auth emails a link back to this site's
// /reset-password with ?token=. Better Auth renamed the endpoint; try the
// current name, then the older one (as the console's auth.js does).
export async function requestReset(email) {
  const body = { email, redirectTo: `${location.origin}/reset-password` }
  try {
    return await post('/request-password-reset', body)
  } catch {
    return post('/forget-password', body)
  }
}

export const resetPassword = (token, newPassword) => post('/reset-password', { token, newPassword })

// One account window serves every way in (the header's person icon, an admin
// page's Sign in, a finished password reset): they ask for it by this event,
// and AccountModal, mounted once in App, answers. mode: 'in' | 'up' | 'reset'.
export const ACCOUNT_EVENT = 'sss:account'
export function openAccount(detail = {}) {
  // Signed out on the preview address: sign in on the live one, which hands back.
  if (isPreview() && !hasEditor() && detail.mode !== 'reset') return toLive('eotm-renew')
  window.dispatchEvent(new CustomEvent(ACCOUNT_EVENT, { detail }))
}
