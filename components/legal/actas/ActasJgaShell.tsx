'use client'

import { Suspense, useCallback, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { legalStyles } from '@/lib/legal/styles'
import JgaNuevaActaWizard from './JgaNuevaActaWizard'
import JgaActasList from './JgaActasList'

export type ActasTab = 'nueva' | 'actas'

const TABS: { id: ActasTab; label: string }[] = [
  { id: 'nueva', label: 'Nueva Acta' },
  { id: 'actas', label: 'Mis Actas' },
]

function ActasJgaShellContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialTab = (searchParams.get('tab') as ActasTab) || 'nueva'
  const [tab, setTab] = useState<ActasTab>(
    TABS.some(t => t.id === initialTab) ? initialTab : 'nueva',
  )

  const switchTab = useCallback(
    (next: ActasTab) => {
      setTab(next)
      const params = new URLSearchParams(searchParams.toString())
      params.set('tab', next)
      if (next !== 'nueva') {
        params.delete('precedente')
        params.delete('sociedad')
      }
      router.replace(`/legal/actas?${params.toString()}`, { scroll: false })
    },
    [router, searchParams],
  )

  return (
    <div style={legalStyles.page}>
      <h1 style={legalStyles.h1}>Actas JGA</h1>
      <p style={{ ...legalStyles.label, textTransform: 'none', fontSize: 14, letterSpacing: 0, marginBottom: 24 }}>
        Generador de actas de Junta General de Accionistas — formato notarial peruano.
      </p>

      <nav
        style={{
          display: 'flex',
          gap: 0,
          marginBottom: 28,
          borderBottom: '1px solid var(--line)',
        }}
      >
        {TABS.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => switchTab(t.id)}
            style={{
              padding: '10px 20px',
              background: 'transparent',
              border: 'none',
              borderBottom: tab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
              color: tab === t.id ? 'var(--ink)' : 'var(--muted)',
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              cursor: 'pointer',
              marginBottom: -1,
            }}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === 'nueva' && <JgaNuevaActaWizard />}
      {tab === 'actas' && <JgaActasList />}
    </div>
  )
}

export default function ActasJgaShell() {
  return (
    <Suspense fallback={<div style={legalStyles.page}>Cargando...</div>}>
      <ActasJgaShellContent />
    </Suspense>
  )
}
