// src/App.jsx

import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
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
import { useConsoleNavigation, signInThroughConsole } from '@/lib/siteConsole'

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
          <Route path="/preview" element={<ToEditor />} />
          {/* Home is the console page "home"; the editor's preview of it lands here. */}
          <Route path="/home" element={<Navigate to="/" replace />} />
          {/* Pages written in the console; the named routes above win. */}
          <Route path="/:slug" element={<Page />} />
        </Routes>
      </Router>
    </UvModeProvider>
  )
}

export default App

// /preview: the one address the owner needs to remember. It hands over to the
// console's sign-in and comes back to the home page with the editor open.
function ToEditor() {
  React.useEffect(() => { signInThroughConsole('/') }, [])
  return <p style={{ padding: '2rem', textAlign: 'center' }}>Opening the editor…</p>
}
