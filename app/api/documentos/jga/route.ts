import { NextResponse } from 'next/server'
import { requireAuthUser } from '@/lib/judicial-caso-access'
import { getDocDb } from '@/lib/document-intelligence/db'

export const runtime = 'nodejs'

export async function GET() {
  const auth = await requireAuthUser()
  if ('response' in auth) return auth.response

  const db = getDocDb()
  const { data, error } = await db
    .from('doc_documentos')
    .select('id, nombre, estado, tipo_documento, sociedad_id, created_at, updated_at')
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ documentos: data ?? [] })
}
