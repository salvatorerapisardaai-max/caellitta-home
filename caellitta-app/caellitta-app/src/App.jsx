import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import AuthGuard from './components/AuthGuard'
import CollaboratorGuard from './components/CollaboratorGuard'
import { PropertyProvider } from './lib/PropertyContext'
import Login from './pages/admin/Login'
import AdminLayout from './components/AdminLayout'
import Dashboard from './pages/admin/Dashboard'
import Prenotazioni from './pages/admin/Prenotazioni'
import Pulizie from './pages/admin/Pulizie'
import CheckIn from './pages/admin/CheckIn'
import Spese from './pages/admin/Spese'
import Convenzioni from './pages/admin/Convenzioni'
import WhatsApp from './pages/admin/WhatsApp'
import PortaleOspiti from './pages/admin/PortaleOspiti'
import Team from './pages/admin/Team'
import Adempimenti from './pages/admin/Adempimenti'
import GuestAccess from './pages/guest/GuestAccess'
import WelcomeBook from './pages/guest/WelcomeBook'
import CollaboratoriLogin from './pages/collaboratori/CollaboratoriLogin'
import CollaboratoriDashboard from './pages/collaboratori/CollaboratoriDashboard'

export default function App() {
  return (
    <Routes>
      {/* LOGIN — pubblica */}
      <Route path="/login" element={<Login />} />

      {/* ADMIN — protetta da AuthGuard */}
      <Route path="/" element={
        <AuthGuard>
          <PropertyProvider>
            <AdminLayout />
          </PropertyProvider>
        </AuthGuard>
      }>
        <Route index element={<Dashboard />} />
        <Route path="prenotazioni" element={<Prenotazioni />} />
        <Route path="pulizie" element={<Pulizie />} />
        <Route path="checkin" element={<CheckIn />} />
        <Route path="spese" element={<Spese />} />
        <Route path="convenzioni" element={<Convenzioni />} />
        <Route path="whatsapp" element={<WhatsApp />} />
        <Route path="portale-ospiti" element={<PortaleOspiti />} />
        <Route path="team" element={<Team />} />
        <Route path="adempimenti" element={<Adempimenti />} />
      </Route>

      {/* GUEST — pubblica */}
      <Route path="/ospite" element={<GuestAccess />} />
      <Route path="/ospite/:code" element={<WelcomeBook />} />

      {/* COLLABORATORI — login pubblico, dashboard protetta da whitelist */}
      <Route path="/collaboratori" element={<CollaboratoriLogin />} />
      <Route path="/collaboratori/dashboard" element={
        <CollaboratorGuard>
          <CollaboratoriDashboard />
        </CollaboratorGuard>
      } />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
