import React, { useEffect, useState } from 'react'
import { sb } from '../../lib/supabase'
import Modal from '../../components/Modal'
import { useActiveProperty } from '../../lib/PropertyContext'

const PLATFORMS = ['Airbnb', 'Booking.com', 'Diretto', 'Collaboratore']
const STATUSES = { confirmed: 'badge-green', pending: 'badge-amber', completed: 'badge-gray', cancelled: 'badge-red' }
const STATUS_LABELS = { confirmed: 'Confermata', pending: 'In attesa', completed: 'Completata', cancelled: 'Annullata' }
const PAYMENT_LABELS = { unpaid: 'Da incassare', deposit_paid: 'Acconto versato', paid: 'Saldato' }
const PAYMENT_BADGES = { unpaid: 'badge-red', deposit_paid: 'badge-amber', paid: 'badge-green' }

const EMPTY = {
  guest_name: '', guest_email: '', guest_phone: '',
  check_in: '', check_out: '', guests_count: 1,
  amount_total: '', amount_deposit: '', platform: 'Airbnb',
  status: 'confirmed', payment_status: 'unpaid', notes: '',
  checkin_by: '', checkout_by: '', cleaning_by: '',
  birth_date: '', birth_place: '', gender: '', document_type: '', document_number: '', nationality: ''
}

// Raggruppa righe di blocked_dates in intervalli continui (stesso motivo/fonte,
// date consecutive), così un blocco lungo non diventa una riga per ogni singolo giorno.
function groupConsecutiveBlocks(rows) {
  const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date))
  const groups = []
  for (const r of sorted) {
    const last = groups[groups.length - 1]
    const expectedNext = last ? addDays(last.end, 1) : null
    if (last && r.date === expectedNext && r.reason === last.reason && r.source === last.source) {
      last.end = r.date
      last.ids.push(r.id)
    } else {
      groups.push({ start: r.date, end: r.date, reason: r.reason, source: r.source, ids: [r.id] })
    }
  }
  return groups
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return toISODate(d)
}

// Un gruppo "tocca" un mese se una qualsiasi delle sue notti cade in quel mese (YYYY-MM)
function groupTouchesMonth(group, month) {
  if (!month) return true
  return group.start.slice(0, 7) <= month && group.end.slice(0, 7) >= month
}

