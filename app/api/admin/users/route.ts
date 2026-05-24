import { NextResponse } from 'next/server'
import { isUserAdmin, requireAuthUser } from '@/lib/judicial-caso-access'
import { getJudicialSupabase } from '@/lib/supabase-judicial'

export async function GET() {
  try {
    const auth = await requireAuthUser()
    if ('response' in auth) return auth.response

    if (!(await isUserAdmin(auth.user.id))) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const supabase = getJudicialSupabase()
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const users = await Promise.all(
      (profiles ?? []).map(async p => {
        const { count } = await supabase
          .from('casos')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', p.id)
          .eq('activo', true)
          .is('archived_at', null)
          .is('deleted_at', null)
        return {
          id: p.id,
          email: p.email,
          full_name: p.full_name,
          role: p.role,
          created_at: p.created_at,
          caso_count: count ?? 0,
        }
      }),
    )

    const stats = {
      total_users: users.length,
      active_users: users.filter(u => u.caso_count > 0).length,
      total_casos: users.reduce((sum, u) => sum + u.caso_count, 0),
    }

    return Response.json({ users, stats })
  } catch (error) {
    console.error('[API] GET /admin/users error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al obtener usuarios' },
      { status: 500 },
    )
  }
}
