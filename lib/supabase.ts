import { createClient } from '@supabase/supabase-js'
import type { Titulo } from '@/types'

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
): Promise<void> {
  const { error } = await supabase.from('titulos').insert([titulo])
  if (error) throw new Error(error.message)
}
