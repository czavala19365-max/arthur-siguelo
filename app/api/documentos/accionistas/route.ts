import { NextResponse } from 'next/server'
import { requireAuthUser } from '@/lib/judicial-caso-access'
import { getDocDb } from '@/lib/document-intelligence/db'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const auth = await requireAuthUser()
  if ('response' in auth) return auth.response

  const { searchParams } = new URL(req.url)
  const sociedadId = searchParams.get('sociedad_id')
  if (!sociedadId) {
    return NextResponse.json({ error: 'sociedad_id requerido' }, { status: 400 })
  }

  const db = getDocDb()
  const { data: soc } = await db
    .from('doc_sociedades')
    .select('id')
    .eq('id', sociedadId)
    .eq('user_id', auth.user.id)
    .maybeSingle()

  if (!soc) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { data, error } = await db
    .from('doc_accionistas')
    .select('*')
    .eq('sociedad_id', sociedadId)
    .eq('activo', true)
    .order('nombre_completo')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ accionistas: data ?? [] })
}

export async function POST(req: Request) {
  const auth = await requireAuthUser()
  if ('response' in auth) return auth.response

  const body = await req.json()
  const db = getDocDb()

  const { data: soc } = await db
    .from('doc_sociedades')
    .select('id')
    .eq('id', body.sociedad_id)
    .eq('user_id', auth.user.id)
    .maybeSingle()

  if (!soc) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { data, error } = await db
    .from('doc_accionistas')
    .insert({
      sociedad_id: body.sociedad_id,
      tipo: body.tipo,
      razon_social: body.razon_social,
      ruc: body.ruc,
      nombre_completo: body.nombre_completo,
      dni: body.dni,
      num_acciones: body.num_acciones,
      valor_nominal: body.valor_nominal ?? 1,
      moneda: body.moneda ?? 'PEN',
      porcentaje: body.porcentaje,
      representantes: body.representantes ?? [],
      poderes_referencia: body.poderes_referencia,
    })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ accionista: data })
}

export async function DELETE(req: Request) {
  const auth = await requireAuthUser()
  if ('response' in auth) return auth.response

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })

  const db = getDocDb()
  const { data: acc } = await db.from('doc_accionistas').select('sociedad_id').eq('id', id).maybeSingle()
  if (!acc) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const { data: soc } = await db
    .from('doc_sociedades')
    .select('id')
    .eq('id', acc.sociedad_id)
    .eq('user_id', auth.user.id)
    .maybeSingle()

  if (!soc) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { error } = await db.from('doc_accionistas').update({ activo: false }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
