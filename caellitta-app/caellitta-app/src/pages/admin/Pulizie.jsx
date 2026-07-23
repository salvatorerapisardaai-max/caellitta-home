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

export default function Pulizie() {
  const navigate = useNavigate()
  const { activePropertyId } = useActiveProperty()
  const [bookings, setBookings] = useState([])
  const [collaborators, setCollaborators] = useState([])
  const [tab, setTab] = useState('da_fare') // da_fare | fatte | da_liquidare
  const [savingId, setSavingId] = useState(null)

  useEffect(() => { if (activePropertyId) load() }, [activePropertyId])

  async function load() {
    const { data: bk } = await sb
      .from('bookings')
      .select('*')
      .eq('property_id', activePropertyId)
      .neq('status', 'cancelled')
      .order('check_out', { ascending: true })
    setBookings(bk || [])

    const { data: cs } = await sb
      .from('collaborators')
      .select('id,name,email,active,compensation_type,default_rate')
      .eq('property_id', activePropertyId)
      .eq('active', true)
    setCollaborators(cs || [])
  }

  async function updateBooking(id, patch) {
    setSavingId(id)
    const { error } = await sb.from('bookings').update(patch).eq('id', id)
    setSavingId(null)
    if (error) { alert('Errore: ' + error.message); return }
    load()
  }

  function assignCollaborator(b, collaboratorId) {
    const collab = collaborators.find(c => c.id === collaboratorId)
    updateBooking(b.id, {
      cleaning_by: collaboratorId || null,
      cleaning_at: collaboratorId ? new Date().toISOString() : null,
      // precompila con il default del collaboratore se non già impostato
      cleaning_compensation_type: b.cleaning_compensation_type || collab?.compensation_type || 'percentage',
      cleaning_rate: b.cleaning_rate ?? collab?.default_rate ?? null,
    })
  }

  function markDone(b) {
    updateBooking(b.id, { cleaning_at: new Date().toISOString() })
  }

  function markSettled(b) {
    updateBooking(b.id, { cleaning_settled: true, cleaning_settled_at: new Date().toISOString() })
  }

  const todayIso = toISODate(new Date())

  // Una pulizia "serve" quando c'è un check-out (turnover). Task = booking con check_out.
  const withCleaning = bookings.filter(b => b.check_out)
  const daFare = withCleaning.filter(b => !b.cleaning_at)
  const fatte = withCleaning.filter(b => b.cleaning_at && !b.cleaning_settled)
  const daLiquidare = withCleaning.filter(b => b.cleaning_at && !b.cleaning_settled && b.cleaning_by)
  const liquidate = withCleaning.filter(b => b.cleaning_settled)

  const totaleDaLiquidare = daLiquidare.reduce((s, b) => s + (b.cleaning_amount_due || 0), 0)
  const totaleLiquidatoMese = liquidate
    .filter(b => b.cleaning_settled_at?.slice(0, 7) === todayIso.slice(0, 7))
    .reduce((s, b) => s + (b.cleaning_amount_due || 0), 0)

  const list = tab === 'da_fare' ? daFare : tab === 'fatte' ? fatte : liquidate

  return (
    <div>
      <style>{`
        @keyframes wiggle { 0%,100% { transform: rotate(0deg); } 25% { transform: rotate(-10deg); } 75% { transform: rotate(10deg); } }
        .icon-configurable { display: inline-block; cursor: pointer; transition: transform .15s; }
        .icon-configurable:hover { animation: wiggle .4s ease-in-out; }
        .pulizie-kpi { display: grid; grid-template-columns: repeat(auto-fit,minmax(160px,1fr)); gap: 1rem; margin-bottom: 1.5rem; }
        .task-card { padding: 1rem; margin-bottom: .6rem; border: 1px solid var(--gold-dim); background: var(--lava-card); }
        .task-row { display: flex; flex-wrap: wrap; gap: .8rem; align-items: flex-end; margin-top: .6rem; }
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '.6rem' }}>
        <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 300, fontSize: '1.6rem', color: 'var(--gold)' }}>
          Pulizie
          <span className="icon-configurable" title="Configura compensi predefiniti da Team" role="button" tabIndex={0}
            onClick={() => navigate('/team')} onKeyDown={e => e.key === 'Enter' && navigate('/team')}
            style={{ marginLeft: '.6rem', fontSize: '1rem' }}>⚙</span>
        </h2>
      </div>

      <div className="pulizie-kpi">
        <MiniKpi label="Da fare" value={daFare.length} color="var(--gold)" />
        <MiniKpi label="Fatte da liquidare" value={daLiquidare.length} color="#8a6a1f" />
        <MiniKpi label="Totale da liquidare" value={`€${totaleDaLiquidare.toFixed(2)}`} color="#963832" />
        <MiniKpi label="Liquidato questo mese" value={`€${totaleLiquidatoMese.toFixed(2)}`} color="#2f6b46" />
      </div>

      <div style={{ display: 'flex', gap: '.5rem', marginBottom: '1rem' }}>
        {['da_fare', 'fatte', 'liquidate'].map(t => (
          <button key={t} className="btn-sm" onClick={() => setTab(t)}
            style={tab === t ? { borderColor: 'var(--gold)', color: 'var(--gold)' } : {}}>
            {t === 'da_fare' ? `Da fare (${daFare.length})` : t === 'fatte' ? `Fatte, da liquidare (${daLiquidare.length})` : `Liquidate (${liquidate.length})`}
          </button>
        ))}
      </div>

      {list.length === 0 && (
        <div className="card" style={{ textAlign: 'center', color: 'var(--salt-faint)', padding: '2.5rem', fontSize: '.85rem' }}>
          Nessuna pulizia in questa categoria
        </div>
      )}

      {list.map(b => (
        <div key={b.id} className="task-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '.6rem' }}>
            <div>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.05rem' }}>{b.guest_name}</div>
              <div style={{ fontSize: '.68rem', color: 'var(--salt-faint)' }}>
                Check-out: {fmtDate(b.check_out)} {b.check_out === todayIso && <strong style={{ color: '#963832' }}> · OGGI</strong>}
              </div>
            </div>
            {b.cleaning_settled && <span className="badge badge-green">Liquidata</span>}
            {!b.cleaning_settled && b.cleaning_at && <span className="badge badge-amber">Fatta</span>}
            {!b.cleaning_at && <span className="badge badge-gray">Da fare</span>}
          </div>

          <div className="task-row">
            <div className="form-group" style={{ marginBottom: 0, minWidth: 160 }}>
              <label className="form-label">Collaboratore</label>
              <select className="form-select" value={b.cleaning_by || ''} disabled={savingId === b.id}
                onChange={e => assignCollaborator(b, e.target.value)}>
                <option value="">— Non assegnato —</option>
                {collaborators.map(c => <option key={c.id} value={c.id}>{c.name || c.email}</option>)}
              </select>
            </div>

            {b.cleaning_by && (
              <>
                <div className="form-group" style={{ marginBottom: 0, minWidth: 150 }}>
                  <label className="form-label">Tipo compenso</label>
                  <select className="form-select" value={b.cleaning_compensation_type || 'percentage'} disabled={savingId === b.id}
                    onChange={e => updateBooking(b.id, { cleaning_compensation_type: e.target.value })}>
                    {Object.entries(COMP_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0, width: 110 }}>
                  <label className="form-label">
                    {b.cleaning_compensation_type === 'percentage' ? '% ' : '€ '}
                    {b.cleaning_compensation_type === 'hourly' ? '/ora' : b.cleaning_compensation_type === 'per_room' ? '/stanza' : ''}
                  </label>
                  <input className="form-input" type="number" step="0.01" value={b.cleaning_rate ?? ''} disabled={savingId === b.id}
                    onChange={e => updateBooking(b.id, { cleaning_rate: e.target.value === '' ? null : Number(e.target.value) })} />
                </div>
                {(b.cleaning_compensation_type === 'hourly' || b.cleaning_compensation_type === 'per_room') && (
                  <div className="form-group" style={{ marginBottom: 0, width: 110 }}>
                    <label className="form-label">{COMP_UNIT_LABEL[b.cleaning_compensation_type]}</label>
                    <input className="form-input" type="number" step="0.5" value={b.cleaning_units ?? ''} disabled={savingId === b.id}
                      onChange={e => updateBooking(b.id, { cleaning_units: e.target.value === '' ? null : Number(e.target.value) })} />
                  </div>
                )}
                <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.1rem', color: 'var(--gold)', paddingBottom: '.4rem' }}>
                  = €{(b.cleaning_amount_due || 0).toFixed(2)}
                </div>
              </>
            )}

            <div style={{ display: 'flex', gap: '.4rem', marginLeft: 'auto' }}>
              {!b.cleaning_at && (
                <button className="btn-sm" onClick={() => markDone(b)} disabled={savingId === b.id}>✓ Segna fatta</button>
              )}
              {b.cleaning_at && !b.cleaning_settled && b.cleaning_by && (
                <button className="btn-primary btn-sm" onClick={() => markSettled(b)} disabled={savingId === b.id}>Segna liquidata</button>
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
