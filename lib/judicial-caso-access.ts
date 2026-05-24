import { NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'
import type { Caso } from '@/lib/judicial-db'
import { getAuthServerClient } from '@/lib/supabase-auth-server'
import { getJudicialSupabase } from '@/lib/supabase-judicial'

export async function requireAuthUser(): Promise<
  { user: User } | { response: NextResponse }
> {
  const supabase = await getAuthServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { response: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) }
  }
  return { user }
}

export async function isUserAdmin(userId: string): Promise<boolean> {
  const judicialDb = getJudicialSupabase()
  const { data: profile } = await judicialDb
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()
  return profile?.role === 'admin'
}

export async function denyUnlessCasoOwnerOrAdmin(
  caso: Caso,
  user: User,
): Promise<NextResponse | null> {
  if (caso.user_id === user.id) return null

  const judicialDb = getJudicialSupabase()
  const { data: profile } = await judicialDb
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  return null
}
