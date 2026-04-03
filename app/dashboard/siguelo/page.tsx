import { Suspense } from 'react'
import MetricsCards from '@/components/siguelo/MetricsCards'
import TitulosList from '@/components/siguelo/TitulosList'
import SigueloAddButton from '@/components/siguelo/SigueloAddButton'

export default function SigueloPage() {
  return (
    <div style={{ padding: '48px 64px', background: 'var(--paper)', minHeight: '100vh' }}>

      {/* Header — mismo patrón que Mis Trámites */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        borderLeft: '4px solid #c2a46d',
        paddingLeft: '24px',
      }}>
        <div>
          <div style={{
            fontFamily: 'DM Mono, monospace',
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            color: '#c2a46d',
            marginBottom: '8px',
          }}>
            SUNARP SÍGUELO
          </div>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(32px, 4vw, 48px)',
            color: 'var(--ink)',
            fontWeight: 400,
            lineHeight: 1.1,
            margin: 0,
          }}>
            Títulos Registrales
          </h1>
        </div>
        <SigueloAddButton />
      </div>

      {/* Métricas */}
      <div style={{ marginTop: '32px' }}>
        <Suspense fallback={
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '12px',
          }}>
            {[...Array(7)].map((_, i) => (
              <div key={i} style={{
                height: '72px',
                background: 'var(--surface)',
                border: '1px solid var(--line)',
              }} />
            ))}
          </div>
        }>
          <MetricsCards />
        </Suspense>
      </div>

      {/* Lista de títulos por estado */}
      <div style={{ marginTop: '32px' }}>
        <Suspense fallback={
          <div style={{
            padding: '48px 24px',
            textAlign: 'center',
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            fontFamily: 'DM Mono, monospace',
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            color: 'var(--muted)',
          }}>
            Cargando títulos…
          </div>
        }>
          <TitulosList />
        </Suspense>
      </div>

    </div>
  )
}
