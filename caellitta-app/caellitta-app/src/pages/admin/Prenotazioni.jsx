import React, { useEffect, useState } from 'react'
import { sb } from '../../lib/supabase'
import Modal from '../../components/Modal'

const PLATFORMS = ['Airbnb', 'Booking.com', 'Diretto']
const STATUSES = { confirmed: 'badge-green', pending: 'badge-amber', cancelled: 'badge-red' }
const STATUS_LABELS = { confirmed: 'Confermata', pending: 'In attesa', cancelled: 'Annullata' }

const EMPTY = {
  guest_name: '', guest_email: '', guest_phone: '',
  check_in: '', check_out: '', guests_count: 1,
  amount_total: '', platform: 'Airbnb', status: 'confirmed', notes: ''
}

export default function Prenotazioni() {
  const [bookings, setBookings] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [filterStatus, setFilter] = useState('all')

  useEffect(() => { load() }, [])

  async function load() {
    const { data, error } = await sb.from('bookings').select('*').order('check_in', { ascending: false })
    if (error) { console.error('load error:', error); return }
    setBookings(data || [])
  }

  function openNew() { setForm(EMPTY); setEditing(null); setSaveError(''); setModal(true) }

  function openEdit(b) {
    setForm({
      guest_name:   b.guest_name   || '',
      guest_email:  b.guest_email  || '',
      guest_phone:  b.guest_phone  || '',
      check_in:     b.check_in?.slice(0, 10) || '',
      check_out:    b.check_out?.slice(0, 10) || '',
      guests_count: b.guests_count || 1,
      amount_total: b.amount_total || '',
      platform:     b.platform     || 'Airbnb',
      status:       b.status       || 'confirmed',
      notes:        b.notes        || ''
    })
    setEditing(b.id)
    setSaveError('')
    setModal(true)
  }

  async function cancelBooking(id) {
    await sb.from('bookings').update({ status: 'cancelled' }).eq('id', id)
    load()
  }

  async function hardDeleteBooking(id) {
    if (!confirm('Eliminare definitivamente?')) return
    await sb.from('bookings').delete().eq('id', id)
    load()
  }

  async function save() {
    if (!form.guest_name || !form.check_in || !form.check_out) {
      setSaveError('Nome, check-in e check-out sono obbligatori.')
      return
    }
    setSaving(true)
    setSaveError('')

    const payload = {
      guest_name:   form.guest_name,
      guest_email:  form.guest_email,
      guest_phone:  form.guest_phone,
      check_in:     form.check_in,
      check_out:    form.check_out,
      guests_count: Number(form.guests_count) || 1,
      amount_total: Number(form.amount_total) || 0,
      platform:     form.platform,
      status:       form.status,
      notes:        form.notes
    }

    try {
      if (editing) {
        const { error } = await sb.from('bookings').update(payload).eq('id', editing)
        if (error) throw error
      } else {
        const code = 'CAELLITTA-' + new Date().getFullYear() + '-' + String(bookings.length + 1).padStart(3, '0')
        const { data: guest, error: gErr } = await sb.from('guests')
          .insert({ name: form.guest_name, email: form.guest_email || null, phone: form.guest_phone || null })
          .select().single()
        if (gErr) throw gErr
        const { error: bErr } = await sb.from('bookings').insert({ ...payload, code, guest_id: guest?.id })
        if (bErr) throw bErr
      }
      await load()
      setModal(false)
      setEditing(null)
    } catch (err) {
      console.error('save error:', err)
      setSaveError('Errore: ' + (err.message || JSON.stringify(err)))
    } finally {
      setSaving(false)
    }
  }

  const filtered = filterStatus === 'all' ? bookings : bookings.filter(b => b.status === filterStatus)
  const f = form

  return (
    <div>
      <style>{`
        .pren-card {
          padding: 1rem;
          margin-bottom: 0.5rem;
          border: 1px solid var(--gold-dim);
          background: var(--lava-card);
        }
        .pren-card-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 0.5rem;
          gap: 0.5rem;
        }
        .pren-card-meta {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
          font-size: 0.75rem;
          color: var(--salt-dim);
        }
        .pren-actions {
          display: flex;
          gap: 0.4rem;
          flex-shrink: 0;
        }
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        @media (max-width: 600px) { .form-grid { grid-template-columns: 1fr; } }
      `}</style>

      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.8rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {['all','confirmed','pending','cancelled'].map(s => (
            <button key={s} onClick={() => setFilter(s)} className="btn-sm"
              style={filterStatus === s ? { borderColor: 'var(--gold)', color: 'var(--gold)' } : {}}>
              {s === 'all' ? 'Tutte' : STATUS_LABELS[s]}
            </button>
          ))}
        </div>
        <button className="btn-primary" onClick={openNew}>+ Nuova prenotazione</button>
      </div>

      {/* LIST */}
      {filtered.length === 0 && (
        <div className="card" style={{ textAlign: 'center', color: 'var(--salt-faint)', padding: '3rem', fontSize: '0.85rem' }}>
          Nessuna prenotazione
        </div>
      )}

      {filtered.map(b => (
        <div key={b.id} className="pren-card">
          {/* Riga top: nome + bottoni */}
          <div className="pren-card-top">
            <div>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.05rem' }}>{b.guest_name}</div>
              <div style={{ fontSize: '0.6rem', fontFamily: 'monospace', color: 'rgba(201,171,114,.45)' }}>{b.code}</div>
            </div>
            <div className="pren-actions">
              <button className="btn-sm" onClick={() => openEdit(b)}>✏</button>
              <button className="btn-sm danger" onClick={() => cancelBooking(b.id)}>✕</button>
              <button className="btn-sm danger" onClick={() => hardDeleteBooking(b.id)}>🗑</button>
            </div>
          </div>
          {/* Riga meta */}
          <div className="pren-card-meta">
            <span>📥 {fmtDate(b.check_in)} → 📤 {fmtDate(b.check_out)}</span>
            <span>👤 {b.guests_count} · {b.platform}</span>
            <span style={{ color: 'var(--gold)', fontFamily: "'Cormorant Garamond',serif", fontSize: '0.95rem' }}>€{b.amount_total}</span>
            <span className={`badge ${STATUSES[b.status] || 'badge-gray'}`}>
              {STATUS_LABELS[b.status] || b.status}
            </span>
          </div>
        </div>
      ))}

      {/* MODAL */}
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Modifica' : 'Nuova prenotazione'}>
        {saveError && (
          <div style={{ background: 'rgba(138,72,72,.15)', border: '1px solid rgba(138,72,72,.4)', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.78rem', color: '#e08080', lineHeight: 1.6 }}>
            {saveError}
          </div>
        )}
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Nome ospite *</label>
            <input className="form-input" value={f.guest_name} onChange={e => setForm(p => ({ ...p, guest_name: e.target.value }))} placeholder="Mario Rossi" />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" value={f.guest_email} onChange={e => setForm(p => ({ ...p, guest_email: e.target.value }))} placeholder="mario@email.it" />
          </div>
          <div className="form-group">
            <label className="form-label">Check-in *</label>
            <input className="form-input" type="date" value={f.check_in} onChange={e => setForm(p => ({ ...p, check_in: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Check-out *</label>
            <input className="form-input" type="date" value={f.check_out} onChange={e => setForm(p => ({ ...p, check_out: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">N° ospiti</label>
            <input className="form-input" type="number" value={f.guests_count} onChange={e => setForm(p => ({ ...p, guests_count: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Importo €</label>
            <input className="form-input" type="number" value={f.amount_total} onChange={e => setForm(p => ({ ...p, amount_total: e.target.value }))} placeholder="0" />
          </div>
          <div className="form-group">
            <label className="form-label">Piattaforma</label>
            <select className="form-select" value={f.platform} onChange={e => setForm(p => ({ ...p, platform: e.target.value }))}>
              {PLATFORMS.map(pl => <option key={pl}>{pl}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Stato</label>
            <select className="form-select" value={f.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
              <option value="confirmed">Confermata</option>
              <option value="pending">In attesa</option>
              <option value="cancelled">Annullata</option>
            </select>
          </div>
        </div>
        <div className="form-group" style={{ marginTop: '0.5rem' }}>
          <label className="form-label">Note</label>
          <textarea className="form-textarea" value={f.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
        </div>
        <div style={{ display: 'flex', gap: '0.8rem', marginTop: '1.5rem' }}>
          <button className="btn-primary" onClick={save} style={{ flex: 1 }} disabled={saving}>
            {saving ? 'Salvataggio…' : 'Salva'}
          </button>
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
