import React, { useState } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'

const NAV = [
  { to: '/',             label: 'Dashboard',    icon: GridIcon,  exact: true },
  { to: '/prenotazioni', label: 'Prenotazioni', icon: CalIcon },
  { to: '/spese',        label: 'Spese',        icon: EuroIcon },
  { to: '/convenzioni',  label: 'Convenzioni',  icon: TagIcon },
  { to: '/whatsapp',     label: 'WhatsApp',     icon: MsgIcon },
]

export default function AdminLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const today = new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <>
      <style>{`
        .admin-wrap { display: flex; height: 100vh; overflow: hidden; }
        .sidebar { width: var(--sidebar); flex-shrink: 0; background: var(--lava-mid); border-right: 1px solid var(--gold-dim); display: flex; flex-direction: column; height: 100vh; overflow-y: auto; }
        .main-area { flex: 1; height: 100vh; overflow-y: auto; overflow-x: hidden; min-width: 0; }
        .topbar { position: sticky; top: 0; z-index: 100; background: rgba(17,16,9,0.96); backdrop-filter: blur(16px); border-bottom: 1px solid var(--gold-dim); display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.5rem; }
        .hamburger { display: none; background: none; border: 1px solid var(--gold-dim); color: var(--gold); width: 34px; height: 34px; cursor: pointer; font-size: 1rem; align-items: center; justify-content: center; flex-shrink: 0; }
        .topbar-date { font-size: 0.65rem; letter-spacing: 0.15em; text-transform: uppercase; color: var(--salt-faint); }
        .page-content { padding: 1.5rem; }
        .drawer { display: none; }

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
            <span className="topbar-date">{today}</span>
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
  return (
    <>
      <div style={{ padding: '1.8rem 1.5rem 1.2rem', borderBottom: '1px solid var(--gold-dim)' }}>
        <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.05rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--gold)' }}>Caellitta</div>
        <div style={{ fontSize: '0.55rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--salt-faint)', marginTop: '0.2rem' }}>Gestionale</div>
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
      <div style={{ padding: '1.2rem 1.4rem', borderTop: '1px solid var(--gold-dim)' }}>
        <div style={{ fontSize: '0.55rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--salt-faint)', marginBottom: '0.3rem' }}>Portale ospiti</div>
        <a href="/ospite" target="_blank" style={{ fontSize: '0.7rem', color: 'var(--gold)', textDecoration: 'none' }}>/ospite →</a>
      </div>
    </>
  )
}

function PageTitle() {
  const loc = useLocation()
  const titles = { '/': 'Dashboard', '/prenotazioni': 'Prenotazioni', '/spese': 'Spese', '/convenzioni': 'Convenzioni', '/whatsapp': 'WhatsApp' }
  const t = titles[loc.pathname] || 'Caellitta'
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
import { supabase } from '../lib/supabase'

const handleLogout = async () => {
  await supabase.auth.signOut()
}

// Nel JSX, in fondo alla sidebar:
<button onClick={handleLogout} style={{
  background: 'none',
  border: '1px solid rgba(201,171,114,0.2)',
  color: 'rgba(240,235,225,0.4)',
  padding: '0.5rem 1rem',
  fontSize: '0.62rem',
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
  cursor: 'pointer',
  fontFamily: "'Jost', sans-serif",
  width: '100%',
}}>
  Esci
</button>
