import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Titulo, HistorialEstado, PagoSunarp } from '@/types'

let _supabase: SupabaseClient | null = null

function getSupabase(): SupabaseClient {
  if (_supabase) return _supabase
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Supabase env vars not set (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)')
  _supabase = createClient(url, key)
  return _supabase
}

/** @deprecated Use getSupabase() inside functions instead of this module-level export */
export const supabase = new Proxy({} as SupabaseClient, {
  get(_t, prop) {
    return (getSupabase() as unknown as Record<string | symbol, unknown>)[prop]
  },
})

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
