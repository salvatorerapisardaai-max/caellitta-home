import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { sb } from '../../lib/supabase'

const VARS_FIELDS = [
  { key: 'name',   label: 'Nome ospite',         ph: 'Marco',              full: true },
  { key: 'code',   label: 'Codice prenotazione',  ph: 'CAELLITTA-2025-001', full: true },
  { key: 'wb',     label: 'Link sito',            ph: 'caellitta-home.vercel.app', full: true },
  { key: 'cin',    label: 'Check-in',             ph: '5 Giu' },
  { key: 'cout',   label: 'Check-out',            ph: '12 Giu' },
  { key: 'nights', label: 'Notti',                ph: '7' },
  { key: 'guests', label: 'N° ospiti',            ph: '2' },
]

const BLANK_BODY = `Scrivi qui il tuo messaggio.

Variabili disponibili: {{name}} {{code}} {{wb}} {{cin}} {{cout}} {{nights}} {{guests}}
Formattazione WhatsApp: *grassetto* e _corsivo_`

function renderTemplate(body, vars) {
  return (body || '').replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (vars[key]) return vars[key]
    const f = VARS_FIELDS.find(f => f.key === key)
    return f ? `[${f.label}]` : `[${key}]`
  })
}

function formatWhatsapp(text) {
  return (text || '')
    .replace(/\*(.*?)\*/g, '<b>$1</b>')
    .replace(/_(.*?)_/g, '<i>$1</i>')
    .replace(/\n/g, '<br/>')
}

