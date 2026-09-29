// src/App.jsx

import React from 'react'
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom'
import { UvModeProvider } from '@/context/UvMode'
import ScrollToTop from '@/components/ScrollToTop'
import Home from '@/pages/Home'
import MeetTheArtist from '@/pages/MeetTheArtist'
import Shop from '@/pages/Shop'
import Library from '@/pages/Library'
import Glossary from '@/pages/Glossary'
import AdminInventory from '@/pages/Admin/Inventory'
import Page from '@/pages/Page'
import SiteTheme from '@/components/SiteTheme'
import { useConsoleNavigation } from '@/lib/siteConsole'

// Lets the Edge of the Map console open a document's page through the router.
function ConsoleNavigation() {
  useConsoleNavigation(useNavigate())
  return null
}

function App() {
  return (
    <UvModeProvider>
      <Router>
        <ScrollToTop />
        <ConsoleNavigation />
        <SiteTheme />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/meet-the-artist" element={<MeetTheArtist />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/library" element={<Library />} />
          <Route path="/library/:slug" element={<Library />} />
          <Route path="/glossary" element={<Glossary />} />
          <Route path="/admin/inventory" element={<AdminInventory />} />
          {/* Pages written in the console; the named routes above win. */}
          <Route path="/:slug" element={<Page />} />
        </Routes>
      </Router>
    </UvModeProvider>
  )
}

export default App
