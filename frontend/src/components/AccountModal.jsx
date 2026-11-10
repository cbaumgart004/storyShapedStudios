/* eslint-disable react/prop-types */
// src/components/AccountModal.jsx
// The one account window (mounted in App): sign in, create an account, or ask
// for a password link; signed in, who you are and Sign out. An owner who signs
// in sees the site as a visitor does plus the loader's Edit site button, the one
// way into the editor. Anything can open it with openAccount() from
// src/lib/account.js: the header's person icon, an admin page, a reset link.
import React, { useEffect, useState } from 'react'
import Modal from './Modal'
import PasswordField from './PasswordField'
import {
  ACCOUNT_EVENT, claimEditor, currentLogin, editorRefusal, getLogin, hasEditor, isLive, isPreview, requestReset, setLogin as announce, signIn, signOut, signUp,
} from '@/lib/account'

const TITLES = { in: 'Welcome back', up: 'Create an account', reset: 'Can’t log in?' }

function Tabs({ mode, setMode }) {
  return (
    <div className="account__tabs" role="tablist">
      <button type="button" role="tab" aria-selected={mode === 'in'} className={mode === 'in' ? 'is-on' : ''} onClick={() => setMode('in')}>
        Sign in
      </button>
      <button type="button" role="tab" aria-selected={mode === 'up'} className={mode === 'up' ? 'is-on' : ''} onClick={() => setMode('up')}>
        Create account
      </button>
    </div>
  )
}

function AccountForm({ mode, setMode, email, notice, onSignedIn }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState('')

  async function submit(e) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    setError('')
    if (mode === 'up' && f.get('password') !== f.get('confirm')) {
      setError('The two passwords do not match.')
      return
    }
    setBusy(true)
    try {
      if (mode === 'reset') {
        await requestReset(f.get('email'))
        setSent(f.get('email'))
        return
      }
      const keep = f.get('keep') === 'on'
      if (mode === 'in') await signIn(f.get('email'), f.get('password'), keep)
      else await signUp(`${String(f.get('first')).trim()} ${String(f.get('last')).trim()}`, f.get('email'), f.get('password'), keep)
      await onSignedIn()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (mode === 'reset' && sent) {
    return (
      <div className="account__form">
        <p className="sss-modal__intro">If there is an account for <strong>{sent}</strong>, a link to choose a new password is on its way. Check your inbox.</p>
        <button type="button" className="link-button" onClick={() => { setSent(''); setMode('in') }}>Back to sign in</button>
      </div>
    )
  }

  return (
    // key: a new mode starts a fresh form, so a typed password does not carry over.
    <form key={mode} className="account__form" onSubmit={submit}>
      {mode === 'reset' ? (
        <p className="sss-modal__intro">Enter your email and we will send a link to choose a new password.</p>
      ) : (
        <Tabs mode={mode} setMode={setMode} />
      )}
      {notice && <p className="sss-modal__intro">{notice}</p>}
      {mode === 'up' && (
        <div className="account__names">
          <label className="account__field">
            <span>First name</span>
            <input className="account__input" name="first" required autoComplete="given-name" />
          </label>
          <label className="account__field">
            <span>Last name</span>
            <input className="account__input" name="last" required autoComplete="family-name" />
          </label>
        </div>
      )}
      <label className="account__field">
        <span>Email</span>
        <input className="account__input" type="email" name="email" required autoComplete="username" defaultValue={email} />
      </label>
      {mode === 'in' && <PasswordField label="Password" name="password" autoComplete="current-password" />}
      {mode === 'up' && (
        <>
          <PasswordField label="Password (8 or more characters)" name="password" autoComplete="new-password" />
          <PasswordField label="Confirm password" name="confirm" autoComplete="new-password" />
        </>
      )}
      {mode !== 'reset' && (
        <label className="account__keep">
          <input type="checkbox" name="keep" defaultChecked />
          <span>Keep me signed in for 7 days</span>
        </label>
      )}
      {error && <p className="account__error" role="alert">{error}</p>}
      <button className="btn btn-primary" type="submit" disabled={busy}>
        {busy ? 'One moment…' : mode === 'in' ? 'Sign in' : mode === 'up' ? 'Create account' : 'Send the link'}
      </button>
      {mode === 'in' && <button type="button" className="link-button" onClick={() => setMode('reset')}>Can’t log in?</button>}
      {mode === 'reset' && <button type="button" className="link-button" onClick={() => setMode('in')}>Back to sign in</button>}
    </form>
  )
}

export default function AccountModal() {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState('in')
  const [email, setEmail] = useState('')
  const [notice, setNotice] = useState('')
  // undefined while checking, null when signed out.
  const [login, setLogin] = useState(undefined)

  // A login that edits this site trades for an editor token once; the
  // console answers a visitor's with 403 and nothing changes. On the live
  // address that trade moves to the preview address (account.js), so it runs
  // only on a sign-in or the Edit site button there, not on opening this window.
  async function refresh({ claim = !isLive() && !isPreview() } = {}) {
    // On the preview address the editor token is the sign-in (account.js,
    // restoreLogin): it comes only from the live address's session.
    let who = isPreview() ? (hasEditor() ? getLogin() : null) : await currentLogin()
    if (!who && !isLive() && hasEditor()) who = getLogin()
    setLogin(who)
    let editor = hasEditor()
    if (who && claim && !editor) editor = await claimEditor(who.jwt)
    if (who) announce({ ...who, editor })
    return editorRefusal()
  }
  const [editing, setEditing] = useState('')

  useEffect(() => {
    const onAsk = (e) => {
      setMode(e.detail?.mode || 'in')
      setEmail(e.detail?.email || '')
      setNotice(e.detail?.notice || '')
      setEditing('')
      setLogin(undefined)
      setOpen(true)
      refresh()
    }
    window.addEventListener(ACCOUNT_EVENT, onAsk)
    return () => window.removeEventListener(ACCOUNT_EVENT, onAsk)
  }, [])

  // An owner the console turned away stays in the window and is told why.
  async function afterSignIn() {
    const why = await refresh({ claim: true })
    if (why) setEditing(why)
    else setOpen(false)
  }

  return (
    <Modal open={open} onClose={() => setOpen(false)} title={login ? 'Your account' : TITLES[mode]}>
      {login === undefined && <p className="sss-modal__intro">One moment…</p>}
      {login === null && <AccountForm mode={mode} setMode={setMode} email={email} notice={notice} onSignedIn={afterSignIn} />}
      {login && (
        <div className="account__form">
          <p className="sss-modal__intro">
            Signed in as <strong>{login.email}</strong>
          </p>
          {editing && <p className="sss-modal__intro">{editing}</p>}
          <div className="sss-modal__links">
            {isLive() && (
              <button type="button" className="btn btn-primary" onClick={async () => {
                setEditing('')
                if (!(await claimEditor(login.jwt))) setEditing(editorRefusal() || 'This account does not edit the site.')
              }}>
                Edit site
              </button>
            )}
            <button type="button" className="btn" onClick={async () => { await signOut(); setLogin(null); setMode('in') }}>
              Sign out
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
