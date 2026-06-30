import { NextResponse } from 'next/server'
import { requireAuthUser } from '@/lib/judicial-caso-access'
import { generarDesarrolloIA } from '@/lib/document-intelligence/ai/jga-ai-service'
import type { DatosJGA, PuntoAgenda } from '@/lib/document-intelligence/types'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const auth = await requireAuthUser()
  if ('response' in auth) return auth.response

  try {
    const body = (await req.json()) as { punto: PuntoAgenda; datos: DatosJGA }
    if (!body.punto || !body.datos) {
      return NextResponse.json({ error: 'punto y datos requeridos' }, { status: 400 })
    }

    const desarrollo = await generarDesarrolloIA(body.punto, body.datos)
    return NextResponse.json({ desarrollo })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error IA'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
