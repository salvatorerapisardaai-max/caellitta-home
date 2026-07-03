import React, { useEffect, useState } from 'react'
import { sb } from '../../lib/supabase'
import Modal from '../../components/Modal'

const EMPTY_PARTNER = { partner: '', title: '', title_en: '', discount: '', description: '', description_en: '', category_id: '', commission_pct: 10, active: true }
const EMPTY_ASSIGN  = { booking_id: '', template_ids: [] }

export default function Convenzioni() {
  const [templates, setTemplates] = useState([])
  const [categories, setCategories] = useState([])
  const [bookings,  setBookings]  = useState([])
  const [gCoupons,  setGCoupons]  = useState([])
  const [loadError, setLoadError] = useState('')
  const [modalPartner, setModalP] = useState(false)
  const [modalAssign,  setModalA] = useState(false)
  const [form,     setForm]       = useState(EMPTY_PARTNER)
  const [assign,   setAssign]     = useState(EMPTY_ASSIGN)
  const [editing,  setEditing]    = useState(null)
  const [saving,   setSaving]     = useState(false)
  const [saveError,setSaveError]  = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoadError('')
    try {
      const { data: t, error: e1 } = await sb.from('coupon_templates').select('*').order('partner')
      if (e1) throw new Error('Templates: ' + e1.message)

      const { data: b, error: e2 } = await sb.from('bookings')
        .select('id,code,guest_name,check_in,status')
        .neq('status','cancelled').order('check_in', { ascending: false })
      if (e2) throw new Error('Bookings: ' + e2.message)

      const { data: gc, error: e3 } = await sb.from('guest_coupons')
        .select('id, booking_id, template_id, code, status, used_at, bookings(guest_name,code), coupon_templates(title,partner)')
      if (e3) throw new Error('Coupons: ' + e3.message)

      const { data: cat, error: e4 } = await sb.from('coupon_categories').select('*').order('name')
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
      discount: t.discount||'', description: t.description||'', description_en: t.description_en||'',
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
      discount: form.discount, description: form.description || null, description_en: form.description_en || null,
      category_id: form.category_id || null,
      commission_pct: form.commission_pct === '' ? null : Number(form.commission_pct),
      active: form.active
    }
    try {
      if (editing) {
        const { error } = await sb.from('coupon_templates').update(payload).eq('id', editing)
        if (error) throw error
      } else {
        const { error } = await sb.from('coupon_templates').insert(payload)
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
        return {
          booking_id:  assign.booking_id,
          template_id: tid,
          code: booking.code + '-' + (t?.partner||'CPR').substring(0,3).toUpperCase() + '-' + suffix,
          status: 'available',
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

  return (
    <div>
      {loadError && (
        <div style={{ background:'rgba(138,72,72,.15)', border:'1px solid rgba(138,72,72,.4)', padding:'0.75rem 1rem', marginBottom:'1rem', fontSize:'0.78rem', color:'#e08080' }}>
          Errore caricamento: {loadError}
        </div>
      )}

      <div style={{ display:'flex', justifyContent:'flex-end', gap:'0.8rem', marginBottom:'1.5rem', flexWrap:'wrap' }}>
        <button className="btn-ghost" onClick={() => { setModalA(true); setAssign(EMPTY_ASSIGN); setSaveError('') }}>
          Assegna coupon →
        </button>
        <button className="btn-primary" onClick={openNew}>+ Nuova convenzione</button>
      </div>

      {/* PARTNER GROUPS */}
      {Object.entries(grouped).map(([partner, items]) => (
        <div key={partner} style={{ marginBottom:'2rem' }}>
          <div style={{ fontSize:'0.62rem', letterSpacing:'0.28em', textTransform:'uppercase', color:'var(--gold)', marginBottom:'0.8rem' }}>
            {partner}
          </div>
          {items.map(t => (
            <div key={t.id} style={{ display:'flex', background:'var(--lava-card)', border:`1px solid ${t.active ? 'var(--gold-dim)' : 'rgba(90,90,90,.2)'}`, marginBottom:'0.5rem', overflow:'hidden', opacity: t.active ? 1 : 0.5 }}>
              <div style={{ width:3, background: t.active ? 'var(--gold)' : '#555', flexShrink:0 }} />
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

                {gCoupons.filter(gc => gc.template_id === t.id && gc.status === 'available').length > 0 && (
                  <div style={{ marginTop:'0.8rem', paddingTop:'0.8rem', borderTop:'1px solid var(--gold-dim)' }}>
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

      {/* COUPON ASSEGNATI */}
      {gCoupons.length > 0 && (
        <div style={{ marginTop:'2rem' }}>
          <div className="sec-hdr"><span className="sec-title">Coupon assegnati</span></div>
          {gCoupons.map(gc => (
            <div key={gc.id} style={{ background:'var(--lava-card)', border:'1px solid var(--gold-dim)', padding:'0.75rem 1rem', marginBottom:'0.4rem' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:'0.5rem', flexWrap:'wrap' }}>
                <div>
                  <div style={{ fontSize:'0.8rem', color:'var(--salt-dim)' }}>{gc.bookings?.guest_name}</div>
                  <div style={{ fontFamily:'monospace', fontSize:'0.6rem', color:'rgba(201,171,114,.45)' }}>{gc.bookings?.code}</div>
                </div>
                <div style={{ fontSize:'0.75rem', color:'var(--salt-dim)' }}>{gc.coupon_templates?.title}</div>
                <div style={{ fontFamily:'monospace', fontSize:'0.65rem', color:'var(--gold)' }}>{gc.code}</div>
                <span className={`badge ${gc.status === 'used' ? 'badge-gray' : 'badge-green'}`}>
                  {gc.status === 'used' ? 'Usato' : 'Attivo'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL NUOVA/MODIFICA */}
      <Modal open={modalPartner} onClose={() => setModalP(false)} title={editing ? 'Modifica convenzione' : 'Nuova convenzione'}>
        {saveError && <div style={{ background:'rgba(138,72,72,.15)', border:'1px solid rgba(138,72,72,.4)', padding:'0.75rem 1rem', marginBottom:'1rem', fontSize:'0.78rem', color:'#e08080' }}>{saveError}</div>}
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
        <div className="form-group">
          <label className="form-label">Dettaglio * (es. livello · durata · inclusioni)</label>
          <input className="form-input" value={form.discount} onChange={e=>setForm(p=>({...p,discount:e.target.value}))} placeholder="Es. Facile · 2-3h · attrezzatura e assicurazione incluse" />
        </div>
        <div className="form-group">
          <label className="form-label">Descrizione per l'ospite</label>
          <textarea className="form-textarea" value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} placeholder="Presentati come ospite Caellitta e ricevi..." />
        </div>
        <div className="form-group">
          <label className="form-label">Descrizione per l'ospite (EN)</label>
          <textarea className="form-textarea" value={form.description_en} onChange={e=>setForm(p=>({...p,description_en:e.target.value}))} placeholder="Show your Caellitta guest status and get..." />
        </div>
        <div className="form-group">
          <label className="form-label">Commissione partner (%)</label>
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
        {saveError && <div style={{ background:'rgba(138,72,72,.15)', border:'1px solid rgba(138,72,72,.4)', padding:'0.75rem 1rem', marginBottom:'1rem', fontSize:'0.78rem', color:'#e08080' }}>{saveError}</div>}
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
            {templates.filter(t => t.active).map(t => (
              <label key={t.id} style={{ display:'flex', alignItems:'center', gap:'0.8rem', cursor:'pointer', padding:'0.6rem 0.8rem', background: assign.template_ids.includes(t.id) ? 'rgba(201,171,114,.08)' : 'var(--lava-card)', border:`1px solid ${assign.template_ids.includes(t.id) ? 'var(--gold-dim2)' : 'var(--gold-dim)'}`, transition:'all .2s' }}>
                <input type="checkbox" checked={assign.template_ids.includes(t.id)} onChange={() => toggleTemplate(t.id)} style={{ accentColor:'var(--gold)' }} />
                <span style={{ flex:1, fontSize:'0.8rem', color:'var(--salt-dim)' }}>{t.partner} — {t.title}</span>
                <span style={{ fontSize:'0.75rem', color:'var(--gold)', fontFamily:"'Cormorant Garamond',serif", textAlign:'right' }}>{t.discount}</span>
              </label>
            ))}
          </div>
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

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('it-IT', { day:'numeric', month:'short' })
}
