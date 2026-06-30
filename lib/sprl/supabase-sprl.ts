import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let _sprlClient: SupabaseClient | null = null

/**
 * Supabase client para el módulo SPRL.
 * Usa el proyecto REGISTRAL (pfiowjjrhxffggdwglcg) con service_role key
 * para bypasear RLS en las tablas sprl_*.
 *
 * SOLO usar en API routes / server-side. NUNCA en client components.
 */
export function getSprlSupabase(): SupabaseClient {
  if (_sprlClient) return _sprlClient

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_KEY_REGISTRAL

  if (!url || !serviceKey) {
    throw new Error(
      'SPRL Supabase env vars not set. Need: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_KEY_REGISTRAL',
    )
  }

  _sprlClient = createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return _sprlClient
}
