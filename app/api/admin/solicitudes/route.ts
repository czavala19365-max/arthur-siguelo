import { NextResponse } from 'next/server'
import { isUserAdmin, requireAuthUser } from '@/lib/judicial-caso-access'
import { getJudicialSupabase } from '@/lib/supabase-judicial'

async function requireAdmin() {
  const auth = await requireAuthUser()
  if ('response' in auth) return { response: auth.response as NextResponse }
  if (!(await isUserAdmin(auth.user.id))) {
    return { response: NextResponse.json({ error: 'No autorizado' }, { status: 403 }) }
  }
  return { user: auth.user }
}

export async function GET() {
  try {
    const auth = await requireAdmin()
    if ('response' in auth) return auth.response

    const supabase = getJudicialSupabase()
    const { data: solicitudes, error } = await supabase
      .from('solicitudes_servicios')
      .select('id, user_id, tipo_servicio, datos, estado, created_at')
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const userIds = [...new Set((solicitudes ?? []).map(solicitud => solicitud.user_id))]
    const { data: profiles, error: profilesError } = userIds.length
      ? await supabase.from('profiles').select('id, email, full_name').in('id', userIds)
      : { data: [], error: null }

    if (profilesError) return NextResponse.json({ error: profilesError.message }, { status: 500 })

    const profileById = new Map((profiles ?? []).map(profile => [profile.id, profile]))
    return NextResponse.json({
      solicitudes: (solicitudes ?? []).map(solicitud => ({
        ...solicitud,
        usuario: profileById.get(solicitud.user_id) ?? null,
      })),
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'No se pudieron cargar las solicitudes.' },
      { status: 500 },
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireAdmin()
    if ('response' in auth) return auth.response

    const body = await request.json() as { id?: string; estado?: string }
    const id = body.id?.trim()
    const estado = body.estado?.trim()
    if (!id || !estado) {
      return NextResponse.json({ error: 'Solicitud y estado son obligatorios.' }, { status: 400 })
    }

    const { data, error } = await getJudicialSupabase()
      .from('solicitudes_servicios')
      .update({ estado })
      .eq('id', id)
      .select('id, estado')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ solicitud: data })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'No se pudo actualizar la solicitud.' },
      { status: 500 },
    )
  }
}