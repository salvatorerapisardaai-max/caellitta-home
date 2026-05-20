import React, { useEffect, useState } from 'react'
import { sb } from '../../lib/supabase'
import Modal from '../../components/Modal'

// I tuoi 3 partner fissi + eventualmente altri
const PARTNER_ICONS = { Ristorante: '🍽', Barca: '⛵', Etna: '🌋', Altro: '🎁' }

const EMPTY_PARTNER = { name: '', category: 'Ristorante', description: '', discount_type: 'percent', discount_value: '', partner_name: '', notes: '' }
const EMPTY_ASSIGN = { booking_id: '', template_ids: [] }

export default function Convenzioni() {
  const [templates, setTemplates]   = useState([])
  const [bookings, setBookings]     = useState([])
  const [gCoupons, setGCoupons]     = useState([])
  const [modalPartner, setModalP]   = useState(false)
  const [modalAssign, setModalA]    = useState(false)
  const [form, setForm]             = useState(EMPTY_PARTNER)
  const [assign, setAssign]         = useState(EMPTY_ASSIGN)
  const [editing, setEditing]       = useState(null)
  const [saving, setSaving]         = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const [{ data: t }, { data: b }, { data: gc }] = await Promise.all([
      sb.from('coupon_templates').select('*').order('category'),
      sb.from('bookings').select('id,code,guest_name,check_in,status').neq('status','cancelled').order('check_in', { ascending: false }),
      sb.from('guest_coupons').select('*, coupon_templates(name,category), bookings(guest_name,code)'),
    ])
    setTemplates(t || [])
    setBookings(b || [])
    setGCoupons(gc || [])
  }

  // Group templates by category/partner
  const grouped = templates.reduce((acc, t) => {
    const k = t.category || 'Altro'
    if (!acc[k]) acc[k] = []
    acc[k].push(t)
    return acc
  }, {})

  async function savePartner() {
    if (!form.name || !form.partner_name || !form.discount_value) return
    setSaving(true)
    const payload = { ...form, discount_value: parseFloat(form.discount_value) }
    if (editing) await sb.from('coupon_templates').update(payload).eq('id', editing)
    else await sb.from('coupon_templates').insert(payload)
    setSaving(false); setModalP(false); load()
  }

  async function deleteTemplate(id) {
    if (!confirm('Eliminare questa convenzione?')) return
    await sb.from('coupon_templates').delete().eq('id', id)
    load()
  }

  async function assignCoupons() {
    if (!assign.booking_id || assign.template_ids.length === 0) return
    setSaving(true)
    const booking = bookings.find(b => b.id === assign.booking_id)
    const inserts = assign.template_ids.map(tid => {
      const t = templates.find(t => t.id === tid)
      return {
        booking_id: assign.booking_id,
        coupon_template_id: tid,
        code: booking.code + '-' + (t?.category || 'CPR').substring(0,3).toUpperCase(),
        used_at: null,
      }
    })
    await sb.from('guest_coupons').insert(inserts)
    setSaving(false); setModalA(false); setAssign(EMPTY_ASSIGN); load()
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
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.8rem', marginBottom: '1.5rem' }}>
        <button className="btn-ghost" onClick={() => { setModalA(true); setAssign(EMPTY_ASSIGN) }}>
          Assegna coupon a prenotazione
        </button>
        <button className="btn-primary" onClick={() => { setForm(EMPTY_PARTNER); setEditing(null); setModalP(true) }}>
          + Nuova convenzione
        </button>
      </div>

      {/* PARTNER GROUPS */}
      {Object.entries(grouped).map(([cat, items]) => (
        <div key={cat} style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.8rem' }}>
            <span style={{ fontSize: '1.2rem' }}>{PARTNER_ICONS[cat] || '🎁'}</span>
            <span style={{ fontSize: '0.62rem', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--gold)' }}>{cat}</span>
          </div>
          {items.map(t => (
            <div key={t.id} style={{
              display: 'flex', background: 'var(--lava-card)', border: '1px solid var(--gold-dim)',
              marginBottom: '0.5rem', overflow: 'hidden',
            }}>
              <div style={{ width: 3, background: 'var(--gold)', flexShrink: 0 }} />
              <div style={{ padding: '1.1rem 1.3rem', flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: '0.55rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '0.25rem' }}>
                      {t.partner_name}
                    </div>
                    <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.1rem', marginBottom: '0.3rem' }}>{t.name}</div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--salt-dim)', lineHeight: 1.7 }}>{t.description}</div>
                    {t.notes && <div style={{ fontSize: '0.68rem', color: 'var(--salt-faint)', marginTop: '0.3rem', fontStyle: 'italic' }}>{t.notes}</div>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem', marginLeft: '1rem' }}>
                    <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.3rem', color: 'var(--gold)' }}>
                      {t.discount_type === 'percent' ? `${t.discount_value}%` : `€${t.discount_value}`}
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button className="btn-sm" onClick={() => { setForm({ ...t, discount_value: t.discount_value?.toString() }); setEditing(t.id); setModalP(true) }}>✏</button>
                      <button className="btn-sm danger" onClick={() => deleteTemplate(t.id)}>✕</button>
                    </div>
                  </div>
                </div>
                {/* Assegnazioni attive */}
                {gCoupons.filter(gc => gc.coupon_template_id === t.id && !gc.used_at).length > 0 && (
                  <div style={{ marginTop: '0.8rem', paddingTop: '0.8rem', borderTop: '1px solid var(--gold-dim)' }}>
                    <div style={{ fontSize: '0.55rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--salt-faint)', marginBottom: '0.4rem' }}>
                      Assegnato a
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                      {gCoupons.filter(gc => gc.coupon_template_id === t.id && !gc.used_at).map(gc => (
                        <span key={gc.id} style={{ fontSize: '0.62rem', padding: '0.2rem 0.6rem', background: 'var(--gold-dim)', color: 'var(--gold)' }}>
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

      {Object.keys(grouped).length === 0 && (
        <div className="card" style={{ textAlign: 'center', color: 'var(--salt-faint)', padding: '3rem', fontSize: '0.85rem' }}>
          Nessuna convenzione ancora. Clicca "+ Nuova convenzione" per iniziare.
        </div>
      )}

      {/* COUPON ASSEGNATI */}
      {gCoupons.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <div className="sec-hdr"><span className="sec-title">Coupon assegnati</span></div>
          {gCoupons.map(gc => (
            <div key={gc.id} style={{
              display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr auto',
              alignItems: 'center', gap: '1rem', padding: '0.75rem 1.2rem',
              background: 'var(--lava-card)', border: '1px solid var(--gold-dim)',
              marginBottom: '0.4rem',
            }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--salt-dim)' }}>{gc.bookings?.guest_name}</div>
                <div style={{ fontFamily: 'monospace', fontSize: '0.6rem', color: 'rgba(201,171,114,.45)' }}>{gc.bookings?.code}</div>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--salt-dim)' }}>{gc.coupon_templates?.name}</div>
              <div style={{ fontFamily: 'monospace', fontSize: '0.68rem', color: 'var(--gold)' }}>{gc.code}</div>
              <span className={`badge ${gc.used_at ? 'badge-gray' : 'badge-green'}`}>
                {gc.used_at ? 'Usato' : 'Attivo'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* MODAL NUOVA CONVENZIONE */}
      <Modal open={modalPartner} onClose={() => setModalP(false)} title={editing ? 'Modifica convenzione' : 'Nuova convenzione'} subtitle="Inserisci i dettagli dell'accordo con il partner">
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Nome del coupon *</label>
            <input className="form-input" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="Pranzo sul mare" />
          </div>
          <div className="form-group">
            <label className="form-label">Partner / locale *</label>
            <input className="form-input" value={form.partner_name} onChange={e=>setForm(p=>({...p,partner_name:e.target.value}))} placeholder="Ristorante La Scogliera" />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Categoria</label>
            <select className="form-select" value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))}>
              {['Ristorante','Barca','Etna','Mare','Bar','Altro'].map(c=><option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Tipo sconto</label>
            <select className="form-select" value={form.discount_type} onChange={e=>setForm(p=>({...p,discount_type:e.target.value}))}>
              <option value="percent">Percentuale (%)</option>
              <option value="fixed">Fisso (€)</option>
              <option value="custom">Accordo custom</option>
            </select>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Valore sconto {form.discount_type === 'percent' ? '(%)' : form.discount_type === 'fixed' ? '(€)' : '(descrivi sotto)'} *</label>
          <input className="form-input" value={form.discount_value} onChange={e=>setForm(p=>({...p,discount_value:e.target.value}))} placeholder={form.discount_type === 'percent' ? '10' : form.discount_type === 'fixed' ? '15.00' : '0'} />
        </div>
        <div className="form-group">
          <label className="form-label">Descrizione per l'ospite</label>
          <textarea className="form-textarea" value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} placeholder="Presentati come ospite Caellitta e ricevi..." />
        </div>
        <div className="form-group">
          <label className="form-label">Note interne (non visibili all'ospite)</label>
          <input className="form-input" value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} placeholder="Es. Accordo con Mario, valido solo sera..." />
        </div>
        <div style={{ display: 'flex', gap: '0.8rem', marginTop: '1.8rem' }}>
          <button className="btn-primary" style={{ flex: 1 }} onClick={savePartner} disabled={saving}>
            {saving ? 'Salvataggio…' : 'Salva'}
          </button>
          <button className="btn-cancel" onClick={() => setModalP(false)}>Annulla</button>
        </div>
      </Modal>

      {/* MODAL ASSEGNA */}
      <Modal open={modalAssign} onClose={() => setModalA(false)} title="Assegna coupon" subtitle="Scegli la prenotazione e i coupon da assegnare">
        <div className="form-group">
          <label className="form-label">Prenotazione</label>
          <select className="form-select" value={assign.booking_id} onChange={e=>setAssign(p=>({...p,booking_id:e.target.value}))}>
            <option value="">— Seleziona —</option>
            {bookings.map(b => (
              <option key={b.id} value={b.id}>{b.guest_name} · {b.code} · {fmtDate(b.check_in)}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Coupon da assegnare</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
            {templates.map(t => (
              <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', cursor: 'pointer', padding: '0.6rem 0.8rem', background: assign.template_ids.includes(t.id) ? 'rgba(201,171,114,.08)' : 'var(--lava-card)', border: `1px solid ${assign.template_ids.includes(t.id) ? 'var(--gold-dim2)' : 'var(--gold-dim)'}`, transition: 'all .2s' }}>
                <input type="checkbox" checked={assign.template_ids.includes(t.id)} onChange={() => toggleTemplate(t.id)} style={{ accentColor: 'var(--gold)' }} />
                <span style={{ flex: 1, fontSize: '0.8rem', color: 'var(--salt-dim)' }}>{t.name}</span>
                <span style={{ fontSize: '0.62rem', color: 'var(--gold)', fontFamily: "'Cormorant Garamond',serif" }}>
                  {t.discount_type === 'percent' ? `${t.discount_value}%` : `€${t.discount_value}`}
                </span>
              </label>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.8rem', marginTop: '1.8rem' }}>
          <button className="btn-primary" style={{ flex: 1 }} onClick={assignCoupons} disabled={saving || !assign.booking_id || assign.template_ids.length === 0}>
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
  return new Date(d).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
}
