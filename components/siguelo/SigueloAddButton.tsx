'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import TituloForm from './TituloForm'

export default function SigueloAddButton() {
  const searchParams = useSearchParams()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (searchParams.get('action') === 'agregar') setOpen(true)
  }, [searchParams])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open])

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          background: 'var(--ink)',
          color: 'var(--paper)',
          border: 'none',
          borderRadius: 0,
          padding: '12px 24px',
          fontFamily: 'var(--font-body)',
          fontSize: '13px',
          fontWeight: 500,
          cursor: 'pointer',
          marginTop: '8px',
          transition: 'opacity 0.15s',
        }}
        onMouseOver={e => { e.currentTarget.style.opacity = '0.85' }}
        onMouseOut={e => { e.currentTarget.style.opacity = '1' }}
      >
        + Agregar título
      </button>

      {open && (
        <>
          {/* Overlay */}
          <div
            onClick={() => setOpen(false)}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.52)',
              zIndex: 40,
            }}
          />

          {/* Modal centrado */}
          <div style={{
            position: 'fixed',
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 'min(92vw, 680px)',
            maxHeight: '88vh',
            overflowY: 'auto',
            zIndex: 41,
            background: 'var(--paper)',
            border: '1px solid var(--line)',
            borderRadius: '4px',
            boxShadow: '0 24px 80px rgba(0,0,0,0.22)',
          }}>
            {/* Barra superior con botón × */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 32px 0',
            }}>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                color: 'var(--accent)',
              }}>
                Arthur · Síguelo
              </div>
              <button
                onClick={() => setOpen(false)}
                style={{
                  width: '32px', height: '32px',
                  background: 'transparent',
                  border: '1px solid var(--line)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  color: 'var(--muted)',
                  fontSize: '18px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-body)',
                  transition: 'background 0.15s, color 0.15s',
                }}
                onMouseOver={e => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.color = 'var(--ink)' }}
                onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--muted)' }}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            <TituloForm />
          </div>
        </>
      )}
    </>
  )
}
