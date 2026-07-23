import React, { useEffect, useState } from 'react'
import { sb } from '../../lib/supabase'
import Modal from '../../components/Modal'
import { getStoredCode, clearStoredCode } from '../../lib/collaboratorAuth'

const EMPTY_BOOKING = { guest_name: '', check_in: '', check_out: '', guests_count: 2, amount_total: '', notes: '' }
const EMPTY_BLOCK = { check_in: '', check_out: '', reason: '' }

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
}

function todayIsoRome() {
  const rome = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Rome' }))
  return new Date(rome.getTime() - rome.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

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
  const [profile, setProfile] = useState(null)
  const [myBookings, setMyBookings] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY_BOOKING)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [confirmation, setConfirmation] = useState(null)
  const [tasks, setTasks] = useState([])
  const [blockModal, setBlockModal] = useState(false)
  const [blockForm, setBlockForm] = useState(EMPTY_BLOCK)
  const [blockSaving, setBlockSaving] = useState(false)
  const [blockError, setBlockError] = useState('')
  const [blockConfirmation, setBlockConfirmation] = useState(null)

  const code = getStoredCode()

  useEffect(() => {
    loadAvailability()
    loadMyBookings()
    loadTasks()
    sb.rpc('validate_collaborator_code', { p_code: code }).then(({ data }) => {
      setProfile(data?.[0] || null)
    })
  }, [])

  async function loadTasks() {
    const { data } = await sb.rpc('get_collaborator_tasks', { p_access_code: code })
    setTasks(data || [])
  }

  async function markTask(bookingId, task) {
    const { error } = await sb.rpc('mark_booking_task', { p_access_code: code, p_booking_id: bookingId, p_task: task })
    if (error) { alert(error.message); return }
    loadTasks()
  }

  function loadAvailability() {
    sb.rpc('get_collaborator_availability', { p_access_code: code })
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setRows(data)
      })
  }

  async function loadMyBookings() {
    const { data } = await sb.rpc('get_my_collaborator_bookings', { p_access_code: code })
    setMyBookings(data || [])
  }

  function logout() {
    clearStoredCode()
    window.location.href = '/collaboratori'
  }

  function openNew() { setForm(EMPTY_BOOKING); setSaveError(''); setConfirmation(null); setModal(true) }

  async function submitBooking() {
    if (!form.guest_name || !form.check_in || !form.check_out) {
      setSaveError(lang === 'it' ? 'Ospite, check-in e check-out sono obbligatori.' : 'Guest, check-in and check-out are required.')
      return
    }
    setSaving(true); setSaveError('')
    const { data, error } = await sb.rpc('create_collaborator_booking', {
      p_access_code: code,
      p_guest_name: form.guest_name,
      p_check_in: form.check_in,
      p_check_out: form.check_out,
      p_guests_count: Number(form.guests_count) || 2,
      p_amount_total: Number(form.amount_total) || 0,
      p_notes: form.notes || null,
    })
    setSaving(false)
    if (error) { setSaveError(error.message); return }
    setConfirmation(data?.[0] || null)
    loadAvailability()
    loadMyBookings()
  }

  function openBlock() { setBlockForm(EMPTY_BLOCK); setBlockError(''); setBlockConfirmation(null); setBlockModal(true) }

  async function submitBlock() {
    if (!blockForm.check_in || !blockForm.check_out) {
      setBlockError(lang === 'it' ? 'Data inizio e data fine sono obbligatorie.' : 'Start and end date are required.')
      return
    }
    setBlockSaving(true); setBlockError('')
    const { data, error } = await sb.rpc('collaborator_block_dates', {
      p_access_code: code,
      p_check_in: blockForm.check_in,
      p_check_out: blockForm.check_out,
      p_reason: blockForm.reason || null,
    })
    setBlockSaving(false)
    if (error) { setBlockError(error.message); return }
    setBlockConfirmation(data)
    loadAvailability()
  }

  const t = {
    it: {
      title: 'Disponibilità', legend: ['Libero', 'Occupato', 'In attesa', 'Bloccato'], logout: 'Esci',
      newBooking: '+ Nuova prenotazione', myBookings: 'Le tue prenotazioni', commission: 'Commissione',
      guestName: 'Nome ospite *', guests: 'N° ospiti', price: 'Prezzo €', notes: 'Note',
      confirm: 'Conferma', cancel: 'Annulla', created: 'Prenotazione creata', code: 'Codice',
      commissionDue: 'Commissione dovuta', close: 'Chiudi',
      tasks: 'Compiti di oggi', taskCheckin: 'Check-in', taskCheckout: 'Check-out', taskCleaning: 'Pulizie',
      markDone: 'Segna fatto', noTasks: 'Nessun compito in sospeso',
      blockDates: '📅 Blocca più date', blockReason: 'Motivo (opzionale)', blockDone: 'Date bloccate',
      blockCount: 'giorni bloccati', earned: 'da liquidare', settled: 'liquidato',
    },
    en: {
      title: 'Availability', legend: ['Free', 'Booked', 'Pending', 'Blocked'], logout: 'Log out',
      newBooking: '+ New booking', myBookings: 'Your bookings', commission: 'Commission',
      guestName: 'Guest name *', guests: 'Guests', price: 'Price €', notes: 'Notes',
      confirm: 'Confirm', cancel: 'Cancel', created: 'Booking created', code: 'Code',
      commissionDue: 'Commission due', close: 'Close',
      tasks: "Today's tasks", taskCheckin: 'Check-in', taskCheckout: 'Check-out', taskCleaning: 'Cleaning',
      markDone: 'Mark done', noTasks: 'No pending tasks',
      blockDates: '📅 Block several dates', blockReason: 'Reason (optional)', blockDone: 'Dates blocked',
      blockCount: 'days blocked', earned: 'to be paid', settled: 'paid',
    },
  }[lang]

  const todayIso = todayIsoRome()

  const statusMap = rows ? buildStatusMap(rows) : {}
  const now = new Date()
  const months = [0, 1, 2].map(i => {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    return { year: d.getFullYear(), month: d.getMonth() }
  })

  // Compenso totale ancora da liquidare per me su check-in/out/pulizie (i valori sono già
  // filtrati dalla RPC: non nulli solo se il compito è mio — nessun altro dato è esposto)
  const myTotalToSettle = tasks.reduce((sum, task) => {
    let s = 0
    if (task.checkin_amount_due != null && !task.checkin_settled) s += task.checkin_amount_due
    if (task.checkout_amount_due != null && !task.checkout_settled) s += task.checkout_amount_due
    if (task.cleaning_amount_due != null && !task.cleaning_settled) s += task.cleaning_amount_due
    return sum + s
  }, 0)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--lava)', padding: '2rem', fontFamily: "'Jost', sans-serif" }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {['it', 'en'].map(l => (
              <button key={l} onClick={() => setLang(l)} style={{
                background: 'none', border: `1px solid ${lang === l ? 'rgba(201,171,114,0.5)' : 'rgba(201,171,114,0.15)'}`,
                color: lang === l ? 'var(--gold)' : 'var(--salt-faint)',
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
          Ospita
        </div>
        <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 'clamp(1.8rem,6vw,2.4rem)', fontWeight: 300, textAlign: 'center', marginBottom: '0.6rem' }}>
          {t.title}
        </h1>

        {profile && (
          <div style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--salt-faint)', marginBottom: '1.2rem' }}>
            {profile.name ? `${profile.name} · ` : ''}{t.commission} <strong style={{ color: 'var(--gold)' }}>{profile.default_commission_pct}%</strong>
          </div>
        )}

        {/* TOTALE DA LIQUIDARE (check-in/out/pulizie) */}
        {myTotalToSettle > 0 && (
          <div style={{
            background: 'var(--lava-card)', border: '1px solid var(--gold-dim)', padding: '0.9rem 1.2rem',
            marginBottom: '1.2rem', textAlign: 'center',
          }}>
            <div style={{ fontSize: '0.58rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--salt-faint)', marginBottom: '0.3rem' }}>
              {t.earned} (check-in/out · pulizie)
            </div>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.5rem', color: 'var(--gold)' }}>
              €{myTotalToSettle.toFixed(2)}
            </div>
          </div>
        )}

        <div style={{ textAlign: 'center', marginBottom: '1.5rem', display: 'flex', gap: '0.6rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn-primary" onClick={openNew}>{t.newBooking}</button>
          <button className="btn-ghost" onClick={openBlock}>{t.blockDates}</button>
        </div>

        {/* COMPITI DI OGGI */}
        {tasks.length > 0 && (
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '0.8rem' }}>
              {t.tasks}
            </div>
            {tasks.map(task => (
              <div key={task.id} style={{ background: 'var(--lava-card)', border: '1px solid var(--gold-dim)', padding: '0.8rem 1rem', marginBottom: '0.5rem' }}>
                <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '0.95rem', marginBottom: '0.15rem' }}>{task.guest_name}</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--salt-faint)', marginBottom: '0.6rem' }}>{fmtDate(task.check_in)} → {fmtDate(task.check_out)} · {task.code}</div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {task.check_in === todayIso && (
                    task.checkin_by
                      ? <TaskDone label={t.taskCheckin} icon="🔑" byName={task.checkin_by_name}
                          amount={task.checkin_amount_due} settled={task.checkin_settled} t={t} />
                      : <button className="btn-sm" onClick={() => markTask(task.id, 'checkin')}>🔑 {t.taskCheckin} · {t.markDone}</button>
                  )}
                  {task.check_out === todayIso && (
                    task.checkout_by
                      ? <TaskDone label={t.taskCheckout} icon="🚪" byName={task.checkout_by_name}
                          amount={task.checkout_amount_due} settled={task.checkout_settled} t={t} />
                      : <button className="btn-sm" onClick={() => markTask(task.id, 'checkout')}>🚪 {t.taskCheckout} · {t.markDone}</button>
                  )}
                  {task.check_out <= todayIso && (
                    task.cleaning_by
                      ? <TaskDone label={t.taskCleaning} icon="🧹" byName={task.cleaning_by_name}
                          amount={task.cleaning_amount_due} settled={task.cleaning_settled} t={t} />
                      : <button className="btn-sm" onClick={() => markTask(task.id, 'cleaning')}>🧹 {t.taskCleaning} · {t.markDone}</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {error && <div style={{ color: 'var(--red)', fontSize: '0.8rem', marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}
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

        {/* LE TUE PRENOTAZIONI */}
        {myBookings.length > 0 && (
          <div style={{ marginTop: '2rem' }}>
            <div style={{ fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '0.8rem' }}>
              {t.myBookings}
            </div>
            {myBookings.map(b => (
              <div key={b.id} style={{ background: 'var(--lava-card)', border: '1px solid var(--gold-dim)', padding: '0.8rem 1rem', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '0.95rem' }}>{b.guest_name}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--salt-faint)' }}>{fmtDate(b.check_in)} → {fmtDate(b.check_out)} · {b.code}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: "'Cormorant Garamond',serif", color: 'var(--gold)' }}>€{b.amount_total}</div>
                    <div style={{ fontSize: '0.6rem', color: b.commission_settled ? 'var(--salt-faint)' : 'var(--red)' }}>
                      {t.commission} {b.commission_pct}% = €{b.commission_due?.toFixed(2)} {b.commission_settled ? '✓' : ''}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL NUOVA PRENOTAZIONE */}
      <Modal open={modal} onClose={() => setModal(false)} title={t.newBooking}>
        {confirmation ? (
          <div>
            <p style={{ fontSize: '0.9rem', color: 'var(--green)', marginBottom: '1rem' }}>✓ {t.created}</p>
            <p style={{ fontSize: '0.85rem', color: 'var(--salt-dim)', marginBottom: '0.4rem' }}>{t.code}: <strong style={{ fontFamily: 'monospace', color: 'var(--gold)' }}>{confirmation.code}</strong></p>
            <p style={{ fontSize: '0.85rem', color: 'var(--salt-dim)', marginBottom: '1.2rem' }}>
              {t.commissionDue}: {confirmation.commission_pct}% = €{confirmation.commission_due?.toFixed(2)}
            </p>
            <button className="btn-primary" style={{ width: '100%' }} onClick={() => setModal(false)}>{t.close}</button>
          </div>
        ) : (
          <>
            {saveError && (
              <div style={{ background: 'rgba(138,72,72,.15)', border: '1px solid rgba(138,72,72,.4)', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.78rem', color: 'var(--red)', lineHeight: 1.6 }}>
                {saveError}
              </div>
            )}
            <div className="form-group">
              <label className="form-label">{t.guestName}</label>
              <input className="form-input" value={form.guest_name} onChange={e => setForm(p => ({ ...p, guest_name: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', gap: '0.8rem' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Check-in *</label>
                <input className="form-input" type="date" value={form.check_in} onChange={e => setForm(p => ({ ...p, check_in: e.target.value }))} />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Check-out *</label>
                <input className="form-input" type="date" value={form.check_out} onChange={e => setForm(p => ({ ...p, check_out: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.8rem' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">{t.guests}</label>
                <input className="form-input" type="number" value={form.guests_count} onChange={e => setForm(p => ({ ...p, guests_count: e.target.value }))} />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">{t.price}</label>
                <input className="form-input" type="number" value={form.amount_total} onChange={e => setForm(p => ({ ...p, amount_total: e.target.value }))} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">{t.notes}</label>
              <textarea className="form-textarea" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
            </div>
            {profile && (
              <p style={{ fontSize: '0.7rem', color: 'var(--salt-faint)', marginBottom: '0.5rem' }}>
                {t.commissionDue}: {profile.default_commission_pct}%
              </p>
            )}
            <div style={{ display: 'flex', gap: '0.8rem', marginTop: '1rem' }}>
              <button className="btn-primary" style={{ flex: 1 }} onClick={submitBooking} disabled={saving}>
                {saving ? '…' : t.confirm}
              </button>
              <button className="btn-cancel" onClick={() => setModal(false)}>{t.cancel}</button>
            </div>
          </>
        )}
      </Modal>

      {/* MODAL BLOCCA PIÙ DATE — nessun ospite/prezzo, solo per riservarsi le date */}
      <Modal open={blockModal} onClose={() => setBlockModal(false)} title={t.blockDates}>
        {blockConfirmation !== null ? (
          <div>
            <p style={{ fontSize: '0.9rem', color: 'var(--green)', marginBottom: '1.2rem' }}>
              ✓ {t.blockDone}: {blockConfirmation} {t.blockCount}
            </p>
            <button className="btn-primary" style={{ width: '100%' }} onClick={() => setBlockModal(false)}>{t.close}</button>
          </div>
        ) : (
          <>
            {blockError && (
              <div style={{ background: 'rgba(138,72,72,.15)', border: '1px solid rgba(138,72,72,.4)', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.78rem', color: 'var(--red)', lineHeight: 1.6 }}>
                {blockError}
              </div>
            )}
            <div style={{ display: 'flex', gap: '0.8rem' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Check-in *</label>
                <input className="form-input" type="date" value={blockForm.check_in} onChange={e => setBlockForm(p => ({ ...p, check_in: e.target.value }))} />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Check-out *</label>
                <input className="form-input" type="date" value={blockForm.check_out} onChange={e => setBlockForm(p => ({ ...p, check_out: e.target.value }))} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">{t.blockReason}</label>
              <input className="form-input" value={blockForm.reason} onChange={e => setBlockForm(p => ({ ...p, reason: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', gap: '0.8rem', marginTop: '1rem' }}>
              <button className="btn-primary" style={{ flex: 1 }} onClick={submitBlock} disabled={blockSaving}>
                {blockSaving ? '…' : t.confirm}
              </button>
              <button className="btn-cancel" onClick={() => setBlockModal(false)}>{t.cancel}</button>
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}

// Riga di compito già assegnato: nome di chi lo ha fatto, e se sono io mostra anche il compenso
// (amount è già null lato server se il compito non è mio — nessuna informazione di altri esposta)
function TaskDone({ label, icon, byName, amount, settled, t }) {
  return (
    <span style={{ fontSize: '0.62rem', color: 'var(--green)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
      {icon} {label}: {byName}
      {amount != null && (
        <span style={{ color: settled ? 'var(--salt-faint)' : 'var(--gold)', fontWeight: 600 }}>
          · €{amount.toFixed(2)} {settled ? `(${t.settled})` : `(${t.earned})`}
        </span>
      )}
    </span>
  )
}
