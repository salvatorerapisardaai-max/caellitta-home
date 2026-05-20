import React, { useEffect } from 'react'

export default function Modal({ open, onClose, title, subtitle, children }) {
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose() }
    if (open) window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: 'rgba(5,4,3,.88)', backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div style={{
        background: 'var(--lava-mid)', border: '1px solid rgba(201,171,114,.2)',
        padding: '2rem', width: '100%', maxWidth: '520px',
        animation: 'fadeIn .3s ease', maxHeight: '90vh', overflowY: 'auto',
      }}>
        {title && (
          <div style={{ marginBottom: '1.8rem' }}>
            <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.4rem', fontWeight: 300, marginBottom: '0.3rem' }}>
              {title}
            </h2>
            {subtitle && (
              <p style={{ fontSize: '0.7rem', color: 'var(--salt-faint)' }}>{subtitle}</p>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  )
}
