import { getPlazos } from '@/lib/db'
import { getTitulos } from '@/lib/supabase'
import { normalizarEstado, ESTADO_STYLES, STATE_ORDER } from '@/lib/estados'
import HomeDashboard from '@/components/HomeDashboard'

type PlazoItem = { id: number; descripcion: string; fecha_vencimiento: string; alias: string | null; tipo: string | null }

export default async function DashboardPage() {
  let titulosTotal = 0
  let titulosPills: Array<{ label: string; count: number; color: string; bg: string }> = []
  let ultimoTitulo: { numero: string; estado: string; color: string; bg: string } | null = null
  let plazosProximos: PlazoItem[] = []
  let plazosVencidos = 0

  try {
    // Títulos (Supabase)
    const titulos = await getTitulos()
    titulosTotal = titulos.length

    const counts: Record<string, number> = {}
    for (const t of titulos) {
      const norm = normalizarEstado(t.ultimo_estado ?? '')
      if (norm) counts[norm] = (counts[norm] || 0) + 1
    }

    titulosPills = STATE_ORDER
      .map(estado => ({
        label: estado,
        count: counts[normalizarEstado(estado)] || 0,
        color: ESTADO_STYLES[estado]?.text ?? '#6B7280',
        bg: ESTADO_STYLES[estado]?.bg ?? '#F3F4F6',
      }))
      .filter(p => p.count > 0)

    const conConsulta = titulos
      .filter(t => t.ultima_consulta)
      .sort((a, b) => new Date(b.ultima_consulta!).getTime() - new Date(a.ultima_consulta!).getTime())

    if (conConsulta.length > 0) {
      const u = conConsulta[0]
      const style = u.ultimo_estado ? (ESTADO_STYLES[u.ultimo_estado] ?? null) : null
      ultimoTitulo = {
        numero: `${u.numero_titulo} (${u.anio_titulo})`,
        estado: u.ultimo_estado ?? 'Sin estado',
        color: style?.text ?? '#6B7280',
        bg: style?.bg ?? '#F3F4F6',
      }
    }
  } catch { /* Supabase may not be available */ }

  try {
    // Plazos (SQLite)
    const today = new Date().toISOString().split('T')[0]
    const allPlazos = getPlazos() as unknown as (PlazoItem & { alias?: string | null })[]
    plazosProximos = allPlazos
      .filter(p => p.fecha_vencimiento >= today)
      .slice(0, 3)
      .map(p => ({ ...p, alias: p.alias ?? null }))
    plazosVencidos = allPlazos.filter(p => p.fecha_vencimiento < today).length
  } catch { /* DB may not be initialized */ }

  return (
    <HomeDashboard
      titulosTotal={titulosTotal}
      titulosPills={titulosPills}
      ultimoTitulo={ultimoTitulo}
      plazosProximos={plazosProximos}
      plazosVencidos={plazosVencidos}
    />
  )
}
