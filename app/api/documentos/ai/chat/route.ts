import { NextResponse } from 'next/server'
import { requireAuthUser } from '@/lib/judicial-caso-access'
import { chatActaJGA, type ChatMessage } from '@/lib/legal/jga/chat-acta-service'
import type { DatosJGA, SeccionActa } from '@/lib/document-intelligence/types'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const auth = await requireAuthUser()
  if ('response' in auth) return auth.response

  try {
    const body = (await req.json()) as {
      messages?: ChatMessage[]
      acta_actual?: { secciones?: SeccionActa[]; datos_jga?: DatosJGA }
    }

    const messages = body.messages ?? []
    const secciones = body.acta_actual?.secciones
    const datos = body.acta_actual?.datos_jga

    if (messages.length === 0) {
      return NextResponse.json({ error: 'messages requerido' }, { status: 400 })
    }
    if (!secciones?.length || !datos) {
      return NextResponse.json({ error: 'acta_actual.secciones y acta_actual.datos_jga requeridos' }, { status: 400 })
    }

    const last = messages[messages.length - 1]
    if (last.role !== 'user' || !last.content.trim()) {
      return NextResponse.json({ error: 'El último mensaje debe ser del usuario' }, { status: 400 })
    }

    const result = await chatActaJGA({ messages, secciones, datos })
    return NextResponse.json(result)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error IA'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
