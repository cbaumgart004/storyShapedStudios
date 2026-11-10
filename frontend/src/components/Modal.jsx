/* eslint-disable react/prop-types */
// src/components/Modal.jsx
// A window over the page: a native <dialog>, so Escape, focus trapping and the
// backdrop come from the browser. It carries .sss-home and the current mode, so
// it takes the daylight or blacklight palette like every page.
import React, { useEffect, useRef } from 'react'
import { useUvMode } from '@/context/UvMode'
import '@/styles/Home.css'
import '@/styles/Account.css'

export default function Modal({ open, onClose, title, children }) {
  const ref = useRef(null)
  const { mode } = useUvMode()
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open && !el.open) el.showModal()
    if (!open && el.open) el.close()
  }, [open])
  return (
    <dialog
      ref={ref}
      className="sss-home sss-modal"
      data-mode={mode}
      aria-label={title}
      onClose={onClose}
      // A click on the backdrop lands on the dialog itself, not its contents.
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <button type="button" className="sss-modal__close" aria-label="Close" onClick={onClose}>
        ×
      </button>
      {title && <h2 className="sss-modal__title">{title}</h2>}
      {open && children}
    </dialog>
  )
}
