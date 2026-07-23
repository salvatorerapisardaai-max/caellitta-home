import React, { useEffect, useState } from 'react'
import { sb } from '../../lib/supabase'
import { useActiveProperty } from '../../lib/PropertyContext'

const STATUS_STYLE = {
  pending: { cls: 'badge-gray', label: 'In coda' },
  testing: { cls: 'badge-amber', label: 'In verifica' },
  sent:    { cls: 'badge-green', label: 'Inviato' },
  error:   { cls: 'badge-red', label: 'Errore' },
}

function Badge({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.pending
  return <span className={`badge ${s.cls}`}>{s.label}</span>
}

export default function Adempimenti() {
  const { activePropertyId } = useActiveProperty()
  const [cred, setCred] = useState({
    istat_struttura_code: '', istat_pms_user: '',
    alloggiati_user: '', alloggiati_ws_key: '',
  })
  const [istatRows, setIstatRows] = useState([])
  const [allogRows, setAllogRows] = useState([])
  const [filter, setFilter] = useState('all')
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (activePropertyId) loadAll() }, [activePropertyId])

  async function loadAll() {
    setLoading(true)

    const { data: c } = await sb.from('compliance_credentials').select('*').eq('property_id', activePropertyId).maybeSingle()
    if (c) setCred(c)

    const { data: istat } = await sb
      .from('istat_submissions')
      .select('id, submission_date, movement_type, status, attempts, last_error')
      .eq('property_id', activePropertyId)
      .order('submission_date', { ascending: false })
      .limit(100)
    setIstatRows(istat || [])

    const { data: allog } = await sb
      .from('guest_registrations')
      .select('id, status, attempts, last_error, deadline_at, sent_at, receipt_storage_path, booking_id, bookings(guest_name, check_in)')
      .eq('property_id', activePropertyId)
      .order('deadline_at', { ascending: true })
      .limit(100)
    setAllogRows(allog || [])

    setLoading(false)
  }

  async function saveCredentials(e) {
    e.preventDefault()
    setSaving(true)
    setSavedMsg('')
    const { error } = await sb.from('compliance_credentials').upsert({ property_id: activePropertyId, ...cred }, { onConflict: 'property_id' })
    setSaving(false)
    setSavedMsg(error ? `Errore: ${error.message}` : 'Salvato correttamente.')
  }

  function isDeadlineClose(deadline_at, status) {
    if (!deadline_at || status === 'sent') return false
    const hoursLeft = (new Date(deadline_at) - new Date()) / 3_600_000
    return hoursLeft < 6
  }

  const filteredIstat = filter === 'all' ? istatRows : istatRows.filter(r => r.status === filter)

  if (loading) {
    return <div style={{ padding: '2.5rem', color: 'var(--salt-faint)' }}>Caricamento…</div>
  }

  return (
    <div>
      <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 300, fontSize: '1.6rem', color: 'var(--gold)', marginBottom: '0.2rem' }}>
        Adempimenti
      </h2>
      <p style={{ fontSize: '0.75rem', color: 'var(--salt-faint)', marginBottom: '1.5rem' }}>
        Alloggiati Web (Polizia di Stato) e Osservatorio Turistico Sicilia (ISTAT).
      </p>

      {/* ================= CREDENZIALI ================= */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="sec-hdr">
          <span className="sec-title">Credenziali struttura</span>
        </div>
        <p style={{ fontSize: '0.72rem', color: 'var(--salt-faint)', marginBottom: '1rem' }}>
          Le password NON si inseriscono qui: sono gestite come secret lato server per sicurezza.
        </p>
        <form onSubmit={saveCredentials} className="form-grid">
          <div className="form-group">
            <label className="form-label">Codice struttura ISTAT (Turist@t)</label>
            <input className="form-input" value={cred.istat_struttura_code || ''}
              onChange={e => setCred({ ...cred, istat_struttura_code: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Utente PMS ISTAT</label>
            <input className="form-input" value={cred.istat_pms_user || ''}
              onChange={e => setCred({ ...cred, istat_pms_user: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Utente Alloggiati Web</label>
            <input className="form-input" value={cred.alloggiati_user || ''}
              onChange={e => setCred({ ...cred, alloggiati_user: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">WSKey Alloggiati Web</label>
            <input className="form-input" value={cred.alloggiati_ws_key || ''}
              onChange={e => setCred({ ...cred, alloggiati_ws_key: e.target.value })} />
          </div>
          <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Salvataggio…' : 'Salva credenziali'}
            </button>
            {savedMsg && <span style={{ fontSize: '0.78rem', color: 'var(--salt-dim)' }}>{savedMsg}</span>}
          </div>
        </form>
      </div>

      {/* ================= CODA ISTAT ================= */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="sec-hdr">
          <span className="sec-title">Coda ISTAT Sicilia</span>
          <select className="form-select" style={{ width: 160 }} value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="all">Tutti</option>
            <option value="pending">In coda</option>
            <option value="sent">Inviati</option>
            <option value="error">Errori</option>
          </select>
        </div>
        {filteredIstat.length === 0 ? (
          <p style={{ fontSize: '0.78rem', color: 'var(--salt-faint)' }}>
            Nessuna trasmissione ISTAT in coda. Si popola automaticamente confermando una prenotazione.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--salt-faint)', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  <th style={{ padding: '0.5rem 0.7rem' }}>Data</th>
                  <th style={{ padding: '0.5rem 0.7rem' }}>Movimento</th>
                  <th style={{ padding: '0.5rem 0.7rem' }}>Stato</th>
                  <th style={{ padding: '0.5rem 0.7rem' }}>Tentativi</th>
                  <th style={{ padding: '0.5rem 0.7rem' }}>Ultimo errore</th>
                </tr>
              </thead>
              <tbody>
                {filteredIstat.map(r => (
                  <tr key={r.id} style={{ borderTop: '1px solid var(--gold-dim)' }}>
                    <td style={{ padding: '0.5rem 0.7rem' }}>{r.submission_date}</td>
                    <td style={{ padding: '0.5rem 0.7rem' }}>{r.movement_type === 'arrival' ? 'Arrivo' : r.movement_type === 'departure' ? 'Partenza' : 'Presenza'}</td>
                    <td style={{ padding: '0.5rem 0.7rem' }}><Badge status={r.status} /></td>
                    <td style={{ padding: '0.5rem 0.7rem' }}>{r.attempts}</td>
                    <td style={{ padding: '0.5rem 0.7rem', color: '#963832' }}>{r.last_error ? r.last_error.slice(0, 80) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ================= CODA ALLOGGIATI WEB ================= */}
      <div className="card">
        <div className="sec-hdr">
          <span className="sec-title">Coda Alloggiati Web</span>
        </div>
        {allogRows.length === 0 ? (
          <p style={{ fontSize: '0.78rem', color: 'var(--salt-faint)' }}>Nessuna trasmissione Alloggiati Web in coda.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--salt-faint)', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  <th style={{ padding: '0.5rem 0.7rem' }}>Prenotazione</th>
                  <th style={{ padding: '0.5rem 0.7rem' }}>Check-in</th>
                  <th style={{ padding: '0.5rem 0.7rem' }}>Stato</th>
                  <th style={{ padding: '0.5rem 0.7rem' }}>Scadenza</th>
                  <th style={{ padding: '0.5rem 0.7rem' }}>Tentativi</th>
                  <th style={{ padding: '0.5rem 0.7rem' }}>Ricevuta</th>
                </tr>
              </thead>
              <tbody>
                {allogRows.map(r => {
                  const close = isDeadlineClose(r.deadline_at, r.status)
                  return (
                    <tr key={r.id} style={{ borderTop: '1px solid var(--gold-dim)' }}>
                      <td style={{ padding: '0.5rem 0.7rem' }}>{r.bookings?.guest_name || '—'}</td>
                      <td style={{ padding: '0.5rem 0.7rem' }}>{r.bookings?.check_in || '—'}</td>
                      <td style={{ padding: '0.5rem 0.7rem' }}><Badge status={r.status} /></td>
                      <td style={{ padding: '0.5rem 0.7rem', color: close ? '#963832' : 'inherit', fontWeight: close ? 700 : 400 }}>
                        {r.deadline_at ? new Date(r.deadline_at).toLocaleString('it-IT') : '—'}
                      </td>
                      <td style={{ padding: '0.5rem 0.7rem' }}>{r.attempts}</td>
                      <td style={{ padding: '0.5rem 0.7rem' }}>
                        {r.receipt_storage_path
                          ? <a href={r.receipt_storage_path} target="_blank" rel="noreferrer" style={{ color: 'var(--gold)', fontWeight: 600 }}>Scarica PDF</a>
                          : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