export default function Prenotazioni() {
  const { activePropertyId } = useActiveProperty()
  const [bookings, setBookings] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState(null)
  const [editingOriginal, setEditingOriginal] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [filterStatus, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [blockedDates, setBlockedDates] = useState([])
  const [blockedMonth, setBlockedMonth] = useState(new Date().toISOString().slice(0, 7))
  const [newBlockStart, setNewBlockStart] = useState('')
  const [newBlockEnd, setNewBlockEnd] = useState('')
  const [newBlockReason, setNewBlockReason] = useState('')
  const [blockError, setBlockError] = useState('')
  const [collaborators, setCollaborators] = useState([])
  const [otherGuests, setOtherGuests] = useState([])

  useEffect(() => {
    if (activePropertyId) { load(); loadBlocked(); loadCollaborators() }
  }, [activePropertyId])

  async function load() {
    const { data, error } = await sb.from('bookings').select('*').eq('property_id', activePropertyId).order('check_in', { ascending: false })
    if (error) { console.error('load error:', error); return }
    setBookings(data || [])
  }

  async function loadCollaborators() {
    const { data } = await sb.from('collaborators').select('id,name,email').eq('property_id', activePropertyId)
    setCollaborators(data || [])
  }

  async function loadBlocked() {
    const { data } = await sb.from('blocked_dates').select('*').eq('property_id', activePropertyId).order('date')
    setBlockedDates(data || [])
  }

  async function addBlockedDate() {
    setBlockError('')
    if (!newBlockStart) return
    // Se non indicata una fine, blocca la sola data di inizio (comportamento precedente)
    const start = newBlockStart
    const end = newBlockEnd || newBlockStart
    if (end < start) { setBlockError('La data di fine non può precedere quella di inizio.'); return }

    const rows = []
    for (let d = new Date(start + 'T00:00:00'); toISODate(d) <= end; d.setDate(d.getDate() + 1)) {
      rows.push({ date: toISODate(d), reason: newBlockReason || 'Bloccato', property_id: activePropertyId })
    }
    const { error } = await sb.from('blocked_dates').upsert(rows, { onConflict: 'date,property_id' })
    if (error) { setBlockError('Errore: ' + error.message); return }
    setNewBlockStart(''); setNewBlockEnd(''); setNewBlockReason('')
    loadBlocked()
  }

  async function removeBlockedDate(id) {
    await sb.from('blocked_dates').delete().eq('id', id)
    loadBlocked()
  }

  async function removeBlockedGroup(ids) {
    if (ids.length > 1 && !confirm(`Sbloccare tutte le ${ids.length} notti di questo intervallo?`)) return
    await sb.from('blocked_dates').delete().in('id', ids)
    loadBlocked()
  }

  function openNew() { setForm(EMPTY); setEditing(null); setEditingOriginal(null); setOtherGuests([]); setSaveError(''); setModal(true) }

  async function openEdit(b) {
    setForm({
      guest_name:   b.guest_name   || '',
      guest_email:  b.guest_email  || '',
      guest_phone:  b.guest_phone  || '',
      check_in:     b.check_in?.slice(0, 10) || '',
      check_out:    b.check_out?.slice(0, 10) || '',
      guests_count: b.guests_count || 1,
      amount_total: b.amount_total || '',
      amount_deposit: b.amount_deposit || '',
      platform:     b.platform     || 'Airbnb',
      status:       b.status       || 'confirmed',
      payment_status: b.payment_status || 'unpaid',
      notes:        b.notes        || '',
      checkin_by:   b.checkin_by   || '',
      checkout_by:  b.checkout_by  || '',
      cleaning_by:  b.cleaning_by  || '',
      birth_date: '', birth_place: '', gender: '', document_type: '', document_number: '', nationality: ''
    })
    setEditing(b.id)
    setEditingOriginal(b)
    setSaveError('')
    setModal(true)

    const { data: og } = await sb.from('booking_guests').select('*').eq('booking_id', b.id).order('created_at')
    setOtherGuests((og || []).map(g => ({
      _key: g.id, role_code: g.role_code || '19',
      first_name: g.first_name || '', last_name: g.last_name || '',
      gender: g.gender || '', birth_date: g.birth_date || '', birth_place: g.birth_place || '',
      birth_country: g.birth_country || '', citizenship: g.citizenship || '',
      document_type: g.document_type || '', document_number: g.document_number || '',
    })))

    if (b.guest_id) {
      const { data: guest } = await sb.from('guests')
        .select('birth_date,birth_place,gender,document_type,document_number,nationality')
        .eq('id', b.guest_id).maybeSingle()
      if (guest) {
        setForm(p => ({
          ...p,
          birth_date: guest.birth_date || '',
          birth_place: guest.birth_place || '',
          gender: guest.gender || '',
          document_type: guest.document_type || '',
          document_number: guest.document_number || '',
          nationality: guest.nationality || '',
        }))
      }
    }
  }

  async function cancelBooking(id) {
    await sb.from('bookings').update({ status: 'cancelled' }).eq('id', id)
    load()
  }

  function addOtherGuest() {
    setOtherGuests(prev => [...prev, {
      _key: 'new-' + Date.now() + Math.random(), role_code: '19',
      first_name: '', last_name: '', gender: '', birth_date: '', birth_place: '',
      birth_country: '', citizenship: '', document_type: '', document_number: '',
    }])
  }
  function updateOtherGuest(key, field, value) {
    setOtherGuests(prev => prev.map(g => g._key === key ? { ...g, [field]: value } : g))
  }
  function removeOtherGuest(key) {
    setOtherGuests(prev => prev.filter(g => g._key !== key))
  }

  async function hardDeleteBooking(id) {
    if (!confirm('Eliminare definitivamente?')) return
    await sb.from('bookings').delete().eq('id', id)
    load()
  }

  // Sostituisce tutti gli ospiti aggiuntivi di una prenotazione con quelli attuali nel form.
  // Cancella e re-inserisce: semplice e sicuro per il volume tipico (pochi ospiti a prenotazione).
  async function syncOtherGuests(bookingId) {
    await sb.from('booking_guests').delete().eq('booking_id', bookingId)
    const rows = otherGuests
      .filter(g => g.first_name.trim() || g.last_name.trim())
      .map(g => ({
        booking_id: bookingId,
        role_code: g.role_code,
        first_name: g.first_name || null,
        last_name: g.last_name || null,
        gender: g.gender || null,
        birth_date: g.birth_date || null,
        birth_place: g.birth_place || null,
        birth_country: g.birth_country || null,
        citizenship: g.citizenship || null,
        document_type: g.document_type || null,
        document_number: g.document_number || null,
      }))
    if (rows.length > 0) await sb.from('booking_guests').insert(rows)
  }

  // Accoda gli invii ISTAT Sicilia (arrivo + partenza) per una prenotazione confermata/completata.
  // Non bloccante: se fallisce (es. property_id mancante) non impedisce il salvataggio della prenotazione,
  // ma logga l'errore in console per diagnosi.
  async function enqueueIstatIfNeeded(bookingId, status) {
    if (status !== 'confirmed' && status !== 'completed') return
    const { error } = await sb.rpc('enqueue_istat_for_booking', { p_booking_id: bookingId })
    if (error) console.error('enqueue_istat_for_booking:', error.message)
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
      amount_deposit: Number(form.amount_deposit) || 0,
      platform:     form.platform,
      status:       form.status,
      payment_status: form.payment_status,
      notes:        form.notes,
      checkin_by:   form.checkin_by || null,
      checkout_by:  form.checkout_by || null,
      cleaning_by:  form.cleaning_by || null,
    }
    // Il timestamp si aggiorna solo quando l'assegnazione cambia davvero,
    // per non sovrascrivere l'orario reale di chi lo ha già segnato da sé
    if (form.checkin_by && form.checkin_by !== editingOriginal?.checkin_by) payload.checkin_at = new Date().toISOString()
    if (form.checkout_by && form.checkout_by !== editingOriginal?.checkout_by) payload.checkout_at = new Date().toISOString()
    if (form.cleaning_by && form.cleaning_by !== editingOriginal?.cleaning_by) payload.cleaning_at = new Date().toISOString()

    // Dati anagrafici per la futura comunicazione Alloggiati Web (solo ospite principale)
    const guestDocPayload = {
      birth_date: form.birth_date || null,
      birth_place: form.birth_place || null,
      gender: form.gender || null,
      document_type: form.document_type || null,
      document_number: form.document_number || null,
      nationality: form.nationality || null,
    }

    try {
      if (editing) {
        const { error } = await sb.from('bookings').update(payload).eq('id', editing)
        if (error) throw error
        if (editingOriginal?.guest_id) {
          await sb.from('guests').update(guestDocPayload).eq('id', editingOriginal.guest_id)
        }
        await syncOtherGuests(editing)
        await enqueueIstatIfNeeded(editing, payload.status)
      } else {
        // Riusa l'ospite esistente (stessa email) invece di duplicarlo in "guests"
        let guestId = null
        if (form.guest_email) {
          const { data: existing } = await sb.from('guests').select('id').eq('email', form.guest_email).maybeSingle()
          guestId = existing?.id || null
        }
        if (!guestId) {
          const { data: guest, error: gErr } = await sb.from('guests')
            .insert({ name: form.guest_name, email: form.guest_email || null, phone: form.guest_phone || null, property_id: activePropertyId, ...guestDocPayload })
            .select().single()
          if (gErr) throw gErr
          guestId = guest?.id
        } else {
          await sb.from('guests').update(guestDocPayload).eq('id', guestId)
        }
        // Il codice prenotazione è assegnato dal trigger set_booking_code lato database
        const { data: newBooking, error: bErr } = await sb.from('bookings')
          .insert({ ...payload, guest_id: guestId, property_id: activePropertyId }).select('id').single()
        if (bErr) throw bErr
        if (newBooking?.id) {
          await syncOtherGuests(newBooking.id)
          await enqueueIstatIfNeeded(newBooking.id, payload.status)
        }
      }
      await load()
      setModal(false)
      setEditing(null)
      setEditingOriginal(null)
    } catch (err) {
      console.error('save error:', err)
      setSaveError('Errore: ' + (err.message || JSON.stringify(err)))
    } finally {
      setSaving(false)
    }
  }

  const bySearch = bookings.filter(b => {
    if (!search.trim()) return true
    const q = search.trim().toLowerCase()
    return b.guest_name?.toLowerCase().includes(q) || b.code?.toLowerCase().includes(q)
  })
  const filtered = filterStatus === 'all' ? bySearch : bySearch.filter(b => b.status === filterStatus)
  const collabById = Object.fromEntries(collaborators.map(c => [c.id, c]))
  const f = form

  const blockedGroups = groupConsecutiveBlocks(blockedDates)
  const visibleBlockedGroups = blockedGroups.filter(g => groupTouchesMonth(g, blockedMonth))
  const monthLabel = blockedMonth
    ? new Date(blockedMonth + '-01T00:00:00').toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
    : null

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
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {['all','confirmed','pending','completed','cancelled'].map(s => (
            <button key={s} onClick={() => setFilter(s)} className="btn-sm"
              style={filterStatus === s ? { borderColor: 'var(--gold)', color: 'var(--gold)' } : {}}>
              {s === 'all' ? 'Tutte' : STATUS_LABELS[s]}
            </button>
          ))}
          <input
            className="form-input"
            style={{ width: 180, fontSize: '0.78rem', padding: '0.45rem 0.7rem' }}
            placeholder="Cerca ospite o codice…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
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
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.05rem' }}>
                {b.guest_name}
                {b.notes && b.notes.includes('Importata automaticamente da iCal') && (
                  <span style={{ marginLeft: '0.6rem', fontSize: '0.55rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8a6a1f', border: '1px solid rgba(224,168,98,.4)', padding: '0.15rem 0.45rem', verticalAlign: 'middle' }}>
                    dati da completare
                  </span>
                )}
              </div>
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
            <span>📥 {fmtDate(b.check_in)} → 📤 {fmtDate(b.check_out)} · {b.nights ?? '—'} notti</span>
            <span>👤 {b.guests_count} · {b.platform}</span>
            <span style={{ color: 'var(--gold)', fontFamily: "'Cormorant Garamond',serif", fontSize: '0.95rem' }}>€{b.amount_total}</span>
            <span className={`badge ${STATUSES[b.status] || 'badge-gray'}`}>
              {STATUS_LABELS[b.status] || b.status}
            </span>
            <span className={`badge ${PAYMENT_BADGES[b.payment_status] || 'badge-gray'}`}>
              {PAYMENT_LABELS[b.payment_status] || '—'}
            </span>
            {b.collaborator_id && (
              <span style={{ fontSize: '0.68rem', color: 'var(--gold)' }}>
                🤝 {collabById[b.collaborator_id]?.name || collabById[b.collaborator_id]?.email || 'Collaboratore'}
                {' · commissione '}{b.commission_pct}% = €{b.commission_due?.toFixed(2)}
                {b.commission_settled ? ' ✓' : ''}
              </span>
            )}
          </div>
          {(b.checkin_by || b.checkout_by || b.cleaning_by) && (
            <div className="pren-card-meta" style={{ marginTop: '0.3rem', fontSize: '0.68rem' }}>
              {b.checkin_by && <span>🔑 Check-in: {collabById[b.checkin_by]?.name || '—'}</span>}
              {b.checkout_by && <span>🚪 Check-out: {collabById[b.checkout_by]?.name || '—'}</span>}
              {b.cleaning_by && <span>🧹 Pulizie: {collabById[b.cleaning_by]?.name || '—'}</span>}
            </div>
          )}
        </div>
      ))}

      {/* DATE BLOCCATE — chiusure manuali + blocchi tecnici OTA, raggruppate per intervallo continuo */}
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <div className="sec-hdr" style={{ flexWrap: 'wrap', gap: '0.6rem' }}>
          <span className="sec-title">Date bloccate</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              className="form-input" type="month"
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.6rem' }}
              value={blockedMonth}
              onChange={e => setBlockedMonth(e.target.value)}
            />
            {blockedMonth && (
              <button className="btn-sm" onClick={() => setBlockedMonth('')}>Vedi tutti i mesi</button>
            )}
          </div>
        </div>
        {blockError && (
          <div style={{ background: 'rgba(138,72,72,.15)', border: '1px solid rgba(138,72,72,.4)', padding: '0.6rem 0.9rem', marginBottom: '1rem', fontSize: '0.75rem', color: '#963832' }}>
            {blockError}
          </div>
        )}
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '1rem', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Da</label>
            <input className="form-input" type="date" value={newBlockStart} onChange={e => setNewBlockStart(e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">A (opzionale)</label>
            <input className="form-input" type="date" value={newBlockEnd} onChange={e => setNewBlockEnd(e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: 160 }}>
            <label className="form-label">Motivo</label>
            <input className="form-input" value={newBlockReason} onChange={e => setNewBlockReason(e.target.value)} placeholder="Es. Manutenzione caldaia" />
          </div>
          <button className="btn-primary" onClick={addBlockedDate} disabled={!newBlockStart}>+ Blocca</button>
        </div>

        {blockedGroups.length === 0 ? (
          <p style={{ fontSize: '0.78rem', color: 'var(--salt-faint)' }}>Nessuna data bloccata</p>
        ) : visibleBlockedGroups.length === 0 ? (
          <p style={{ fontSize: '0.78rem', color: 'var(--salt-faint)' }}>
            Nessun blocco in {monthLabel}. {blockedGroups.length} intervalli bloccati in totale — cambia mese o clicca "Vedi tutti i mesi".
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {visibleBlockedGroups.map((g, i) => {
              const nights = Math.round((new Date(g.end) - new Date(g.start)) / 86400000) + 1
              const isManual = !g.source || g.source === 'manual'
              return (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: 'var(--lava-card)', border: '1px solid var(--gold-dim)', padding: '0.6rem 0.9rem',
                }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--salt-dim)' }}>
                    <strong style={{ color: 'var(--gold)', fontWeight: 400 }}>
                      {fmtDate(g.start)}{g.end !== g.start ? ` → ${fmtDate(g.end)}` : ''}
                    </strong>
                    {' '}({nights} {nights === 1 ? 'notte' : 'notti'}) — {g.reason}
                    {!isManual && (
                      <span style={{ fontSize: '0.6rem', color: 'var(--salt-faint)' }}> · sincronizzato da {g.source === 'airbnb' ? 'Airbnb' : 'Booking.com'}</span>
                    )}
                  </span>
                  {isManual ? (
                    <button className="btn-sm danger" onClick={() => removeBlockedGroup(g.ids)}>✕</button>
                  ) : (
                    <span style={{ fontSize: '0.6rem', color: 'var(--salt-faint)', fontStyle: 'italic' }}>gestito automaticamente</span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* MODAL */}
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Modifica' : 'Nuova prenotazione'}>
        {saveError && (
          <div style={{ background: 'rgba(138,72,72,.15)', border: '1px solid rgba(138,72,72,.4)', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.78rem', color: '#963832', lineHeight: 1.6 }}>
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
            <label className="form-label">Acconto ricevuto €</label>
            <input className="form-input" type="number" value={f.amount_deposit} onChange={e => setForm(p => ({ ...p, amount_deposit: e.target.value }))} placeholder="0" />
          </div>
          <div className="form-group">
            <label className="form-label">Piattaforma</label>
            <select className="form-select" value={f.platform} onChange={e => setForm(p => ({ ...p, platform: e.target.value }))}>
              {PLATFORMS.map(pl => <option key={pl}>{pl}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Stato pagamento</label>
            <select className="form-select" value={f.payment_status} onChange={e => setForm(p => ({ ...p, payment_status: e.target.value }))}>
              <option value="unpaid">Da incassare</option>
              <option value="deposit_paid">Acconto versato</option>
              <option value="paid">Saldato</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Stato</label>
            <select className="form-select" value={f.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
              <option value="confirmed">Confermata</option>
              <option value="pending">In attesa</option>
              <option value="completed">Completata</option>
              <option value="cancelled">Annullata</option>
            </select>
          </div>
        </div>
        <div className="form-grid" style={{ marginTop: '0.5rem' }}>
          <div className="form-group">
            <label className="form-label">Check-in fatto da</label>
            <select className="form-select" value={f.checkin_by} onChange={e => setForm(p => ({ ...p, checkin_by: e.target.value }))}>
              <option value="">— Non assegnato —</option>
              {collaborators.map(c => <option key={c.id} value={c.id}>{c.name || c.email}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Check-out fatto da</label>
            <select className="form-select" value={f.checkout_by} onChange={e => setForm(p => ({ ...p, checkout_by: e.target.value }))}>
              <option value="">— Non assegnato —</option>
              {collaborators.map(c => <option key={c.id} value={c.id}>{c.name || c.email}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Pulizie fatte da</label>
            <select className="form-select" value={f.cleaning_by} onChange={e => setForm(p => ({ ...p, cleaning_by: e.target.value }))}>
              <option value="">— Non assegnato —</option>
              {collaborators.map(c => <option key={c.id} value={c.id}>{c.name || c.email}</option>)}
            </select>
          </div>
        </div>

        <div style={{ fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--salt-faint)', margin: '1rem 0 0.5rem' }}>
          Documento ospite (per Alloggiati Web — solo ospite principale)
        </div>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Data di nascita</label>
            <input className="form-input" type="date" value={f.birth_date} onChange={e => setForm(p => ({ ...p, birth_date: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Luogo di nascita</label>
            <input className="form-input" value={f.birth_place} onChange={e => setForm(p => ({ ...p, birth_place: e.target.value }))} placeholder="Es. Catania" />
          </div>
          <div className="form-group">
            <label className="form-label">Sesso</label>
            <select className="form-select" value={f.gender} onChange={e => setForm(p => ({ ...p, gender: e.target.value }))}>
              <option value="">— Non specificato —</option>
              <option value="M">M</option>
              <option value="F">F</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Tipo documento</label>
            <input className="form-input" value={f.document_type} onChange={e => setForm(p => ({ ...p, document_type: e.target.value }))} placeholder="Es. Carta d'identità" />
          </div>
          <div className="form-group">
            <label className="form-label">Numero documento</label>
            <input className="form-input" value={f.document_number} onChange={e => setForm(p => ({ ...p, document_number: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Nazionalità</label>
            <input className="form-input" value={f.nationality} onChange={e => setForm(p => ({ ...p, nationality: e.target.value }))} placeholder="Es. Italia" />
          </div>
        </div>
        <div className="form-group" style={{ marginTop: '0.5rem' }}>
          <label className="form-label">Note</label>
          <textarea className="form-textarea" value={f.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
        </div>

        {/* ALTRI OSPITI — famiglia/gruppo, per Alloggiati Web quando sono più di uno */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '1.2rem 0 0.5rem' }}>
          <span style={{ fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--salt-faint)' }}>
            Altri ospiti (famiglia/gruppo) — {otherGuests.length}
          </span>
          <button type="button" className="btn-sm" onClick={addOtherGuest}>+ Aggiungi ospite</button>
        </div>
        {otherGuests.length === 0 && (
          <p style={{ fontSize: '0.7rem', color: 'var(--salt-faint)', marginBottom: '0.5rem' }}>
            Solo il capofamiglia. Aggiungi qui gli altri componenti del gruppo, se presenti.
          </p>
        )}
        {otherGuests.map((g, idx) => (
          <div key={g._key} style={{ background: 'var(--lava-hover)', border: '1px solid var(--gold-dim2)', padding: '0.9rem 1rem', marginBottom: '0.6rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
              <span style={{ fontSize: '0.65rem', color: 'var(--gold)' }}>Ospite {idx + 2}</span>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <select className="form-select" style={{ width: 150, padding: '0.3rem 0.5rem', fontSize: '0.7rem' }}
                  value={g.role_code} onChange={e => updateOtherGuest(g._key, 'role_code', e.target.value)}>
                  <option value="19">Familiare</option>
                  <option value="20">Membro gruppo</option>
                </select>
                <button type="button" className="btn-sm danger" onClick={() => removeOtherGuest(g._key)}>✕</button>
              </div>
            </div>
            <div className="form-grid">
              <input className="form-input" placeholder="Nome" value={g.first_name} onChange={e => updateOtherGuest(g._key, 'first_name', e.target.value)} />
              <input className="form-input" placeholder="Cognome" value={g.last_name} onChange={e => updateOtherGuest(g._key, 'last_name', e.target.value)} />
              <input className="form-input" type="date" value={g.birth_date} onChange={e => updateOtherGuest(g._key, 'birth_date', e.target.value)} />
              <input className="form-input" placeholder="Luogo di nascita" value={g.birth_place} onChange={e => updateOtherGuest(g._key, 'birth_place', e.target.value)} />
              <select className="form-select" value={g.gender} onChange={e => updateOtherGuest(g._key, 'gender', e.target.value)}>
                <option value="">— Sesso —</option>
                <option value="M">M</option>
                <option value="F">F</option>
              </select>
              <input className="form-input" placeholder="Nazionalità" value={g.citizenship} onChange={e => updateOtherGuest(g._key, 'citizenship', e.target.value)} />
              <input className="form-input" placeholder="Tipo documento" value={g.document_type} onChange={e => updateOtherGuest(g._key, 'document_type', e.target.value)} />
              <input className="form-input" placeholder="Numero documento" value={g.document_number} onChange={e => updateOtherGuest(g._key, 'document_number', e.target.value)} />
            </div>
          </div>
        ))}
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

function toISODate(d) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}
