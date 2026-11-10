// src/App.jsx

import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { UvModeProvider } from '@/context/UvMode'
import ScrollToTop from '@/components/ScrollToTop'
import Home from '@/pages/Home'
import MeetTheArtist from '@/pages/MeetTheArtist'
import Library from '@/pages/Library'
import Glossary from '@/pages/Glossary'
import AdminInventory from '@/pages/Admin/Inventory'
import EtsyReview from '@/pages/Admin/EtsyReview'
import AdminForms, { SharedInvoice } from '@/pages/Admin/Forms'
import Page from '@/pages/Page'
import SitePage from '@/components/SitePage'
import SiteTheme from '@/components/SiteTheme'
import ClassStyles from '@/components/ClassStyles'
import AccountModal from '@/components/AccountModal'
import SignedIn from '@/components/SignedIn'
import ResetPassword from '@/pages/ResetPassword'
import { useConsoleNavigation } from '@/lib/siteConsole'
import { openAccount } from '@/lib/account'

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
        <ClassStyles />
        <AccountModal />
        <SignedIn />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/meet-the-artist" element={<MeetTheArtist />} />
          <Route path="/shop" element={<SitePage slug="shop" />} />
          <Route path="/library" element={<Library />} />
          <Route path="/library/:slug" element={<Library />} />
          <Route path="/glossary" element={<Glossary />} />
          <Route path="/admin/inventory" element={<AdminInventory />} />
          <Route path="/admin/etsy" element={<EtsyReview />} />
          <Route path="/admin/forms" element={<AdminForms />} />
          <Route path="/admin/emails" element={<AdminForms page="emails" />} />
          <Route path="/admin/forms/:folder" element={<AdminForms />} />
          <Route path="/admin/forms/:folder/:id" element={<AdminForms />} />
          <Route path="/invoice/:token" element={<SharedInvoice />} />
          <Route path="/preview" element={<ToSignIn />} />
          <Route path="/reset-password" element={<ResetPassword />} />
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

// /preview: the one address the owner needs to remember. It opens the site's
// sign-in on the home page; an owner's sign-in hands her to the preview address.
function ToSignIn() {
  const navigate = useNavigate()
  React.useEffect(() => {
    navigate('/', { replace: true })
    openAccount()
  }, [])
  return null
}
