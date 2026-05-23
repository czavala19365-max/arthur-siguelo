import { createBrowserClient } from '@supabase/ssr'

export function getAuthClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL_JUDICIAL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_JUDICIAL!,
  )
}
