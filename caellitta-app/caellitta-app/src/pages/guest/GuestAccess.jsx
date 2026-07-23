import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { sb } from '../../lib/supabase'

export default function GuestAccess() {
  const [code, setCode]   = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [lang, setLang]   = useState('it')
  const navigate = useNavigate()

  const t = {
    it: {
      subtitle: 'Inserisci il codice prenotazione che hai ricevuto via email per accedere al tuo Welcome Book e ai coupon.',
      label: 'Codice prenotazione',
      btn: 'Accedi al mio soggiorno →',
      loading: 'Caricamento…',
      help: 'Non trovi il codice? Scrivi al tuo host — ti aiuta subito.',
      error: "Codice non trovato. Controlla l'email di conferma.",
    },
    en: {
      subtitle: 'Enter the booking code you received by email to access your Welcome Book and coupons.',
      label: 'Booking code',
      btn: 'Access my stay →',
      loading: 'Loading…',
      help: "Can't find your code? Message your host — they'll help right away.",
      error: 'Code not found. Please check your confirmation email.',
    },
  }[lang]

  async function access() {
    if (!code.trim()) return
    setLoading(true); setError('')
    const { data } = await sb.rpc('get_booking_by_code', { p_code: code.trim() })
    const found = data?.[0]
    if (found) {
      navigate('/ospite/' + found.code)
    } else {
      setError(t.error)
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--lava)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '2rem',
    }}>
      {/* Grana leggera */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        opacity: 0.018 }} />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 420, textAlign: 'center' }}>

        {/* Lang switch */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
          {['it', 'en'].map(l => (
            <button key={l} onClick={() => setLang(l)} style={{
              background: 'none', border: `1px solid ${lang === l ? 'var(--gold)' : 'rgba(156,122,60,0.25)'}`,
              color: lang === l ? 'var(--gold)' : 'var(--salt-faint)',
              fontSize: '0.62rem', letterSpacing: '0.2em', textTransform: 'uppercase',
              padding: '0.3rem 0.7rem', cursor: 'pointer', fontFamily: "'Jost', sans-serif",
              transition: 'all 0.2s',
            }}>
              {l === 'it' ? '🇮🇹 IT' : '🇬🇧 EN'}
            </button>
          ))}
        </div>

        <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.1rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '0.5rem' }}>
          Ospita
        </div>
        <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 'clamp(2rem,8vw,3rem)', fontWeight: 300, lineHeight: 1.1, marginBottom: '0.8rem' }}>
          {lang === 'it' ? <>Benvenuto/<br/><em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>a</em></> : <>Welcome<br/><em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>to your stay</em></>}
        </h1>
        <p style={{ fontSize: '0.82rem', color: 'var(--salt-dim)', marginBottom: '2.5rem', lineHeight: 1.8, fontWeight: 300 }}>
          {t.subtitle}
        </p>

        <div style={{ background: 'var(--lava-card)', border: '1px solid var(--gold-dim2)', padding: '2rem', boxShadow: '0 4px 20px rgba(43,35,24,0.05)' }}>
          <label style={{ display: 'block', fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '0.6rem', textAlign: 'left' }}>
            {t.label}
          </label>
          <input
            style={{
              width: '100%', background: 'var(--lava)', border: '1px solid rgba(156,122,60,.3)',
              padding: '0.9rem 1rem', fontFamily: 'monospace', fontSize: '1rem',
              color: 'var(--salt)', outline: 'none', letterSpacing: '0.08em',
              textAlign: 'center', textTransform: 'uppercase', marginBottom: '1rem',
              transition: 'border-color .22s',
            }}
            placeholder="CODICE-PRENOTAZIONE"
            value={code}
            onChange={e => setCode(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && access()}
            onFocus={e => e.target.style.borderColor = 'var(--gold)'}
            onBlur={e => e.target.style.borderColor = 'rgba(156,122,60,.3)'}
          />
          {error && (
            <div style={{ fontSize: '0.75rem', color: 'var(--red)', marginBottom: '1rem', textAlign: 'left' }}>{error}</div>
          )}
          <button
            className="btn-primary"
            style={{ width: '100%', padding: '0.8rem', fontSize: '0.72rem' }}
            onClick={access}
            disabled={loading || !code.trim()}
          >
            {loading ? t.loading : t.btn}
          </button>
        </div>

        <p style={{ fontSize: '0.7rem', color: 'var(--salt-faint)', marginTop: '1.5rem', lineHeight: 1.7 }}>
          {t.help}
        </p>
      </div>
    </div>
  )
}
