import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { sb } from '../../lib/supabase'
import { useActiveProperty } from '../../lib/PropertyContext'
import Modal from '../../components/Modal'

const EMPTY = { name: '', address: '', cin: '', cir: '' }

export default function LeStrutture() {
  const { properties, loading, setActivePropertyId, createProperty, updateProperty, deleteProperty } = useActiveProperty()
  const navigate = useNavigate()
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  function enter(id) {
    setActivePropertyId(id)
    navigate('/')
  }

  function openNew() { setForm(EMPTY); setEditingId(null); setError(''); setModal(true) }
  function openEdit(p) {
    setForm({ name: p.name || '', address: p.address || '', cin: p.cin || '', cir: p.cir || '' })
    setEditingId(p.id); setError(''); setModal(true)
  }

  async function save() {
    if (!form.name.trim()) { setError('Il nome della struttura è obbligatorio.'); return }
    setSaving(true); setError('')
    const { error: err } = editingId
      ? await updateProperty(editingId, form)
      : await createProperty(form)
    setSaving(false)
    if (err) { setError(err.message); return }
    setModal(false)
  }

  async function handleDelete(p) {
    setDeletingId(p.id)
    const { error: err } = await deleteProperty(p.id)
    setDeletingId(null)
    setConfirmDelete(null)
    if (err) alert('Errore: ' + err.message)
  }

  async function logout() {
    await sb.auth.signOut()
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--lava)', padding: '2rem 1.5rem' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--gold)' }}>Ospita</div>
            <div style={{ fontSize: '0.62rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--salt-faint)' }}>Le mie strutture</div>
          </div>
          <button className="btn-cancel" onClick={logout}>Esci</button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--salt-faint)', padding: '3rem' }}>Caricamento…</div>
        ) : properties.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
            <p style={{ color: 'var(--salt-dim)', marginBottom: '1.5rem' }}>Non hai ancora nessuna struttura. Creane una per iniziare.</p>
            <button className="btn-primary" onClick={openNew}>+ Crea la tua prima struttura</button>
          </div>
        ) : (
          <>
            {properties.map(p => (
              <div key={p.id} className="card" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.3rem', color: 'var(--gold)' }}>{p.name}</div>
                  {p.address && <div style={{ fontSize: '0.78rem', color: 'var(--salt-faint)', marginTop: '0.2rem' }}>{p.address}</div>}
                  {p.cin && <div style={{ fontSize: '0.68rem', color: 'var(--salt-faint)', marginTop: '0.2rem', fontFamily: 'monospace' }}>CIN: {p.cin}</div>}
                </div>
                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <button className="btn-primary" onClick={() => enter(p.id)}>Entra →</button>
                  <button className="btn-sm" onClick={() => openEdit(p)}>✏️ Modifica</button>
                  <button className="btn-sm danger" onClick={() => setConfirmDelete(p)}>🗑️ Elimina</button>
                </div>
              </div>
            ))}

            {properties.length < 5 ? (
              <button className="btn-ghost" style={{ width: '100%', padding: '1rem' }} onClick={openNew}>+ Aggiungi struttura ({properties.length}/5)</button>
            ) : (
              <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--salt-faint)' }}>Limite di 5 strutture raggiunto</p>
            )}
          </>
        )}
      </div>

      {/* MODAL CREA/MODIFICA */}
      <Modal open={modal} onClose={() => setModal(false)} title={editingId ? 'Modifica struttura' : 'Nuova struttura'}>
        {error && <div style={{ background: 'rgba(168,69,63,.12)', border: '1px solid rgba(168,69,63,.4)', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.78rem', color: 'var(--red)' }}>{error}</div>}
        <div className="form-group">
          <label className="form-label">Nome struttura *</label>
          <input className="form-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Es. Villa Panorama" />
        </div>
        <div className="form-group">
          <label className="form-label">Indirizzo</label>
          <input className="form-input" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">CIN</label>
            <input className="form-input" value={form.cin} onChange={e => setForm(p => ({ ...p, cin: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">CIR</label>
            <input className="form-input" value={form.cir} onChange={e => setForm(p => ({ ...p, cir: e.target.value }))} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.8rem', marginTop: '1rem' }}>
          <button className="btn-primary" style={{ flex: 1 }} onClick={save} disabled={saving}>{saving ? 'Salvataggio…' : 'Salva'}</button>
          <button className="btn-cancel" onClick={() => setModal(false)}>Annulla</button>
        </div>
      </Modal>

      {/* MODAL CONFERMA ELIMINAZIONE */}
      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Eliminare questa struttura?">
        <p style={{ fontSize: '0.85rem', color: 'var(--salt-dim)', lineHeight: 1.7, marginBottom: '0.8rem' }}>
          Stai per eliminare <strong style={{ color: 'var(--gold)' }}>{confirmDelete?.name}</strong>.
        </p>
        <p style={{ fontSize: '0.8rem', color: 'var(--red)', lineHeight: 1.7, marginBottom: '1.5rem' }}>
          ⚠️ Verranno eliminate DEFINITIVAMENTE anche tutte le prenotazioni, ospiti, spese, collaboratori, template e configurazioni di questa struttura. L'azione non può essere annullata.
        </p>
        <div style={{ display: 'flex', gap: '0.8rem' }}>
          <button className="btn-sm danger" style={{ flex: 1, padding: '0.7rem' }} onClick={() => handleDelete(confirmDelete)} disabled={deletingId === confirmDelete?.id}>
            {deletingId === confirmDelete?.id ? 'Eliminazione…' : 'Sì, elimina definitivamente'}
          </button>
          <button className="btn-cancel" onClick={() => setConfirmDelete(null)}>Annulla</button>
        </div>
      </Modal>
    </div>
  )
}
