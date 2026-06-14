import { NextResponse } from 'next/server'
import { requireAuthUser } from '@/lib/judicial-caso-access'
import { generarActaJGA } from '@/lib/document-intelligence/jga-engine'
import { saveDocumentoGenerado } from '@/lib/document-intelligence/db'
import type { DatosJGA } from '@/lib/document-intelligence/types'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const auth = await requireAuthUser()
  if ('response' in auth) return auth.response

  try {
    const body = (await req.json()) as {
      datos: DatosJGA
      sociedad_id?: string
      precedente_id?: string
      nombre?: string
      guardar?: boolean
    }

    if (!body.datos?.sociedad || !body.datos?.agenda) {
      return NextResponse.json({ error: 'datos JGA incompletos' }, { status: 400 })
    }

    const secciones = await generarActaJGA(body.datos)

    let documentoId: string | undefined
    if (body.guardar !== false) {
      const doc = await saveDocumentoGenerado({
        userId: auth.user.id,
        sociedadId: body.sociedad_id,
        precedenteId: body.precedente_id,
        nombre: body.nombre ?? `Acta JGA - ${body.datos.sociedad.razon_social} - ${body.datos.fecha}`,
        datos: body.datos,
        secciones,
      })
      documentoId = doc.id
    }

    return NextResponse.json({ secciones, documento_id: documentoId })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error al generar acta'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
