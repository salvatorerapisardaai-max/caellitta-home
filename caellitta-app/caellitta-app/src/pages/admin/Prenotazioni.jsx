import React, { useEffect, useState } from 'react'
import { sb } from '../../lib/supabase'
import Modal from '../../components/Modal'

const PLATFORMS = ['Airbnb', 'Booking.com', 'Diretto']

const STATUSES = {
  confirmed: 'badge-green',
  pending: 'badge-amber',
  completed: 'badge-gray',
  cancelled: 'badge-red'
}

const STATUS_LABELS = {
  confirmed: 'Confermata',
  pending: 'In attesa',
  completed: 'Completata',
  cancelled: 'Annullata'
}

const EMPTY = {
  guest_name: '',
  guest_email: '',
  guest_phone: '',
  check_in: '',
  check_out: '',
  guests_count: 2,
  amount_total: '',
  amount_deposit: '',
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

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const { data } = await sb
      .from('bookings')
      .select('*')
      .order('check_in', { ascending: false })

    setBookings(data || [])
  }

  function openNew() {
    setForm(EMPTY)
    setEditing(null)
    setModal(true)
  }

  function openEdit(b) {
    setForm({
      ...b,
      check_in: b.check_in?.slice(0, 10),
      check_out: b.check_out?.slice(0, 10)
    })
    setEditing(b.id)
    setModal(true)
  }

  async function save() {
    if (!form.guest_name || !form.check_in || !form.check_out) return

    setSaving(true)

    const { nights, ...safe } = form
    
    const payload = {
      ...safe,
      guests_count: Number(form.guests_count),
      amount_total: Number(form.amount_total) || 0,
      amount_deposit: Number(form.amount_deposit) || 0
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
      console.error(err)
      alert('Errore salvataggio: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function deleteBooking(id) {
    if (!confirm('Eliminare questa prenotazione?')) return

    await sb
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', id)

    load()
  }

  const filtered =
    filterStatus === 'all'
      ? bookings
      : bookings.filter(b => b.status === filterStatus)

  const f = form

  return (
    <div>

      {/* HEADER FIX MOBILE */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.8rem',
          marginBottom: '1.5rem'
        }}
      >
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {['all','confirmed','pending','completed','cancelled'].map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className="btn-sm"
              style={{
                whiteSpace: 'nowrap',
                ...(filterStatus === s
                  ? { borderColor: 'var(--gold)', color: 'var(--gold)' }
                  : {})
              }}
            >
              {s === 'all' ? 'Tutte' : STATUS_LABELS[s]}
            </button>
          ))}
        </div>

        <button
          className="btn-primary"
          onClick={openNew}
          style={{
            whiteSpace: 'nowrap',
            flexShrink: 0
          }}
        >
          + Nuova prenotazione
        </button>
      </div>

      {/* LIST */}
      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          Nessuna prenotazione
        </div>
      ) : (
        filtered.map(b => (
          <div
            key={b.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1.4fr 1fr 1fr 0.8fr auto',
              gap: '1rem',
              padding: '0.9rem 1.2rem',
              border: '1px solid var(--gold-dim)',
              marginBottom: '0.5rem',
              background: 'var(--lava-card)',
              alignItems: 'center',
              minWidth: 0
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                {b.guest_name}
              </div>
              <div style={{ fontSize: '0.6rem', color: 'var(--salt-faint)' }}>
                {b.code}
              </div>
            </div>

            <div style={{ fontSize: '0.72rem' }}>
              {fmtDate(b.check_in)} → {fmtDate(b.check_out)}
            </div>

            <div style={{ color: 'var(--gold)' }}>
              €{b.amount_total}
            </div>

            <span className={`badge ${STATUSES[b.status]}`}>
              {STATUS_LABELS[b.status]}
            </span>

            <div style={{ fontSize: '0.65rem' }}>
              {b.guest_phone || '—'}
            </div>

            <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
              <button className="btn-sm" onClick={() => openEdit(b)}>✏</button>
              <button className="btn-sm danger" onClick={() => deleteBooking(b.id)}>✕</button>
            </div>
          </div>
        ))
      )}

      {/* MODAL */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editing ? 'Modifica prenotazione' : 'Nuova prenotazione'}
        subtitle="Compila i campi della prenotazione"
      >
        <div className="form-grid">

          <div className="form-group">
            <label className="form-label">Nome ospite *</label>
            <input
              className="form-input"
              value={f.guest_name}
              onChange={e => setForm(p => ({ ...p, guest_name: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Piattaforma</label>
            <select
              className="form-input"
              value={f.platform}
              onChange={e => setForm(p => ({ ...p, platform: e.target.value }))}
            >
              {PLATFORMS.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
          <label className="form-label">Stato</label>
          <select
              className="form-input"
              value={f.status}
              onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
            >
              <option value="confirmed">Confermata</option>
              <option value="pending">In attesa</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Importo totale €</label>
            <input
              type="number"
              className="form-input"
              value={f.amount_total}
              onChange={e => setForm(p => ({ ...p, amount_total: e.target.value }))}
            />
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Note (opzionale)</label>
            <textarea
              className="form-textarea"
              value={f.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              className="form-input"
              value={f.guest_email}
              onChange={e => setForm(p => ({ ...p, guest_email: e.target.value }))}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Check-in *</label>
            <input
              type="date"
              className="form-input"
              value={f.check_in}
              onChange={e => setForm(p => ({ ...p, check_in: e.target.value }))}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Check-out *</label>
            <input
              type="date"
              className="form-input"
              value={f.check_out}
              onChange={e => setForm(p => ({ ...p, check_out: e.target.value }))}
            />
          </div>

        </div>

        <div style={{ display: 'flex', gap: '0.8rem', marginTop: '1.2rem', flexWrap: 'wrap' }}>
        
          {/* SALVA */}
          <button
            className="btn-primary"
            style={{ flex: 1 }}
            onClick={save}
            disabled={saving}
          >
            {saving ? 'Salvataggio…' : editing ? 'Aggiorna' : 'Salva'}
          </button>
        
          {/* ANNULLA (CHIUDI MODAL) */}
          <button className="btn-cancel" onClick={() => setModal(false)}>
            Annulla
          </button>
        
          {/* ❗ ANNULLA PRENOTAZIONE (SOLO IN MODIFICA) */}
          {editing && (
            <button
              className="btn-sm danger"
              onClick={() => {
                if (confirm('Vuoi annullare questa prenotazione?')) {
                  setForm(p => ({ ...p, status: 'cancelled' }))
                  setTimeout(save, 100)
                }
              }}
              style={{ flexBasis: '100%' }}   // 👈 va sotto su mobile
            >
              Annulla prenotazione
            </button>
          )}
        
        </div>
      </Modal>

      {/* RESPONSIVE FIX */}
      <style>{`
        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
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

/* UTILS */
function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'short'
  })
}
