import React, { useEffect, useState } from 'react'
import { sb } from '../../lib/supabase'
import Modal from '../../components/Modal'

const CATEGORIES = ['Pulizie', 'Manutenzione', 'Utenze', 'Biancheria', 'Materiali', 'Commissioni', 'Altro']
const CAT_COLORS = {
  Pulizie: '#7dcca0', Manutenzione: '#e08080', Utenze: '#7ab8d4',
  Biancheria: '#d4a84a', Materiali: '#c9ab72', Commissioni: '#9a7ab8', Altro: '#888'
}

const EMPTY = { description: '', amount: '', category: 'Pulizie', date: new Date().toISOString().split('T')[0], notes: '' }

export default function Spese() {
  const [expenses, setExpenses] = useState([])
  const [modal, setModal]       = useState(false)
  const [form, setForm]         = useState(EMPTY)
  const [editing, setEditing]   = useState(null)
  const [saving, setSaving]     = useState(false)
  const [saveError, setSaveError] = useState('')
  const [filterMonth, setFilter]= useState('all')

  useEffect(() => { load() }, [])

  async function load() {
    const { data, error } = await sb.from('expenses').select('*').order('date', { ascending: false })
    if (error) { console.error('load error:', error); return }
    setExpenses(data || [])
  }

  function openNew() { setForm(EMPTY); setEditing(null); setSaveError(''); setModal(true) }

  function openEdit(e) {
    setForm({
      description: e.description || '',
      amount:      e.amount      || '',
      category:    e.category    || 'Pulizie',
      date:        e.date?.slice(0,10) || new Date().toISOString().split('T')[0],
      notes:       e.notes       || ''
    })
    setEditing(e.id)
    setSaveError('')
    setModal(true)
  }

  async function save() {
    if (!form.description || !form.amount) {
      setSaveError('Descrizione e importo sono obbligatori.')
      return
    }
    setSaving(true)
    setSaveError('')

    const payload = {
      description: form.description,
      amount:      parseFloat(form.amount),
      category:    form.category,
      date:        form.date,
      notes:       form.notes || null
    }

    try {
      if (editing) {
        const { error } = await sb.from('expenses').update(payload).eq('id', editing)
        if (error) throw error
      } else {
        const { error } = await sb.from('expenses').insert(payload)
        if (error) throw error
      }
      await load()
      setModal(false)
      setEditing(null)
    } catch (err) {
      console.error('save error:', err)
      setSaveError('Errore: ' + (err.message || JSON.stringify(err)))
    } finally {
      setSaving(false)
    }
  }

  async function del(id) {
    if (!confirm('Eliminare questa spesa?')) return
    await sb.from('expenses').delete().eq('id', id)
    load()
  }

  const months = [...new Set(expenses.map(e => e.date?.slice(0,7)))].sort().reverse()
  const filtered = filterMonth === 'all' ? expenses : expenses.filter(e => e.date?.startsWith(filterMonth))
  const totalFiltered = filtered.reduce((s, e) => s + (e.amount || 0), 0)

  const byCat = CATEGORIES.map(cat => ({
    cat,
    total: expenses.filter(e => e.category === cat).reduce((s, e) => s + (e.amount || 0), 0)
  })).filter(c => c.total > 0)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.8rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="btn-sm" onClick={() => setFilter('all')} style={filterMonth==='all'?{borderColor:'var(--gold)',color:'var(--gold)'}:{}}>Tutte</button>
          {months.slice(0,6).map(m => (
            <button key={m} className="btn-sm" onClick={() => setFilter(m)} style={filterMonth===m?{borderColor:'var(--gold)',color:'var(--gold)'}:{}}>
              {new Date(m+'-01').toLocaleDateString('it-IT',{month:'long',year:'numeric'})}
            </button>
          ))}
        </div>
        <button className="btn-primary" onClick={openNew}>+ Nuova spesa</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.8fr', gap: '1.2rem', marginBottom: '1.2rem' }}>
        {/* BY CATEGORY */}
        <div className="card">
          <div className="sec-title" style={{ marginBottom: '1rem' }}>Per categoria</div>
          {byCat.length === 0 && (
            <p style={{ fontSize: '0.78rem', color: 'var(--salt-faint)' }}>Nessuna spesa ancora</p>
          )}
          {byCat.map(({ cat, total }) => {
            const max = Math.max(...byCat.map(c => c.total))
            return (
              <div key={cat} style={{ marginBottom: '0.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.3rem' }}>
                  <span style={{ color: 'var(--salt-dim)' }}>{cat}</span>
                  <span style={{ color: '#e08080', fontFamily: "'Cormorant Garamond',serif" }}>€{total.toFixed(0)}</span>
                </div>
                <div style={{ height: 3, background: 'var(--lava-hover)', borderRadius: 2 }}>
                  <div style={{ height: '100%', width: `${(total / max) * 100}%`, background: CAT_COLORS[cat] || 'var(--gold)', borderRadius: 2, transition: 'width 0.6s' }} />
                </div>
              </div>
            )
          })}
          <div style={{ marginTop: '1.2rem', paddingTop: '1rem', borderTop: '1px solid var(--gold-dim)', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.65rem', color: 'var(--salt-faint)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Totale</span>
            <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.2rem', color: '#e08080' }}>€{totalFiltered.toFixed(2)}</span>
          </div>
        </div>

        {/* LIST */}
        <div>
          {filtered.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', color: 'var(--salt-faint)', padding: '3rem', fontSize: '0.85rem' }}>Nessuna spesa</div>
          ) : filtered.map(e => (
            <div key={e.id} style={{
              display: 'grid', gridTemplateColumns: '1.5fr 0.8fr 1fr auto',
              alignItems: 'center', gap: '1rem', padding: '0.85rem 1.2rem',
              background: 'var(--lava-card)', border: '1px solid var(--gold-dim)',
              marginBottom: '0.5rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: CAT_COLORS[e.category] || '#888', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--salt-dim)' }}>{e.description}</div>
                  {e.notes && <div style={{ fontSize: '0.68rem', color: 'var(--salt-faint)' }}>{e.notes}</div>}
                </div>
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--salt-faint)' }}>{fmtDate(e.date)}</div>
              <span style={{ fontSize: '0.58rem', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '0.2rem 0.55rem', border: '1px solid var(--gold-dim)', color: CAT_COLORS[e.category] || 'var(--salt-faint)' }}>
                {e.category}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', justifyContent: 'flex-end' }}>
                <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.05rem', color: '#e08080' }}>−€{e.amount?.toFixed(2)}</span>
                <button className="btn-sm" onClick={() => openEdit(e)}>✏</button>
                <button className="btn-sm danger" onClick={() => del(e.id)}>✕</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MODAL */}
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Modifica spesa' : 'Nuova spesa'}>
        {saveError && (
          <div style={{ background: 'rgba(138,72,72,.15)', border: '1px solid rgba(138,72,72,.4)', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.78rem', color: '#e08080', lineHeight: 1.6 }}>
            {saveError}
          </div>
        )}
        <div className="form-group">
          <label className="form-label">Descrizione *</label>
          <input className="form-input" value={form.description} onChange={e => setForm(p=>({...p,description:e.target.value}))} placeholder="Pulizie fine soggiorno" />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Importo € *</label>
            <input className="form-input" type="number" step="0.01" value={form.amount} onChange={e => setForm(p=>({...p,amount:e.target.value}))} placeholder="0.00" />
          </div>
          <div className="form-group">
            <label className="form-label">Data</label>
            <input className="form-input" type="date" value={form.date} onChange={e => setForm(p=>({...p,date:e.target.value}))} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Categoria</label>
          <select className="form-select" value={form.category} onChange={e => setForm(p=>({...p,category:e.target.value}))}>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Note</label>
          <input className="form-input" value={form.notes} onChange={e => setForm(p=>({...p,notes:e.target.value}))} placeholder="Note opzionali" />
        </div>
        <div style={{ display: 'flex', gap: '0.8rem', marginTop: '1.8rem' }}>
          <button className="btn-primary" style={{ flex: 1 }} onClick={save} disabled={saving}>
            {saving ? 'Salvataggio…' : 'Salva spesa'}
          </button>
          <button className="btn-cancel" onClick={() => setModal(false)}>Annulla</button>
        </div>
      </Modal>
    </div>
  )
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })
}
