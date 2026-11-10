// src/pages/ResetPassword.jsx
// Where the password email lands (/reset-password?token=…): choose a new
// password, then the sign-in window opens. Neon Auth issued the token, and it
// checks it on the way back.
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUvMode } from '@/context/UvMode'
import SiteHeader from '@/components/SiteHeader'
import SiteFooter from '@/components/SiteFooter'
import PasswordField from '@/components/PasswordField'
import { openAccount, resetPassword } from '@/lib/account'
import '@/styles/Home.css'
import '@/styles/Account.css'

export default function ResetPassword() {
  const { mode } = useUvMode()
  const token = new URLSearchParams(location.search).get('token')
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    if (f.get('password') !== f.get('confirm')) {
      setError('The two passwords do not match.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await resetPassword(token, f.get('password'))
      navigate('/', { replace: true })
      openAccount({ mode: 'in', notice: 'Your password is changed. Sign in with the new one.' })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="sss-home" data-mode={mode}>
      <SiteHeader />
      <main className="reset-password">
        <h1 className="sss-modal__title">Choose a new password</h1>
        {token ? (
          <form className="account__form" onSubmit={submit}>
            <PasswordField label="New password (8 or more characters)" name="password" autoComplete="new-password" />
            <PasswordField label="Confirm new password" name="confirm" autoComplete="new-password" />
            {error && <p className="account__error" role="alert">{error}</p>}
            <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'One moment…' : 'Save password'}</button>
          </form>
        ) : (
          <p>This link is missing its code. Ask for a new one from the sign-in window.</p>
        )}
      </main>
      <SiteFooter />
    </div>
  )
}
