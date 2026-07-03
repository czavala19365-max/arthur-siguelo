import { NextRequest, NextResponse } from 'next/server'
import { requireAuthUser } from '@/lib/judicial-caso-access'
import {
  cargarPrecedenteDrafter,
  guardarComoPrecedenteDrafter,
  guardarNuevaVersion,
  listarPrecedentesDrafter,
} from '@/lib/legal/drafter/precedents/precedent-service'
import type { DrafterDocumentInput } from '@/lib/legal/drafter/document-service'
import type { DocumentTypeId } from '@/lib/legal/drafter/form-schemas'
import type { SeccionDrafter } from '@/lib/legal/drafter/types'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const auth = await requireAuthUser()
  if ('response' in auth) return auth.response

  const documentType = req.nextUrl.searchParams.get('documentType') as DocumentTypeId | null
  const sociedadIdParam = req.nextUrl.searchParams.get('sociedadId')
  if (!documentType) return NextResponse.json({ error: 'documentType es requerido' }, { status: 400 })

  try {
    const precedentes = await listarPrecedentesDrafter({
      userId: auth.user.id,
      documentType,
      sociedadId: sociedadIdParam || null,
    })
    return NextResponse.json({ precedentes })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuthUser()
  if ('response' in auth) return auth.response

  try {
    const body = (await req.json()) as {
      action: 'guardar' | 'cargar' | 'nueva_version'
      precedenteId?: string
      nombre?: string
      sociedadId?: string | null
      documentType?: DocumentTypeId
      jurisdiction?: string
      fields?: Record<string, string>
      sections?: SeccionDrafter[]
    }

    if (body.action === 'cargar') {
      if (!body.precedenteId) return NextResponse.json({ error: 'precedenteId es requerido' }, { status: 400 })
      const result = await cargarPrecedenteDrafter(body.precedenteId, auth.user.id)
      if (!result) return NextResponse.json({ error: 'Precedente no encontrado' }, { status: 404 })
      return NextResponse.json(result)
    }

    if (body.action === 'nueva_version') {
      if (!body.precedenteId || !body.documentType || !body.jurisdiction || !body.sections) {
        return NextResponse.json({ error: 'precedenteId, documentType, jurisdiction y sections son requeridos' }, { status: 400 })
      }
      const precedente = await guardarNuevaVersion({
        precedenteId: body.precedenteId,
        userId: auth.user.id,
        input: { documentType: body.documentType, jurisdiction: body.jurisdiction, fields: body.fields || {} },
        sections: body.sections,
      })
      return NextResponse.json({ precedente })
    }

    if (!body.nombre || !body.documentType || !body.jurisdiction || !body.sections) {
      return NextResponse.json({ error: 'nombre, documentType, jurisdiction y sections son requeridos' }, { status: 400 })
    }

    const input: DrafterDocumentInput = {
      documentType: body.documentType,
      jurisdiction: body.jurisdiction,
      fields: body.fields || {},
    }

    const precedente = await guardarComoPrecedenteDrafter({
      userId: auth.user.id,
      sociedadId: body.sociedadId,
      nombre: body.nombre,
      input,
      sections: body.sections,
    })

    return NextResponse.json({ precedente })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
