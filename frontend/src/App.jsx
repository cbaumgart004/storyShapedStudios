// src/App.jsx

import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { UvModeProvider } from '@/context/UvMode'
import ScrollToTop from '@/components/ScrollToTop'
import Home from '@/pages/Home'
import MeetTheArtist from '@/pages/MeetTheArtist'
import Shop from '@/pages/Shop'
import Library from '@/pages/Library'
import Glossary from '@/pages/Glossary'

function App() {
  return (
    <UvModeProvider>
      <Router>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/meet-the-artist" element={<MeetTheArtist />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/library" element={<Library />} />
          <Route path="/glossary" element={<Glossary />} />
        </Routes>
      </Router>
    </UvModeProvider>
  )
}

export default App
