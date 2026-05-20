import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { sb } from '../../lib/supabase'

export default function GuestAccess() {
  const [code, setCode]   = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function access() {
    if (!code.trim()) return
    setLoading(true); setError('')
    const { data } = await sb.from('bookings')
      .select('code')
      .eq('code', code.trim().toUpperCase())
      .neq('status', 'cancelled')
      .single()
    if (data) {
      navigate('/ospite/' + data.code)
    } else {
      setError('Codice non trovato. Controlla l\'email di conferma.')
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--lava)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '2rem',
    }}>
      {/* Noise */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        opacity: 0.025 }} />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 420, textAlign: 'center' }}>
        <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.1rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '0.5rem' }}>
          Caellitta Home
        </div>
        <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 'clamp(2rem,8vw,3rem)', fontWeight: 300, lineHeight: 1.1, marginBottom: '0.8rem' }}>
          Benvenuto/<br/><em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>a</em>
        </h1>
        <p style={{ fontSize: '0.82rem', color: 'var(--salt-faint)', marginBottom: '2.5rem', lineHeight: 1.8, fontWeight: 300 }}>
          Inserisci il codice prenotazione che hai ricevuto via email per accedere al tuo Welcome Book e ai coupon.
        </p>

        <div style={{ background: 'var(--lava-card)', border: '1px solid var(--gold-dim)', padding: '2rem' }}>
          <label style={{ display: 'block', fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '0.6rem', textAlign: 'left' }}>
            Codice prenotazione
          </label>
          <input
            style={{
              width: '100%', background: 'var(--lava-mid)', border: '1px solid rgba(201,171,114,.25)',
              padding: '0.9rem 1rem', fontFamily: 'monospace', fontSize: '1rem',
              color: 'var(--salt)', outline: 'none', letterSpacing: '0.08em',
              textAlign: 'center', textTransform: 'uppercase', marginBottom: '1rem',
              transition: 'border-color .22s',
            }}
            placeholder="CAELLITTA-2025-001"
            value={code}
            onChange={e => setCode(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && access()}
            onFocus={e => e.target.style.borderColor = 'var(--gold)'}
            onBlur={e => e.target.style.borderColor = 'rgba(201,171,114,.25)'}
          />
          {error && (
            <div style={{ fontSize: '0.75rem', color: '#e08080', marginBottom: '1rem', textAlign: 'left' }}>{error}</div>
          )}
          <button
            className="btn-primary"
            style={{ width: '100%', padding: '0.8rem', fontSize: '0.72rem' }}
            onClick={access}
            disabled={loading || !code.trim()}
          >
            {loading ? 'Caricamento…' : 'Accedi al mio soggiorno →'}
          </button>
        </div>

        <p style={{ fontSize: '0.7rem', color: 'var(--salt-faint)', marginTop: '1.5rem', lineHeight: 1.7 }}>
          Non trovi il codice? Scrivi su WhatsApp — ti aiutiamo subito.
        </p>
      </div>
    </div>
  )
}
