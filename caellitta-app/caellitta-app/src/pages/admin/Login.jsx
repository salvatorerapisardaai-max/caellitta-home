import { useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError('Credenziali non valide. Riprova.')
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--lava)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Jost', sans-serif",
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Grain overlay */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
        opacity: 0.03,
      }} />

      {/* Radial glow */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 600, height: 600,
        background: 'radial-gradient(circle, rgba(201,171,114,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{
        position: 'relative', zIndex: 1,
        width: '100%', maxWidth: 420,
        padding: '0 1.5rem',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <div style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: '1.8rem', fontWeight: 300,
            letterSpacing: '0.3em', textTransform: 'uppercase',
            color: 'var(--gold)', marginBottom: '0.4rem',
          }}>
            Caellitta Home
          </div>
          <div style={{
            fontSize: '0.62rem', letterSpacing: '0.3em',
            textTransform: 'uppercase', color: 'rgba(240,235,225,0.3)',
          }}>
            Gestionale · Area Riservata
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--lava-card)',
          border: '1px solid rgba(201,171,114,0.12)',
          padding: '2.5rem',
        }}>
          <div style={{
            width: 32, height: 1,
            background: 'var(--gold)', opacity: 0.5,
            marginBottom: '2rem',
          }} />

          <form onSubmit={handleLogin}>
            {/* Email */}
            <div style={{ marginBottom: '1.2rem' }}>
              <label style={{
                display: 'block', fontSize: '0.62rem',
                letterSpacing: '0.2em', textTransform: 'uppercase',
                color: 'var(--gold)', marginBottom: '0.5rem',
              }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={{
                  width: '100%', padding: '0.8rem 1rem',
                  background: 'rgba(240,235,225,0.04)',
                  border: '1px solid rgba(201,171,114,0.2)',
                  color: 'var(--salt)', fontSize: '0.9rem',
                  fontFamily: "'Jost', sans-serif", fontWeight: 300,
                  outline: 'none', transition: 'border-color 0.3s',
                }}
                onFocus={e => e.target.style.borderColor = 'rgba(201,171,114,0.5)'}
                onBlur={e => e.target.style.borderColor = 'rgba(201,171,114,0.2)'}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: '1.8rem' }}>
              <label style={{
                display: 'block', fontSize: '0.62rem',
                letterSpacing: '0.2em', textTransform: 'uppercase',
                color: 'var(--gold)', marginBottom: '0.5rem',
              }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={{
                  width: '100%', padding: '0.8rem 1rem',
                  background: 'rgba(240,235,225,0.04)',
                  border: '1px solid rgba(201,171,114,0.2)',
                  color: 'var(--salt)', fontSize: '0.9rem',
                  fontFamily: "'Jost', sans-serif", fontWeight: 300,
                  outline: 'none', transition: 'border-color 0.3s',
                }}
                onFocus={e => e.target.style.borderColor = 'rgba(201,171,114,0.5)'}
                onBlur={e => e.target.style.borderColor = 'rgba(201,171,114,0.2)'}
              />
            </div>

            {/* Error */}
            {error && (
              <div style={{
                fontSize: '0.75rem', color: '#c97a7a',
                marginBottom: '1.2rem', letterSpacing: '0.05em',
              }}>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '0.9rem',
                background: loading ? 'rgba(201,171,114,0.4)' : 'var(--gold)',
                color: 'var(--lava)', border: 'none',
                fontSize: '0.7rem', letterSpacing: '0.25em',
                textTransform: 'uppercase', fontFamily: "'Jost', sans-serif",
                fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background 0.3s',
              }}
            >
              {loading ? 'Accesso in corso...' : 'Accedi'}
            </button>
          </form>
        </div>

        <div style={{
          textAlign: 'center', marginTop: '2rem',
          fontSize: '0.62rem', letterSpacing: '0.15em',
          color: 'rgba(240,235,225,0.2)',
        }}>
          Aci Castello · Sicilia
        </div>
      </div>
    </div>
  )
}
