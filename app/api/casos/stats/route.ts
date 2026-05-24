import { getCasosStats } from '@/lib/judicial-db'
import { isUserAdmin, requireAuthUser } from '@/lib/judicial-caso-access'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const auth = await requireAuthUser()
    if ('response' in auth) return auth.response

    const url = new URL(request.url)
    const asUserId = url.searchParams.get('as_user_id')
    let targetUserId: string | undefined = auth.user.id

    if (asUserId) {
      if (!(await isUserAdmin(auth.user.id))) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
      }
      targetUserId = asUserId
    }

    return Response.json(await getCasosStats(targetUserId))
  } catch (error) {
    console.error('[API] GET /casos/stats error:', error)
    return Response.json({ error: 'Error al obtener estadísticas judiciales' }, { status: 500 })
  }
}
