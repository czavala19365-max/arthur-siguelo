import { createClient } from '@supabase/supabase-js'
import type { Titulo, HistorialEstado, PagoSunarp } from '@/types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function getTitulos(): Promise<Titulo[]> {
  const { data, error } = await supabase
    .from('titulos')
    .select('*')
    .eq('estado_gestion', 'activo')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getTitulosArchivados(): Promise<Titulo[]> {
  const { data, error } = await supabase
    .from('titulos')
    .select('*')
    .eq('estado_gestion', 'archivado')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getTitulosEliminados(): Promise<Titulo[]> {
  const { data, error } = await supabase
    .from('titulos')
    .select('*')
    .eq('estado_gestion', 'eliminado')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function archivarTitulo(id: string): Promise<void> {
  const { error } = await supabase
    .from('titulos')
    .update({ estado_gestion: 'archivado' })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function eliminarTituloLogico(id: string): Promise<void> {
  const { error } = await supabase
    .from('titulos')
    .update({ estado_gestion: 'eliminado' })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function restaurarTitulo(id: string): Promise<void> {
  const { error } = await supabase
    .from('titulos')
    .update({ estado_gestion: 'activo' })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function createTitulo(
  titulo: Omit<Titulo, 'id' | 'created_at'>
): Promise<string> {
  const { data, error } = await supabase
    .from('titulos')
    .insert([titulo])
    .select('id')
    .single()
  if (error) throw new Error(error.message)
  return data.id as string
}

/** Normalización mínima sin importar lib/estados (evitar dependencia circular) */
function normEstadoSimple(s: string): string {
  return s.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
}

/**
 * Igual que getTitulos() pero enriquece cada título con:
 * - fecha_ultimo_calificacion : detectado_en del último cambio de estado a EN CALIFICACIÓN
 * - es_reingreso              : true si existe algún historial de OBSERVADO o LIQUIDADO previo
 *
 * Se hace en 2 queries (titulos + historial bulk) para no N+1.
 */
export async function getTitulosEnriquecidos(): Promise<Titulo[]> {
  const titulos = await getTitulos()
  if (titulos.length === 0) return []

  const ids = titulos.map(t => t.id)

  const { data: historial } = await supabase
    .from('historial_estados')
    .select('titulo_id, estado_nuevo, detectado_en')
    .in('titulo_id', ids)
    .order('detectado_en', { ascending: false })

  if (!historial || historial.length === 0) return titulos

  // Agrupar por titulo_id (ya viene ordenado desc por fecha)
  type HEntry = { estado_nuevo: string; detectado_en: string }
  const byTitulo: Record<string, HEntry[]> = {}
  for (const h of historial) {
    const tid = h.titulo_id as string
    if (!byTitulo[tid]) byTitulo[tid] = []
    byTitulo[tid].push({ estado_nuevo: h.estado_nuevo as string, detectado_en: h.detectado_en as string })
  }

  return titulos.map(t => {
    const entries = byTitulo[t.id] ?? []

    // Primera entrada (más reciente) con estado EN CALIFICACIÓN
    const lastCalif = entries.find(e => normEstadoSimple(e.estado_nuevo) === 'EN CALIFICACION')

    // Hay reingreso si existe al menos un OBSERVADO o LIQUIDADO en historial
    const esReingreso = entries.some(e => {
      const n = normEstadoSimple(e.estado_nuevo)
      return n === 'OBSERVADO' || n === 'LIQUIDADO'
    })

    return {
      ...t,
      fecha_ultimo_calificacion: lastCalif?.detectado_en ?? null,
      es_reingreso: esReingreso,
    }
  })
}

export type ExtraSunarpData = {
  fecha_presentacion?: string | null
  fecha_vencimiento?: string | null
  lugar_presentacion?: string | null
  nombre_presentante?: string | null
  tipo_registro?: string | null
  monto_devolucion?: string | null
  indi_prorroga?: string | null
  indi_suspension?: string | null
  pagos?: PagoSunarp[] | null
  actos?: string[] | null
}

export async function actualizarEstadoTitulo(
  id: string,
  nuevoEstado: string,
  areaRegistral?: string | null,
  numeroPartida?: string | null,
  extra?: ExtraSunarpData
): Promise<void> {
  const updates: Record<string, unknown> = {
    ultimo_estado: nuevoEstado,
    ultima_consulta: new Date().toISOString(),
  }
  if (areaRegistral !== undefined) updates.area_registral = areaRegistral
  if (numeroPartida !== undefined) updates.numero_partida = numeroPartida

  if (extra) {
    if (extra.fecha_presentacion !== undefined) updates.fecha_presentacion = extra.fecha_presentacion
    if (extra.fecha_vencimiento  !== undefined) updates.fecha_vencimiento  = extra.fecha_vencimiento
    if (extra.lugar_presentacion !== undefined) updates.lugar_presentacion = extra.lugar_presentacion
    if (extra.nombre_presentante !== undefined) updates.nombre_presentante = extra.nombre_presentante
    if (extra.tipo_registro      !== undefined) updates.tipo_registro      = extra.tipo_registro
    if (extra.monto_devolucion   !== undefined) updates.monto_devolucion   = extra.monto_devolucion
    if (extra.indi_prorroga      !== undefined) updates.indi_prorroga      = extra.indi_prorroga
    if (extra.indi_suspension    !== undefined) updates.indi_suspension    = extra.indi_suspension
    if (extra.pagos              !== undefined) updates.pagos              = extra.pagos
    if (extra.actos              !== undefined) updates.actos              = extra.actos
  }

  const { error } = await supabase
    .from('titulos')
    .update(updates)
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function registrarCambioEstado(
  entrada: Omit<HistorialEstado, 'id' | 'detectado_en'>
): Promise<void> {
  const { error } = await supabase.from('historial_estados').insert([entrada])
  if (error) throw new Error(error.message)

  // Marcar el momento del último cambio de estado para el badge "ACTUALIZADO"
  const { error: err2 } = await supabase
    .from('titulos')
    .update({ last_state_change: new Date().toISOString() })
    .eq('id', entrada.titulo_id)
  if (err2) throw new Error(err2.message)
}

export async function getUltimoEstado(titulo_id: string): Promise<string | null> {
  const { data } = await supabase
    .from('titulos')
    .select('ultimo_estado')
    .eq('id', titulo_id)
    .single()
  return data?.ultimo_estado ?? null
}

export async function getTituloById(id: string): Promise<Titulo | null> {
  const { data } = await supabase
    .from('titulos')
    .select('*')
    .eq('id', id)
    .single()
  return data ?? null
}

export async function eliminarTitulo(id: string): Promise<void> {
  // historial_estados se elimina en cascada por la FK con ON DELETE CASCADE
  const { error } = await supabase.from('titulos').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function getHistorialByTituloId(titulo_id: string): Promise<HistorialEstado[]> {
  const { data } = await supabase
    .from('historial_estados')
    .select('*')
    .eq('titulo_id', titulo_id)
    .order('detectado_en', { ascending: false })
  return data ?? []
}

export type MovimientoReciente = {
  id: string
  estado_anterior: string
  estado_nuevo: string
  detectado_en: string
  numero_titulo: string
  oficina_registral: string
  nombre_cliente: string
  asunto: string | null
}

export async function getUltimosMovimientos(limit = 5): Promise<MovimientoReciente[]> {
  const { data, error } = await supabase
    .from('historial_estados')
    .select(`
      id,
      estado_anterior,
      estado_nuevo,
      detectado_en,
      titulos ( numero_titulo, oficina_registral, nombre_cliente, asunto )
    `)
    .order('detectado_en', { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)
  if (!data) return []

  return data.flatMap(row => {
    const t = Array.isArray(row.titulos) ? row.titulos[0] : row.titulos
    if (!t) return []
    return [{
      id: row.id as string,
      estado_anterior: row.estado_anterior as string,
      estado_nuevo: row.estado_nuevo as string,
      detectado_en: row.detectado_en as string,
      numero_titulo: (t as { numero_titulo: string }).numero_titulo,
      oficina_registral: (t as { oficina_registral: string }).oficina_registral,
      nombre_cliente: (t as { nombre_cliente: string }).nombre_cliente,
      asunto: (t as { asunto: string | null }).asunto ?? null,
    }]
  })
}
