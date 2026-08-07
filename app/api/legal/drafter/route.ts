import { NextRequest, NextResponse } from 'next/server'
import { requireAuthUser } from '@/lib/judicial-caso-access'
import type { AttachmentInput } from '@/lib/legal/file-attachments'
import { generarYGuardarDocumento, type GeneratedDocument } from '@/lib/legal/drafter/generation-service'
import { getDocumentSchema } from '@/lib/legal/drafter/schema/registry'
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
      attachments?: AttachmentInput[]
    }

    const fields = body.fields || {}

    const primary = await generarYGuardarDocumento({
      userId: auth.user.id,
      documentType: body.documentType,
      jurisdiction: body.jurisdiction,
      fields,
      attachments: body.attachments,
    })

    const schema = getDocumentSchema(body.documentType)
    const applicableAccessories = (schema.accessoryDocuments ?? []).filter(rule => rule.condition(fields))

    const accessories: GeneratedDocument[] = await Promise.all(
      applicableAccessories.map(rule =>
        generarYGuardarDocumento({
          userId: auth.user.id,
          documentType: rule.id as DocumentTypeId,
          jurisdiction: body.jurisdiction,
          fields: rule.deriveFields(fields),
          documentoPadreId: primary.documentId,
        }),
      ),
    )

    return NextResponse.json({ documents: [primary, ...accessories] })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
