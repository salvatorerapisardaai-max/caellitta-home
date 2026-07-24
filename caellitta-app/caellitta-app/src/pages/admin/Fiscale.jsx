import React, { useEffect, useState } from 'react'
import { sb } from '../../lib/supabase'
import { useActiveProperty } from '../../lib/PropertyContext'

export default function Fiscale() {
  const { properties } = useActiveProperty()
  const [accountId, setAccountId] = useState(null)
  const [config, setConfig] = useState({ regime: 'cedolare_secca', aliquota: 21, prices_include_tax: false })
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
      account_id: accountId, regime: config.regime, aliquota: Number(config.aliquota),
      prices_include_tax: config.prices_include_tax, updated_at: new Date().toISOString(),
    }, { onConflict: 'account_id' })
    setSaving(false)
    setSavedMsg(error ? `Errore: ${error.message}` : 'Salvato.')
  }

  const filteredBookings = filterProperty === 'all' ? bookings : bookings.filter(b => b.property_id === filterProperty)
  const filteredExpenses = filterProperty === 'all' ? expenses : expenses.filter(e => e.property_id === filterProperty)

  const ricaviInseriti = filteredBookings.reduce((s, b) => s + (b.amount_total || 0), 0)
  const speseTotali = filteredExpenses.reduce((s, e) => s + (e.amount || 0), 0)
  const aliquotaNum = Number(config.aliquota) || 0

  // Se i prezzi inseriti sono GIÀ al netto della cedolare secca, l'imposta va "scorporata"
  // (calcolata all'indietro) invece che aggiunta sopra il lordo.
  let ricaviLordi, imposta, nettoDopoTasse
  if (config.prices_include_tax) {
    ricaviLordi = aliquotaNum < 100 ? ricaviInseriti / (1 - aliquotaNum / 100) : ricaviInseriti
    imposta = ricaviLordi - ricaviInseriti
    nettoDopoTasse = ricaviInseriti
  } else {
    ricaviLordi = ricaviInseriti
    imposta = ricaviLordi * aliquotaNum / 100
    nettoDopoTasse = ricaviLordi - imposta
  }
  const ricaviTotali = ricaviLordi
  const margine = nettoDopoTasse - speseTotali

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
            <div className="form-grid" style={{ gridTemplateColumns: 'repeat(5,1fr)' }}>
              <div>
                <div style={{ fontSize: '0.58rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--salt-faint)' }}>Ricavi lordi</div>
                <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.6rem', color: 'var(--green)' }}>€{ricaviTotali.toLocaleString('it', { maximumFractionDigits: 0 })}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.58rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--salt-faint)' }}>Imposta ({config.aliquota}%)</div>
                <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.6rem', color: 'var(--amber)' }}>€{imposta.toLocaleString('it', { maximumFractionDigits: 0 })}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.58rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--salt-faint)' }}>Netto dopo cedolare secca</div>
                <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.6rem', color: 'var(--gold)' }}>€{nettoDopoTasse.toLocaleString('it', { maximumFractionDigits: 0 })}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.58rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--salt-faint)' }}>Spese totali</div>
                <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.6rem', color: 'var(--red)' }}>€{speseTotali.toLocaleString('it', { maximumFractionDigits: 0 })}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.58rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--salt-faint)' }}>Margine netto reale</div>
                <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.6rem', color: 'var(--gold)' }}>€{margine.toLocaleString('it', { maximumFractionDigits: 0 })}</div>
              </div>
            </div>
            <p style={{ fontSize: '0.62rem', color: 'var(--salt-faint)', marginTop: '0.8rem' }}>
              Margine netto reale = ricavi al netto della cedolare secca − spese. È il guadagno effettivo dopo le tasse.
            </p>
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
            <div className="form-group" style={{ marginTop: '0.8rem' }}>
              <label className="form-label">I prezzi che inserisci nelle prenotazioni sono:</label>
              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', flex: 1, minWidth: 220, border: `1px solid ${!config.prices_include_tax ? 'var(--gold)' : 'var(--gold-dim2)'}`, padding: '0.7rem 0.9rem', background: !config.prices_include_tax ? 'var(--gold-dim)' : 'transparent' }}>
                  <input type="radio" checked={!config.prices_include_tax} onChange={() => setConfig(p => ({ ...p, prices_include_tax: false }))} style={{ accentColor: 'var(--gold)' }} />
                  <span style={{ fontSize: '0.8rem' }}><strong>Lordi</strong> — il totale pagato dall'ospite, l'imposta va calcolata sopra (caso più comune)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', flex: 1, minWidth: 220, border: `1px solid ${config.prices_include_tax ? 'var(--gold)' : 'var(--gold-dim2)'}`, padding: '0.7rem 0.9rem', background: config.prices_include_tax ? 'var(--gold-dim)' : 'transparent' }}>
                  <input type="radio" checked={config.prices_include_tax} onChange={() => setConfig(p => ({ ...p, prices_include_tax: true }))} style={{ accentColor: 'var(--gold)' }} />
                  <span style={{ fontSize: '0.8rem' }}><strong>Già al netto</strong> — hai già scorporato tu la cedolare secca, l'imposta va ricalcolata all'indietro</span>
                </label>
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

          {/* SCADENZE — la cedolare secca sui redditi dell'anno si versa l'anno successivo */}
          <div className="card" style={{ marginTop: '1.5rem' }}>
            <div className="sec-hdr"><span className="sec-title">Scadenze di versamento {year}</span></div>
            <p style={{ fontSize: '0.78rem', color: 'var(--salt-dim)', lineHeight: 1.7 }}>
              La cedolare secca sui ricavi di un anno si versa l'anno <strong>successivo</strong>, insieme al modello Redditi:
            </p>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.6rem' }}>
              <div style={{ flex: 1, minWidth: 200, border: '1px solid var(--gold-dim2)', padding: '0.8rem 1rem' }}>
                <div style={{ fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--salt-faint)' }}>Acconto</div>
                <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.1rem', color: 'var(--gold)' }}>30 novembre {year + 1}</div>
              </div>
              <div style={{ flex: 1, minWidth: 200, border: '1px solid var(--gold-dim2)', padding: '0.8rem 1rem' }}>
                <div style={{ fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--salt-faint)' }}>Saldo</div>
                <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.1rem', color: 'var(--gold)' }}>30 giugno {year + 2}</div>
              </div>
            </div>
            <p style={{ fontSize: '0.62rem', color: 'var(--salt-faint)', marginTop: '0.7rem' }}>
              Date indicative del regime ordinario F24 — verifica sempre le scadenze esatte con il tuo commercialista, possono variare (proroghe, rateizzazioni).
            </p>
          </div>
        </>
      )}
    </div>
  )
}
