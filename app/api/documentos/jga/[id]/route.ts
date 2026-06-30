import { NextResponse } from 'next/server'
import { requireAuthUser } from '@/lib/judicial-caso-access'
import { getDocDb } from '@/lib/document-intelligence/db'

export const runtime = 'nodejs'

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAuthUser()
  if ('response' in auth) return auth.response

  const { id } = await ctx.params
  const db = getDocDb()
  const { data, error } = await db
    .from('doc_documentos')
    .select('*')
    .eq('id', id)
    .eq('user_id', auth.user.id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  return NextResponse.json({ documento: data, success: true })
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAuthUser()
  if ('response' in auth) return auth.response

  const { id } = await ctx.params
  const body = await req.json()
  const db = getDocDb()

  const { data: existing } = await db
    .from('doc_documentos')
    .select('id')
    .eq('id', id)
    .eq('user_id', auth.user.id)
    .maybeSingle()

  if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.contenido_generado !== undefined) payload.contenido_generado = body.contenido_generado
  if (body.datos_entrada !== undefined) payload.datos_entrada = body.datos_entrada
  if (body.estado !== undefined) payload.estado = body.estado
  if (body.nombre !== undefined) payload.nombre = body.nombre

  const { data, error } = await db.from('doc_documentos').update(payload).eq('id', id).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ documento: data, success: true })
}
