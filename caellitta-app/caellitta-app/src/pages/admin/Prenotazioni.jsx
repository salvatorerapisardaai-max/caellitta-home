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
  amount_deposit: 0,
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

    const payload = {
      ...form,
      guests_count: parseInt(form.guests_count),
      amount_total: parseFloat(form.amount_total) || 0,
      amount_deposit: parseFloat(form.amount_deposit) || 0
    }

    if (editing) {
      await sb.from('bookings').update(payload).eq('id', editing)
    } else {
      const code =
        'CAELLITTA-' +
        new Date().getFullYear() +
        '-' +
        String(bookings.length + 1).padStart(3, '0')

      const { data: guest } = await sb
        .from('guests')
        .insert({
          name: form.guest_name,
          email: form.guest_email,
          phone: form.guest_phone
        })
        .select()
        .single()

      await sb.from('bookings').insert({
        ...payload,
        code,
        guest_id: guest?.id
      })
    }

    setSaving(false)
    setModal(false)
    load()
  }

  async function deleteBooking(id) {
    if (!confirm('Eliminare questa prenotazione?')) return
    await sb.from('bookings').update({ status: 'cancelled' }).eq('id', id)
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
          gap: '0.8rem',
          flexWrap: 'wrap',
          marginBottom: '1.5rem'
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            flexWrap: 'wrap'
          }}
        >
          {['all', 'confirmed', 'pending', 'completed', 'cancelled'].map(s => (
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

      {/* STATS */}
      <div
        style={{
          display: 'flex',
          border: '1px solid var(--gold-dim)',
          marginBottom: '1.2rem',
          overflow: 'hidden',
          flexWrap: 'wrap'
        }}
      >
        {[
          { label: 'Totale', val: bookings.filter(b => b.status !== 'cancelled').length },
          { label: 'Confermate', val: bookings.filter(b => b.status === 'confirmed').length },
          { label: 'In attesa', val: bookings.filter(b => b.status === 'pending').length },
          {
            label: 'Entrate tot.',
            val:
              '€' +
              bookings
                .filter(b => b.status !== 'cancelled')
                .reduce((s, b) => s + (b.amount_total || 0), 0)
                .toLocaleString('it')
          }
        ].map((s, i, arr) => (
          <div
            key={s.label}
            style={{
              flex: '1 1 120px',
              padding: '1rem',
              textAlign: 'center',
              borderRight: i < arr.length - 1 ? '1px solid var(--gold-dim)' : 'none'
            }}
          >
            <div
              style={{
                fontFamily: "'Cormorant Garamond',serif",
                fontSize: '1.5rem',
                color: 'var(--gold)'
              }}
            >
              {s.val}
            </div>
            <div
              style={{
                fontSize: '0.55rem',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'var(--salt-faint)'
              }}
            >
              {s.label}
            </div>
          </div>
        ))}
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
              background: 'var(--lava-card)'
            }}
          >
            <div>
              <div style={{ fontFamily: "'Cormorant Garamond',serif" }}>
                {b.guest_name}
              </div>
              <div style={{ fontSize: '0.6rem', color: 'var(--salt-faint)' }}>
                {b.code}
              </div>
            </div>

            <div style={{ fontSize: '0.72rem' }}>
              {fmtDate(b.check_in)} → {fmtDate(b.check_out)}
            </div>

            <div style={{ color: 'var(--gold)' }}>€{b.amount_total}</div>

            <span className={`badge ${STATUSES[b.status]}`}>
              {STATUS_LABELS[b.status]}
            </span>

            <div style={{ fontSize: '0.65rem' }}>{b.guest_phone || '—'}</div>

            <div style={{ display: 'flex', gap: '0.4rem' }}>
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
      >
        <div className="form-row">
          <input
            className="form-input"
            value={f.guest_name}
            onChange={e => setForm(p => ({ ...p, guest_name: e.target.value }))}
            placeholder="Nome ospite"
          />
          <input
            className="form-input"
            value={f.guest_email}
            onChange={e => setForm(p => ({ ...p, guest_email: e.target.value }))}
            placeholder="Email"
          />
        </div>

        <div className="form-row">
          <input
            type="date"
            className="form-input"
            value={f.check_in}
            onChange={e => setForm(p => ({ ...p, check_in: e.target.value }))}
          />
          <input
            type="date"
            className="form-input"
            value={f.check_out}
            onChange={e => setForm(p => ({ ...p, check_out: e.target.value }))}
          />
        </div>

        <button className="btn-primary" onClick={save} disabled={saving}>
          {saving ? 'Salvataggio…' : 'Salva'}
        </button>
      </Modal>
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
