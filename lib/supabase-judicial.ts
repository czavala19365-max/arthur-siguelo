import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null

/** Service-role client for judicial tables (casos, movimientos_judiciales, alertas_config, …). */
export function getJudicialSupabase(): SupabaseClient {
  if (_client) return _client
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY
  if (!url?.trim() || !key?.trim()) {
    throw new Error(
      'Judicial module requires SUPABASE_URL and SUPABASE_SERVICE_KEY (service role) in the environment.',
    )
  }
  _client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  return _client
}
