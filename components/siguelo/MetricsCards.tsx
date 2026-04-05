import { getTitulos } from '@/lib/supabase'
import { ESTADO_STYLES, normalizarEstado, STATE_ORDER } from '@/lib/estados'
import MetricsPills from './MetricsPills'
import type { PillData } from './MetricsPills'

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

  const pills: PillData[] = STATE_ORDER
    .map(estado => ({
      label: estado,
      value: count(estado),
      color: ESTADO_STYLES[estado]?.text ?? '#6B7280',
      bg: ESTADO_STYLES[estado]?.bg ?? '#F3F4F6',
    }))
    .filter(p => p.value > 0)

  pills.push({
    label: 'TOTAL',
    value: titulos.length,
    color: '#c2a46d',
    bg: 'rgba(194, 164, 109, 0.1)',
  })

  return <MetricsPills pills={pills} />
}
