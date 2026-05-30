import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AuthGuard from './components/AuthGuard'
import Login from './pages/Login'
import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import AdminLayout from './components/AdminLayout'
import Dashboard from './pages/admin/Dashboard'
import Prenotazioni from './pages/admin/Prenotazioni'
import Spese from './pages/admin/Spese'
import Convenzioni from './pages/admin/Convenzioni'
import WhatsApp from './pages/admin/WhatsApp'
import GuestAccess from './pages/guest/GuestAccess'
import WelcomeBook from './pages/guest/WelcomeBook'

export default function App() {
  return (
    <Routes>
      {/* ADMIN */}
      <Route path="/" element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="prenotazioni" element={<Prenotazioni />} />
        <Route path="spese" element={<Spese />} />
        <Route path="convenzioni" element={<Convenzioni />} />
        <Route path="whatsapp" element={<WhatsApp />} />
      </Route>

      {/* GUEST */}
      <Route path="/ospite" element={<GuestAccess />} />
      <Route path="/ospite/:code" element={<WelcomeBook />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
