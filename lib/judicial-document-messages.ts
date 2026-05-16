import { getJudicialSupabase } from '@/lib/supabase-judicial'

export type DocumentMessageRole = 'user' | 'assistant' | 'system'

export interface DocumentMessageRow {
  id: string
  role: DocumentMessageRole
  content: string
  created_at: string
}

/** IDs de escritos_judiciales son enteros (BIGSERIAL), no UUID. */
export function parseJudicialDocumentId(raw: string | number | null | undefined): number | null {
  if (typeof raw === 'number') {
    return Number.isFinite(raw) && raw > 0 ? Math.trunc(raw) : null
  }
  const s = String(raw ?? '').trim()
  if (!/^\d+$/.test(s)) return null
  const n = Number.parseInt(s, 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

function isUuidSchemaError(message: string): boolean {
  return /invalid input syntax for type uuid/i.test(message)
}

function schemaFixHint(): string {
  return (
    'La tabla document_messages en Supabase tiene un tipo de columna incorrecto. ' +
    'Ejecuta en el SQL Editor el archivo supabase/migrations/20260515120000_fix_document_messages_bigint.sql'
  )
}

export async function insertDocumentMessage(params: {
  documentId: number
  role: DocumentMessageRole
  content: string
  documentSnapshot?: string | null
}): Promise<void> {
  const supabase = getJudicialSupabase()
  const { error } = await supabase.from('document_messages').insert({
    document_id: params.documentId,
    role: params.role,
    content: params.content,
    document_snapshot: params.documentSnapshot ?? null,
  })
  if (!error) return
  if (isUuidSchemaError(error.message)) {
    throw new Error(schemaFixHint())
  }
  throw new Error(`document_messages insert failed: ${error.message}`)
}

export async function listDocumentMessages(documentId: number): Promise<DocumentMessageRow[]> {
  const supabase = getJudicialSupabase()
  const { data, error } = await supabase
    .from('document_messages')
    .select('id, role, content, created_at')
    .eq('document_id', documentId)
    .order('created_at', { ascending: true })
  if (error) {
    if (isUuidSchemaError(error.message)) {
      throw new Error(schemaFixHint())
    }
    throw new Error(error.message)
  }
  return (data ?? []).map(row => ({
    id: String((row as { id: string }).id),
    role: (row as { role: DocumentMessageRole }).role,
    content: String((row as { content: string }).content ?? ''),
    created_at: String((row as { created_at: string }).created_at ?? ''),
  }))
}

export async function listRecentDocumentMessages(
  documentId: number,
  limit: number,
): Promise<Array<{ role: 'user' | 'assistant'; content: string }>> {
  const supabase = getJudicialSupabase()
  const { data, error } = await supabase
    .from('document_messages')
    .select('role, content')
    .eq('document_id', documentId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) {
    if (isUuidSchemaError(error.message)) {
      throw new Error(schemaFixHint())
    }
    throw new Error(error.message)
  }
  return [...(data ?? [])].reverse().map(m => ({
    role: (m as { role: string }).role === 'assistant' ? 'assistant' as const : 'user' as const,
    content: String((m as { content: string }).content ?? ''),
  }))
}
