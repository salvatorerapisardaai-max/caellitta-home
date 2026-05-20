import React, { useEffect, useState } from 'react'
import { sb } from '../../lib/supabase'
import { useNavigate } from 'react-router-dom'

export default function Dashboard() {
  const [bookings, setBookings] = useState([])
  const [expenses, setExpenses] = useState([])
  const [calMonth, setCalMonth] = useState(getRomeDate())

  const navigate = useNavigate()

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const { data: bk } = await sb
      .from('bookings')
      .select('*')
      .neq('status', 'cancelled')
      .order('check_in')

    const { data: ex } = await sb
      .from('expenses')
      .select('*')
      .order('date', { ascending: false })

    setBookings(bk || [])
    setExpenses(ex || [])
  }

  const today = getRomeDate()

  const thisMonth = today.getMonth()
  const thisYear = today.getFullYear()

  const active = bookings.filter(b => {
    const ci = new Date(b.check_in)
    const co = new Date(b.check_out)
    return ci <= today && today <= co
  })

  const upcoming = bookings
    .filter(b => new Date(b.check_in) > today)
    .sort((a, b) => new Date(a.check_in) - new Date(b.check_in))

  const monthRevenue = bookings
    .filter(b => {
      const ci = new Date(b.check_in)

      return (
        ci.getMonth() === thisMonth &&
        ci.getFullYear() === thisYear &&
        b.status !== 'cancelled'
      )
    })
    .reduce((s, b) => s + (b.amount_total || 0), 0)

  const monthExpenses = (expenses || [])
    .filter(e => {
      const d = new Date(e.date)

      return (
        d.getMonth() === thisMonth &&
        d.getFullYear() === thisYear
      )
    })
    .reduce((s, e) => s + (e.amount || 0), 0)

  // ───────────── CALENDAR ─────────────
  const year = calMonth.getFullYear()
  const month = calMonth.getMonth()

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const offset = firstDay === 0 ? 6 : firstDay - 1

  function getDayType(d) {
    const date = new Date(year, month, d)

    const iso = toISO(date)
    const todayIso = toISO(today)

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
      color: '#7dcca0',
    },

    checkout: {
      bg: 'rgba(138,72,72,.12)',
      border: '2px solid rgba(138,72,72,.5)',
      color: '#e08080',
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
  }

  return (
    <div>
      {/* ───────────────── KPI ───────────────── */}
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
          label="Entrate mese"
          value={`€${monthRevenue.toLocaleString('it')}`}
          sub={new Date().toLocaleDateString('it-IT', {
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
          label="Margine"
          value={`€${(monthRevenue - monthExpenses).toLocaleString('it')}`}
          sub="entrate - spese"
          color={monthRevenue - monthExpenses >= 0 ? 'green' : 'red'}
          accent="blue"
        />
      </div>

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
              ['#7dcca0', 'Check-in'],
              ['#e08080', 'Check-out'],
              ['var(--gold-light)', 'Occupato'],
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
                color: '#e08080',
              }}
            >
              −€{e.amount?.toFixed(2)}
            </div>
          </div>
        ))}
      </div>

      {/* ───────────────── RESPONSIVE ───────────────── */}
      <style>{`
        .dashboard-kpi-grid {
          display: grid;
          grid-template-columns: repeat(4,1fr);
          gap: 1rem;
          margin-bottom: 2rem;
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
    green: '#7dcca0',
    red: '#e08080',
    blue: '#7ab8d4',
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

function getRomeDate() {
  return new Date(
    new Date().toLocaleString('en-US', {
      timeZone: 'Europe/Rome',
    })
  )
}
