import { getPlazos } from '@/lib/db'
import { getUltimosMovimientos } from '@/lib/supabase'
import type { MovimientoReciente } from '@/lib/supabase'
import HomeDashboard from '@/components/HomeDashboard'

type PlazoItem = { id: number; descripcion: string; fecha_vencimiento: string; alias: string | null; tipo: string | null }

export default async function DashboardPage() {
  let movimientos: MovimientoReciente[] = []
  let plazosProximos: PlazoItem[] = []
  let plazosVencidos = 0

  try {
    movimientos = await getUltimosMovimientos(5)
  } catch { /* Supabase may not be available */ }

  try {
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
      movimientos={movimientos}
      plazosProximos={plazosProximos}
      plazosVencidos={plazosVencidos}
    />
  )
}
