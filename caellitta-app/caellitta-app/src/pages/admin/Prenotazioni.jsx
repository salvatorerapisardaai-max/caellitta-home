import React, { useEffect, useState } from 'react'
import { sb } from '../../lib/supabase'
import Modal from '../../components/Modal'

const PLATFORMS = ['Airbnb', 'Booking.com', 'Diretto']
const STATUSES  = { confirmed: 'badge-green', pending: 'badge-amber', completed: 'badge-gray', cancelled: 'badge-red' }
const STATUS_LABELS = { confirmed: 'Confermata', pending: 'In attesa', completed: 'Completata', cancelled: 'Annullata' }

const EMPTY = {
  guest_name: '', guest_email: '', guest_phone: '',
  check_in: '', check_out: '', guests_count: 2,
  amount_total: '', amount_deposit: 0,
  platform: 'Airbnb', status: 'confirmed', notes: ''
}

export default function Prenotazioni() {
  const [bookings, setBookings]   = useState([])
  const [modal, setModal]         = useState(false)
  const [form, setForm]           = useState(EMPTY)
  const [editing, setEditing]     = useState(null)
  const [saving, setSaving]       = useState(false)
  const [filterStatus, setFilter] = useState('all')

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await sb.from('bookings').select('*').order('check_in', { ascending: false })
    setBookings(data || [])
  }

  function openNew() { setForm(EMPTY); setEditing(null); setModal(true) }
  function openEdit(b) {
    setForm({ ...b, check_in: b.check_in?.slice(0,10), check_out: b.check_out?.slice(0,10) })
    setEditing(b.id); setModal(true)
  }

  async function save() {
    if (!form.guest_name || !form.check_in || !form.check_out) return
    setSaving(true)
    const nights = Math.round((new Date(form.check_out) - new Date(form.check_in)) / 86400000)
    const payload = { ...form, guests_count: parseInt(form.guests_count), amount_total: parseFloat(form.amount_total) || 0, amount_deposit: parseFloat(form.amount_deposit) || 0 }

    if (editing) {
      await sb.from('bookings').update(payload).eq('id', editing)
    } else {
      const code = 'CAELLITTA-' + new Date().getFullYear() + '-' + String(bookings.length + 1).padStart(3, '0')
      const { data: guest } = await sb.from('guests').insert({ name: form.guest_name, email: form.guest_email, phone: form.guest_phone }).select().single()
      await sb.from('bookings').insert({ ...payload, code, guest_id: guest?.id })
    }
    setSaving(false); setModal(false); load()
  }

  async function deleteBooking(id) {
    if (!confirm('Eliminare questa prenotazione?')) return
    await sb.from('bookings').update({ status: 'cancelled' }).eq('id', id)
    load()
  }

  const filtered = filterStatus === 'all' ? bookings : bookings.filter(b => b.status === filterStatus)
  const f = form

  return (
    <div>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {['all','confirmed','pending','completed','cancelled'].map(s => (
            <button key={s} onClick={() => setFilter(s)} className="btn-sm" style={filterStatus === s ? { borderColor: 'var(--gold)', color: 'var(--gold)' } : {}}>
              {s === 'all' ? 'Tutte' : STATUS_LABELS[s]}
            </button>
          ))}
        </div>
        <button className="btn-primary" onClick={openNew}>+ Nuova prenotazione</button>
      </div>

      {/* MINI STATS */}
      <div style={{ display: 'flex', border: '1px solid var(--gold-dim)', marginBottom: '1.2rem', overflow: 'hidden' }}>
        {[
          { label: 'Totale', val: bookings.filter(b => b.status !== 'cancelled').length },
          { label: 'Confermate', val: bookings.filter(b => b.status === 'confirmed').length },
          { label: 'In attesa', val: bookings.filter(b => b.status === 'pending').length },
          { label: 'Entrate tot.', val: '€' + bookings.filter(b=>b.status!=='cancelled').reduce((s,b)=>s+(b.amount_total||0),0).toLocaleString('it') },
        ].map((s, i, arr) => (
          <div key={s.label} style={{
            flex: 1, padding: '1rem', textAlign: 'center',
            borderRight: i < arr.length - 1 ? '1px solid var(--gold-dim)' : 'none'
          }}>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.5rem', color: 'var(--gold)' }}>{s.val}</div>
            <div style={{ fontSize: '0.55rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--salt-faint)', marginTop: '0.2rem' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* LIST */}
      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--salt-faint)', fontSize: '0.85rem', padding: '3rem' }}>
          Nessuna prenotazione
        </div>
      ) : filtered.map(b => (
        <div key={b.id} style={{
          display: 'grid', gridTemplateColumns: '2fr 1.4fr 1fr 1fr 0.8fr auto',
          alignItems: 'center', gap: '1rem', padding: '0.9rem 1.3rem',
          background: 'var(--lava-card)', border: '1px solid var(--gold-dim)',
          marginBottom: '0.5rem', transition: 'border-color .22s',
        }}
          onMouseEnter={e => e.currentTarget.style.borderColor='rgba(201,171,114,.28)'}
          onMouseLeave={e => e.currentTarget.style.borderColor='var(--gold-dim)'}
        >
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1rem' }}>{b.guest_name}</div>
            <div style={{ fontFamily: 'monospace', fontSize: '0.6rem', color: 'rgba(201,171,114,.45)', marginTop: '0.15rem' }}>{b.code}</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--salt-faint)', marginTop: '0.1rem' }}>{b.platform}</div>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--salt-dim)' }}>
            {fmtDate(b.check_in)} → {fmtDate(b.check_out)}
            <div style={{ fontSize: '0.65rem', color: 'var(--salt-faint)' }}>{b.nights || nightsBetween(b.check_in, b.check_out)} notti · {b.guests_count} ospiti</div>
          </div>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.1rem', color: 'var(--gold)' }}>€{b.amount_total}</div>
          <span className={`badge ${STATUSES[b.status] || 'badge-gray'}`}>{STATUS_LABELS[b.status] || b.status}</span>
          <div style={{ fontSize: '0.65rem', color: 'var(--salt-faint)' }}>{b.guest_phone || '—'}</div>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button className="btn-sm" onClick={() => openEdit(b)}>✏</button>
            <button className="btn-sm danger" onClick={() => deleteBooking(b.id)}>✕</button>
          </div>
        </div>
      ))}

      {/* MODAL */}
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Modifica prenotazione' : 'Nuova prenotazione'} subtitle="Compila i campi della prenotazione">
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Nome ospite *</label>
            <input className="form-input" value={f.guest_name} onChange={e => setForm(p=>({...p,guest_name:e.target.value}))} placeholder="Mario Rossi" />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" value={f.guest_email} onChange={e => setForm(p=>({...p,guest_email:e.target.value}))} placeholder="mario@email.it" />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Telefono</label>
            <input className="form-input" value={f.guest_phone} onChange={e => setForm(p=>({...p,guest_phone:e.target.value}))} placeholder="+39 333..." />
          </div>
          <div className="form-group">
            <label className="form-label">Piattaforma</label>
            <select className="form-select" value={f.platform} onChange={e => setForm(p=>({...p,platform:e.target.value}))}>
              {PLATFORMS.map(pl => <option key={pl}>{pl}</option>)}
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Check-in *</label>
            <input className="form-input" type="date" value={f.check_in} onChange={e => setForm(p=>({...p,check_in:e.target.value}))} />
          </div>
          <div className="form-group">
            <label className="form-label">Check-out *</label>
            <input className="form-input" type="date" value={f.check_out} onChange={e => setForm(p=>({...p,check_out:e.target.value}))} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">N° ospiti</label>
            <input className="form-input" type="number" min="1" max="10" value={f.guests_count} onChange={e => setForm(p=>({...p,guests_count:e.target.value}))} />
          </div>
          <div className="form-group">
            <label className="form-label">Stato</label>
            <select className="form-select" value={f.status} onChange={e => setForm(p=>({...p,status:e.target.value}))}>
              {Object.entries(STATUS_LABELS).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Importo totale €</label>
            <input className="form-input" type="number" value={f.amount_total} onChange={e => setForm(p=>({...p,amount_total:e.target.value}))} placeholder="0.00" />
          </div>
          <div className="form-group">
            <label className="form-label">Caparra €</label>
            <input className="form-input" type="number" value={f.amount_deposit} onChange={e => setForm(p=>({...p,amount_deposit:e.target.value}))} placeholder="0.00" />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Note</label>
          <textarea className="form-textarea" value={f.notes} onChange={e => setForm(p=>({...p,notes:e.target.value}))} placeholder="Arrivo tardivo, richieste speciali..." />
        </div>
        <div style={{ display: 'flex', gap: '0.8rem', marginTop: '1.8rem' }}>
          <button className="btn-primary" style={{ flex: 1 }} onClick={save} disabled={saving}>
            {saving ? 'Salvataggio…' : editing ? 'Aggiorna' : 'Salva prenotazione'}
          </button>
          <button className="btn-cancel" onClick={() => setModal(false)}>Annulla</button>
        </div>
      </Modal>
    </div>
  )
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })
}
function nightsBetween(ci, co) {
  if (!ci || !co) return 0
  return Math.round((new Date(co) - new Date(ci)) / 86400000)
}
