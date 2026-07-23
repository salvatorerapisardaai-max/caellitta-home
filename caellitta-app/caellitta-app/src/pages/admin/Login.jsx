import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { sb } from '../../lib/supabase'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await sb.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Credenziali non valide. Riprova.')
      setLoading(false)
    } else {
      navigate('/')
    }
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
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
        opacity: 0.02,
      }} />

      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 600, height: 600,
        background: 'radial-gradient(circle, rgba(156,122,60,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{
        position: 'relative', zIndex: 1,
        width: '100%', maxWidth: 420,
        padding: '0 1.5rem',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <div style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: '1.8rem', fontWeight: 300,
            letterSpacing: '0.3em', textTransform: 'uppercase',
            color: 'var(--gold)', marginBottom: '0.4rem',
          }}>
            Ospita
          </div>
          <div style={{
            fontSize: '0.62rem', letterSpacing: '0.3em',
            textTransform: 'uppercase', color: 'var(--salt-faint)',
          }}>
            Gestionale · Area Riservata
          </div>
        </div>

        <div style={{
          background: 'var(--lava-card)',
          border: '1px solid var(--gold-dim2)',
          padding: '2.5rem',
          boxShadow: '0 4px 20px rgba(43,35,24,0.06)',
        }}>
          <div style={{
            width: 32, height: 1,
            background: 'var(--gold)', opacity: 0.5,
            marginBottom: '2rem',
          }} />

          <form onSubmit={handleLogin}>
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
                  background: 'var(--lava)',
                  border: '1px solid rgba(156,122,60,0.3)',
                  color: 'var(--salt)', fontSize: '0.9rem',
                  fontFamily: "'Jost', sans-serif", fontWeight: 300,
                  outline: 'none', transition: 'border-color 0.3s',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--gold)'}
                onBlur={e => e.target.style.borderColor = 'rgba(156,122,60,0.3)'}
              />
            </div>

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
                  background: 'var(--lava)',
                  border: '1px solid rgba(156,122,60,0.3)',
                  color: 'var(--salt)', fontSize: '0.9rem',
                  fontFamily: "'Jost', sans-serif", fontWeight: 300,
                  outline: 'none', transition: 'border-color 0.3s',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--gold)'}
                onBlur={e => e.target.style.borderColor = 'rgba(156,122,60,0.3)'}
              />
            </div>

            {error && (
              <div style={{
                fontSize: '0.75rem', color: 'var(--red)',
                marginBottom: '1.2rem', letterSpacing: '0.05em',
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '0.9rem',
                background: loading ? 'rgba(156,122,60,0.4)' : 'var(--gold)',
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
          color: 'var(--salt-faint)',
        }}>
          Il gestionale per chi ospita
        </div>
      </div>
    </div>
  )
}
