import React, { useEffect, useState } from 'react'
import { sb } from '../../lib/supabase'
import Modal from '../../components/Modal'
import { useActiveProperty } from '../../lib/PropertyContext'

const EMPTY_PARTNER = { partner: '', title: '', title_en: '', title_es: '', title_fr: '', title_de: '', discount: '', description: '', description_en: '', description_es: '', description_fr: '', description_de: '', category_id: '', commission_pct: 10, active: true }
const EMPTY_ASSIGN  = { booking_id: '', template_ids: [], amounts: {} }

export default function Convenzioni() {
  const { activePropertyId } = useActiveProperty()
  const [templates, setTemplates] = useState([])
  const [categories, setCategories] = useState([])
  const [bookings,  setBookings]  = useState([])
  const [gCoupons,  setGCoupons]  = useState([])
  const [loadError, setLoadError] = useState('')
  const [modalPartner, setModalP] = useState(false)
  const [modalAssign,  setModalA] = useState(false)
  const [form,     setForm]       = useState(EMPTY_PARTNER)
  const [assign,   setAssign]     = useState(EMPTY_ASSIGN)
  const [extraLang, setExtraLang] = useState('es')
  const [editing,  setEditing]    = useState(null)
  const [saving,   setSaving]     = useState(false)
  const [saveError,setSaveError]  = useState('')
  const [newCatName, setNewCatName] = useState('')

  async function addCategory() {
    if (!newCatName.trim()) return
    const slug = newCatName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const { error } = await sb.from('coupon_categories').insert({
      property_id: activePropertyId, name: newCatName.trim(), slug, color: '#9c7a3c',
    })
    if (error) { alert('Errore: ' + error.message); return }
    setNewCatName('')
    load()
  }

  async function deleteCategory(cat) {
    const inUso = templates.filter(t => t.category_id === cat.id).length
    if (inUso > 0) {
      alert(`"${cat.name}" è usata da ${inUso} convenzioni. Cambia categoria a quelle convenzioni prima di eliminarla.`)
      return
    }
    if (!confirm(`Eliminare la categoria "${cat.name}"?`)) return
    await sb.from('coupon_categories').delete().eq('id', cat.id)
    load()
  }

  useEffect(() => { if (activePropertyId) load() }, [activePropertyId])

  async function load() {
    setLoadError('')
    try {
      const { data: t, error: e1 } = await sb.from('coupon_templates').select('*').eq('property_id', activePropertyId).order('partner')
      if (e1) throw new Error('Templates: ' + e1.message)

      const { data: b, error: e2 } = await sb.from('bookings')
        .select('id,code,guest_name,check_in,status')
        .eq('property_id', activePropertyId)
        .neq('status','cancelled').order('check_in', { ascending: false })
      if (e2) throw new Error('Bookings: ' + e2.message)

      // amount_paid/commission/commission_settled: importo esperienza e commissione dovuta
      // dal partner a noi — dati interni, mai esposti nel portale ospite. Filtrato per
      // struttura tramite le prenotazioni collegate (guest_coupons non ha property_id diretto).
      const { data: gc, error: e3 } = await sb.from('guest_coupons')
        .select('id, booking_id, template_id, code, status, used_at, amount_paid, commission, commission_settled, commission_settled_at, notes, bookings!inner(guest_name,code,property_id), coupon_templates(title,partner,commission_pct)')
        .eq('bookings.property_id', activePropertyId)
      if (e3) throw new Error('Coupons: ' + e3.message)

      const { data: cat, error: e4 } = await sb.from('coupon_categories').select('*').eq('property_id', activePropertyId).order('name')
      if (e4) throw new Error('Categorie: ' + e4.message)

      setTemplates(t || [])
      setBookings(b  || [])
      setGCoupons(gc || [])
      setCategories(cat || [])
    } catch (err) {
      console.error(err)
      setLoadError(err.message)
    }
  }

  const grouped = templates.reduce((acc, t) => {
    const k = t.partner || 'Altro'
    if (!acc[k]) acc[k] = []
    acc[k].push(t)
    return acc
  }, {})

  function openNew()  { setForm(EMPTY_PARTNER); setEditing(null); setSaveError(''); setModalP(true) }
  function openEdit(t) {
    setForm({
      partner: t.partner||'', title: t.title||'', title_en: t.title_en||'',
      title_es: t.title_es||'', title_fr: t.title_fr||'', title_de: t.title_de||'',
      discount: t.discount||'', description: t.description||'', description_en: t.description_en||'',
      description_es: t.description_es||'', description_fr: t.description_fr||'', description_de: t.description_de||'',
      category_id: t.category_id||'', commission_pct: t.commission_pct ?? 10, active: t.active ?? true
    })
    setEditing(t.id); setSaveError(''); setModalP(true)
  }

  async function savePartner() {
    if (!form.partner || !form.title || !form.discount) {
      setSaveError('Partner, titolo e sconto sono obbligatori.'); return
    }
    setSaving(true); setSaveError('')
    const payload = {
      partner: form.partner, title: form.title, title_en: form.title_en || null,
      title_es: form.title_es || null, title_fr: form.title_fr || null, title_de: form.title_de || null,
      discount: form.discount, description: form.description || null, description_en: form.description_en || null,
      description_es: form.description_es || null, description_fr: form.description_fr || null, description_de: form.description_de || null,
      category_id: form.category_id || null,
      commission_pct: form.commission_pct === '' ? null : Number(form.commission_pct),
      active: form.active
    }
    try {
      if (editing) {
        const { error } = await sb.from('coupon_templates').update(payload).eq('id', editing)
        if (error) throw error
      } else {
        const { error } = await sb.from('coupon_templates').insert({ ...payload, property_id: activePropertyId })
        if (error) throw error
      }
      await load(); setModalP(false); setEditing(null)
    } catch (err) {
      setSaveError('Errore: ' + (err.message || JSON.stringify(err)))
    } finally { setSaving(false) }
  }

  async function deleteTemplate(id) {
    if (!confirm('Eliminare questa convenzione?')) return
    await sb.from('coupon_templates').delete().eq('id', id)
    load()
  }

  async function assignCoupons() {
    if (!assign.booking_id || assign.template_ids.length === 0) return
    setSaving(true); setSaveError('')
    const booking = bookings.find(b => b.id === assign.booking_id)
    try {
      const inserts = assign.template_ids.map((tid, i) => {
        const t = templates.find(t => t.id === tid)
        // Aggiunto l'indice i: senza, due template dello stesso partner assegnati
        // nella stessa chiamata potevano generare lo stesso Date.now() e collidere.
        const suffix = Date.now().toString(36).toUpperCase() + i.toString(36).toUpperCase()
        // Importo esperienza inserito subito in fase di assegnazione (se compilato):
        // la commissione dovuta dal partner si calcola da sola, niente da ricordarsi dopo.
        const rawAmount = assign.amounts[tid]
        const amount = rawAmount !== undefined && rawAmount !== '' ? Number(rawAmount) : null
        const commission = (amount != null && t?.commission_pct != null)
          ? Math.round(amount * t.commission_pct) / 100
          : null
        return {
          booking_id:  assign.booking_id,
          template_id: tid,
          code: booking.code + '-' + (t?.partner||'CPR').substring(0,3).toUpperCase() + '-' + suffix,
          status: 'available',
          amount_paid: amount,
          commission,
        }
      })
      const { error } = await sb.from('guest_coupons').insert(inserts)
      if (error) throw error
      await load(); setModalA(false); setAssign(EMPTY_ASSIGN)
    } catch (err) {
      setSaveError('Errore: ' + (err.message || JSON.stringify(err)))
    } finally { setSaving(false) }
  }

  function toggleTemplate(id) {
    setAssign(prev => ({
      ...prev,
      template_ids: prev.template_ids.includes(id)
        ? prev.template_ids.filter(x => x !== id)
        : [...prev.template_ids, id]
    }))
  }

  function setAssignAmount(tid, value) {
    setAssign(prev => ({ ...prev, amounts: { ...prev.amounts, [tid]: value } }))
  }

  // Aggiorna importo esperienza + ricalcola commissione (usabile anche su coupon già assegnati,
  // per quando l'importo si scopre solo a consuntivo)
  async function updateCouponAmount(gc, amountStr) {
    const amount = amountStr === '' ? null : Number(amountStr)
    const pct = gc.coupon_templates?.commission_pct
    const commission = (amount != null && pct != null) ? Math.round(amount * pct) / 100 : null
    await sb.from('guest_coupons').update({ amount_paid: amount, commission }).eq('id', gc.id)
    load()
  }

  async function toggleCouponSettled(gc) {
    await sb.from('guest_coupons').update({
      commission_settled: !gc.commission_settled,
      commission_settled_at: !gc.commission_settled ? new Date().toISOString() : null,
    }).eq('id', gc.id)
    load()
  }

  return (
    <div>
      {loadError && (
        <div style={{ background:'rgba(168,69,63,.12)', border:'1px solid rgba(168,69,63,.4)', padding:'0.75rem 1rem', marginBottom:'1rem', fontSize:'0.78rem', color:'var(--red)' }}>
          Errore caricamento: {loadError}
        </div>
      )}

      <div style={{ display:'flex', justifyContent:'flex-end', gap:'0.8rem', marginBottom:'1.5rem', flexWrap:'wrap' }}>
        <button className="btn-ghost" onClick={() => { setModalA(true); setAssign(EMPTY_ASSIGN); setSaveError('') }}>
          Assegna coupon →
        </button>
        <button className="btn-primary" onClick={openNew}>+ Nuova convenzione</button>
      </div>

      {/* CATEGORIE — servono a raggruppare le convenzioni nel Welcome Book dell'ospite */}
      <div className="card" style={{ marginBottom:'1.5rem' }}>
        <div className="sec-hdr"><span className="sec-title">Categorie</span></div>
        <p style={{ fontSize:'0.72rem', color:'var(--salt-faint)', marginBottom:'0.8rem' }}>
          Raggruppano le convenzioni nel Welcome Book. Personalizzale come vuoi.
        </p>
        <div style={{ display:'flex', flexWrap:'wrap', gap:'0.4rem', marginBottom:'0.8rem' }}>
          {categories.length === 0 && <span style={{ fontSize:'0.78rem', color:'var(--salt-faint)' }}>Nessuna categoria.</span>}
          {categories.map(cat => (
            <span key={cat.id} style={{
              display:'inline-flex', alignItems:'center', gap:'0.4rem', fontSize:'0.72rem',
              padding:'0.25rem 0.6rem', border:'1px solid var(--gold-dim2)', color:'var(--salt-dim)',
            }}>
              <span style={{ width:8, height:8, borderRadius:'50%', background: cat.color || 'var(--gold)' }} />
              {cat.name}
              <button className="btn-sm" style={{ padding:'0 0.3rem', border:'none' }} onClick={() => deleteCategory(cat)}>✕</button>
            </span>
          ))}
        </div>
        <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap' }}>
          <input className="form-input" style={{ flex:1, minWidth:180 }} placeholder="Nome nuova categoria (es. Spiagge)"
            value={newCatName} onChange={e => setNewCatName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addCategory()} />
          <button className="btn-sm" onClick={addCategory} disabled={!newCatName.trim()}>+ Aggiungi categoria</button>
        </div>
      </div>

      {/* PARTNER GROUPS */}
      {Object.entries(grouped).map(([partner, items]) => (
        <div key={partner} style={{ marginBottom:'2rem' }}>
          <div style={{ fontSize:'0.62rem', letterSpacing:'0.28em', textTransform:'uppercase', color:'var(--gold)', marginBottom:'0.8rem' }}>
            {partner}
          </div>
          {items.map(t => (
            <div key={t.id} style={{ display:'flex', background:'var(--lava-card)', border:`1px solid ${t.active ? 'var(--gold-dim2)' : 'rgba(90,90,90,.2)'}`, marginBottom:'0.5rem', overflow:'hidden', opacity: t.active ? 1 : 0.5 }}>
              <div style={{ width:3, background: t.active ? 'var(--gold)' : '#999', flexShrink:0 }} />
              <div style={{ padding:'1rem 1.2rem', flex:1, minWidth:0 }}>
                {/* Riga 1: titolo + descrizione a sinistra, azioni a destra */}
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'0.8rem' }}>
                  <div style={{ minWidth:0, flex:1 }}>
                    <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.05rem', marginBottom: t.description ? '0.25rem' : 0, wordBreak:'break-word' }}>{t.title}</div>
                    {t.description && <div style={{ fontSize:'0.76rem', color:'var(--salt-dim)', lineHeight:1.7 }}>{t.description}</div>}
                  </div>
                  <div style={{ display:'flex', gap:'0.4rem', flexShrink:0 }}>
                    <button className="btn-sm" onClick={() => openEdit(t)}>✏</button>
                    <button className="btn-sm danger" onClick={() => deleteTemplate(t.id)}>✕</button>
                  </div>
                </div>

                {/* Riga 2: dettaglio/valore a PIENA LARGHEZZA — niente più colonna stretta a destra,
                    così i testi lunghi (livello · quota · inclusioni) vanno a capo bene anche su mobile */}
                {t.discount && (
                  <div style={{ marginTop:'0.6rem', fontFamily:"'Cormorant Garamond',serif", fontSize:'0.98rem', color:'var(--gold)', lineHeight:1.5, wordBreak:'break-word' }}>
                    {t.discount}
                  </div>
                )}

                {t.commission_pct != null && (
                  <div style={{ marginTop:'0.4rem', fontSize:'0.62rem', color:'var(--salt-faint)' }}>
                    🔒 Commissione partner: {t.commission_pct}% (visibile solo qui)
                  </div>
                )}

                {gCoupons.filter(gc => gc.template_id === t.id && gc.status === 'available').length > 0 && (
                  <div style={{ marginTop:'0.8rem', paddingTop:'0.8rem', borderTop:'1px solid var(--gold-dim2)' }}>
                    <div style={{ fontSize:'0.55rem', letterSpacing:'0.18em', textTransform:'uppercase', color:'var(--salt-faint)', marginBottom:'0.4rem' }}>Assegnato a</div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:'0.4rem' }}>
                      {gCoupons.filter(gc => gc.template_id === t.id && gc.status === 'available').map(gc => (
                        <span key={gc.id} style={{ fontSize:'0.62rem', padding:'0.2rem 0.6rem', background:'var(--gold-dim)', color:'var(--gold)' }}>
                          {gc.bookings?.guest_name} · {gc.bookings?.code}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ))}

      {Object.keys(grouped).length === 0 && !loadError && (
        <div className="card" style={{ textAlign:'center', color:'var(--salt-faint)', padding:'3rem', fontSize:'0.85rem' }}>
          Nessuna convenzione. Clicca "+ Nuova convenzione" per iniziare.
        </div>
      )}

      {/* COUPON ASSEGNATI — con importo esperienza e commissione dovuta dal partner (solo interno) */}
      {gCoupons.length > 0 && (
        <div style={{ marginTop:'2rem' }}>
          <div className="sec-hdr"><span className="sec-title">Coupon assegnati</span></div>
          {gCoupons.map(gc => (
            <CouponRow key={gc.id} gc={gc} onSaveAmount={updateCouponAmount} onToggleSettled={toggleCouponSettled} />
          ))}
        </div>
      )}

      {/* MODAL NUOVA/MODIFICA */}
      <Modal open={modalPartner} onClose={() => setModalP(false)} title={editing ? 'Modifica convenzione' : 'Nuova convenzione'}>
        {saveError && <div style={{ background:'rgba(168,69,63,.12)', border:'1px solid rgba(168,69,63,.4)', padding:'0.75rem 1rem', marginBottom:'1rem', fontSize:'0.78rem', color:'var(--red)' }}>{saveError}</div>}
        <div className="form-group">
          <label className="form-label">Partner / locale *</label>
          <input className="form-input" value={form.partner} onChange={e=>setForm(p=>({...p,partner:e.target.value}))} placeholder="Es. Ristorante La Scogliera" />
        </div>
        <div className="form-group">
          <label className="form-label">Categoria</label>
          <select className="form-select" value={form.category_id} onChange={e=>setForm(p=>({...p,category_id:e.target.value}))}>
            <option value="">— Nessuna —</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Titolo coupon *</label>
          <input className="form-input" value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} placeholder="Es. Pranzo sul mare" />
        </div>
        <div className="form-group">
          <label className="form-label">Titolo coupon (EN)</label>
          <input className="form-input" value={form.title_en} onChange={e=>setForm(p=>({...p,title_en:e.target.value}))} placeholder="Es. Lunch by the sea" />
        </div>
        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.6rem' }}>
            {[['es','🇪🇸 ES'],['fr','🇫🇷 FR'],['de','🇩🇪 DE']].map(([code, label]) => (
              <button key={code} type="button" onClick={() => setExtraLang(code)} style={{
                background: extraLang === code ? 'var(--gold-dim)' : 'transparent',
                border: `1px solid ${extraLang === code ? 'var(--gold)' : 'var(--gold-dim2)'}`,
                color: extraLang === code ? 'var(--gold)' : 'var(--salt-dim)',
                padding: '0.3rem 0.7rem', fontSize: '0.65rem', cursor: 'pointer',
              }}>{label}</button>
            ))}
          </div>
          <input className="form-input" style={{ marginBottom: '0.5rem' }} value={form[`title_${extraLang}`] || ''}
            onChange={e=>setForm(p=>({...p, [`title_${extraLang}`]: e.target.value}))} placeholder={`Titolo coupon (${extraLang.toUpperCase()})`} />
          <textarea className="form-textarea" value={form[`description_${extraLang}`] || ''}
            onChange={e=>setForm(p=>({...p, [`description_${extraLang}`]: e.target.value}))} placeholder={`Descrizione (${extraLang.toUpperCase()})`} />
        </div>
        <div className="form-group">
          <label className="form-label">Dettaglio * (es. livello · durata · inclusioni)</label>
          <input className="form-input" value={form.discount} onChange={e=>setForm(p=>({...p,discount:e.target.value}))} placeholder="Es. Facile · 2-3h · attrezzatura e assicurazione incluse" />
        </div>
        <div className="form-group">
          <label className="form-label">Descrizione per l'ospite</label>
          <textarea className="form-textarea" value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} placeholder="Presentati come ospite e ricevi..." />
        </div>
        <div className="form-group">
          <label className="form-label">Descrizione per l'ospite (EN)</label>
          <textarea className="form-textarea" value={form.description_en} onChange={e=>setForm(p=>({...p,description_en:e.target.value}))} placeholder="Show your guest status and get..." />
        </div>
        <div className="form-group">
          <label className="form-label">Commissione partner (%) — quanto ci deve il partner per esperienza, mai visibile all'ospite</label>
          <input className="form-input" type="number" step="0.5" value={form.commission_pct} onChange={e=>setForm(p=>({...p,commission_pct:e.target.value}))} placeholder="10" />
        </div>
        <div className="form-group">
          <label style={{ display:'flex', alignItems:'center', gap:'0.6rem', cursor:'pointer' }}>
            <input type="checkbox" checked={form.active} onChange={e=>setForm(p=>({...p,active:e.target.checked}))} style={{ accentColor:'var(--gold)' }} />
            <span className="form-label" style={{ margin:0 }}>Convenzione attiva</span>
          </label>
        </div>
        <div style={{ display:'flex', gap:'0.8rem', marginTop:'1.5rem' }}>
          <button className="btn-primary" style={{ flex:1 }} onClick={savePartner} disabled={saving}>{saving ? 'Salvataggio…' : 'Salva'}</button>
          <button className="btn-cancel" onClick={() => setModalP(false)}>Annulla</button>
        </div>
      </Modal>

      {/* MODAL ASSEGNA */}
      <Modal open={modalAssign} onClose={() => setModalA(false)} title="Assegna coupon" subtitle="Scegli la prenotazione e i coupon da assegnare">
        {saveError && <div style={{ background:'rgba(168,69,63,.12)', border:'1px solid rgba(168,69,63,.4)', padding:'0.75rem 1rem', marginBottom:'1rem', fontSize:'0.78rem', color:'var(--red)' }}>{saveError}</div>}
        <div className="form-group">
          <label className="form-label">Prenotazione</label>
          <select className="form-select" value={assign.booking_id} onChange={e=>setAssign(p=>({...p,booking_id:e.target.value}))}>
            <option value="">— Seleziona —</option>
            {bookings.map(b => <option key={b.id} value={b.id}>{b.guest_name} · {b.code} · {fmtDate(b.check_in)}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Coupon da assegnare</label>
          <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem', marginTop:'0.5rem' }}>
            {templates.filter(t => t.active).map(t => {
              const checked = assign.template_ids.includes(t.id)
              const amountVal = assign.amounts[t.id] ?? ''
              const previewCommission = (amountVal !== '' && t.commission_pct != null)
                ? (Number(amountVal) * t.commission_pct / 100).toFixed(2)
                : null
              return (
                <div key={t.id}>
                  <label style={{ display:'flex', alignItems:'center', gap:'0.8rem', cursor:'pointer', padding:'0.6rem 0.8rem', background: checked ? 'rgba(156,122,60,.08)' : 'var(--lava-card)', border:`1px solid ${checked ? 'var(--gold-dim2)' : 'rgba(156,122,60,.2)'}`, transition:'all .2s' }}>
                    <input type="checkbox" checked={checked} onChange={() => toggleTemplate(t.id)} style={{ accentColor:'var(--gold)' }} />
                    <span style={{ flex:1, fontSize:'0.8rem', color:'var(--salt-dim)' }}>{t.partner} — {t.title}</span>
                    <span style={{ fontSize:'0.75rem', color:'var(--gold)', fontFamily:"'Cormorant Garamond',serif", textAlign:'right' }}>{t.discount}</span>
                  </label>
                  {checked && t.commission_pct != null && (
                    <div style={{ display:'flex', alignItems:'center', gap:'0.6rem', padding:'0.5rem 0.8rem 0.2rem 2.4rem', flexWrap:'wrap' }}>
                      <span style={{ fontSize:'0.6rem', letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--salt-faint)' }}>🔒 Importo esperienza (interno) €</span>
                      <input
                        className="form-input" type="number" style={{ width:90 }}
                        value={amountVal}
                        onChange={e => setAssignAmount(t.id, e.target.value)}
                        placeholder="es. 100"
                      />
                      {previewCommission && (
                        <span style={{ fontSize:'0.68rem', color:'var(--gold)' }}>→ commissione {t.commission_pct}% = €{previewCommission}</span>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <p style={{ fontSize:'0.62rem', color:'var(--salt-faint)', marginTop:'0.6rem', lineHeight:1.6 }}>
            L'importo esperienza è facoltativo qui — se non lo conosci ancora, puoi compilarlo dopo dalla lista "Coupon assegnati" qui sotto. Non è mai visibile all'ospite.
          </p>
        </div>
        <div style={{ display:'flex', gap:'0.8rem', marginTop:'1.8rem' }}>
          <button className="btn-primary" style={{ flex:1 }} onClick={assignCoupons} disabled={saving || !assign.booking_id || assign.template_ids.length === 0}>
            {saving ? 'Assegnazione…' : `Assegna ${assign.template_ids.length > 0 ? assign.template_ids.length : ''} coupon`}
          </button>
          <button className="btn-cancel" onClick={() => setModalA(false)}>Annulla</button>
        </div>
      </Modal>
    </div>
  )
}

// Riga di un coupon assegnato: mostra sempre nome/codice/stato (visibile all'ospite),
// e in una fascia separata contrassegnata "🔒 Solo noi" l'importo esperienza e la
// commissione dovuta dal partner — editabile inline, con toggle "Segna incassata".
function CouponRow({ gc, onSaveAmount, onToggleSettled }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(gc.amount_paid ?? '')
  const pct = gc.coupon_templates?.commission_pct
  const hasAmount = gc.amount_paid != null

  return (
    <div style={{ background:'var(--lava-card)', border:'1px solid var(--gold-dim2)', padding:'0.75rem 1rem', marginBottom:'0.4rem' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:'0.5rem', flexWrap:'wrap' }}>
        <div>
          <div style={{ fontSize:'0.8rem', color:'var(--salt-dim)' }}>{gc.bookings?.guest_name}</div>
          <div style={{ fontFamily:'monospace', fontSize:'0.6rem', color:'rgba(156,122,60,.6)' }}>{gc.bookings?.code}</div>
        </div>
        <div style={{ fontSize:'0.75rem', color:'var(--salt-dim)' }}>{gc.coupon_templates?.title}</div>
        <div style={{ fontFamily:'monospace', fontSize:'0.65rem', color:'var(--gold)' }}>{gc.code}</div>
        <span className={`badge ${gc.status === 'used' ? 'badge-gray' : 'badge-green'}`}>
          {gc.status === 'used' ? 'Usato' : 'Attivo'}
        </span>
      </div>

      <div style={{ marginTop:'0.6rem', paddingTop:'0.6rem', borderTop:'1px dashed var(--gold-dim2)', display:'flex', alignItems:'center', gap:'0.7rem', flexWrap:'wrap' }}>
        <span style={{ fontSize:'0.55rem', letterSpacing:'0.15em', textTransform:'uppercase', color:'var(--salt-faint)' }}>🔒 Solo noi</span>
        {editing ? (
          <>
            <input className="form-input" style={{ width:90 }} type="number" value={val} onChange={e=>setVal(e.target.value)} placeholder="importo €" autoFocus />
            <button className="btn-sm" onClick={() => { onSaveAmount(gc, val); setEditing(false) }}>Salva</button>
            <button className="btn-sm" onClick={() => { setVal(gc.amount_paid ?? ''); setEditing(false) }}>Annulla</button>
          </>
        ) : hasAmount ? (
          <>
            <span style={{ fontSize:'0.72rem', color:'var(--salt-dim)' }}>Esperienza €{gc.amount_paid.toFixed(2)}</span>
            <span style={{ fontSize:'0.72rem', color:'var(--gold)' }}>commissione {pct ?? '—'}% = €{(gc.commission||0).toFixed(2)}</span>
            <button className="btn-sm" onClick={() => setEditing(true)}>✏</button>
            <button className={`btn-sm ${gc.commission_settled ? '' : 'danger'}`} onClick={() => onToggleSettled(gc)}>
              {gc.commission_settled ? '✓ Incassata' : 'Segna incassata'}
            </button>
          </>
        ) : (
          <button className="btn-sm" onClick={() => setEditing(true)}>+ importo esperienza</button>
        )}
      </div>
    </div>
  )
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('it-IT', { day:'numeric', month:'short' })
}
