import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { sb } from '../../lib/supabase'
import { useActiveProperty } from '../../lib/PropertyContext'

const COMP_LABELS = {
  percentage: '% importo prenotazione',
  fixed: 'Fisso a intervento',
  hourly: 'A ore',
  per_room: 'A stanza/appartamento',
}
const COMP_UNIT_LABEL = { hourly: 'Ore', per_room: 'N° stanze' }

export default function CheckIn() {
  const navigate = useNavigate()
  const { activePropertyId } = useActiveProperty()
  const [bookings, setBookings] = useState([])
  const [collaborators, setCollaborators] = useState([])
  const [units, setUnits] = useState([])
  const [kind, setKind] = useState('checkin') // checkin | checkout
  const [tab, setTab] = useState('da_fare')
  const [savingId, setSavingId] = useState(null)

  useEffect(() => { if (activePropertyId) load() }, [activePropertyId])

  async function load() {
    const { data: bk } = await sb.from('bookings').select('*').eq('property_id', activePropertyId).neq('status', 'cancelled').order('check_in', { ascending: true })
    setBookings(bk || [])
    const { data: cs } = await sb.from('collaborators').select('id,name,email,active,compensation_type,default_rate').eq('property_id', activePropertyId).eq('active', true)
    setCollaborators(cs || [])
    const { data: u } = await sb.from('property_units').select('id,name').eq('property_id', activePropertyId).eq('active', true)
    setUnits(u || [])
  }

  async function updateBooking(id, patch) {
    setSavingId(id)
    const { error } = await sb.from('bookings').update(patch).eq('id', id)
    setSavingId(null)
    if (error) { alert('Errore: ' + error.message); return }
    load()
  }

  const byField = kind === 'checkin'
    ? { by: 'checkin_by', at: 'checkin_at', comp: 'checkin_compensation_type', rate: 'checkin_rate', units: 'checkin_units', settled: 'checkin_settled', settledAt: 'checkin_settled_at', due: 'checkin_amount_due', date: 'check_in' }
    : { by: 'checkout_by', at: 'checkout_at', comp: 'checkout_compensation_type', rate: 'checkout_rate', units: 'checkout_units', settled: 'checkout_settled', settledAt: 'checkout_settled_at', due: 'checkout_amount_due', date: 'check_out' }

  function assignCollaborator(b, collaboratorId) {
    const collab = collaborators.find(c => c.id === collaboratorId)
    updateBooking(b.id, {
      [byField.by]: collaboratorId || null,
      [byField.at]: collaboratorId ? new Date().toISOString() : null,
      [byField.comp]: b[byField.comp] || collab?.compensation_type || 'percentage',
      [byField.rate]: b[byField.rate] ?? collab?.default_rate ?? null,
    })
  }
  const markDone = b => updateBooking(b.id, { [byField.at]: new Date().toISOString() })
  const markSettled = b => updateBooking(b.id, { [byField.settled]: true, [byField.settledAt]: new Date().toISOString() })

  const todayIso = toISODate(new Date())
  const relevant = bookings.filter(b => b[byField.date])
  const daFare = relevant.filter(b => !b[byField.at])
  const fatte = relevant.filter(b => b[byField.at] && !b[byField.settled])
  const daLiquidare = fatte.filter(b => b[byField.by])
  const liquidate = relevant.filter(b => b[byField.settled])

  const totaleDaLiquidare = daLiquidare.reduce((s, b) => s + (b[byField.due] || 0), 0)

  const list = tab === 'da_fare' ? daFare : tab === 'fatte' ? fatte : liquidate

  return (
    <div>
      <style>{`
        @keyframes wiggle { 0%,100% { transform: rotate(0deg); } 25% { transform: rotate(-10deg); } 75% { transform: rotate(10deg); } }
        .icon-configurable { display: inline-block; cursor: pointer; transition: transform .15s; }
        .icon-configurable:hover { animation: wiggle .4s ease-in-out; }
        .ci-kpi { display: grid; grid-template-columns: repeat(auto-fit,minmax(160px,1fr)); gap: 1rem; margin-bottom: 1.5rem; }
        .task-card { padding: 1rem; margin-bottom: .6rem; border: 1px solid var(--gold-dim); background: var(--lava-card); }
        .task-row { display: flex; flex-wrap: wrap; gap: .8rem; align-items: flex-end; margin-top: .6rem; }
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '.6rem' }}>
        <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 300, fontSize: '1.6rem', color: 'var(--gold)' }}>
          Check-in / Check-out
          <span className="icon-configurable" title="Configura compensi predefiniti da Team" role="button" tabIndex={0}
            onClick={() => navigate('/team')} onKeyDown={e => e.key === 'Enter' && navigate('/team')}
            style={{ marginLeft: '.6rem', fontSize: '1rem' }}>⚙</span>
        </h2>
        <div style={{ display: 'flex', gap: '.4rem' }}>
          <button className="btn-sm" onClick={() => { setKind('checkin'); setTab('da_fare') }} style={kind === 'checkin' ? { borderColor: 'var(--gold)', color: 'var(--gold)' } : {}}>🔑 Check-in</button>
          <button className="btn-sm" onClick={() => { setKind('checkout'); setTab('da_fare') }} style={kind === 'checkout' ? { borderColor: 'var(--gold)', color: 'var(--gold)' } : {}}>🚪 Check-out</button>
        </div>
      </div>

      <div className="ci-kpi">
        <MiniKpi label="Da fare" value={daFare.length} color="var(--gold)" />
        <MiniKpi label="Fatti da liquidare" value={daLiquidare.length} color="#8a6a1f" />
        <MiniKpi label="Totale da liquidare" value={`€${totaleDaLiquidare.toFixed(2)}`} color="#963832" />
        <MiniKpi label="Liquidati" value={liquidate.length} color="#2f6b46" />
      </div>

      <div style={{ display: 'flex', gap: '.5rem', marginBottom: '1rem' }}>
        {['da_fare', 'fatte', 'liquidate'].map(t => (
          <button key={t} className="btn-sm" onClick={() => setTab(t)} style={tab === t ? { borderColor: 'var(--gold)', color: 'var(--gold)' } : {}}>
            {t === 'da_fare' ? `Da fare (${daFare.length})` : t === 'fatte' ? `Fatti, da liquidare (${daLiquidare.length})` : `Liquidati (${liquidate.length})`}
          </button>
        ))}
      </div>

      {list.length === 0 && (
        <div className="card" style={{ textAlign: 'center', color: 'var(--salt-faint)', padding: '2.5rem', fontSize: '.85rem' }}>
          Nessun task in questa categoria
        </div>
      )}

      {list.map(b => (
        <div key={b.id} className="task-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '.6rem' }}>
            <div>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.05rem' }}>{b.guest_name}</div>
              <div style={{ fontSize: '.68rem', color: 'var(--salt-faint)' }}>
                {kind === 'checkin' ? 'Check-in' : 'Check-out'}: {fmtDate(b[byField.date])} {b[byField.date] === todayIso && <strong style={{ color: '#963832' }}> · OGGI</strong>}
                {b.unit_id && units.find(u => u.id === b.unit_id) && <span style={{ color: 'var(--gold)' }}> · 🚪 {units.find(u => u.id === b.unit_id).name}</span>}
              </div>
            </div>
            {b[byField.settled] && <span className="badge badge-green">Liquidato</span>}
            {!b[byField.settled] && b[byField.at] && <span className="badge badge-amber">Fatto</span>}
            {!b[byField.at] && <span className="badge badge-gray">Da fare</span>}
          </div>

          <div className="task-row">
            <div className="form-group" style={{ marginBottom: 0, minWidth: 160 }}>
              <label className="form-label">Collaboratore</label>
              <select className="form-select" value={b[byField.by] || ''} disabled={savingId === b.id}
                onChange={e => assignCollaborator(b, e.target.value)}>
                <option value="">— Non assegnato —</option>
                {collaborators.map(c => <option key={c.id} value={c.id}>{c.name || c.email}</option>)}
              </select>
            </div>

            {b[byField.by] && (
              <>
                <div className="form-group" style={{ marginBottom: 0, minWidth: 150 }}>
                  <label className="form-label">Tipo compenso</label>
                  <select className="form-select" value={b[byField.comp] || 'percentage'} disabled={savingId === b.id}
                    onChange={e => updateBooking(b.id, { [byField.comp]: e.target.value })}>
                    {Object.entries(COMP_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0, width: 110 }}>
                  <label className="form-label">
                    {b[byField.comp] === 'percentage' ? '% ' : '€ '}
                    {b[byField.comp] === 'hourly' ? '/ora' : b[byField.comp] === 'per_room' ? '/stanza' : ''}
                  </label>
                  <input className="form-input" type="number" step="0.01" value={b[byField.rate] ?? ''} disabled={savingId === b.id}
                    onChange={e => updateBooking(b.id, { [byField.rate]: e.target.value === '' ? null : Number(e.target.value) })} />
                </div>
                {(b[byField.comp] === 'hourly' || b[byField.comp] === 'per_room') && (
                  <div className="form-group" style={{ marginBottom: 0, width: 110 }}>
                    <label className="form-label">{COMP_UNIT_LABEL[b[byField.comp]]}</label>
                    <input className="form-input" type="number" step="0.5" value={b[byField.units] ?? ''} disabled={savingId === b.id}
                      onChange={e => updateBooking(b.id, { [byField.units]: e.target.value === '' ? null : Number(e.target.value) })} />
                  </div>
                )}
                <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.1rem', color: 'var(--gold)', paddingBottom: '.4rem' }}>
                  = €{(b[byField.due] || 0).toFixed(2)}
                </div>
              </>
            )}

            <div style={{ display: 'flex', gap: '.4rem', marginLeft: 'auto' }}>
              {!b[byField.at] && <button className="btn-sm" onClick={() => markDone(b)} disabled={savingId === b.id}>✓ Segna fatto</button>}
              {b[byField.at] && !b[byField.settled] && b[byField.by] && (
                <button className="btn-primary btn-sm" onClick={() => markSettled(b)} disabled={savingId === b.id}>Segna liquidato</button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function MiniKpi({ label, value, color }) {
  return (
    <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
      <div style={{ fontSize: '.58rem', letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--salt-faint)', marginBottom: '.4rem' }}>{label}</div>
      <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.5rem', color }}>{value}</div>
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
