'use client'

import { useState } from 'react'
import TituloForm from './TituloForm'

export default function SigueloAddButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          background: open ? 'transparent' : 'var(--ink)',
          color: open ? 'var(--ink)' : 'var(--paper)',
          border: open ? '1px solid var(--line-strong)' : 'none',
          borderRadius: 0,
          padding: '12px 24px',
          fontFamily: 'Inter, sans-serif',
          fontSize: '13px',
          fontWeight: 500,
          cursor: 'pointer',
          marginTop: '8px',
          transition: 'all 0.15s',
        }}
      >
        {open ? '× Cerrar' : '+ Agregar título'}
      </button>
      {open && (
        <div style={{ marginTop: '28px' }}>
          <TituloForm />
        </div>
      )}
    </>
  )
}
