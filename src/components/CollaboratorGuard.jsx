import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { sb } from '../lib/supabase'

export default function CollaboratorGuard({ children }) {
  const [session, setSession] = useState(undefined)   // undefined = loading
  const [authorized, setAuthorized] = useState(undefined) // undefined = checking

  useEffect(() => {
    sb.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const { data: { subscription } } = sb.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session === undefined) return
    if (!session) {
      setAuthorized(false)
      return
    }
    sb.rpc('is_active_collaborator').then(({ data, error }) => {
      setAuthorized(!error && data === true)
    })
  }, [session])

  // Caricamento sessione o verifica whitelist
  if (session === undefined || (session && authorized === undefined)) {
    return <LoadingScreen />
  }

  // Non loggato → torna al login collaboratori
  if (!session) return <Navigate to="/collaboratori" replace />

  // Loggato ma email non in whitelist
  if (!authorized) return <NotAuthorized />

  return children
}

function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100vh', background: 'var(--lava)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        fontFamily: "'Cormorant Garamond', serif",
        fontSize: '1.2rem', fontWeight: 300,
        letterSpacing: '0.3em', color: 'rgba(201,171,114,0.4)',
      }}>
        Caellitta…
      </div>
    </div>
  )
}

function NotAuthorized() {
  async function logout() {
    await sb.auth.signOut()
    window.location.href = '/collaboratori'
  }
  return (
    <div style={{
      minHeight: '100vh', background: 'var(--lava)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '2rem', textAlign: 'center',
    }}>
      <div style={{
        fontFamily: "'Cormorant Garamond', serif", fontSize: '1.4rem', fontWeight: 300,
        color: 'var(--gold)', marginBottom: '1rem', letterSpacing: '0.05em',
      }}>
        Accesso non autorizzato
      </div>
      <p style={{ fontSize: '0.85rem', color: 'var(--salt-faint)', maxWidth: 380, lineHeight: 1.8, marginBottom: '2rem' }}>
        Questa email non è abilitata al portale collaboratori. Contatta Salvatore per richiedere l'accesso.
      </p>
      <button onClick={logout} className="btn-primary" style={{ padding: '0.7rem 1.6rem', fontSize: '0.72rem' }}>
        Torna al login
      </button>
    </div>
  )
}
