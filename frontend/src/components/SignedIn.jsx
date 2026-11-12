/* eslint-disable react/prop-types */
// src/components/SignedIn.jsx
// The signed-in login for any component (useLogin), the header's Welcome line
// (Welcome, in SiteHeader.jsx), and the sign-in restore on load.
import React, { useEffect, useState } from 'react'
import { LOGIN_EVENT, firstName, getLogin, restoreLogin } from '@/lib/account'
import '@/styles/Account.css'

export function useLogin() {
  const [who, setWho] = useState(getLogin)
  useEffect(() => {
    const on = (e) => setWho(e.detail)
    window.addEventListener(LOGIN_EVENT, on)
    return () => window.removeEventListener(LOGIN_EVENT, on)
  }, [])
  return who
}

// Restores a kept sign-in on load. The way into the editor is the header's
// Manage icon (SiteHeader.jsx), on every address.
export default function SignedIn() {
  useEffect(() => { restoreLogin() }, [])
  return null
}

export function Welcome({ className = '' }) {
  const who = useLogin()
  const first = who ? firstName(who) : ''
  // No one signed in, or no name to greet: nothing, not a bare "Welcome".
  if (!first) return null
  return <p className={`sss-welcome ${className}`} aria-live="polite">{`Welcome, ${first}`}</p>
}
