import React, { useEffect, useState } from 'react'
import { sb } from '../../lib/supabase'
import { useActiveProperty } from '../../lib/PropertyContext'

const HERO_BUCKET = 'site-media'
const heroPath = (propertyId) => `${propertyId}/benvenuto.jpg`
const heroPublicUrl = (propertyId) =>
  `https://ejjatrfeeatgiqpomibd.supabase.co/storage/v1/object/public/${HERO_BUCKET}/${heroPath(propertyId)}`

const THEME_PRESETS = [
  { name: 'Notte mediterranea', bg: '#111009', card: '#221d14', accent: '#c9ab72', text: '#f0ebe1' },
  { name: 'Sabbia chiara', bg: '#faf5ea', card: '#ffffff', accent: '#9c7a3c', text: '#2b2318' },
  { name: 'Blu marino', bg: '#0d2b33', card: '#14424f', accent: '#e7b682', text: '#f6efe2' },
]

const EMPTY_ITEM = { icon: '✨', title_it: '', title_en: '', title_es: '', title_fr: '', title_de: '', text_it: '', text_en: '', text_es: '', text_fr: '', text_de: '' }
const EMPTY_CONTACT = { name: '', role_it: '', role_en: '', role_es: '', role_fr: '', role_de: '', phone: '', is_whatsapp: false, avatar: 'person' }
const EMPTY_EMERGENCY = { icon: 'medical', name_it: '', name_en: '', name_es: '', name_fr: '', name_de: '', num: '' }

