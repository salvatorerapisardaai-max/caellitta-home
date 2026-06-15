import React, { useEffect, useState } from 'react'
import { sb } from '../../lib/supabase'

const MONTHS_IT = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre']
const MONTHS_EN = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAYS_IT = ['Lun','Mar','Mer','Gio','Ven','Sab','Dom']
const DAYS_EN = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

function toKey(d) {
  return d.toISOString().slice(0, 10)
}

// Costruisce una mappa data -> stato ('confirmed' | 'pending' | 'blocked')
// check_out è esclusivo (notte di partenza libera)
function buildStatusMap(rows) {
  const map = {}
  for (const r of rows) {
    const start = new Date(r.check_in + 'T00:00:00')
    const end = new Date(r.check_out + 'T00:00:00')
    for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
      const key = toKey(d)
      // confirmed/blocked hanno priorità su pending
      if (!map[key] || r.status !== 'pending') {
        map[key] = r.status
      }
    }
  }
  return map
}

function MonthGrid({ year, month, statusMap, lang }) {
  const months = lang === 'it' ? MONTHS_IT : MONTHS_EN
  const days = lang === 'it' ? DAYS_IT : DAYS_EN
  const first = new Date(year, month, 1)
  const startOffset = (first.getDay() + 6) % 7 // lunedì = colonna 0
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <div style={{ marginBottom: '2rem' }}>
      <div style={{
        fontFamily: "'Cormorant Garamond',serif", fontSize: '1.1rem', color: 'var(--gold)',
        letterSpacing: '0.1em', marginBottom: '0.8rem', textTransform: 'uppercase',
      }}>
        {months[month]} {year}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '4px', marginBottom: '4px' }}>
        {days.map(d => (
          <div key={d} style={{ fontSize: '0.6rem', textAlign: 'center', color: 'var(--salt-faint)', letterSpacing: '0.1em' }}>{d}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '4px' }}>
        {cells.map((d, i) => {
          if (d === null) return <div key={i} />
          const dateObj = new Date(year, month, d)
          const key = toKey(dateObj)
          const status = statusMap[key]
          let bg = 'rgba(201,171,114,0.08)' // libero
          if (status === 'confirmed') bg = 'rgba(192,90,90,0.45)'
          else if (status === 'pending') bg = 'rgba(201,171,114,0.35)'
          else if (status === 'blocked') bg = 'rgba(120,120,120,0.4)'
          return (
            <div key={i} style={{
              aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: bg, fontSize: '0.7rem', color: 'var(--salt)', borderRadius: 2,
            }}>
              {d}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function CollaboratoriDashboard() {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')
  const [lang, setLang] = useState('it')

  useEffect(() => {
    sb.from('v_collaborator_availability').select('check_in, check_out, status')
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setRows(data)
      })
  }, [])

  async function logout() {
    await sb.auth.signOut()
    window.location.href = '/collaboratori'
  }

  const t = {
    it: { title: 'Disponibilità', legend: ['Libero', 'Occupato', 'In attesa', 'Bloccato'], logout: 'Esci' },
    en: { title: 'Availability', legend: ['Free', 'Booked', 'Pending', 'Blocked'], logout: 'Log out' },
  }[lang]

  const statusMap = rows ? buildStatusMap(rows) : {}
  const now = new Date()
  const months = [0, 1, 2].map(i => {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    return { year: d.getFullYear(), month: d.getMonth() }
  })

  return (
    <div style={{ minHeight: '100vh', background: 'var(--lava)', padding: '2rem', fontFamily: "'Jost', sans-serif" }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {['it', 'en'].map(l => (
              <button key={l} onClick={() => setLang(l)} style={{
                background: 'none', border: `1px solid ${lang === l ? 'rgba(201,171,114,0.5)' : 'rgba(201,171,114,0.15)'}`,
                color: lang === l ? 'var(--gold)' : 'rgba(240,235,225,0.3)',
                fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase',
                padding: '0.25rem 0.6rem', cursor: 'pointer',
              }}>
                {l === 'it' ? 'IT' : 'EN'}
              </button>
            ))}
          </div>
          <button onClick={logout} style={{
            background: 'none', border: '1px solid rgba(201,171,114,0.2)', color: 'var(--salt-faint)',
            fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase',
            padding: '0.25rem 0.6rem', cursor: 'pointer',
          }}>
            {t.logout}
          </button>
        </div>

        <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.1rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '0.2rem', textAlign: 'center' }}>
          Caellitta Home
        </div>
        <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 'clamp(1.8rem,6vw,2.4rem)', fontWeight: 300, textAlign: 'center', marginBottom: '1.5rem' }}>
          {t.title}
        </h1>

        {error && <div style={{ color: '#e08080', fontSize: '0.8rem', marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}
        {!rows && !error && <div style={{ color: 'var(--salt-faint)', fontSize: '0.8rem', textAlign: 'center' }}>Caricamento…</div>}

        {rows && months.map(({ year, month }, i) => (
          <MonthGrid key={i} year={year} month={month} statusMap={statusMap} lang={lang} />
        ))}

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center', marginTop: '1rem', fontSize: '0.65rem', color: 'var(--salt-faint)' }}>
          {[
            { c: 'rgba(201,171,114,0.08)', l: t.legend[0] },
            { c: 'rgba(192,90,90,0.45)', l: t.legend[1] },
            { c: 'rgba(201,171,114,0.35)', l: t.legend[2] },
            { c: 'rgba(120,120,120,0.4)', l: t.legend[3] },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <div style={{ width: 12, height: 12, background: item.c, borderRadius: 2 }} />
              {item.l}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
