import React, { useEffect, useState } from 'react'
import { sb } from '../../lib/supabase'
import Modal from '../../components/Modal'

const PLATFORMS = ['Airbnb', 'Booking.com', 'Diretto']

const STATUSES = {
  confirmed: 'badge-green',
  pending: 'badge-amber',
  cancelled: 'badge-red'
}

const STATUS_LABELS = {
  confirmed: 'Confermata',
  pending: 'In attesa',
  cancelled: 'Annullata'
}

const EMPTY = {
  guest_name: '',
  guest_email: '',
  guest_phone: '',
  check_in: '',
  check_out: '',
  guests_count: 1,
  amount_total: '',
  platform: 'Airbnb',
  status: 'confirmed',
  notes: ''
}

export default function Prenotazioni() {
  const [bookings, setBookings] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [filterStatus, setFilter] = useState('all')

  useEffect(() => { load() }, [])

  async function load() {
    const { data, error } = await sb
      .from('bookings')
      .select('*')
      .order('check_in', { ascending: false })

    if (!error) setBookings(data || [])
  }

  function openNew() {
    setForm(EMPTY)
    setEditing(null)
    setModal(true)
  }

  function openEdit(b) {
    setForm({
      guest_name: b.guest_name || '',
      guest_email: b.guest_email || '',
      guest_phone: b.guest_phone || '',
      check_in: b.check_in?.slice(0, 10) || '',
      check_out: b.check_out?.slice(0, 10) || '',
      guests_count: b.guests_count || 1,
      amount_total: b.amount_total || '',
      platform: b.platform || 'Airbnb',
      status: b.status || 'confirmed',
      notes: b.notes || ''
    })

    setEditing(b.id)
    setModal(true)
  }

  async function cancelBooking(id) {
    await sb.from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', id)

    load()
  }

  async function hardDeleteBooking(id) {
    if (!confirm('Eliminare definitivamente?')) return

    await sb.from('bookings')
      .delete()
      .eq('id', id)

    load()
  }

  async function save() {
    if (!form.guest_name || !form.check_in || !form.check_out) {
      alert('Compila i campi obbligatori')
      return
    }

    setSaving(true)

    // 🔥 CLEAN PAYLOAD (IMPORTANTISSIMO PER SUPABASE)
    const payload = {
      guest_name: form.guest_name,
      guest_email: form.guest_email,
      guest_phone: form.guest_phone,
      check_in: form.check_in,
      check_out: form.check_out,
      guests_count: Number(form.guests_count) || 1,
      amount_total: Number(form.amount_total) || 0,
      platform: form.platform,
      status: form.status,
      notes: form.notes
    }

    try {
      if (editing) {
        const { error } = await sb
          .from('bookings')
          .update(payload)
          .eq('id', editing)

        if (error) throw error
      } else {
        const code =
          'CAELLITTA-' +
          new Date().getFullYear() +
          '-' +
          String(bookings.length + 1).padStart(3, '0')

        const { data: guest, error: gErr } = await sb
          .from('guests')
          .insert({
            name: form.guest_name,
            email: form.guest_email,
            phone: form.guest_phone
          })
          .select()
          .single()

        if (gErr) throw gErr

        const { error: bErr } = await sb
          .from('bookings')
          .insert({
            ...payload,
            code,
            guest_id: guest?.id
          })

        if (bErr) throw bErr
      }

      await load()
      setModal(false)
      setEditing(null)

    } catch (err) {
      alert('Errore salvataggio: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const filtered =
    filterStatus === 'all'
      ? bookings
      : bookings.filter(b => b.status === filterStatus)

  const f = form

  return (
    <div>

      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.8rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {['all','confirmed','pending','cancelled'].map(s => (
            <button key={s} onClick={() => setFilter(s)} className="btn-sm">
              {s === 'all' ? 'Tutte' : STATUS_LABELS[s]}
            </button>
          ))}
        </div>

        <button className="btn-primary" onClick={openNew}>
          + Nuova prenotazione
        </button>
      </div>

      {/* LIST */}
      {filtered.map(b => (
        <div
          key={b.id}
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr 2fr 1fr auto',
            gap: '1rem',
            padding: '1rem',
            marginTop: '0.6rem',
            border: '1px solid var(--gold-dim)',
            background: 'var(--lava-card)',
            alignItems: 'start'
          }}
        >

          <div>
            <div>{b.guest_name}</div>
            <div style={{ fontSize: '0.6rem' }}>{b.code}</div>
            <div style={{ fontSize: '0.7rem', marginTop: '0.4rem' }}>
              📥 {fmtDate(b.check_in)} <br/>
              📤 {fmtDate(b.check_out)} <br/>
              👤 {b.guests_count} ospiti
            </div>
          </div>

          <div style={{ color: 'var(--gold)' }}>
            €{b.amount_total}
          </div>

          <span className={`badge ${STATUSES[b.status]}`}>
            {STATUS_LABELS[b.status]}
          </span>

          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button className="btn-sm" onClick={() => openEdit(b)}>✏</button>
            <button className="btn-sm danger" onClick={() => cancelBooking(b.id)}>✕</button>
            <button className="btn-sm danger" onClick={() => hardDeleteBooking(b.id)}>🗑</button>
          </div>

        </div>
      ))}

      {/* MODAL FIXED LABELS + SAFE SAVE */}
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Modifica' : 'Nuova prenotazione'}>

        <div className="form-grid">

          <div className="form-group">
            <label>Nome ospite</label>
            <input value={f.guest_name}
              onChange={e => setForm(p => ({ ...p, guest_name: e.target.value }))} />
          </div>

          <div className="form-group">
            <label>Email</label>
            <input value={f.guest_email}
              onChange={e => setForm(p => ({ ...p, guest_email: e.target.value }))} />
          </div>

          <div className="form-group">
            <label>Check-in</label>
            <input type="date"
              value={f.check_in}
              onChange={e => setForm(p => ({ ...p, check_in: e.target.value }))} />
          </div>

          <div className="form-group">
            <label>Check-out</label>
            <input type="date"
              value={f.check_out}
              onChange={e => setForm(p => ({ ...p, check_out: e.target.value }))} />
          </div>

          <div className="form-group">
            <label>Ospiti</label>
            <input type="number"
              value={f.guests_count}
              onChange={e => setForm(p => ({ ...p, guests_count: e.target.value }))} />
          </div>

          <div className="form-group">
            <label>Importo</label>
            <input type="number"
              value={f.amount_total}
              onChange={e => setForm(p => ({ ...p, amount_total: e.target.value }))} />
          </div>

          <div className="form-group">
            <label>Piattaforma</label>
            <select value={f.platform}
              onChange={e => setForm(p => ({ ...p, platform: e.target.value }))}>
              {PLATFORMS.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label>Stato</label>
            <select value={f.status}
              onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
              <option value="confirmed">Confermata</option>
              <option value="pending">In attesa</option>
            </select>
          </div>

        </div>

        <div className="form-group" style={{ marginTop: '1rem' }}>
          <label>Note</label>
          <textarea
            value={f.notes}
            onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
        </div>

        <div style={{ display: 'flex', gap: '0.8rem', marginTop: '1.2rem' }}>
          <button className="btn-primary" onClick={save} style={{ flex: 1 }}>
            {saving ? 'Salvataggio…' : 'Salva'}
          </button>

          <button className="btn-cancel" onClick={() => setModal(false)}>
            Annulla
          </button>
        </div>

      </Modal>

      <style>{`
        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
        }

        .form-group label {
          font-size: 0.65rem;
          text-transform: uppercase;
          color: var(--salt-faint);
        }

        @media (max-width: 768px) {
          .form-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

    </div>
  )
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'short'
  })
}
