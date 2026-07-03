import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { sb } from '../lib/supabase'
import { getStoredCode, clearStoredCode } from '../lib/collaboratorAuth'

export default function CollaboratorGuard({ children }) {
  const [authorized, setAuthorized] = useState(undefined) // undefined = checking

  useEffect(() => {
    const code = getStoredCode()
    if (!code) { setAuthorized(false); return }
    sb.rpc('validate_collaborator_code', { p_code: code }).then(({ data, error }) => {
      if (error || !data?.[0]) {
        clearStoredCode()
        setAuthorized(false)
      } else {
        setAuthorized(true)
      }
    })
  }, [])

  if (authorized === undefined) return <LoadingScreen />
  if (!authorized) return <Navigate to="/collaboratori" replace />

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
