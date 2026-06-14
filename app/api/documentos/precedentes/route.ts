import { NextResponse } from 'next/server'
import { requireAuthUser } from '@/lib/judicial-caso-access'
import { getDocDb } from '@/lib/document-intelligence/db'
import {
  cargarPrecedente,
  crearDesdePrecedente,
  guardarComoPrecedente,
} from '@/lib/document-intelligence/precedents/precedent-service'
import type { CambiosPrecedente, DatosJGA } from '@/lib/document-intelligence/types'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const auth = await requireAuthUser()
  if ('response' in auth) return auth.response

  const sociedadId = new URL(req.url).searchParams.get('sociedad_id') ?? undefined
  const db = getDocDb()
  let q = db
    .from('doc_precedentes')
    .select('id, nombre_referencia, sociedad_id, tipo_operaciones, created_at, datos_jga')
    .eq('user_id', auth.user.id)
  if (sociedadId) q = q.eq('sociedad_id', sociedadId)
  const { data, error } = await q.order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const precedentes = (data ?? []).map(row => {
    const datos = row.datos_jga as DatosJGA | null
    return {
      id: row.id,
      nombre_referencia: row.nombre_referencia,
      sociedad_id: row.sociedad_id,
      tipo_operaciones: row.tipo_operaciones,
      created_at: row.created_at,
      razon_social: datos?.sociedad?.razon_social ?? '',
      fecha_acta: datos?.fecha ?? '',
    }
  })

  return NextResponse.json({ precedentes })
}

export async function POST(req: Request) {
  const auth = await requireAuthUser()
  if ('response' in auth) return auth.response

  const body = await req.json()

  if (body.action === 'crear_desde') {
    const datos = await crearDesdePrecedente(
      body.precedente_id,
      body.cambios as CambiosPrecedente,
      auth.user.id,
    )
    if (!datos) return NextResponse.json({ error: 'Precedente no encontrado' }, { status: 404 })
    return NextResponse.json({ datos })
  }

  if (body.action === 'cargar') {
    const p = await cargarPrecedente(body.precedente_id, auth.user.id)
    if (!p) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    return NextResponse.json({ precedente: p })
  }

  const datos = body.datos as DatosJGA
  const precedente = await guardarComoPrecedente(
    datos,
    body.nombre_referencia,
    auth.user.id,
    body.sociedad_id,
    body.secciones,
  )
  return NextResponse.json({ precedente })
}
