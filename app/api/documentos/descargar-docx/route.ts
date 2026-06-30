import { NextResponse } from 'next/server'
import { requireAuthUser } from '@/lib/judicial-caso-access'
import { generarDocxJGA } from '@/lib/document-intelligence/docx/jga-docx-builder'
import { getDocDb } from '@/lib/document-intelligence/db'
import { generarActaJGA } from '@/lib/document-intelligence/jga-engine'
import type { DatosJGA, SeccionActa } from '@/lib/document-intelligence/types'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const auth = await requireAuthUser()
  if ('response' in auth) return auth.response

  try {
    const body = (await req.json()) as {
      documento_id?: string
      datos?: DatosJGA
      secciones?: SeccionActa[]
      nombre_archivo?: string
    }

    let secciones = body.secciones
    let datos = body.datos

    if (body.documento_id) {
      const db = getDocDb()
      const { data: doc } = await db
        .from('doc_documentos')
        .select('*')
        .eq('id', body.documento_id)
        .eq('user_id', auth.user.id)
        .maybeSingle()

      if (!doc) return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 })
      secciones = doc.contenido_generado as SeccionActa[]
      datos = doc.datos_entrada as DatosJGA
    }

    if (!datos) return NextResponse.json({ error: 'datos requeridos' }, { status: 400 })
    if (!secciones) secciones = await generarActaJGA(datos)

    const buffer = await generarDocxJGA(secciones, datos)
    const filename = `${body.nombre_archivo ?? 'acta-jga'}.docx`.replace(/[^\w.-]+/g, '_')

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
