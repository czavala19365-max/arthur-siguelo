import { NextRequest, NextResponse } from 'next/server'
import { requireAuthUser } from '@/lib/judicial-caso-access'
import { procesarMensajeIntake } from '@/lib/legal/drafter/intake/intake-service'
import { getDocumentSchema } from '@/lib/legal/drafter/schema/registry'
import type { ChatMessage } from '@/lib/legal/edit-with-ai/edit-service'
import type { DocumentTypeId } from '@/lib/legal/drafter/form-schemas'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const auth = await requireAuthUser()
  if ('response' in auth) return auth.response

  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY no configurada' }, { status: 500 })
    }

    const body = (await req.json()) as {
      documentType: DocumentTypeId
      jurisdiction: string
      fields: Record<string, string>
      messages?: ChatMessage[]
      instruction: string
    }

    if (!body.instruction?.trim()) {
      return NextResponse.json({ error: 'instruction es requerido' }, { status: 400 })
    }

    const schema = getDocumentSchema(body.documentType)

    const result = await procesarMensajeIntake({
      schema,
      jurisdiction: body.jurisdiction,
      fields: body.fields || {},
      messages: body.messages || [],
      instruction: body.instruction,
    })

    return NextResponse.json(result)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
