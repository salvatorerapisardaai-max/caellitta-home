import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import AuthGuard from './components/AuthGuard'
import Login from './pages/admin/Login'
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

      {/* LOGIN — pubblica */}
      <Route path="/login" element={<Login />} />

      {/* ADMIN — protetta da AuthGuard */}
      <Route path="/" element={
        <AuthGuard>
          <AdminLayout />
        </AuthGuard>
      }>
        <Route index element={<Dashboard />} />
        <Route path="prenotazioni" element={<Prenotazioni />} />
        <Route path="spese" element={<Spese />} />
        <Route path="convenzioni" element={<Convenzioni />} />
        <Route path="whatsapp" element={<WhatsApp />} />
      </Route>

      {/* GUEST — pubblica */}
      <Route path="/ospite" element={<GuestAccess />} />
      <Route path="/ospite/:code" element={<WelcomeBook />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />

    </Routes>
  )
}
