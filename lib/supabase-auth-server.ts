import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function getAuthServerClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL_JUDICIAL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_JUDICIAL!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // ignore — called from Server Component where cookies may be read-only
          }
        },
      },
    },
  )
}
