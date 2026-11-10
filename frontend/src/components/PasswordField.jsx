/* eslint-disable react/prop-types */
// src/components/PasswordField.jsx
// A password box with an eye button that shows what was typed, for phones
// especially.
import React, { useState } from 'react'

function Eye({ open }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
      {!open && <path d="M4 4l16 16" />}
    </svg>
  )
}

export default function PasswordField({ label, name, autoComplete, minLength = 8 }) {
  const [shown, setShown] = useState(false)
  return (
    <label className="account__field">
      <span>{label}</span>
      <span className="password-field">
        <input className="account__input" type={shown ? 'text' : 'password'} name={name} required minLength={minLength} autoComplete={autoComplete} />
        <button type="button" className="password-field__eye" aria-label={shown ? 'Hide password' : 'Show password'} aria-pressed={shown}
          onClick={() => setShown((s) => !s)}>
          <Eye open={shown} />
        </button>
      </span>
    </label>
  )
}
