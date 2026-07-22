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

  const activeProperty = properties.find(p => p.id === activePropertyId) || null

  return (
    <PropertyContext.Provider value={{ properties, activePropertyId, activeProperty, setActivePropertyId, loading, reload: load }}>
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
