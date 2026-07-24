import React, { useEffect, useState } from 'react'
import { sb } from '../../lib/supabase'
import { useActiveProperty } from '../../lib/PropertyContext'

export default function Fiscale() {
  const { properties } = useActiveProperty()
  const [accountId, setAccountId] = useState(null)
  const [config, setConfig] = useState({ regime: 'cedolare_secca', aliquota: 21 })
  const [bookings, setBookings] = useState([])
  const [expenses, setExpenses] = useState([])
  const [year, setYear] = useState(new Date().getFullYear())
  const [filterProperty, setFilterProperty] = useState('all')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')

  useEffect(() => { if (properties.length > 0) load() }, [properties.length, year])

  async function load() {
    setLoading(true)
    const { data: userData } = await sb.auth.getUser()
    const { data: member } = await sb.from('account_members').select('account_id').eq('user_id', userData?.user?.id).limit(1).maybeSingle()
    const accId = member?.account_id
    setAccountId(accId)

    if (accId) {
      const { data: cfg } = await sb.from('fiscal_config').select('*').eq('account_id', accId).maybeSingle()
      if (cfg) setConfig(cfg)
    }

    const propertyIds = properties.map(p => p.id)
    const { data: bk } = await sb.from('bookings')
      .select('id, property_id, amount_total, check_in, status')
      .in('property_id', propertyIds)
      .in('status', ['confirmed', 'completed'])
      .gte('check_in', `${year}-01-01`).lte('check_in', `${year}-12-31`)
    setBookings(bk || [])

    const { data: ex } = await sb.from('expenses')
      .select('id, property_id, amount, date')
      .in('property_id', propertyIds)
      .gte('date', `${year}-01-01`).lte('date', `${year}-12-31`)
    setExpenses(ex || [])

    setLoading(false)
  }

  async function saveConfig() {
    if (!accountId) return
    setSaving(true); setSavedMsg('')
    const { error } = await sb.from('fiscal_config').upsert({
      account_id: accountId, regime: config.regime, aliquota: Number(config.aliquota), updated_at: new Date().toISOString(),
    }, { onConflict: 'account_id' })
    setSaving(false)
    setSavedMsg(error ? `Errore: ${error.message}` : 'Salvato.')
  }

  const filteredBookings = filterProperty === 'all' ? bookings : bookings.filter(b => b.property_id === filterProperty)
  const filteredExpenses = filterProperty === 'all' ? expenses : expenses.filter(e => e.property_id === filterProperty)

  const ricaviTotali = filteredBookings.reduce((s, b) => s + (b.amount_total || 0), 0)
  const speseTotali = filteredExpenses.reduce((s, e) => s + (e.amount || 0), 0)
  const margine = ricaviTotali - speseTotali
  const imposta = ricaviTotali * (Number(config.aliquota) || 0) / 100

  // Riepilogo per struttura — utile quando si guarda "tutte le strutture" insieme
  const perStruttura = properties.map(p => {
    const rb = bookings.filter(b => b.property_id === p.id)
    const re = expenses.filter(e => e.property_id === p.id)
    const ricavi = rb.reduce((s, b) => s + (b.amount_total || 0), 0)
    const spese = re.reduce((s, e) => s + (e.amount || 0), 0)
    return { name: p.name, id: p.id, ricavi, spese, margine: ricavi - spese }
  })

  const years = [0, 1, 2, 3].map(i => new Date().getFullYear() - i)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem', flexWrap: 'wrap', gap: '0.6rem' }}>
        <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 300, fontSize: '1.6rem', color: 'var(--gold)' }}>Fiscale</h2>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <select className="form-select" style={{ width: 100 }} value={year} onChange={e => setYear(Number(e.target.value))}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select className="form-select" style={{ width: 200 }} value={filterProperty} onChange={e => setFilterProperty(e.target.value)}>
            <option value="all">Tutte le strutture</option>
            {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>
      <p style={{ fontSize: '0.75rem', color: 'var(--salt-faint)', marginBottom: '1.5rem' }}>
        Vista a livello di host: aggrega tutte le tue strutture, indipendentemente da quale hai selezionata nel gestionale.
      </p>

      {loading ? (
        <div style={{ padding: '2.5rem', color: 'var(--salt-faint)' }}>Caricamento…</div>
      ) : (
        <>
          {/* RIEPILOGO */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="sec-hdr"><span className="sec-title">Riepilogo {year}</span></div>
            <div className="form-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
              <div>
                <div style={{ fontSize: '0.58rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--salt-faint)' }}>Ricavi totali</div>
                <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.6rem', color: 'var(--green)' }}>€{ricaviTotali.toLocaleString('it')}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.58rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--salt-faint)' }}>Spese totali</div>
                <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.6rem', color: 'var(--red)' }}>€{speseTotali.toLocaleString('it')}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.58rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--salt-faint)' }}>Margine</div>
                <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.6rem', color: 'var(--gold)' }}>€{margine.toLocaleString('it')}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.58rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--salt-faint)' }}>Imposta stimata ({config.aliquota}%)</div>
                <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.6rem', color: 'var(--amber)' }}>€{imposta.toLocaleString('it')}</div>
              </div>
            </div>
          </div>

          {/* RIEPILOGO PER STRUTTURA (solo se "tutte" selezionato e più di 1 struttura) */}
          {filterProperty === 'all' && properties.length > 1 && (
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <div className="sec-hdr"><span className="sec-title">Per struttura</span></div>
              {perStruttura.map(s => (
                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid var(--gold-dim2)', fontSize: '0.82rem' }}>
                  <span style={{ color: 'var(--salt-dim)' }}>{s.name}</span>
                  <span>
                    <span style={{ color: 'var(--green)' }}>€{s.ricavi.toFixed(0)}</span>
                    {' − '}
                    <span style={{ color: 'var(--red)' }}>€{s.spese.toFixed(0)}</span>
                    {' = '}
                    <strong style={{ color: 'var(--gold)' }}>€{s.margine.toFixed(0)}</strong>
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* CONFIGURAZIONE REGIME */}
          <div className="card">
            <div className="sec-hdr"><span className="sec-title">Regime fiscale</span></div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Regime</label>
                <select className="form-select" value={config.regime} onChange={e => setConfig(p => ({ ...p, regime: e.target.value }))}>
                  <option value="cedolare_secca">Cedolare secca</option>
                  <option value="ordinario" disabled>Regime ordinario / P.IVA (in arrivo)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Aliquota (%)</label>
                <input className="form-input" type="number" step="0.5" value={config.aliquota} onChange={e => setConfig(p => ({ ...p, aliquota: e.target.value }))} />
              </div>
            </div>
            <p style={{ fontSize: '0.65rem', color: 'var(--salt-faint)', marginBottom: '1rem' }}>
              L'aliquota standard per la cedolare secca sulle locazioni brevi è il 21%. Verifica sempre con il tuo commercialista la percentuale corretta per la tua situazione specifica — questo è un riepilogo indicativo, non una dichiarazione fiscale.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button className="btn-primary" onClick={saveConfig} disabled={saving}>{saving ? 'Salvataggio…' : 'Salva'}</button>
              {savedMsg && <span style={{ fontSize: '0.78rem', color: 'var(--salt-dim)' }}>{savedMsg}</span>}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
