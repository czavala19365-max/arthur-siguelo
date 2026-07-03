import { NextResponse } from 'next/server'
import { requireAuthUser } from '@/lib/judicial-caso-access'
import { generarDocxDrafter } from '@/lib/legal/drafter/docx/drafter-docx-builder'
import { cargarDocumentoDrafter } from '@/lib/legal/drafter/document-service'
import type { DocumentTypeId } from '@/lib/legal/drafter/form-schemas'
import type { SeccionDrafter } from '@/lib/legal/drafter/types'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const auth = await requireAuthUser()
  if ('response' in auth) return auth.response

  try {
    const body = (await req.json()) as {
      documentId?: string
      sections?: SeccionDrafter[]
      documentType?: DocumentTypeId
    }

    let sections = body.sections
    let documentType = body.documentType

    if (body.documentId) {
      const doc = await cargarDocumentoDrafter(body.documentId, auth.user.id)
      if (!doc) return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 })
      sections = doc.contenido_generado
      documentType = doc.tipo_documento as DocumentTypeId
    }

    if (!sections || !documentType) {
      return NextResponse.json({ error: 'sections y documentType (o documentId) son requeridos' }, { status: 400 })
    }

    const buffer = await generarDocxDrafter(sections, documentType)
    const filename = `${documentType}.docx`.replace(/[^\w.-]+/g, '_')

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error al generar DOCX'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
