import React, { useEffect, useState } from 'react'
import { sb } from '../../lib/supabase'

const HERO_BUCKET = 'site-media'
const HERO_PATH = 'benvenuto.jpg'
const HERO_PUBLIC_URL_BASE = `https://ejjatrfeeatgiqpomibd.supabase.co/storage/v1/object/public/${HERO_BUCKET}/${HERO_PATH}`

const EMPTY_ITEM = { icon: '✨', title_it: '', title_en: '', text_it: '', text_en: '' }

export default function PortaleOspiti() {
  const [propertyId, setPropertyId] = useState(null)
  const [content, setContent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')
  const [uploading, setUploading] = useState(false)
  const [heroPreview, setHeroPreview] = useState(HERO_PUBLIC_URL_BASE)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data: prop } = await sb.from('properties').select('id').order('created_at').limit(1).single()
    if (!prop) { setLoading(false); return }
    setPropertyId(prop.id)

    const { data: c } = await sb.from('guest_portal_content').select('*').eq('property_id', prop.id).single()
    setContent(c || {
      welcome_text_it: '', welcome_text_en: '', wifi_ssid: '', wifi_password: '',
      hero_image_url: null, casa_items: [], dintorni_items: [], regole_items: [],
    })
    if (c?.hero_image_url) setHeroPreview(c.hero_image_url)
    setLoading(false)
  }

  async function save() {
    setSaving(true)
    setSavedMsg('')
    const { error } = await sb.from('guest_portal_content').upsert({
      property_id: propertyId,
      welcome_text_it: content.welcome_text_it,
      welcome_text_en: content.welcome_text_en,
      wifi_ssid: content.wifi_ssid,
      wifi_password: content.wifi_password,
      hero_image_url: content.hero_image_url,
      casa_items: content.casa_items,
      dintorni_items: content.dintorni_items,
      regole_items: content.regole_items,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'property_id' })
    setSaving(false)
    setSavedMsg(error ? `Errore: ${error.message}` : 'Salvato correttamente — visibile subito agli ospiti.')
  }

  async function uploadHero(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const { error } = await sb.storage.from(HERO_BUCKET).upload(HERO_PATH, file, { upsert: true, cacheControl: '60' })
    setUploading(false)
    if (error) { alert('Errore upload: ' + error.message); return }
    const bustedUrl = `${HERO_PUBLIC_URL_BASE}?v=${Date.now()}`
    setHeroPreview(bustedUrl)
    setContent(p => ({ ...p, hero_image_url: bustedUrl }))
  }

  function updateItem(listKey, index, field, value) {
    setContent(p => {
      const list = [...(p[listKey] || [])]
      list[index] = { ...list[index], [field]: value }
      return { ...p, [listKey]: list }
    })
  }
  function addItem(listKey) {
    setContent(p => ({ ...p, [listKey]: [...(p[listKey] || []), { ...EMPTY_ITEM }] }))
  }
  function removeItem(listKey, index) {
    setContent(p => ({ ...p, [listKey]: p[listKey].filter((_, i) => i !== index) }))
  }
  function moveItem(listKey, index, dir) {
    setContent(p => {
      const list = [...p[listKey]]
      const target = index + dir
      if (target < 0 || target >= list.length) return p
      ;[list[index], list[target]] = [list[target], list[index]]
      return { ...p, [listKey]: list }
    })
  }

  if (loading || !content) {
    return <div style={{ padding: '2.5rem', color: 'var(--salt-faint)' }}>Caricamento…</div>
  }

  return (
    <div>
      <style>{`
        @keyframes wiggle { 0%,100% { transform: rotate(0deg); } 25% { transform: rotate(-10deg); } 75% { transform: rotate(10deg); } }
        .icon-configurable { display: inline-block; cursor: pointer; transition: transform .15s; }
        .icon-configurable:hover { animation: wiggle .4s ease-in-out; }
        .item-card { background: var(--lava-card); border: 1px solid var(--gold-dim); padding: 1rem; margin-bottom: .6rem; }
        .item-row { display: flex; gap: .6rem; flex-wrap: wrap; }
      `}</style>

      <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 300, fontSize: '1.6rem', color: 'var(--gold)', marginBottom: '0.2rem' }}>
        Portale ospiti
        <span className="icon-configurable" style={{ marginLeft: '.6rem', fontSize: '1rem' }} title="Sezione configurabile">⚙</span>
      </h2>
      <p style={{ fontSize: '0.75rem', color: 'var(--salt-faint)', marginBottom: '1.5rem' }}>
        Modifica foto e testi che gli ospiti vedono nel loro Welcome Book (/ospite/:codice).
      </p>

      {/* HERO IMAGE */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="sec-hdr"><span className="sec-title">Foto di copertina</span></div>
        <div style={{ display: 'flex', gap: '1.2rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <img src={heroPreview} alt="Copertina" style={{ width: 160, height: 100, objectFit: 'cover', border: '1px solid var(--gold-dim)' }}
            onError={e => { e.currentTarget.style.opacity = 0.2 }} />
          <div>
            <label className="btn-sm" style={{ display: 'inline-block', cursor: 'pointer' }}>
              {uploading ? 'Caricamento…' : 'Carica nuova foto'}
              <input type="file" accept="image/*" onChange={uploadHero} style={{ display: 'none' }} disabled={uploading} />
            </label>
            <p style={{ fontSize: '0.68rem', color: 'var(--salt-faint)', marginTop: '0.5rem' }}>JPG o PNG, orientamento orizzontale consigliato.</p>
          </div>
        </div>
      </div>

      {/* TESTI BENVENUTO */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="sec-hdr"><span className="sec-title">Testo di benvenuto</span></div>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Italiano</label>
            <textarea className="form-textarea" style={{ minHeight: 110 }} value={content.welcome_text_it || ''}
              onChange={e => setContent(p => ({ ...p, welcome_text_it: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">English</label>
            <textarea className="form-textarea" style={{ minHeight: 110 }} value={content.welcome_text_en || ''}
              onChange={e => setContent(p => ({ ...p, welcome_text_en: e.target.value }))} />
          </div>
        </div>
      </div>

      {/* WIFI */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="sec-hdr"><span className="sec-title">WiFi</span></div>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Nome rete (SSID)</label>
            <input className="form-input" value={content.wifi_ssid || ''} onChange={e => setContent(p => ({ ...p, wifi_ssid: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" value={content.wifi_password || ''} onChange={e => setContent(p => ({ ...p, wifi_password: e.target.value }))} />
          </div>
        </div>
      </div>

      <ItemListEditor title="La casa" listKey="casa_items" items={content.casa_items || []}
        onUpdate={updateItem} onAdd={addItem} onRemove={removeItem} onMove={moveItem} />
      <ItemListEditor title="Dintorni" listKey="dintorni_items" items={content.dintorni_items || []}
        onUpdate={updateItem} onAdd={addItem} onRemove={removeItem} onMove={moveItem} />
      <ItemListEditor title="Regole della casa" listKey="regole_items" items={content.regole_items || []}
        onUpdate={updateItem} onAdd={addItem} onRemove={removeItem} onMove={moveItem} />

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
        <button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Salvataggio…' : 'Salva tutto'}</button>
        {savedMsg && <span style={{ fontSize: '0.78rem', color: 'var(--salt-dim)' }}>{savedMsg}</span>}
      </div>
    </div>
  )
}

function ItemListEditor({ title, listKey, items, onUpdate, onAdd, onRemove, onMove }) {
  return (
    <div className="card" style={{ marginBottom: '1.5rem' }}>
      <div className="sec-hdr">
        <span className="sec-title">{title}</span>
        <button className="btn-sm" onClick={() => onAdd(listKey)}>+ Aggiungi voce</button>
      </div>
      {items.length === 0 && <p style={{ fontSize: '0.78rem', color: 'var(--salt-faint)' }}>Nessuna voce. Clicca "+ Aggiungi voce".</p>}
      {items.map((item, i) => (
        <div key={i} className="item-card">
          <div className="item-row" style={{ marginBottom: '.5rem' }}>
            <input className="form-input" style={{ width: 60, textAlign: 'center' }} value={item.icon}
              onChange={e => onUpdate(listKey, i, 'icon', e.target.value)} placeholder="🔑" />
            <input className="form-input" style={{ flex: 1, minWidth: 160 }} value={item.title_it}
              onChange={e => onUpdate(listKey, i, 'title_it', e.target.value)} placeholder="Titolo IT" />
            <input className="form-input" style={{ flex: 1, minWidth: 160 }} value={item.title_en}
              onChange={e => onUpdate(listKey, i, 'title_en', e.target.value)} placeholder="Titolo EN" />
          </div>
          <div className="item-row" style={{ marginBottom: '.5rem' }}>
            <textarea className="form-textarea" style={{ flex: 1, minHeight: 60 }} value={item.text_it}
              onChange={e => onUpdate(listKey, i, 'text_it', e.target.value)} placeholder="Testo IT" />
            <textarea className="form-textarea" style={{ flex: 1, minHeight: 60 }} value={item.text_en}
              onChange={e => onUpdate(listKey, i, 'text_en', e.target.value)} placeholder="Testo EN" />
          </div>
          <div style={{ display: 'flex', gap: '.4rem' }}>
            <button className="btn-sm" onClick={() => onMove(listKey, i, -1)} disabled={i === 0}>↑</button>
            <button className="btn-sm" onClick={() => onMove(listKey, i, 1)} disabled={i === items.length - 1}>↓</button>
            <button className="btn-sm danger" onClick={() => onRemove(listKey, i)}>🗑 Rimuovi</button>
          </div>
        </div>
      ))}
    </div>
  )
}
