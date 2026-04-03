import { getTitulos } from '@/lib/supabase'
import { ESTADO_STYLES, normalizarEstado } from '@/lib/estados'

export default async function MetricsCards() {
  let titulos: Awaited<ReturnType<typeof getTitulos>> = []
  try {
    titulos = await getTitulos()
  } catch {
    return null
  }

  const count = (estado: string) => {
    const norm = normalizarEstado(estado)
    return titulos.filter(t => normalizarEstado(t.ultimo_estado ?? '') === norm).length
  }

  const metrics = [
    {
      label: 'TOTAL',
      value: titulos.length,
      accentColor: '#c2a46d',
      valueColor: 'var(--ink)',
    },
    {
      label: 'EN CALIFICACIÓN',
      value: count('EN CALIFICACIÓN'),
      accentColor: ESTADO_STYLES['EN CALIFICACIÓN'].text,
      valueColor: ESTADO_STYLES['EN CALIFICACIÓN'].text,
    },
    {
      label: 'OBSERVADOS',
      value: count('OBSERVADO'),
      accentColor: ESTADO_STYLES['OBSERVADO'].text,
      valueColor: ESTADO_STYLES['OBSERVADO'].text,
    },
    {
      label: 'LIQUIDADOS',
      value: count('LIQUIDADO'),
      accentColor: ESTADO_STYLES['LIQUIDADO'].text,
      valueColor: ESTADO_STYLES['LIQUIDADO'].text,
    },
    {
      label: 'INSCRITOS',
      value: count('INSCRITO'),
      accentColor: ESTADO_STYLES['INSCRITO'].text,
      valueColor: ESTADO_STYLES['INSCRITO'].text,
    },
    {
      label: 'TACHADOS',
      value: count('TACHADO'),
      accentColor: ESTADO_STYLES['TACHADO'].text,
      valueColor: ESTADO_STYLES['TACHADO'].text,
    },
    {
      label: 'PRORROGADOS',
      value: count('PRORROGADO'),
      accentColor: ESTADO_STYLES['PRORROGADO'].text,
      valueColor: ESTADO_STYLES['PRORROGADO'].text,
    },
  ]

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(7, 1fr)',
      gap: '0',
      border: '1px solid var(--line)',
    }}>
      {metrics.map((m, i) => (
        <div
          key={m.label}
          style={{
            background: 'var(--surface)',
            borderRight: i < metrics.length - 1 ? '1px solid var(--line)' : 'none',
            borderTop: `3px solid ${m.accentColor}`,
            padding: '20px 20px 16px',
          }}
        >
          <div style={{
            fontFamily: 'DM Mono, monospace',
            fontSize: '9px',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: m.valueColor,
            marginBottom: '10px',
            opacity: 0.8,
          }}>
            {m.label}
          </div>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: '40px',
            color: m.valueColor,
            lineHeight: 1,
          }}>
            {m.value}
          </div>
        </div>
      ))}
    </div>
  )
}
