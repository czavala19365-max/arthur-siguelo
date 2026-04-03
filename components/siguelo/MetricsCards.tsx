import { getTitulos } from '@/lib/supabase'
import { ESTADO_STYLES, normalizarEstado } from '@/lib/estados'

export default async function MetricsCards() {
  let titulos: Awaited<ReturnType<typeof getTitulos>> = []
  try {
    titulos = await getTitulos()
  } catch {
    return null
  }

  // Comparación normalizada: sin acentos, mayúsculas — cubre "EN CALIFICACION" y "EN CALIFICACIÓN"
  const count = (estado: string) => {
    const norm = normalizarEstado(estado)
    return titulos.filter(t => normalizarEstado(t.ultimo_estado ?? '') === norm).length
  }

  const metrics = [
    {
      label: 'Total Títulos',
      value: titulos.length,
      bg: '#EFF6FF',
      color: '#1D4ED8',
    },
    {
      label: 'En Calificación',
      value: count('EN CALIFICACIÓN'),
      bg: ESTADO_STYLES['EN CALIFICACIÓN'].bg,
      color: ESTADO_STYLES['EN CALIFICACIÓN'].text,
    },
    {
      label: 'Observados',
      value: count('OBSERVADO'),
      bg: ESTADO_STYLES['OBSERVADO'].bg,
      color: ESTADO_STYLES['OBSERVADO'].text,
    },
    {
      label: 'Liquidados',
      value: count('LIQUIDADO'),
      bg: ESTADO_STYLES['LIQUIDADO'].bg,
      color: ESTADO_STYLES['LIQUIDADO'].text,
    },
    {
      label: 'Inscritos',
      value: count('INSCRITO'),
      bg: ESTADO_STYLES['INSCRITO'].bg,
      color: ESTADO_STYLES['INSCRITO'].text,
    },
    {
      label: 'Tachados',
      value: count('TACHADO'),
      bg: ESTADO_STYLES['TACHADO'].bg,
      color: ESTADO_STYLES['TACHADO'].text,
    },
    {
      label: 'Prorrogados',
      value: count('PRORROGADO'),
      bg: ESTADO_STYLES['PRORROGADO'].bg,
      color: ESTADO_STYLES['PRORROGADO'].text,
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
      {metrics.map((m) => (
        <div
          key={m.label}
          className="rounded-xl px-4 py-3 shadow-sm"
          style={{ backgroundColor: m.bg, border: '1px solid rgba(0,0,0,0.07)' }}
        >
          <p className="text-2xl font-bold leading-none" style={{ color: m.color }}>
            {m.value}
          </p>
          <p className="text-xs mt-1.5 font-medium" style={{ color: m.color, opacity: 0.75 }}>
            {m.label}
          </p>
        </div>
      ))}
    </div>
  )
}
