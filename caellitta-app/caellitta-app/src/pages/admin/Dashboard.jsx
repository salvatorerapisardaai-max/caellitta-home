import React, { useEffect, useState } from 'react'
import { sb } from '../../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { useActiveProperty } from '../../lib/PropertyContext'

export default function Dashboard() {
  const { activePropertyId } = useActiveProperty()
  const [bookings, setBookings] = useState([])
  const [expenses, setExpenses] = useState([])
  const [blockedDates, setBlockedDates] = useState([])
  const [guestCoupons, setGuestCoupons] = useState([])
  const [waTemplates, setWaTemplates] = useState([])
  const [calMonth, setCalMonth] = useState(getRomeDate())

  const navigate = useNavigate()

  useEffect(() => {
    if (activePropertyId) loadData()
  }, [activePropertyId])

  async function loadData() {
    const { data: bk } = await sb
      .from('bookings')
      .select('*, guests(nationality)')
      .eq('property_id', activePropertyId)
      .neq('status', 'cancelled')
      .order('check_in')

    const { data: ex } = await sb
      .from('expenses')
      .select('*')
      .eq('property_id', activePropertyId)
      .order('date', { ascending: false })

    const { data: bd } = await sb
      .from('blocked_dates')
      .select('*')
      .eq('property_id', activePropertyId)
      .order('date')

    // Commissioni dovute DAL PARTNER A NOI per le esperienze Convenzioni — contabilità
    // separata e opposta rispetto a quella dei collaboratori (bookings.commission_due,
    // che invece è quanto dobbiamo NOI a loro). Filtrata per struttura tramite le prenotazioni.
    const { data: gc } = await sb
      .from('guest_coupons')
      .select('commission, commission_settled, bookings!inner(property_id)')
      .eq('bookings.property_id', activePropertyId)

    const { data: wt } = await sb
      .from('whatsapp_templates')
      .select('id, lang, name, trigger_event, trigger_offset_days')
      .eq('property_id', activePropertyId)
      .eq('active', true)

    setBookings(bk || [])
    setExpenses(ex || [])
    setBlockedDates(bd || [])
    setGuestCoupons(gc || [])
    setWaTemplates(wt || [])
  }

  const today = getRomeDate()
  const todayIso = toISO(today)

  const thisMonth = today.getMonth()
  const thisYear = today.getFullYear()

  // Confronto su stringhe ISO (YYYY-MM-DD, come restituite da Postgres per le colonne "date"):
  // evita i confronti tra oggetti Date UTC/locale che possono introdurre scarti di un giorno.
  const active = bookings.filter(b => b.check_in <= todayIso && todayIso <= b.check_out)

  const upcoming = bookings
    .filter(b => b.check_in > todayIso)
    .sort((a, b) => a.check_in.localeCompare(b.check_in))

  const upcomingCheckouts = bookings
    .filter(b => b.check_out >= todayIso)
    .sort((a, b) => a.check_out.localeCompare(b.check_out))

  // Le statistiche di riepilogo seguono il mese NAVIGATO nel calendario (calMonth),
  // non sempre il mese reale di oggi — così cambiando mese nel calendario, il
  // resoconto sotto si aggiorna di conseguenza (richiesta esplicita).
  const viewYear = calMonth.getFullYear()
  const viewMonth = calMonth.getMonth()
  const thisMonthKey = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`
  const isCurrentRealMonth = viewYear === thisYear && viewMonth === thisMonth

  // Solo prenotazioni confermate/completate contano come entrate reali del mese
  // (le "in attesa" non sono ricavo certo e gonfierebbero il margine)
  const monthRevenue = bookings
    .filter(b => b.check_in.slice(0, 7) === thisMonthKey && (b.status === 'confirmed' || b.status === 'completed'))
    .reduce((s, b) => s + (b.amount_total || 0), 0)

  const monthExpenses = (expenses || [])
    .filter(e => e.date?.slice(0, 7) === thisMonthKey)
    .reduce((s, e) => s + (e.amount || 0), 0)

  // ───────────── TOTALI COMPLESSIVI (da sempre, non solo il mese corrente) ─────────────
  const totalRevenueAllTime = bookings
    .filter(b => b.status === 'confirmed' || b.status === 'completed')
    .reduce((s, b) => s + (b.amount_total || 0), 0)

  const totalExpensesAllTime = (expenses || []).reduce((s, e) => s + (e.amount || 0), 0)

  const totalMarginAllTime = totalRevenueAllTime - totalExpensesAllTime

  const totalBookingsCount = bookings.filter(b => b.status === 'confirmed' || b.status === 'completed').length

  // Tasso di occupazione del mese NAVIGATO (non del mese reale)
  const monthStartIso = toISO(new Date(viewYear, viewMonth, 1))
  const monthEndIso = toISO(new Date(viewYear, viewMonth + 1, 1))
  const daysInThisMonth = daysBetween(monthStartIso, monthEndIso)
  const occupiedNights = bookings.reduce((sum, b) => {
    const start = b.check_in > monthStartIso ? b.check_in : monthStartIso
    const end = b.check_out < monthEndIso ? b.check_out : monthEndIso
    return sum + Math.max(0, daysBetween(start, end))
  }, 0)
  const occupancyRate = daysInThisMonth > 0 ? Math.round((occupiedNights / daysInThisMonth) * 100) : 0

  // DA VERSARE — quanto dobbiamo NOI ai collaboratori per le prenotazioni che ci hanno portato
  const commissionToPay = bookings
    .filter(b => b.collaborator_id && !b.commission_settled)
    .reduce((s, b) => s + (b.commission_due || 0), 0)

  // DA INCASSARE — quanto ci deve il partner (es. Ivana Luxury Experiences) per le esperienze
  // Convenzioni fatte dai nostri ospiti. Contabilità separata, mai sommata alla precedente.
  const commissionToCollect = guestCoupons
    .filter(gc => !gc.commission_settled && gc.commission)
    .reduce((s, gc) => s + (gc.commission || 0), 0)

  // Compensi da liquidare per pulizie / check-in / check-out (nuovo modello di compenso)
  const cleaningToSettle = bookings
    .filter(b => b.cleaning_by && b.cleaning_at && !b.cleaning_settled)
    .reduce((s, b) => s + (b.cleaning_amount_due || 0), 0)
  const checkinToSettle = bookings
    .filter(b => b.checkin_by && b.checkin_at && !b.checkin_settled)
    .reduce((s, b) => s + (b.checkin_amount_due || 0), 0)
  const checkoutToSettle = bookings
    .filter(b => b.checkout_by && b.checkout_at && !b.checkout_settled)
    .reduce((s, b) => s + (b.checkout_amount_due || 0), 0)
  const operationalToSettle = cleaningToSettle + checkinToSettle + checkoutToSettle

  // ───────────── METRICHE REVENUE MANAGEMENT — anno corrente ─────────────
  const yearKey = String(thisYear)
  const confirmedThisYear = bookings.filter(b => b.check_in?.slice(0, 4) === yearKey && (b.status === 'confirmed' || b.status === 'completed'))
  const revenueThisYear = confirmedThisYear.reduce((s, b) => s + (b.amount_total || 0), 0)
  const nightsThisYear = confirmedThisYear.reduce((s, b) => s + daysBetween(b.check_in, b.check_out), 0)
  const adr = nightsThisYear > 0 ? revenueThisYear / nightsThisYear : 0
  const isLeapYear = (thisYear % 4 === 0 && (thisYear % 100 !== 0 || thisYear % 400 === 0))
  const revPar = revenueThisYear / (isLeapYear ? 366 : 365)
  const avgStay = confirmedThisYear.length > 0 ? nightsThisYear / confirmedThisYear.length : 0

  // ───────────── PROMEMORIA WHATSAPP (da inviare oggi) ─────────────
  // Per ogni prenotazione attiva, verifica se un template attivo "scatta" oggi
  // in base a trigger_event (check_in/check_out/mid_stay) e trigger_offset_days.
  const waReminders = []
  for (const b of bookings) {
    if (b.status === 'cancelled' || !b.check_in || !b.check_out) continue
    for (const tpl of waTemplates) {
      let targetIso = null
      if (tpl.trigger_event === 'check_in') targetIso = addDaysIso(b.check_in, tpl.trigger_offset_days || 0)
      else if (tpl.trigger_event === 'check_out') targetIso = addDaysIso(b.check_out, tpl.trigger_offset_days || 0)
      else if (tpl.trigger_event === 'mid_stay') {
        const nights = daysBetween(b.check_in, b.check_out)
        if (nights >= 2) targetIso = addDaysIso(b.check_in, Math.floor(nights / 2))
      }
      if (targetIso === todayIso) {
        waReminders.push({ booking: b, template: tpl })
      }
    }
  }

  // ───────────── CALENDAR ─────────────
  const year = calMonth.getFullYear()
  const month = calMonth.getMonth()

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const offset = firstDay === 0 ? 6 : firstDay - 1

  const blockedSet = new Set(blockedDates.map(bd => bd.date))

  // Report ospiti del mese mostrato nel calendario (arrivi/presenze/nazionalità),
  // utile per la compilazione manuale di TourISTAT/ISTAT o della tassa di soggiorno
  const reportMonthStartIso = toISO(new Date(year, month, 1))
  const reportMonthEndIso = toISO(new Date(year, month + 1, 1))
  const monthArrivals = bookings.filter(b => b.check_in >= reportMonthStartIso && b.check_in < reportMonthEndIso)
  const monthPresences = bookings.reduce((sum, b) => {
    const start = b.check_in > reportMonthStartIso ? b.check_in : reportMonthStartIso
    const end = b.check_out < reportMonthEndIso ? b.check_out : reportMonthEndIso
    return sum + Math.max(0, daysBetween(start, end))
  }, 0)
  const nationalityBreakdown = {}
  for (const b of monthArrivals) {
    const nat = b.guests?.nationality || 'Non specificata'
    nationalityBreakdown[nat] = (nationalityBreakdown[nat] || 0) + 1
  }

  function getDayType(d) {
    const date = new Date(year, month, d)
    const iso = toISO(date)

    if (blockedSet.has(iso)) return 'blocked'

    for (const b of bookings) {
      if (b.check_in === iso) return 'checkin'
      if (b.check_out === iso) return 'checkout'
      if (b.check_in < iso && iso < b.check_out) return 'booked'
    }

    return iso === todayIso ? 'today' : 'free'
  }

  const CAL_COLORS = {
    checkin: {
      bg: 'rgba(74,138,104,.2)',
      border: '2px solid var(--green)',
      color: 'var(--green)',
    },

    checkout: {
      bg: 'rgba(138,72,72,.12)',
      border: '2px solid rgba(138,72,72,.5)',
      color: 'var(--red)',
    },

    booked: {
      bg: 'rgba(201,171,114,.12)',
      color: 'var(--gold-light)',
      border: '1px solid transparent',
    },

    today: {
      bg: 'transparent',
      border: '1px solid rgba(201,171,114,.35)',
      color: 'var(--gold)',
    },

    free: {
      bg: 'var(--lava-card)',
      color: 'var(--salt-dim)',
      border: '1px solid transparent',
    },

    blocked: {
      bg: 'rgba(120,120,120,.18)',
      border: '1px solid rgba(120,120,120,.4)',
      color: 'var(--salt-faint)',
    },
  }

  return (
    <div>
      {/* ───────────────── KPI (mese corrente) ───────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.6rem' }}>
        <span style={{ fontSize: '0.62rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--salt-faint)' }}>
          Riepilogo — {calMonth.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}
        </span>
        {!isCurrentRealMonth && (
          <button className="btn-sm" onClick={() => setCalMonth(getRomeDate())} style={{ fontSize: '0.6rem', padding: '0.15rem 0.5rem' }}>
            ← torna a oggi
          </button>
        )}
      </div>
      <div className="dashboard-kpi-grid">
        <KPI
          label="Ospiti ora"
          value={
            active.length > 0
              ? active[0].guest_name.split(' ')[0]
              : '—'
          }
          sub={
            active.length > 0
              ? `fino al ${fmtDate(active[0].check_out)}`
              : 'Nessuno'
          }
          color="gold"
          accent="gold"
        />

        <KPI
          label="Occupazione mese"
          value={`${occupancyRate}%`}
          sub={`${occupiedNights}/${daysInThisMonth} notti`}
          color="blue"
          accent="blue"
        />

        <KPI
          label="Entrate mese"
          value={`€${monthRevenue.toLocaleString('it')}`}
          sub={calMonth.toLocaleDateString('it-IT', {
            month: 'long',
            year: 'numeric',
          })}
          color="green"
          accent="green"
        />

        <KPI
          label="Spese mese"
          value={`€${monthExpenses.toLocaleString('it')}`}
          sub="tutte le categorie"
          color="red"
          accent="red"
        />

        <KPI
          label="Margine mese"
          value={`€${(monthRevenue - monthExpenses).toLocaleString('it')}`}
          sub="entrate - spese"
          color={monthRevenue - monthExpenses >= 0 ? 'green' : 'red'}
          accent="blue"
        />

        <KPI
          label="Commissioni da versare"
          value={`€${commissionToPay.toLocaleString('it')}`}
          sub="ai collaboratori"
          color={commissionToPay > 0 ? 'red' : 'green'}
          accent="gold"
        />

        <KPI
          label="Commissioni da incassare"
          value={`€${commissionToCollect.toLocaleString('it')}`}
          sub="da esperienze (Convenzioni)"
          color={commissionToCollect > 0 ? 'gold' : 'green'}
          accent="gold"
        />
      </div>

      {/* ───────────────── METRICHE REVENUE MANAGEMENT ───────────────── */}
      <div className="card" style={{ marginBottom: '1.2rem' }}>
        <div className="sec-hdr">
          <span className="sec-title">Revenue management {thisYear}</span>
        </div>
        <div className="totali-grid">
          <div className="totali-item">
            <div className="totali-label">ADR (tariffa media/notte)</div>
            <div className="totali-value" style={{ color: 'var(--gold)' }}>€{adr.toFixed(2)}</div>
          </div>
          <div className="totali-item">
            <div className="totali-label">RevPAR (ricavo/notte disponibile)</div>
            <div className="totali-value" style={{ color: 'var(--gold)' }}>€{revPar.toFixed(2)}</div>
          </div>
          <div className="totali-item">
            <div className="totali-label">Permanenza media</div>
            <div className="totali-value" style={{ color: 'var(--gold)' }}>{avgStay.toFixed(1)} notti</div>
          </div>
        </div>
        <p style={{ fontSize: '0.6rem', color: 'var(--salt-faint)', marginTop: '0.8rem' }}>
          ADR = entrate ÷ notti vendute · RevPAR = entrate ÷ giorni dell'anno (tutta la struttura, occupata o no)
        </p>
      </div>

      {/* ───────────────── TOTALE COMPLESSIVO (da sempre) ───────────────── */}
      <div className="card" style={{ marginBottom: '1.2rem' }}>
        <div className="sec-hdr">
          <span className="sec-title">Totale complessivo</span>
          <span style={{ fontSize: '0.65rem', color: 'var(--salt-faint)' }}>
            {totalBookingsCount} prenotazioni confermate/completate, da sempre
          </span>
        </div>
        <div className="totali-grid">
          <div className="totali-item">
            <div className="totali-label">Entrate totali</div>
            <div className="totali-value" style={{ color: 'var(--green)' }}>€{totalRevenueAllTime.toLocaleString('it')}</div>
          </div>
          <div className="totali-item">
            <div className="totali-label">Spese totali</div>
            <div className="totali-value" style={{ color: 'var(--red)' }}>−€{totalExpensesAllTime.toLocaleString('it')}</div>
          </div>
          <div className="totali-item">
            <div className="totali-label">Margine netto</div>
            <div className="totali-value" style={{ color: totalMarginAllTime >= 0 ? 'var(--gold)' : 'var(--red)' }}>
              €{totalMarginAllTime.toLocaleString('it')}
            </div>
          </div>
          <div className="totali-item">
            <div className="totali-label">Compensi operativi da liquidare</div>
            <div className="totali-value" style={{ color: operationalToSettle > 0 ? 'var(--amber)' : 'var(--green)' }}>
              €{operationalToSettle.toFixed(2)}
            </div>
            <div style={{ fontSize: '0.6rem', color: 'var(--salt-faint)', marginTop: '0.2rem' }}>
              pulizie €{cleaningToSettle.toFixed(0)} · check-in €{checkinToSettle.toFixed(0)} · check-out €{checkoutToSettle.toFixed(0)}
            </div>
          </div>
        </div>
      </div>

      {/* ───────────────── PROMEMORIA WHATSAPP DA INVIARE OGGI ───────────────── */}
      {waReminders.length > 0 && (
        <div className="card" style={{ marginBottom: '1.2rem', borderColor: 'rgba(37,211,102,.35)' }}>
          <div className="sec-hdr">
            <span className="sec-title">💬 Promemoria WhatsApp — da inviare oggi</span>
            <span className="badge badge-green">{waReminders.length}</span>
          </div>
          {waReminders.map((r, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.6rem',
              padding: '0.7rem 0', borderBottom: i < waReminders.length - 1 ? '1px solid var(--gold-dim)' : 'none',
            }}>
              <div>
                <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1rem' }}>{r.booking.guest_name}</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--salt-faint)' }}>{r.template.name} ({r.template.lang.toUpperCase()})</div>
              </div>
              <button className="btn-sm" style={{ borderColor: '#25D366', color: '#25D366' }}
                onClick={() => navigate(`/whatsapp?bookingId=${r.booking.id}&templateId=${r.template.id}`)}>
                Apri messaggio →
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ───────────────── MAIN GRID ───────────────── */}
      <div className="dashboard-main-grid">
        {/* CALENDAR */}
        <div className="card">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.2rem',
              gap: '1rem',
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: '1.4rem',
                fontWeight: 300,
                color: 'var(--gold)',
              }}
            >
              {new Date(year, month).toLocaleDateString('it-IT', {
                month: 'long',
                year: 'numeric',
              })}
            </span>

            <div
              style={{
                display: 'flex',
                gap: '0.5rem',
              }}
            >
              <button
                className="btn-sm"
                onClick={() =>
                  setCalMonth(new Date(year, month - 1))
                }
              >
                ‹
              </button>

              <button
                className="btn-sm"
                onClick={() =>
                  setCalMonth(new Date(year, month + 1))
                }
              >
                ›
              </button>
            </div>
          </div>

          {/* CALENDAR GRID */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7,1fr)',
              gap: '3px',
            }}
          >
            {['Lu', 'Ma', 'Me', 'Gi', 'Ve', 'Sa', 'Do'].map(d => (
              <div
                key={d}
                style={{
                  textAlign: 'center',
                  fontSize: '0.58rem',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: 'var(--salt-faint)',
                  padding: '0.5rem 0',
                }}
              >
                {d}
              </div>
            ))}

            {Array(offset)
              .fill(null)
              .map((_, i) => (
                <div key={`e${i}`} />
              ))}

            {Array(daysInMonth)
              .fill(null)
              .map((_, i) => {
                const d = i + 1
                const type = getDayType(d)

                const s = CAL_COLORS[type] || CAL_COLORS.free

                return (
                  <div
                    key={d}
                    style={{
                      aspectRatio: '1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.72rem',
                      background: s.bg,
                      color: s.color,
                      border: s.border,
                      minWidth: 0,
                    }}
                  >
                    {d}
                  </div>
                )
              })}
          </div>

          {/* LEGEND */}
          <div
            style={{
              display: 'flex',
              gap: '1rem',
              marginTop: '1rem',
              flexWrap: 'wrap',
            }}
          >
            {[
              ['var(--green)', 'Check-in'],
              ['var(--red)', 'Check-out'],
              ['var(--gold-light)', 'Occupato'],
              ['rgba(120,120,120,.5)', 'Bloccato'],
            ].map(([c, l]) => (
              <div
                key={l}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.6rem',
                  color: 'var(--salt-faint)',
                }}
              >
                <div
                  style={{
                    width: 10,
                    height: 10,
                    background: c,
                    borderRadius: 1,
                  }}
                />

                {l}
              </div>
            ))}
          </div>
        </div>

        {/* ───────────────── UPCOMING ───────────────── */}
        <div
          className="card"
          style={{
            minWidth: 0,
          }}
        >
          <div className="sec-hdr">
            <span className="sec-title">
              Prossimi arrivi
            </span>

            <button
              className="btn-sm"
              onClick={() => navigate('/prenotazioni')}
            >
              Vedi tutti
            </button>
          </div>

          {upcoming.slice(0, 5).length === 0 ? (
            <p
              style={{
                fontSize: '0.8rem',
                color: 'var(--salt-faint)',
                paddingTop: '1rem',
              }}
            >
              Nessuna prenotazione futura
            </p>
          ) : (
            upcoming.slice(0, 5).map(b => (
              <div
                key={b.id}
                style={{
                  padding: '0.8rem 0',
                  borderBottom: '1px solid var(--gold-dim)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '1rem',
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    minWidth: 0,
                    flex: 1,
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'Cormorant Garamond', serif",
                      fontSize: '1rem',
                      overflowWrap: 'break-word',
                    }}
                  >
                    {b.guest_name}
                  </div>

                  <div
                    style={{
                      fontSize: '0.68rem',
                      color: 'var(--salt-faint)',
                      marginTop: '0.15rem',
                    }}
                  >
                    {fmtDate(b.check_in)} →{' '}
                    {fmtDate(b.check_out)}
                  </div>

                  <div
                    style={{
                      fontSize: '0.6rem',
                      fontFamily: 'monospace',
                      color: 'rgba(201,171,114,.45)',
                      marginTop: '0.1rem',
                      overflowWrap: 'break-word',
                    }}
                  >
                    {b.code}
                  </div>
                </div>

                <span
                  style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize: '1.05rem',
                    color: 'var(--gold)',
                    flexShrink: 0,
                  }}
                >
                  €{b.amount_total}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ───────────────── PROSSIMI CHECK-OUT ───────────────── */}
      <div
        className="card"
        style={{
          marginTop: '1.2rem',
          minWidth: 0,
        }}
      >
        <div className="sec-hdr">
          <span className="sec-title">
            Prossimi check-out
          </span>

          <button
            className="btn-sm"
            onClick={() => navigate('/prenotazioni')}
          >
            Vedi tutti
          </button>
        </div>

        {upcomingCheckouts.slice(0, 5).length === 0 ? (
          <p
            style={{
              fontSize: '0.8rem',
              color: 'var(--salt-faint)',
              paddingTop: '1rem',
            }}
          >
            Nessun check-out in programma
          </p>
        ) : (
          upcomingCheckouts.slice(0, 5).map(b => (
            <div
              key={b.id}
              style={{
                padding: '0.8rem 0',
                borderBottom: '1px solid var(--gold-dim)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '1rem',
                minWidth: 0,
              }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', overflowWrap: 'break-word' }}>
                  {b.guest_name}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--salt-faint)', marginTop: '0.15rem' }}>
                  {fmtDate(b.check_out)} · {b.code}
                </div>
              </div>
              <span
                style={{
                  fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase',
                  padding: '0.2rem 0.55rem', border: '1px solid var(--gold-dim)',
                  color: b.check_out === todayIso ? 'var(--red)' : 'var(--salt-faint)', flexShrink: 0,
                }}
              >
                {b.check_out === todayIso ? 'Oggi' : `tra ${daysBetween(todayIso, b.check_out)}g`}
              </span>
            </div>
          ))
        )}
      </div>

      {/* ───────────────── EXPENSES ───────────────── */}
      <div
        className="card"
        style={{
          marginTop: '1.2rem',
          minWidth: 0,
        }}
      >
        <div className="sec-hdr">
          <span className="sec-title">
            Ultime spese
          </span>

          <button
            className="btn-sm"
            onClick={() => navigate('/spese')}
          >
            Vedi tutte
          </button>
        </div>

        {(expenses || []).slice(0, 5).map(e => (
          <div
            key={e.id}
            className="expense-row"
          >
            <div
              style={{
                fontSize: '0.8rem',
                color: 'var(--salt-dim)',
                overflowWrap: 'break-word',
              }}
            >
              {e.description}
            </div>

            <div
              style={{
                fontSize: '0.68rem',
                color: 'var(--salt-faint)',
              }}
            >
              {fmtDate(e.date)}
            </div>

            <div>
              <span
                style={{
                  fontSize: '0.58rem',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  padding: '0.2rem 0.55rem',
                  border: '1px solid var(--gold-dim)',
                  color: 'var(--salt-faint)',
                  display: 'inline-block',
                }}
              >
                {e.category || '—'}
              </span>
            </div>

            <div
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: '1.05rem',
                color: 'var(--red)',
              }}
            >
              −€{e.amount?.toFixed(2)}
            </div>
          </div>
        ))}
      </div>

      {/* ───────────────── REPORT OSPITI (TourISTAT / tassa di soggiorno) ───────────────── */}
      <div className="card" style={{ marginTop: '1.2rem' }}>
        <div className="sec-hdr">
          <span className="sec-title">Report ospiti</span>
          <span style={{ fontSize: '0.65rem', color: 'var(--salt-faint)' }}>
            {new Date(year, month).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}
          </span>
        </div>
        <p style={{ fontSize: '0.7rem', color: 'var(--salt-faint)', marginBottom: '1rem' }}>
          Dati per la compilazione manuale di TourISTAT/ISTAT o della tassa di soggiorno del comune — segue il mese selezionato nel calendario qui sopra.
        </p>
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.58rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--salt-faint)' }}>Arrivi</div>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.6rem', color: 'var(--gold)' }}>{monthArrivals.length}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.58rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--salt-faint)' }}>Presenze (notti)</div>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.6rem', color: 'var(--gold)' }}>{monthPresences}</div>
          </div>
        </div>
        {Object.keys(nationalityBreakdown).length > 0 && (
          <div>
            <div style={{ fontSize: '0.58rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--salt-faint)', marginBottom: '0.5rem' }}>Per nazionalità</div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {Object.entries(nationalityBreakdown).map(([nat, count]) => (
                <span key={nat} style={{ fontSize: '0.72rem', padding: '0.3rem 0.7rem', border: '1px solid var(--gold-dim)', color: 'var(--salt-dim)' }}>
                  {nat}: <strong style={{ color: 'var(--gold)' }}>{count}</strong>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ───────────────── RESPONSIVE ───────────────── */}
      <style>{`
        .dashboard-kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1rem;
          margin-bottom: 1.2rem;
        }

        .dashboard-main-grid {
          display: grid;
          grid-template-columns: 1.4fr 1fr;
          gap: 1.2rem;
        }

        .expense-row {
          display: grid;
          grid-template-columns: 1.5fr 1fr 1fr auto;
          align-items: center;
          gap: 1rem;
          padding: 0.75rem 0;
          border-bottom: 1px solid var(--gold-dim);
        }

        .totali-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 1.2rem;
          margin-top: 0.6rem;
        }

        .totali-label {
          font-size: 0.58rem;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--salt-faint);
          margin-bottom: 0.4rem;
        }

        .totali-value {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.7rem;
          line-height: 1;
        }

        @media (max-width: 768px) {

          .dashboard-kpi-grid {
            grid-template-columns: 1fr !important;
          }

          .dashboard-main-grid {
            grid-template-columns: 1fr !important;
          }

          .expense-row {
            grid-template-columns: 1fr !important;
            gap: 0.5rem !important;
          }

          .totali-grid {
            grid-template-columns: 1fr 1fr !important;
          }

          .sec-hdr {
            gap: 0.7rem;
            flex-wrap: wrap;
          }
        }
      `}</style>
    </div>
  )
}

function KPI({
  label,
  value,
  sub,
  color,
  accent,
}) {
  const colors = {
    gold: 'var(--gold)',
    green: 'var(--green)',
    red: 'var(--red)',
    blue: 'var(--sea-light)',
  }

  const accents = {
    gold: 'var(--gold)',
    green: 'var(--green)',
    red: 'var(--red)',
    blue: 'var(--sea-light)',
  }

  return (
    <div
      className="card"
      style={{
        position: 'relative',
        overflow: 'hidden',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 140,
      }}
    >
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 2,
          background: `linear-gradient(90deg,${accents[accent]},transparent)`,
        }}
      />

      <div
        style={{
          fontSize: '0.58rem',
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: 'var(--salt-faint)',
          marginBottom: '0.8rem',
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: '2rem',
          fontWeight: 300,
          color: colors[color],
          lineHeight: 1,
          overflowWrap: 'break-word',
        }}
      >
        {value}
      </div>

      <div
        style={{
          fontSize: '0.62rem',
          color: 'var(--salt-faint)',
          marginTop: '0.45rem',
        }}
      >
        {sub}
      </div>
    </div>
  )
}

function fmtDate(d) {
  if (!d) return '—'

  return new Date(d).toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'short',
  })
}

function toISO(date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .split('T')[0]
}

function daysBetween(isoA, isoB) {
  return Math.round((new Date(isoB + 'T00:00:00Z') - new Date(isoA + 'T00:00:00Z')) / 86400000)
}

function addDaysIso(iso, n) {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

function getRomeDate() {
  return new Date(
    new Date().toLocaleString('en-US', {
      timeZone: 'Europe/Rome',
    })
  )
}
