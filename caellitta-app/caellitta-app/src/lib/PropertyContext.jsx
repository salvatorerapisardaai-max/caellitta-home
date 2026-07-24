import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { sb } from '../lib/supabase'

const PropertyContext = createContext(null)

const STORAGE_KEY = 'ospita_active_property_id'

export function PropertyProvider({ children }) {
  const [properties, setProperties] = useState([])
  const [activePropertyId, setActivePropertyIdState] = useState(() => localStorage.getItem(STORAGE_KEY) || null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await sb.from('properties').select('id, name, address, brand').order('created_at')
    const list = data || []
    setProperties(list)
    setActivePropertyIdState(prev => {
      if (prev && list.some(p => p.id === prev)) return prev
      const fallback = list[0]?.id || null
      if (fallback) localStorage.setItem(STORAGE_KEY, fallback)
      return fallback
    })
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function setActivePropertyId(id) {
    localStorage.setItem(STORAGE_KEY, id)
    setActivePropertyIdState(id)
  }

  // Crea una nuova struttura per l'account dell'utente loggato (fino a 5, applicato anche
  // lato database). L'host la può aggiungere da solo dopo il login, senza intervento manuale.
  async function createProperty({ name, address, cin, cir }) {
    if (properties.length >= 5) {
      return { error: { message: 'Limite massimo di 5 strutture per account raggiunto.' } }
    }
    const { data: userData } = await sb.auth.getUser()
    const userId = userData?.user?.id
    if (!userId) return { error: { message: 'Utente non autenticato.' } }

    const { data: member } = await sb.from('account_members').select('account_id').eq('user_id', userId).limit(1).maybeSingle()
    if (!member) return { error: { message: 'Nessun account associato a questo utente.' } }

    const { data, error } = await sb.from('properties')
      .insert({ account_id: member.account_id, name, address: address || null, cin: cin || null, cir: cir || null })
      .select().single()

    if (!error && data) {
      await load()
      setActivePropertyId(data.id)
    }
    return { data, error }
  }

  async function updateProperty(id, fields) {
    const { data, error } = await sb.from('properties').update(fields).eq('id', id).select().single()
    if (!error) await load()
    return { data, error }
  }

  async function deleteProperty(id) {
    const { error } = await sb.rpc('delete_property_cascade', { p_property_id: id })
    if (!error) {
      if (id === activePropertyId) {
        localStorage.removeItem(STORAGE_KEY)
        setActivePropertyIdState(null)
      }
      await load()
    }
    return { error }
  }

  const activeProperty = properties.find(p => p.id === activePropertyId) || null

  return (
    <PropertyContext.Provider value={{ properties, activePropertyId, activeProperty, setActivePropertyId, loading, reload: load, createProperty, updateProperty, deleteProperty }}>
      {children}
    </PropertyContext.Provider>
  )
}

// Hook usato da ogni pagina del gestionale per sapere su quale struttura filtrare le query.
// Esempio: const { activePropertyId } = useActiveProperty()
//          sb.from('bookings').select('*').eq('property_id', activePropertyId)
export function useActiveProperty() {
  const ctx = useContext(PropertyContext)
  if (!ctx) throw new Error('useActiveProperty deve essere usato dentro <PropertyProvider>')
  return ctx
}
