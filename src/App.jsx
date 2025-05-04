// App.jsx

import React from 'react'
import { Outlet, Link } from 'react-router-dom'

export default function App() {
  return (
    <div>
      <nav style={{ padding: '1rem', background: '#f0f0f0' }}>
        <Link to="/" style={{ marginRight: '1rem' }}>
          Home
        </Link>
        <Link to="/about" style={{ marginRight: '1rem' }}>
          About
        </Link>
        <Link to="/shop">Shop</Link>
      </nav>

      <main style={{ padding: '2rem' }}>
        <Outlet />
      </main>
    </div>
  )
}
