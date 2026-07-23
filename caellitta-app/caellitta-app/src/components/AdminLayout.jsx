import React, { useState, useEffect } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { sb } from '../lib/supabase'
import { useActiveProperty } from '../lib/PropertyContext'
import Modal from './Modal'

const NAV = [
  { to: '/',              label: 'Dashboard',      icon: GridIcon,  exact: true },
  { to: '/prenotazioni',  label: 'Prenotazioni',   icon: CalIcon },
  { to: '/pulizie',       label: 'Pulizie',        icon: BroomIcon },
  { to: '/checkin',       label: 'Check-in/out',   icon: KeyIcon },
  { to: '/spese',         label: 'Spese',          icon: EuroIcon },
  { to: '/convenzioni',   label: 'Convenzioni',    icon: TagIcon },
  { to: '/whatsapp',      label: 'WhatsApp',       icon: MsgIcon },
  { to: '/portale-ospiti',label: 'Portale ospiti', icon: ImageIcon },
  { to: '/team',          label: 'Team',           icon: TeamIcon },
  { to: '/adempimenti',   label: 'Adempimenti',    icon: ShieldIcon },
]

const TITLES = {
  '/': 'Dashboard', '/prenotazioni': 'Prenotazioni', '/pulizie': 'Pulizie', '/checkin': 'Check-in Check-out',
  '/spese': 'Spese', '/convenzioni': 'Convenzioni', '/whatsapp': 'WhatsApp', '/portale-ospiti': 'Portale ospiti',
  '/team': 'Team', '/adempimenti': 'Adempimenti',
}

export default function AdminLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [theme, setTheme] = useState(() => localStorage.getItem('ospita_theme') || 'light')
  const today = new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('ospita_theme', theme)
  }, [theme])

  return (
    <>
      <style>{`
        .admin-wrap { display: flex; height: 100vh; overflow: hidden; }
        .sidebar { width: var(--sidebar); flex-shrink: 0; background: var(--lava-mid); border-right: 1px solid var(--gold-dim); display: flex; flex-direction: column; height: 100vh; overflow-y: auto; }
        .main-area { flex: 1; height: 100vh; overflow-y: auto; overflow-x: hidden; min-width: 0; }
        .topbar { position: sticky; top: 0; z-index: 100; background: rgba(250,245,234,0.92); backdrop-filter: blur(16px); border-bottom: 1px solid var(--gold-dim2); display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.5rem; }
        .hamburger { display: none; background: none; border: 1px solid var(--gold-dim); color: var(--gold); width: 34px; height: 34px; cursor: pointer; font-size: 1rem; align-items: center; justify-content: center; flex-shrink: 0; }
        .topbar-date { font-size: 0.65rem; letter-spacing: 0.15em; text-transform: uppercase; color: var(--salt-faint); }
        .page-content { padding: 1.5rem; }
        .drawer { display: none; }

        /* Icone "configurabili": segnalano visivamente che una sezione/campo può essere personalizzato.
           Usato in WhatsApp, Pulizie, Check-in e ovunque serva far notare una configurazione disponibile. */
        @keyframes wiggle { 0%,100% { transform: rotate(0deg); } 25% { transform: rotate(-10deg); } 75% { transform: rotate(10deg); } }
        .icon-configurable { display: inline-block; transition: transform .15s; cursor: help; }
        .icon-configurable:hover { animation: wiggle .4s ease-in-out; }

        @media (max-width: 768px) {
          .sidebar { display: none; }
          .hamburger { display: flex; }
          .topbar-date { display: none; }
          .page-content { padding: 1rem; }
          .drawer {
            display: block;
            position: fixed; top: 57px; left: 0; right: 0; bottom: 0;
            background: var(--lava-mid); z-index: 200;
            border-top: 1px solid var(--gold-dim);
            overflow-y: auto;
            transform: translateX(-100%);
            transition: transform 0.28s ease;
          }
          .drawer.open { transform: translateX(0); }
        }
      `}</style>

      <div className="admin-wrap">
        {/* SIDEBAR DESKTOP */}
        <aside className="sidebar">
          <SidebarContent />
        </aside>

        {/* MAIN */}
        <main className="main-area">
          {/* TOPBAR */}
          <div className="topbar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
              <button className="hamburger" onClick={() => setDrawerOpen(p => !p)}>
                {drawerOpen ? '✕' : '☰'}
              </button>
              <PageTitle />
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span className="topbar-date">{today}</span>
              <button
                onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
                title={theme === 'light' ? 'Passa al tema scuro' : 'Passa al tema chiaro'}
                style={{
                  background: 'none', border: '1px solid var(--gold-dim2)', color: 'var(--gold)',
                  width: 30, height: 30, borderRadius: 4, cursor: 'pointer', fontSize: '0.9rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: '0.8rem',
                }}
              >
                {theme === 'light' ? '🌙' : '☀️'}
              </button>
            </div>
          </div>

          {/* MOBILE DRAWER */}
          <div className={`drawer${drawerOpen ? ' open' : ''}`}>
            <SidebarContent onNav={() => setDrawerOpen(false)} />
          </div>

          {/* CONTENT */}
          <div className="page-content fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </>
  )
}

