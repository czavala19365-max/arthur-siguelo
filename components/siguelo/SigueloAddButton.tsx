'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import TituloForm from './TituloForm'

export default function SigueloAddButton() {
  const searchParams = useSearchParams()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (searchParams.get('action') === 'agregar') {
      setOpen(true)
    }
  }, [searchParams])

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
          fontFamily: 'var(--font-body)',
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
