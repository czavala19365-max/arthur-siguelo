import { Suspense } from 'react'
import TitulosGestionList from '@/components/siguelo/TitulosGestionList'

export default function EliminadosPage() {
  return (
    <div style={{ padding: '48px 64px', background: 'var(--paper)', minHeight: '100vh' }}>
      <div style={{
        borderLeft: '4px solid #c2a46d',
        paddingLeft: '24px',
        marginBottom: '32px',
      }}>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: '11px',
          textTransform: 'uppercase', letterSpacing: '0.15em',
          color: '#c2a46d', marginBottom: '8px',
        }}>
          SUNARP SÍGUELO
        </div>
        <h1 style={{
          fontFamily: 'var(--font-body)',
          fontSize: 'clamp(28px, 4vw, 44px)',
          color: 'var(--ink)', fontWeight: 600,
          lineHeight: 1.1, margin: 0,
        }}>
          Títulos Eliminados
        </h1>
      </div>

      <Suspense fallback={
        <div style={{
          padding: '48px 24px', textAlign: 'center',
          background: 'var(--surface)', border: '1px solid var(--line)',
          fontFamily: 'var(--font-mono)', fontSize: '11px',
          textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--muted)',
        }}>
          Cargando títulos eliminados…
        </div>
      }>
        <TitulosGestionList tipo="eliminado" />
      </Suspense>
    </div>
  )
}