function SidebarContent({ onNav }) {
  const { properties, activePropertyId, setActivePropertyId, loading, createProperty } = useActiveProperty()
  const [newPropModal, setNewPropModal] = useState(false)
  const [newProp, setNewProp] = useState({ name: '', address: '', cin: '', cir: '' })
  const [newPropError, setNewPropError] = useState('')
  const [creatingProp, setCreatingProp] = useState(false)

  async function submitNewProperty() {
    if (!newProp.name.trim()) { setNewPropError('Il nome della struttura è obbligatorio.'); return }
    setCreatingProp(true)
    setNewPropError('')
    const { error } = await createProperty(newProp)
    setCreatingProp(false)
    if (error) { setNewPropError(error.message); return }
    setNewProp({ name: '', address: '', cin: '', cir: '' })
    setNewPropModal(false)
  }

  const handleLogout = async () => {
    await sb.auth.signOut()
  }

  return (
    <>
      <div style={{ padding: '1.8rem 1.5rem 1.2rem', borderBottom: '1px solid var(--gold-dim)' }}>
        <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.05rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--gold)' }}>Ospita</div>
        <div style={{ fontSize: '0.55rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--salt-faint)', marginTop: '0.2rem' }}>Gestionale</div>
      </div>

      {/* SELETTORE STRUTTURA — visibile sempre; se ce n'è una sola, mostra solo il nome */}
      <div style={{ padding: '1rem 1.4rem', borderBottom: '1px solid var(--gold-dim)' }}>
        <div style={{ fontSize: '0.55rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--salt-faint)', marginBottom: '0.4rem' }}>Struttura attiva</div>
        {loading ? (
          <div style={{ fontSize: '0.8rem', color: 'var(--salt-faint)' }}>Caricamento…</div>
        ) : properties.length <= 1 ? (
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1rem', color: 'var(--gold)' }}>
            {properties[0]?.name || '—'}
          </div>
        ) : (
          <select
            className="form-select"
            style={{ width: '100%', fontSize: '0.85rem' }}
            value={activePropertyId || ''}
            onChange={e => setActivePropertyId(e.target.value)}
          >
            {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )}
        {!loading && properties.length < 5 && (
          <button className="btn-sm" style={{ marginTop: '0.6rem', width: '100%' }} onClick={() => setNewPropModal(true)}>
            + Nuova struttura ({properties.length}/5)
          </button>
        )}
        {!loading && properties.length >= 5 && (
          <p style={{ fontSize: '0.62rem', color: 'var(--salt-faint)', marginTop: '0.6rem' }}>Limite di 5 strutture raggiunto</p>
        )}

        <Modal open={newPropModal} onClose={() => setNewPropModal(false)} title="Nuova struttura">
          {newPropError && (
            <div style={{ background: 'rgba(168,69,63,.12)', border: '1px solid rgba(168,69,63,.4)', padding: '0.7rem 1rem', marginBottom: '1rem', fontSize: '0.78rem', color: 'var(--red)' }}>
              {newPropError}
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Nome struttura *</label>
            <input className="form-input" value={newProp.name} onChange={e => setNewProp(p => ({ ...p, name: e.target.value }))} placeholder="Es. Villa Panorama" />
          </div>
          <div className="form-group">
            <label className="form-label">Indirizzo</label>
            <input className="form-input" value={newProp.address} onChange={e => setNewProp(p => ({ ...p, address: e.target.value }))} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">CIN</label>
              <input className="form-input" value={newProp.cin} onChange={e => setNewProp(p => ({ ...p, cin: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">CIR</label>
              <input className="form-input" value={newProp.cir} onChange={e => setNewProp(p => ({ ...p, cir: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.8rem', marginTop: '1rem' }}>
            <button className="btn-primary" style={{ flex: 1 }} onClick={submitNewProperty} disabled={creatingProp}>
              {creatingProp ? 'Creazione…' : 'Crea struttura'}
            </button>
            <button className="btn-cancel" onClick={() => setNewPropModal(false)}>Annulla</button>
          </div>
        </Modal>
      </div>

      <nav style={{ flex: 1, padding: '1.2rem 0' }}>
        <div style={{ fontSize: '0.52rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--salt-faint)', padding: '0 1.4rem', marginBottom: '0.5rem' }}>Menu</div>
        {NAV.map(item => (
          <NavLink key={item.to} to={item.to} end={item.exact} onClick={onNav}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: '0.8rem',
              padding: '0.85rem 1.4rem', cursor: 'pointer', transition: 'all 0.22s',
              borderLeft: isActive ? '2px solid var(--gold)' : '2px solid transparent',
              background: isActive ? 'rgba(201,171,114,0.08)' : 'transparent',
              color: isActive ? 'var(--gold)' : 'var(--salt-dim)',
              fontSize: '0.85rem', fontWeight: 300, textDecoration: 'none',
            })}>
            <item.icon />{item.label}
          </NavLink>
        ))}
      </nav>

      {/* PORTALE OSPITI */}
      <div style={{ padding: '1.2rem 1.4rem', borderTop: '1px solid var(--gold-dim)' }}>
        <div style={{ fontSize: '0.55rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--salt-faint)', marginBottom: '0.3rem' }}>Portale ospiti</div>
        <a href="/ospite" target="_blank" style={{ fontSize: '0.7rem', color: 'var(--gold)', textDecoration: 'none' }}>/ospite →</a>
      </div>

      {/* AREA COLLABORATORI */}
      <div style={{ padding: '1.2rem 1.4rem', borderTop: '1px solid var(--gold-dim)' }}>
        <div style={{ fontSize: '0.55rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--salt-faint)', marginBottom: '0.3rem' }}>Collaboratori</div>
        <a href="/collaboratori" target="_blank" style={{ fontSize: '0.7rem', color: 'var(--gold)', textDecoration: 'none' }}>/collaboratori →</a>
      </div>

      {/* LOGOUT */}
      <div style={{ padding: '1rem 1.4rem', borderTop: '1px solid var(--gold-dim)' }}>
        <button
          onClick={handleLogout}
          style={{
            width: '100%', padding: '0.55rem 1rem',
            background: 'none', border: '1px solid rgba(201,171,114,0.2)',
            color: 'rgba(240,235,225,0.4)', fontSize: '0.62rem',
            letterSpacing: '0.2em', textTransform: 'uppercase',
            cursor: 'pointer', fontFamily: "'Jost', sans-serif",
            transition: 'border-color 0.3s, color 0.3s',
          }}
          onMouseOver={e => { e.currentTarget.style.borderColor = 'rgba(201,171,114,0.5)'; e.currentTarget.style.color = 'var(--gold)' }}
          onMouseOut={e => { e.currentTarget.style.borderColor = 'rgba(201,171,114,0.2)'; e.currentTarget.style.color = 'rgba(240,235,225,0.4)' }}
        >
          Esci
        </button>
      </div>
    </>
  )
}

function PageTitle() {
  const loc = useLocation()
  const t = TITLES[loc.pathname] || 'Ospita'
  const [first, ...rest] = t.split(' ')
  return (
    <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.15rem', fontWeight: 300 }}>
      {first}{rest.length > 0 && <> <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>{rest.join(' ')}</em></>}
    </span>
  )
}

function GridIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg> }
function CalIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> }
function EuroIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="9"/><path d="M14.5 8.5a4 4 0 1 0 0 7"/><line x1="8" y1="12" x2="15" y2="12"/><line x1="8" y1="14.5" x2="13" y2="14.5"/></svg> }
function TagIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><circle cx="7" cy="7" r="1.5"/></svg> }
function MsgIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> }
function TeamIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> }
function BroomIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 21l4-4"/><path d="M13.5 6.5L21 14l-3 3-7.5-7.5"/><path d="M6 15l4.5-4.5c1-1 1-2.5 0-3.5l-1-1c-1-1-2.5-1-3.5 0L2 10.5"/></svg> }
function KeyIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="7.5" cy="15.5" r="4.5"/><path d="M10.5 12.5L20 3"/><path d="M17 6l3 3"/><path d="M14 9l3 3"/></svg> }
function ImageIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg> }
function ShieldIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z"/><path d="M9 12l2 2 4-4"/></svg> }
