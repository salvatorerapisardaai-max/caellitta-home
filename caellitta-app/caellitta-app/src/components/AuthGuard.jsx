import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function AuthGuard({ children }) {
  const [session, setSession] = useState(undefined) // undefined = loading

  useEffect(() => {
    // Leggi sessione corrente
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    // Ascolta cambiamenti (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Loading
  if (session === undefined) {
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

  // Non autenticato → redirect login
  if (!session) return <Navigate to="/login" replace />

  // Autenticato → mostra contenuto
  return children
}