export default function WhatsApp() {
  const [searchParams] = useSearchParams()
  const [templates, setTemplates] = useState([])
  const [lang, setLang] = useState('it')
  const [activeId, setActiveId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [draft, setDraft] = useState({ name: '', phase: '', timing: '', body: '', trigger_event: 'check_in', trigger_offset_days: 0 })
  const [savingTpl, setSavingTpl] = useState(false)
  const [copied, setCopied] = useState(false)
  const [vars, setVars] = useState({ name: '', cin: '', cout: '', nights: '', guests: '', code: '', wb: window.location.host })
  const [mobileTab, setMobileTab] = useState('vars') // 'vars' | 'templates' | 'preview'
  const [bookings, setBookings] = useState([])
  const [bookingId, setBookingId] = useState('')

  useEffect(() => { loadTemplates(); loadBookings() }, [])

  useEffect(() => {
    // Arrivo da un promemoria (Dashboard): precompila booking e template indicati nell'URL
    const qBooking = searchParams.get('bookingId')
    const qTemplate = searchParams.get('templateId')
    if (qTemplate && templates.some(t => t.id === qTemplate)) {
      const tpl = templates.find(t => t.id === qTemplate)
      setLang(tpl.lang)
      setActiveId(tpl.id)
    }
    if (qBooking && bookings.some(b => b.id === qBooking)) {
      applyBooking(qBooking)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templates.length, bookings.length])

  useEffect(() => {
    // Al cambio lingua, seleziona il primo template della lingua ed esce da eventuale modifica
    const first = templates.filter(t => t.lang === lang)[0]
    setActiveId(first?.id || null)
    setEditingId(null)
  }, [lang, templates.length])

  async function loadTemplates() {
    const { data } = await sb.from('whatsapp_templates').select('*').eq('active', true).order('lang').order('sort_order')
    setTemplates(data || [])
    if (!activeId && data?.length) {
      const first = data.filter(t => t.lang === lang)[0] || data[0]
      setActiveId(first?.id || null)
    }
  }

  async function loadBookings() {
    const { data } = await sb.from('bookings').select('*').neq('status', 'cancelled').order('check_in', { ascending: false })
    setBookings(data || [])
  }

  function applyBooking(id) {
    setBookingId(id)
    const b = bookings.find(x => x.id === id)
    if (!b) return
    const fmt = d => new Date(d).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
    setVars(p => ({
      ...p,
      name: b.guest_name || '',
      cin: fmt(b.check_in),
      cout: fmt(b.check_out),
      nights: b.nights != null ? String(b.nights) : '',
      guests: b.guests_count != null ? String(b.guests_count) : '',
      code: b.code || '',
    }))
  }

  const tpls = templates.filter(t => t.lang === lang)
  const current = tpls.find(t => t.id === activeId) || tpls[0]
  const rendered = current ? renderTemplate(current.body, vars) : ''
  const isEditing = editingId && current && editingId === current.id

  function copy() {
    navigator.clipboard.writeText(rendered)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function startEdit(t) {
    setActiveId(t.id)
    setEditingId(t.id)
    setDraft({
      name: t.name, phase: t.phase, timing: t.timing, body: t.body,
      trigger_event: t.trigger_event || 'check_in', trigger_offset_days: t.trigger_offset_days ?? 0,
    })
    setMobileTab('preview')
  }
  function cancelEdit() { setEditingId(null) }

  async function saveEdit() {
    setSavingTpl(true)
    await sb.from('whatsapp_templates').update({
      name: draft.name, phase: draft.phase, timing: draft.timing, body: draft.body,
      trigger_event: draft.trigger_event, trigger_offset_days: Number(draft.trigger_offset_days) || 0,
      updated_at: new Date().toISOString(),
    }).eq('id', editingId)
    setSavingTpl(false)
    setEditingId(null)
    loadTemplates()
  }

  async function duplicateTemplate(t) {
    const maxOrder = Math.max(0, ...tpls.map(x => x.sort_order || 0))
    const { data } = await sb.from('whatsapp_templates').insert({
      lang: t.lang, phase: t.phase, timing: t.timing, name: `${t.name} (copia)`, body: t.body, sort_order: maxOrder + 1,
    }).select().single()
    await loadTemplates()
    if (data) startEdit(data)
  }

  async function deleteTemplate(t) {
    if (!confirm(`Eliminare il template "${t.name}"?`)) return
    await sb.from('whatsapp_templates').update({ active: false }).eq('id', t.id)
    if (editingId === t.id) setEditingId(null)
    loadTemplates()
  }

  async function addNewTemplate() {
    const maxOrder = Math.max(0, ...tpls.map(x => x.sort_order || 0))
    const { data } = await sb.from('whatsapp_templates').insert({
      lang, phase: 'Nuova fase', timing: '', name: 'Nuovo template', body: BLANK_BODY, sort_order: maxOrder + 1,
      trigger_event: 'check_in', trigger_offset_days: 0,
    }).select().single()
    await loadTemplates()
    if (data) startEdit(data)
  }

  if (!current) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--salt-faint)' }}>
        <p style={{ marginBottom: '1rem' }}>Nessun template per questa lingua.</p>
        <button className="btn-primary" onClick={addNewTemplate}>+ Crea il primo template</button>
      </div>
    )
  }

  const VarsPanel = () => (
    <div style={{ padding: '1.2rem 1.4rem' }}>
      <div style={{ fontSize: '0.58rem', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '1rem' }}>Variabili ospite</div>

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', fontSize: '0.56rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--salt-faint)', marginBottom: '0.3rem' }}>Precompila da prenotazione</label>
        <select className="form-select" style={{ fontSize: '0.8rem' }} value={bookingId} onChange={e => applyBooking(e.target.value)}>
          <option value="">— Compila manualmente —</option>
          {bookings.map(b => <option key={b.id} value={b.id}>{b.guest_name} · {b.code}</option>)}
        </select>
      </div>

      {VARS_FIELDS.filter(f => f.full).map(f => (
        <div key={f.key} style={{ marginBottom: '0.7rem' }}>
          <label style={{ display: 'block', fontSize: '0.56rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--salt-faint)', marginBottom: '0.3rem' }}>{f.label}</label>
          <input className="form-input" style={{ fontSize: '0.8rem' }} placeholder={f.ph} value={vars[f.key]} onChange={e => setVars(p => ({ ...p, [f.key]: e.target.value }))} />
        </div>
      ))}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
        {VARS_FIELDS.filter(f => !f.full).map(f => (
          <div key={f.key}>
            <label style={{ display: 'block', fontSize: '0.56rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--salt-faint)', marginBottom: '0.3rem' }}>{f.label}</label>
            <input className="form-input" style={{ fontSize: '0.8rem' }} placeholder={f.ph} value={vars[f.key]} onChange={e => setVars(p => ({ ...p, [f.key]: e.target.value }))} />
          </div>
        ))}
      </div>
    </div>
  )

  const TemplatesPanel = () => (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.8rem 1.4rem', borderBottom: '1px solid var(--gold-dim)' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {['it', 'en'].map(l => (
            <button key={l} onClick={() => setLang(l)}
              style={{ background: lang === l ? 'var(--gold-dim)' : 'transparent', border: '1px solid var(--gold-dim)', color: lang === l ? 'var(--gold)' : 'var(--salt-faint)', padding: '0.3rem 0.8rem', fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'Jost,sans-serif' }}>
              {l === 'it' ? '🇮🇹 IT' : '🇬🇧 EN'}
            </button>
          ))}
        </div>
        <span className="icon-configurable" title="Puoi modificare, duplicare, eliminare o creare nuovi template" style={{ fontSize: '0.9rem', cursor: 'help' }}>⚙</span>
      </div>
      {tpls.map(t => (
        <div key={t.id} style={{
          padding: '0.75rem 1.1rem', cursor: 'pointer',
          borderLeft: activeId === t.id ? '2px solid var(--gold)' : '2px solid transparent',
          background: activeId === t.id ? 'rgba(201,171,114,.08)' : 'transparent',
          borderBottom: '1px solid var(--gold-dim)',
          transition: 'all .2s',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}
            onClick={() => { setActiveId(t.id); setMobileTab('preview') }}>
            <div style={{ minWidth: 0 }}>
              <span style={{ fontSize: '0.56rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#25D366', background: 'rgba(37,211,102,0.1)', padding: '0.18rem 0.45rem', whiteSpace: 'nowrap', marginRight: '0.4rem' }}>
                {t.timing || t.phase}
              </span>
              <span style={{ fontSize: '0.82rem', fontWeight: 300, color: activeId === t.id ? 'var(--gold)' : 'var(--salt-dim)' }}>{t.name}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.4rem' }}>
            <button className="btn-sm" style={{ fontSize: '0.62rem', padding: '0.15rem 0.5rem' }} onClick={() => startEdit(t)}>✏ Modifica</button>
            <button className="btn-sm" style={{ fontSize: '0.62rem', padding: '0.15rem 0.5rem' }} onClick={() => duplicateTemplate(t)}>⧉ Duplica</button>
            <button className="btn-sm danger" style={{ fontSize: '0.62rem', padding: '0.15rem 0.5rem' }} onClick={() => deleteTemplate(t)}>🗑</button>
          </div>
        </div>
      ))}
      <div style={{ padding: '0.9rem 1.1rem' }}>
        <button className="btn-primary" style={{ width: '100%', fontSize: '0.7rem' }} onClick={addNewTemplate}>+ Nuovo template</button>
      </div>
    </div>
  )

  const EditorPanel = () => (
    <div style={{ padding: '1.2rem 1.4rem', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
      <div style={{ fontSize: '0.58rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--gold)' }}>Modifica template</div>
      <div className="form-grid">
        <div className="form-group">
          <label className="form-label">Nome</label>
          <input className="form-input" value={draft.name} onChange={e => setDraft(p => ({ ...p, name: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Fase</label>
          <input className="form-input" value={draft.phase} onChange={e => setDraft(p => ({ ...p, phase: e.target.value }))} placeholder="Es. Pre-arrivo" />
        </div>
        <div className="form-group">
          <label className="form-label">Timing</label>
          <input className="form-input" value={draft.timing} onChange={e => setDraft(p => ({ ...p, timing: e.target.value }))} placeholder="Es. -7 giorni" />
        </div>
      </div>
      <div className="form-grid">
        <div className="form-group">
          <label className="form-label">Promemoria: quando</label>
          <select className="form-select" value={draft.trigger_event} onChange={e => setDraft(p => ({ ...p, trigger_event: e.target.value }))}>
            <option value="check_in">Rispetto al check-in</option>
            <option value="check_out">Rispetto al check-out</option>
            <option value="mid_stay">A metà soggiorno</option>
          </select>
        </div>
        {draft.trigger_event !== 'mid_stay' && (
          <div className="form-group">
            <label className="form-label">Giorni di scarto (negativo = prima)</label>
            <input className="form-input" type="number" value={draft.trigger_offset_days}
              onChange={e => setDraft(p => ({ ...p, trigger_offset_days: e.target.value }))} placeholder="-7" />
          </div>
        )}
      </div>
      <p style={{ fontSize: '0.65rem', color: 'var(--salt-faint)', marginTop: '-0.5rem' }}>
        Determina quando questo template appare tra i "Promemoria da inviare oggi" in Dashboard.
      </p>
      <div className="form-group">
        <label className="form-label">Messaggio</label>
        <textarea className="form-textarea" style={{ minHeight: 220, fontFamily: 'monospace', fontSize: '0.8rem' }}
          value={draft.body} onChange={e => setDraft(p => ({ ...p, body: e.target.value }))} />
        <div style={{ fontSize: '0.65rem', color: 'var(--salt-faint)', marginTop: '0.4rem' }}>
          Variabili: {'{{name}} {{code}} {{wb}} {{cin}} {{cout}} {{nights}} {{guests}}'} · Formattazione: *grassetto* _corsivo_
        </div>
      </div>
      <div style={{ background: '#0a0f0a', border: '1px solid rgba(37,211,102,.12)', overflow: 'hidden' }}>
        <div style={{ background: '#0d1a0d', padding: '0.8rem' }}>
          <div style={{ background: '#1a2e1a', borderRadius: '0 8px 8px 8px', padding: '0.8rem 1rem' }}>
            <div style={{ fontSize: '0.76rem', color: 'rgba(240,235,225,.85)', lineHeight: 1.75, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
              dangerouslySetInnerHTML={{ __html: formatWhatsapp(renderTemplate(draft.body, vars)) }} />
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '0.8rem' }}>
        <button className="btn-primary" style={{ flex: 1 }} onClick={saveEdit} disabled={savingTpl}>{savingTpl ? 'Salvataggio…' : 'Salva'}</button>
        <button className="btn-cancel" onClick={cancelEdit}>Annulla</button>
      </div>
    </div>
  )

  const PreviewPanel = () => {
    if (isEditing) return <EditorPanel />
    return (
      <div style={{ padding: '1.2rem 1.4rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
        <div>
          <div style={{ fontSize: '0.58rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#25D366', marginBottom: '0.3rem' }}>{current.phase}</div>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.4rem', fontWeight: 300 }}>{current.name}</div>
        </div>
        <div style={{ background: '#0a0f0a', border: '1px solid rgba(37,211,102,.12)', overflow: 'hidden' }}>
          <div style={{ background: '#1f2c1f', padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(37,211,102,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }}>🏠</div>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'rgba(240,235,225,.7)' }}>Caellitta Home</div>
              <div style={{ fontSize: '0.55rem', color: 'rgba(37,211,102,.6)' }}>in linea</div>
            </div>
          </div>
          <div style={{ background: '#0d1a0d', padding: '0.8rem' }}>
            <div style={{ background: '#1a2e1a', borderRadius: '0 8px 8px 8px', padding: '0.8rem 1rem' }}>
              <div style={{ fontSize: '0.76rem', color: 'rgba(240,235,225,.85)', lineHeight: 1.75, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                dangerouslySetInnerHTML={{ __html: formatWhatsapp(rendered) }} />
              <div style={{ fontSize: '0.52rem', color: 'rgba(37,211,102,.45)', textAlign: 'right', marginTop: '0.4rem' }}>
                {new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })} ✓✓
              </div>
            </div>
          </div>
        </div>
        <button onClick={copy} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
          background: copied ? '#4a8a68' : '#25D366',
          color: copied ? 'var(--salt)' : '#0a0f0a', border: 'none',
          padding: '0.85rem', fontFamily: 'Jost,sans-serif',
          fontSize: '0.7rem', letterSpacing: '0.18em', textTransform: 'uppercase',
          fontWeight: 500, cursor: 'pointer', transition: 'all .22s', width: '100%',
        }}>
          {copied ? '✓ Copiato!' : '⎘ Copia testo WhatsApp'}
        </button>
      </div>
    )
  }

  return (
    <>
      <style>{`
        @keyframes wiggle { 0%,100% { transform: rotate(0deg); } 25% { transform: rotate(-10deg); } 75% { transform: rotate(10deg); } }
        .icon-configurable { display: inline-block; transition: transform .15s; }
        .icon-configurable:hover { animation: wiggle .4s ease-in-out; }
        .wa-desktop { display: grid; grid-template-columns: 320px 1fr; height: calc(100vh - 120px); gap: 0; margin: -2rem; overflow: hidden; }
        .wa-left { background: var(--lava-mid); border-right: 1px solid var(--gold-dim); display: flex; flex-direction: column; overflow: hidden; }
        .wa-left-top { overflow-y: auto; flex-shrink: 0; border-bottom: 1px solid var(--gold-dim); max-height: 40%; }
        .wa-left-bottom { flex: 1; overflow-y: auto; }
        .wa-right { overflow-y: auto; display: flex; flex-direction: column; }
        .wa-mobile { display: none; }
        .wa-mobile-tabs { display: flex; border-bottom: 1px solid var(--gold-dim); }
        .wa-mobile-tab { flex: 1; padding: 0.75rem; text-align: center; font-size: 0.62rem; letter-spacing: 0.15em; text-transform: uppercase; cursor: pointer; border: none; background: transparent; font-family: Jost,sans-serif; transition: all .2s; }

        @media (max-width: 768px) {
          .wa-desktop { display: none !important; }
          .wa-mobile { display: flex; flex-direction: column; margin: -1rem; }
        }
      `}</style>

      {/* DESKTOP */}
      <div className="wa-desktop">
        <div className="wa-left">
          <div className="wa-left-top"><VarsPanel /></div>
          <div className="wa-left-bottom"><TemplatesPanel /></div>
        </div>
        <div className="wa-right"><PreviewPanel /></div>
      </div>

      {/* MOBILE: 3 tab */}
      <div className="wa-mobile">
        <div className="wa-mobile-tabs">
          {[['vars', 'Variabili'], ['templates', 'Template'], ['preview', isEditing ? 'Modifica' : 'Anteprima']].map(([id, label]) => (
            <button key={id} className="wa-mobile-tab" onClick={() => setMobileTab(id)}
              style={{ color: mobileTab === id ? 'var(--gold)' : 'var(--salt-faint)', borderBottom: mobileTab === id ? '2px solid var(--gold)' : '2px solid transparent' }}>
              {label}
            </button>
          ))}
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {mobileTab === 'vars' && <VarsPanel />}
          {mobileTab === 'templates' && <TemplatesPanel />}
          {mobileTab === 'preview' && <PreviewPanel />}
        </div>
      </div>
    </>
  )
}
