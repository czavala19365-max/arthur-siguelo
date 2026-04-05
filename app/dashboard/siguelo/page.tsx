import { Suspense } from 'react'
import MetricsCards from '@/components/siguelo/MetricsCards'
import TitulosList from '@/components/siguelo/TitulosList'
import SigueloAddButton from '@/components/siguelo/SigueloAddButton'

export default function SigueloPage() {
  return (
    <div style={{ padding: '48px 64px', background: 'var(--paper)', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{
        borderLeft: '4px solid #c2a46d',
        paddingLeft: '24px',
        marginBottom: '20px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
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

        {/* Pills de métricas — integradas debajo del título */}
        <div style={{ marginTop: '20px' }}>
          <Suspense fallback={
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {[...Array(4)].map((_, i) => (
                <div key={i} style={{
                  width: '100px',
                  height: '40px',
                  background: 'var(--surface)',
                  borderLeft: '2px solid var(--line-mid)',
                }} />
              ))}
            </div>
          }>
            <MetricsCards />
          </Suspense>
        </div>
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
