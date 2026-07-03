import React, { useEffect, useState } from 'react'
import { sb } from '../../lib/supabase'
import Modal from '../../components/Modal'

const EMPTY = { email: '', name: '', default_commission_pct: 10, active: true }
const EXPORT_URL = 'https://ejjatrfeeatgiqpomibd.supabase.co/functions/v1/ical-export'
const PLATFORM_LABELS = { airbnb: 'Airbnb', booking: 'Booking.com' }

export default function Team() {
  const [collaborators, setCollaborators] = useState([])
  const [bookings, setBookings] = useState([])
  const [feeds, setFeeds] = useState([])
  const [feedUrls, setFeedUrls] = useState({})
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')
  const [copied, setCopied] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoadError('')
    try {
      const { data: c, error: e1 } = await sb.from('collaborators').select('*').order('name')
      if (e1) throw new Error('Collaboratori: ' + e1.message)

      const { data: b, error: e2 } = await sb.from('bookings')
        .select('id,code,guest_name,check_in,check_out,amount_total,commission_pct,commission_due,commission_settled,collaborator_id')
        .not('collaborator_id', 'is', null)
        .order('check_in', { ascending: false })
      if (e2) throw new Error('Prenotazioni: ' + e2.message)

      const { data: f, error: e3 } = await sb.from('ical_feeds').select('*').order('platform')
      if (e3) throw new Error('Calendari: ' + e3.message)

      setCollaborators(c || [])
      setBookings(b || [])
      setFeeds(f || [])
      setFeedUrls(Object.fromEntries((f || []).map(x => [x.id, x.import_url || ''])))
    } catch (err) {
      console.error(err)
      setLoadError(err.message)
    }
  }

  async function saveFeedUrl(feedId) {
    await sb.from('ical_feeds').update({ import_url: feedUrls[feedId] || null }).eq('id', feedId)
    load()
  }

  async function syncNow() {
    setSyncing(true); setSyncMsg('')
    try {
      const { data, error } = await sb.functions.invoke('ical-import')
      if (error) throw error
      setSyncMsg('Sincronizzazione completata.')
      console.log('ical-import result:', data)
    } catch (err) {
      setSyncMsg('Errore: ' + (err.message || JSON.stringify(err)))
    } finally {
      setSyncing(false)
      load()
    }
  }

  function copyExportUrl() {
    navigator.clipboard.writeText(EXPORT_URL)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function openNew() { setForm(EMPTY); setEditing(null); setSaveError(''); setModal(true) }

  function openEdit(c) {
    setForm({ email: c.email || '', name: c.name || '', default_commission_pct: c.default_commission_pct ?? 10, active: c.active ?? true })
    setEditing(c.id)
    setSaveError('')
    setModal(true)
  }

  async function save() {
    if (!form.email) { setSaveError('Email obbligatoria.'); return }
    setSaving(true); setSaveError('')
    const payload = {
      email: form.email.trim().toLowerCase(),
      name: form.name || null,
      default_commission_pct: Number(form.default_commission_pct) || 0,
      active: form.active,
    }
    try {
      if (editing) {
        const { error } = await sb.from('collaborators').update(payload).eq('id', editing)
        if (error) throw error
      } else {
        const { error } = await sb.from('collaborators').insert(payload)
        if (error) throw error
      }
      await load()
      setModal(false)
      setEditing(null)
    } catch (err) {
      setSaveError('Errore: ' + (err.message || JSON.stringify(err)))
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(c) {
    await sb.from('collaborators').update({ active: !c.active }).eq('id', c.id)
    load()
  }

  async function toggleSettled(b) {
    await sb.from('bookings').update({
      commission_settled: !b.commission_settled,
      commission_settled_at: !b.commission_settled ? new Date().toISOString() : null,
    }).eq('id', b.id)
    load()
  }

  const collabById = Object.fromEntries(collaborators.map(c => [c.id, c]))
  const totalDue = bookings.filter(b => !b.commission_settled).reduce((s, b) => s + (b.commission_due || 0), 0)

  return (
    <div>
      {loadError && (
        <div style={{ background: 'rgba(138,72,72,.15)', border: '1px solid rgba(138,72,72,.4)', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.78rem', color: '#e08080' }}>
          Errore caricamento: {loadError}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.8rem' }}>
        <div className="card" style={{ padding: '0.9rem 1.4rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <span style={{ fontSize: '0.62rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--salt-faint)' }}>Commissioni da incassare</span>
          <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.3rem', color: 'var(--gold)' }}>€{totalDue.toFixed(2)}</span>
        </div>
        <button className="btn-primary" onClick={openNew}>+ Nuovo collaboratore</button>
      </div>

      {/* COLLABORATORI */}
      <div className="sec-hdr"><span className="sec-title">Collaboratori</span></div>
      {collaborators.length === 0 && !loadError && (
        <div className="card" style={{ textAlign: 'center', color: 'var(--salt-faint)', padding: '2rem', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
          Nessun collaboratore. Clicca "+ Nuovo collaboratore" per iniziare.
        </div>
      )}
      {collaborators.map(c => (
        <div key={c.id} style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.6rem',
          background: 'var(--lava-card)', border: `1px solid ${c.active ? 'var(--gold-dim)' : 'rgba(90,90,90,.2)'}`,
          padding: '0.9rem 1.2rem', marginBottom: '0.5rem', opacity: c.active ? 1 : 0.55,
        }}>
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.05rem' }}>{c.name || '—'}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--salt-faint)' }}>{c.email}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <span style={{ fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0.2rem 0.55rem', border: '1px solid var(--gold-dim)', color: 'var(--gold)' }}>
              Commissione {c.default_commission_pct}%
            </span>
            <span className={`badge ${c.active ? 'badge-green' : 'badge-gray'}`}>{c.active ? 'Attivo' : 'Sospeso'}</span>
            <button className="btn-sm" onClick={() => openEdit(c)}>✏</button>
            <button className="btn-sm" onClick={() => toggleActive(c)}>{c.active ? 'Sospendi' : 'Riattiva'}</button>
          </div>
        </div>
      ))}

      {/* PRENOTAZIONI DEI COLLABORATORI */}
      <div className="sec-hdr" style={{ marginTop: '2rem' }}><span className="sec-title">Prenotazioni dei collaboratori</span></div>
      {bookings.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--salt-faint)', padding: '2rem', fontSize: '0.85rem' }}>
          Nessuna prenotazione creata da un collaboratore
        </div>
      ) : bookings.map(b => (
        <div key={b.id} style={{ background: 'var(--lava-card)', border: '1px solid var(--gold-dim)', padding: '0.85rem 1.1rem', marginBottom: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.6rem', alignItems: 'center' }}>
            <div>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1rem' }}>{b.guest_name}</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--salt-faint)' }}>
                {collabById[b.collaborator_id]?.name || collabById[b.collaborator_id]?.email || '—'} · {fmtDate(b.check_in)} → {fmtDate(b.check_out)} · {b.code}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
              <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '0.95rem', color: 'var(--gold)' }}>€{b.amount_total}</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--salt-dim)' }}>commissione {b.commission_pct}% = €{b.commission_due?.toFixed(2)}</span>
              <button className={`btn-sm ${b.commission_settled ? '' : 'danger'}`} onClick={() => toggleSettled(b)}>
                {b.commission_settled ? '✓ Saldata' : 'Segna saldata'}
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* SINCRONIZZAZIONE CALENDARI — anti-overbooking Airbnb/Booking.com, gratuita via iCal */}
      <div className="card" style={{ marginTop: '2rem' }}>
        <div className="sec-hdr">
          <span className="sec-title">Sincronizzazione calendari</span>
          <button className="btn-sm" onClick={syncNow} disabled={syncing}>{syncing ? 'Sincronizzo…' : 'Sincronizza ora'}</button>
        </div>
        {syncMsg && <p style={{ fontSize: '0.75rem', color: 'var(--salt-faint)', marginBottom: '1rem' }}>{syncMsg}</p>}

        <p style={{ fontSize: '0.72rem', color: 'var(--salt-dim)', lineHeight: 1.7, marginBottom: '1rem' }}>
          <strong>1. Importa</strong> — incolla qui sotto il link "esporta calendario" (.ics) che trovi nel pannello host di Airbnb e Booking.com: le loro date occupate verranno bloccate automaticamente anche qui (sincronizzazione ogni 3 ore, o subito con "Sincronizza ora").<br/>
          <strong>2. Esporta</strong> — incolla invece questo link nella sezione "importa calendario" di Airbnb e Booking.com, così anche le prenotazioni fatte qui (o dai collaboratori) bloccano le date da loro:
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <code style={{ fontSize: '0.68rem', color: 'var(--gold)', background: 'var(--lava-hover)', padding: '0.4rem 0.7rem', wordBreak: 'break-all' }}>{EXPORT_URL}</code>
          <button className="btn-sm" onClick={copyExportUrl}>{copied ? '✓ Copiato' : 'Copia'}</button>
        </div>

        {feeds.map(f => (
          <div key={f.id} style={{ marginBottom: '1rem' }}>
            <label className="form-label">{PLATFORM_LABELS[f.platform] || f.platform}</label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <input
                className="form-input" style={{ flex: 1, minWidth: 220 }}
                placeholder="https://www.airbnb.it/calendar/ical/....ics"
                value={feedUrls[f.id] ?? ''}
                onChange={e => setFeedUrls(p => ({ ...p, [f.id]: e.target.value }))}
              />
              <button className="btn-sm" onClick={() => saveFeedUrl(f.id)}>Salva</button>
            </div>
            <div style={{ fontSize: '0.6rem', color: 'var(--salt-faint)', marginTop: '0.3rem' }}>
              {f.last_synced_at ? `Ultima sincronizzazione: ${new Date(f.last_synced_at).toLocaleString('it-IT')} — ${f.last_status || ''}` : 'Mai sincronizzato'}
            </div>
          </div>
        ))}
      </div>

      {/* MODAL */}
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Modifica collaboratore' : 'Nuovo collaboratore'}>
        {saveError && (
          <div style={{ background: 'rgba(138,72,72,.15)', border: '1px solid rgba(138,72,72,.4)', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.78rem', color: '#e08080' }}>
            {saveError}
          </div>
        )}
        <div className="form-group">
          <label className="form-label">Email *</label>
          <input className="form-input" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="nome@email.com" />
        </div>
        <div className="form-group">
          <label className="form-label">Nome</label>
          <input className="form-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Mario Rossi" />
        </div>
        <div className="form-group">
          <label className="form-label">Commissione (%)</label>
          <input className="form-input" type="number" step="0.5" value={form.default_commission_pct} onChange={e => setForm(p => ({ ...p, default_commission_pct: e.target.value }))} placeholder="10" />
        </div>
        <div className="form-group">
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={form.active} onChange={e => setForm(p => ({ ...p, active: e.target.checked }))} style={{ accentColor: 'var(--gold)' }} />
            <span className="form-label" style={{ margin: 0 }}>Collaboratore attivo</span>
          </label>
        </div>
        <div style={{ display: 'flex', gap: '0.8rem', marginTop: '1.5rem' }}>
          <button className="btn-primary" style={{ flex: 1 }} onClick={save} disabled={saving}>{saving ? 'Salvataggio…' : 'Salva'}</button>
          <button className="btn-cancel" onClick={() => setModal(false)}>Annulla</button>
        </div>
      </Modal>
    </div>
  )
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
}
