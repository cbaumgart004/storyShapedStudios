// src/App.jsx

import React from 'react'
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import Home from '@/pages/Home'
import About from '@/pages/About'
import Shop from '@/pages/Shop'

console.log('🌿 App loaded')

const NavBar = () => (
  <nav style={{ padding: '1rem', background: '#eee', marginBottom: '2rem' }}>
    <Link to="/" style={{ marginRight: '1rem' }}>
      Home
    </Link>
    <Link to="/about" style={{ marginRight: '1rem' }}>
      About
    </Link>
    <Link to="/shop" style={{ marginRight: '1rem' }}>
      Shop
    </Link>
    <Link to="/test">Test</Link>
  </nav>
)

const Test = () => {
  console.log('🔍 Test component loaded')
  return <div>Hello from Test</div>
}

function App() {
  return (
    <Router>
      <NavBar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/test" element={<Test />} />
      </Routes>
    </Router>
  )
}

export default App