export default function PortaleOspiti() {
  const { activePropertyId } = useActiveProperty()
  const [content, setContent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')
  const [uploading, setUploading] = useState(false)
  const [editLang, setEditLang] = useState('it')
  const [heroPreview, setHeroPreview] = useState(null)

  useEffect(() => {
    if (activePropertyId) { load(); setHeroPreview(heroPublicUrl(activePropertyId)) }
  }, [activePropertyId])

  async function load() {
    setLoading(true)
    const { data: c } = await sb.from('guest_portal_content').select('*').eq('property_id', activePropertyId).maybeSingle()
    setContent(c || {
      welcome_text_it: '', welcome_text_en: '', welcome_text_es: '', welcome_text_fr: '', welcome_text_de: '', wifi_ssid: '', wifi_password: '',
      hero_image_url: null, casa_items: [], dintorni_items: [], regole_items: [],
      contacts_items: [], emergency_items: [], custom_sections: [],
      theme_bg: '#111009', theme_card: '#221d14', theme_accent: '#c9ab72', theme_text: '#f0ebe1',
    })
    if (c?.hero_image_url) setHeroPreview(c.hero_image_url)
    setLoading(false)
  }

  async function save() {
    setSaving(true)
    setSavedMsg('')
    const { error } = await sb.from('guest_portal_content').upsert({
      property_id: activePropertyId,
      welcome_text_it: content.welcome_text_it,
      welcome_text_en: content.welcome_text_en,
      welcome_text_es: content.welcome_text_es,
      welcome_text_fr: content.welcome_text_fr,
      welcome_text_de: content.welcome_text_de,
      wifi_ssid: content.wifi_ssid,
      wifi_password: content.wifi_password,
      hero_image_url: content.hero_image_url,
      casa_items: content.casa_items,
      dintorni_items: content.dintorni_items,
      regole_items: content.regole_items,
      contacts_items: content.contacts_items,
      emergency_items: content.emergency_items,
      custom_sections: content.custom_sections,
      theme_bg: content.theme_bg,
      theme_card: content.theme_card,
      theme_accent: content.theme_accent,
      theme_text: content.theme_text,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'property_id' })
    setSaving(false)
    setSavedMsg(error ? `Errore: ${error.message}` : 'Salvato correttamente — visibile subito agli ospiti.')
  }

  async function uploadHero(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const { error } = await sb.storage.from(HERO_BUCKET).upload(heroPath(activePropertyId), file, { upsert: true, cacheControl: '60' })
    setUploading(false)
    if (error) { alert('Errore upload: ' + error.message); return }
    const bustedUrl = `${heroPublicUrl(activePropertyId)}?v=${Date.now()}`
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
  function addCustomSection() {
    setContent(p => ({
      ...p,
      custom_sections: [...(p.custom_sections || []), {
        id: 'sec-' + Date.now(), icon: '✨', label_it: 'Nuova sezione', label_en: 'New section', label_es: '', label_fr: '', label_de: '', items: [],
      }],
    }))
  }
  function updateCustomSectionMeta(idx, field, value) {
    setContent(p => {
      const list = [...p.custom_sections]
      list[idx] = { ...list[idx], [field]: value }
      return { ...p, custom_sections: list }
    })
  }
  function removeCustomSection(idx) {
    if (!confirm('Eliminare questa sezione? Gli ospiti non la vedranno più.')) return
    setContent(p => ({ ...p, custom_sections: p.custom_sections.filter((_, i) => i !== idx) }))
  }
  function moveCustomSection(idx, dir) {
    setContent(p => {
      const list = [...p.custom_sections]
      const target = idx + dir
      if (target < 0 || target >= list.length) return p
      ;[list[idx], list[target]] = [list[target], list[idx]]
      return { ...p, custom_sections: list }
    })
  }
  function addCustomSectionItem(secIdx) {
    setContent(p => {
      const list = [...p.custom_sections]
      list[secIdx] = { ...list[secIdx], items: [...list[secIdx].items, { ...EMPTY_ITEM }] }
      return { ...p, custom_sections: list }
    })
  }
  function updateCustomSectionItem(secIdx, itemIdx, field, value) {
    setContent(p => {
      const list = [...p.custom_sections]
      const items = [...list[secIdx].items]
      items[itemIdx] = { ...items[itemIdx], [field]: value }
      list[secIdx] = { ...list[secIdx], items }
      return { ...p, custom_sections: list }
    })
  }
  function removeCustomSectionItem(secIdx, itemIdx) {
    setContent(p => {
      const list = [...p.custom_sections]
      list[secIdx] = { ...list[secIdx], items: list[secIdx].items.filter((_, i) => i !== itemIdx) }
      return { ...p, custom_sections: list }
    })
  }

  function addItem(listKey, emptyShape) {
    setContent(p => ({ ...p, [listKey]: [...(p[listKey] || []), { ...(emptyShape || EMPTY_ITEM) }] }))
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
      </h2>
      <p style={{ fontSize: '0.75rem', color: 'var(--salt-faint)', marginBottom: '1rem' }}>
        Il Welcome Book supporta 5 lingue. Scegli quale stai modificando — i contenuti già tradotti restano salvati nelle altre lingue.
      </p>
      <div style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', gap: '0.4rem', background: 'var(--lava)', padding: '0.6rem 0', marginBottom: '1.2rem', borderBottom: '1px solid var(--gold-dim2)' }}>
        {[['it','🇮🇹 Italiano'],['en','🇬🇧 English'],['es','🇪🇸 Español'],['fr','🇫🇷 Français'],['de','🇩🇪 Deutsch']].map(([code, label]) => (
          <button key={code} onClick={() => setEditLang(code)} style={{
            background: editLang === code ? 'var(--gold-dim)' : 'transparent',
            border: `1px solid ${editLang === code ? 'var(--gold)' : 'var(--gold-dim2)'}`,
            color: editLang === code ? 'var(--gold)' : 'var(--salt-dim)',
            padding: '0.4rem 0.8rem', fontSize: '0.68rem', cursor: 'pointer', fontFamily: 'Jost,sans-serif',
          }}>
            {label}
          </button>
        ))}
      </div>

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
        <div className="sec-hdr"><span className="sec-title">Testo di benvenuto ({editLang.toUpperCase()})</span></div>
        <textarea className="form-textarea" style={{ minHeight: 110, width: '100%' }} value={content[`welcome_text_${editLang}`] || ''}
          onChange={e => setContent(p => ({ ...p, [`welcome_text_${editLang}`]: e.target.value }))} />
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

      {/* COLORI TEMA — l'ospite li vede nel Welcome Book, calcolo automatico delle sfumature */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="sec-hdr"><span className="sec-title">Colori del Welcome Book</span></div>
        <p style={{ fontSize: '0.72rem', color: 'var(--salt-faint)', marginBottom: '1rem' }}>
          Parti da un tema pronto, oppure scegli i 4 colori base: il resto (sfumature, trasparenze) si calcola da solo.
        </p>
        <div style={{ display: 'flex', gap: '0.7rem', flexWrap: 'wrap', marginBottom: '1.2rem' }}>
          {THEME_PRESETS.map(preset => (
            <button key={preset.name} onClick={() => setContent(p => ({ ...p, theme_bg: preset.bg, theme_card: preset.card, theme_accent: preset.accent, theme_text: preset.text }))}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem', cursor: 'pointer',
                background: 'none', border: content.theme_accent === preset.accent && content.theme_bg === preset.bg ? '2px solid var(--gold)' : '1px solid rgba(156,122,60,.25)',
                padding: '0.6rem', borderRadius: 4,
              }}>
              <div style={{ display: 'flex', width: 64, height: 36, borderRadius: 3, overflow: 'hidden', border: '1px solid rgba(0,0,0,.1)' }}>
                <div style={{ flex: 1, background: preset.bg }} />
                <div style={{ flex: 1, background: preset.card }} />
                <div style={{ flex: 1, background: preset.accent }} />
              </div>
              <span style={{ fontSize: '0.62rem', color: 'var(--salt-dim)' }}>{preset.name}</span>
            </button>
          ))}
        </div>
        <div className="form-grid">
          <ColorField label="Sfondo" value={content.theme_bg} onChange={v => setContent(p => ({ ...p, theme_bg: v }))} />
          <ColorField label="Sfondo schede" value={content.theme_card} onChange={v => setContent(p => ({ ...p, theme_card: v }))} />
          <ColorField label="Colore accento" value={content.theme_accent} onChange={v => setContent(p => ({ ...p, theme_accent: v }))} />
          <ColorField label="Colore testo" value={content.theme_text} onChange={v => setContent(p => ({ ...p, theme_text: v }))} />
        </div>
      </div>

      {/* CONTATTI */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="sec-hdr">
          <span className="sec-title">Contatti</span>
          <button className="btn-sm" onClick={() => addItem('contacts_items', EMPTY_CONTACT)}>+ Aggiungi contatto</button>
        </div>
        {(content.contacts_items || []).length === 0 && <p style={{ fontSize: '0.78rem', color: 'var(--salt-faint)' }}>Nessun contatto. Aggiungine uno (es. il tuo WhatsApp principale).</p>}
        {(content.contacts_items || []).map((c, i) => (
          <div key={i} className="item-card">
            <div className="item-row" style={{ marginBottom: '.5rem' }}>
              <input className="form-input" style={{ flex: 1, minWidth: 140 }} placeholder="Nome (vuoto = nome struttura)" value={c.name}
                onChange={e => updateItem('contacts_items', i, 'name', e.target.value)} />
              <select className="form-select" style={{ width: 160 }} value={c.avatar} onChange={e => updateItem('contacts_items', i, 'avatar', e.target.value)}>
                <option value="chat">💬 Chat</option>
                <option value="person">👤 Persona</option>
              </select>
            </div>
            <div className="item-row" style={{ marginBottom: '.5rem' }}>
              <input className="form-input" style={{ flex: 1, minWidth: 140 }} placeholder={`Ruolo (${editLang.toUpperCase()}, es. Host)`} value={c[`role_${editLang}`] || ''}
                onChange={e => updateItem('contacts_items', i, `role_${editLang}`, e.target.value)} />
              <LangCompleteness item={c} field="role" />
              <input className="form-input" style={{ flex: 1, minWidth: 160 }} placeholder="+39 ..." value={c.phone}
                onChange={e => updateItem('contacts_items', i, 'phone', e.target.value)} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontSize: '0.75rem', color: 'var(--salt-dim)', cursor: 'pointer' }}>
                <input type="checkbox" checked={!!c.is_whatsapp} onChange={e => updateItem('contacts_items', i, 'is_whatsapp', e.target.checked)} style={{ accentColor: 'var(--gold)' }} />
                È un numero WhatsApp (apre chat invece di chiamare)
              </label>
              <button className="btn-sm danger" onClick={() => removeItem('contacts_items', i)}>🗑</button>
            </div>
          </div>
        ))}
      </div>

      {/* NUMERI DI EMERGENZA */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="sec-hdr">
          <span className="sec-title">Numeri di emergenza</span>
          <button className="btn-sm" onClick={() => addItem('emergency_items', EMPTY_EMERGENCY)}>+ Aggiungi numero</button>
        </div>
        {(content.emergency_items || []).length === 0 && <p style={{ fontSize: '0.78rem', color: 'var(--salt-faint)' }}>Nessun numero di emergenza configurato.</p>}
        {(content.emergency_items || []).map((e, i) => (
          <div key={i} className="item-row" style={{ marginBottom: '.5rem', alignItems: 'center' }}>
            <select className="form-select" style={{ width: 130 }} value={e.icon} onChange={ev => updateItem('emergency_items', i, 'icon', ev.target.value)}>
              <option value="medical">🚑 Sanitario</option>
              <option value="fire">🚒 Vigili del fuoco</option>
              <option value="police">🚓 Polizia</option>
              <option value="hospital">🏥 Ospedale</option>
            </select>
            <input className="form-input" style={{ flex: 1, minWidth: 130 }} placeholder={`Nome (${editLang.toUpperCase()})`} value={e[`name_${editLang}`] || ''} onChange={ev => updateItem('emergency_items', i, `name_${editLang}`, ev.target.value)} />
            <LangCompleteness item={e} field="name" />
            <input className="form-input" style={{ width: 140 }} placeholder="Numero" value={e.num} onChange={ev => updateItem('emergency_items', i, 'num', ev.target.value)} />
            <button className="btn-sm danger" onClick={() => removeItem('emergency_items', i)}>🗑</button>
          </div>
        ))}
      </div>

      <ItemListEditor title="La casa" listKey="casa_items" items={content.casa_items || []}
        onUpdate={updateItem} onAdd={addItem} onRemove={removeItem} onMove={moveItem} lang={editLang} />
      <ItemListEditor title="Dintorni" listKey="dintorni_items" items={content.dintorni_items || []}
        onUpdate={updateItem} onAdd={addItem} onRemove={removeItem} onMove={moveItem} lang={editLang} />
      <ItemListEditor title="Regole della casa" listKey="regole_items" items={content.regole_items || []}
        onUpdate={updateItem} onAdd={addItem} onRemove={removeItem} onMove={moveItem} lang={editLang} />

      {/* SEZIONI PERSONALIZZATE — capitoli aggiuntivi oltre ai 7 fissi, l'host può crearne quante vuole */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="sec-hdr">
          <span className="sec-title">Sezioni personalizzate</span>
          <button className="btn-sm" onClick={addCustomSection}>+ Nuova sezione</button>
        </div>
        <p style={{ fontSize: '0.72rem', color: 'var(--salt-faint)', marginBottom: '1rem' }}>
          Aggiungi capitoli su misura al Welcome Book — appariranno nel menu dell'ospite dopo "Regole".
        </p>
        {(content.custom_sections || []).length === 0 && (
          <p style={{ fontSize: '0.78rem', color: 'var(--salt-faint)' }}>Nessuna sezione personalizzata ancora.</p>
        )}
        {(content.custom_sections || []).map((sec, secIdx) => (
          <div key={sec.id} style={{ border: '1px solid var(--gold-dim2)', padding: '1rem', marginBottom: '1rem' }}>
            <div className="item-row" style={{ marginBottom: '.6rem', alignItems: 'center' }}>
              <input className="form-input" style={{ width: 60, textAlign: 'center' }} value={sec.icon}
                onChange={e => updateCustomSectionMeta(secIdx, 'icon', e.target.value)} placeholder="🌟" />
              <input className="form-input" style={{ flex: 1, minWidth: 140 }} value={sec[`label_${editLang}`] || ''}
                onChange={e => updateCustomSectionMeta(secIdx, `label_${editLang}`, e.target.value)} placeholder={`Nome sezione (${editLang.toUpperCase()})`} />
              <LangCompleteness item={sec} field="label" />
              <button className="btn-sm" onClick={() => moveCustomSection(secIdx, -1)} disabled={secIdx === 0}>↑</button>
              <button className="btn-sm" onClick={() => moveCustomSection(secIdx, 1)} disabled={secIdx === content.custom_sections.length - 1}>↓</button>
              <button className="btn-sm danger" onClick={() => removeCustomSection(secIdx)}>🗑 Elimina sezione</button>
            </div>

            {sec.items.length === 0 && <p style={{ fontSize: '0.72rem', color: 'var(--salt-faint)', marginBottom: '.5rem' }}>Nessuna voce in questa sezione.</p>}
            {sec.items.map((item, itemIdx) => (
              <div key={itemIdx} className="item-card">
                <div className="item-row" style={{ marginBottom: '.5rem' }}>
                  <input className="form-input" style={{ width: 60, textAlign: 'center' }} value={item.icon}
                    onChange={e => updateCustomSectionItem(secIdx, itemIdx, 'icon', e.target.value)} placeholder="🔑" />
                  <input className="form-input" style={{ flex: 1, minWidth: 140 }} value={item[`title_${editLang}`] || ''}
                    onChange={e => updateCustomSectionItem(secIdx, itemIdx, `title_${editLang}`, e.target.value)} placeholder={`Titolo (${editLang.toUpperCase()})`} />
                  <LangCompleteness item={item} field="title" />
                </div>
                <div className="item-row" style={{ marginBottom: '.5rem' }}>
                  <textarea className="form-textarea" style={{ flex: 1, minHeight: 60 }} value={item[`text_${editLang}`] || ''}
                    onChange={e => updateCustomSectionItem(secIdx, itemIdx, `text_${editLang}`, e.target.value)} placeholder={`Testo (${editLang.toUpperCase()})`} />
                  <LangCompleteness item={item} field="text" />
                </div>
                <button className="btn-sm danger" onClick={() => removeCustomSectionItem(secIdx, itemIdx)}>🗑 Rimuovi voce</button>
              </div>
            ))}
            <button className="btn-sm" onClick={() => addCustomSectionItem(secIdx)} style={{ marginTop: '.4rem' }}>+ Aggiungi voce</button>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
        <button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Salvataggio…' : 'Salva tutto'}</button>
        {savedMsg && <span style={{ fontSize: '0.78rem', color: 'var(--salt-dim)' }}>{savedMsg}</span>}
      </div>
    </div>
  )
}

function ColorField({ label, value, onChange }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <input type="color" value={value || '#000000'} onChange={e => onChange(e.target.value)}
          style={{ width: 42, height: 38, border: '1px solid rgba(156,122,60,.3)', padding: 0, cursor: 'pointer', background: 'none' }} />
        <input className="form-input" value={value || ''} onChange={e => onChange(e.target.value)} placeholder="#000000" />
      </div>
    </div>
  )
}

const EDIT_LANGS = [
  { code: 'it', flag: '🇮🇹' }, { code: 'en', flag: '🇬🇧' }, { code: 'es', flag: '🇪🇸' },
  { code: 'fr', flag: '🇫🇷' }, { code: 'de', flag: '🇩🇪' },
]

function ItemListEditor({ title, listKey, items, onUpdate, onAdd, onRemove, onMove, lang }) {
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
            <input className="form-input" style={{ flex: 1, minWidth: 160 }} value={item[`title_${lang}`] || ''}
              onChange={e => onUpdate(listKey, i, `title_${lang}`, e.target.value)} placeholder={`Titolo (${lang.toUpperCase()})`} />
            <LangCompleteness item={item} field="title" />
          </div>
          <div className="item-row" style={{ marginBottom: '.5rem' }}>
            <textarea className="form-textarea" style={{ flex: 1, minHeight: 60 }} value={item[`text_${lang}`] || ''}
              onChange={e => onUpdate(listKey, i, `text_${lang}`, e.target.value)} placeholder={`Testo (${lang.toUpperCase()})`} />
            <LangCompleteness item={item} field="text" />
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

// Piccolo indicatore: quali lingue sono già compilate per questo campo di questa voce.
// Se manca una traduzione, il Welcome Book usa comunque IT come ripiego — non è bloccante,
// ma aiuta l'host a capire cosa ha già tradotto e cosa no.
function LangCompleteness({ item, field }) {
  return (
    <div style={{ display: 'flex', gap: '2px', alignItems: 'center', flexShrink: 0 }}>
      {EDIT_LANGS.map(l => (
        <span key={l.code} title={l.code.toUpperCase()} style={{ fontSize: '0.7rem', opacity: item[`${field}_${l.code}`] ? 1 : 0.22 }}>{l.flag}</span>
      ))}
    </div>
  )
}
