import { createClient } from '@supabase/supabase-js'
import type { Titulo, HistorialEstado } from '@/types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function getTitulos(): Promise<Titulo[]> {
  const { data, error } = await supabase
    .from('titulos')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
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

export async function actualizarEstadoTitulo(
  id: string,
  nuevoEstado: string,
  areaRegistral?: string | null,
  numeroPartida?: string | null
): Promise<void> {
  const updates: Record<string, unknown> = {
    ultimo_estado: nuevoEstado,
    ultima_consulta: new Date().toISOString(),
  }
  if (areaRegistral !== undefined) updates.area_registral = areaRegistral
  if (numeroPartida !== undefined) updates.numero_partida = numeroPartida

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
