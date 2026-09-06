import { getDocDb } from '@/lib/document-intelligence/db'
import type { DocumentTypeId } from './form-schemas'
import { documentTypeLabel } from './form-schemas'
import type { SeccionDrafter } from './types'

export interface DrafterDocumentInput {
  documentType: DocumentTypeId
  jurisdiction: string
  fields: Record<string, string>
}

export interface DrafterDocumentRow {
  id: string
  user_id: string
  documento_padre_id: string | null
  tipo_documento: string
  nombre: string
  datos_entrada: DrafterDocumentInput
  contenido_generado: SeccionDrafter[]
  estado: 'borrador' | 'revision' | 'finalizado'
  version: number
  created_at: string
  updated_at: string
}

export async function guardarDocumentoDrafter(params: {
  userId: string
  input: DrafterDocumentInput
  sections: SeccionDrafter[]
  documentoPadreId?: string
}): Promise<DrafterDocumentRow> {
  const db = getDocDb()
  const { data, error } = await db
    .from('doc_documentos')
    .insert({
      user_id: params.userId,
      documento_padre_id: params.documentoPadreId ?? null,
      tipo_documento: params.input.documentType,
      nombre: documentTypeLabel(params.input.documentType),
      datos_entrada: params.input,
      contenido_generado: params.sections,
      estado: 'borrador',
    })
    .select('*')
    .single()
  if (error) throw new Error(`guardarDocumentoDrafter: ${error.message}`)
  return data as DrafterDocumentRow
}

export async function actualizarDocumentoDrafter(params: {
  documentId: string
  userId: string
  sections: SeccionDrafter[]
}): Promise<DrafterDocumentRow> {
  const db = getDocDb()
  const { data: current, error: fetchError } = await db
    .from('doc_documentos')
    .select('version')
    .eq('id', params.documentId)
    .eq('user_id', params.userId)
    .maybeSingle()
  if (fetchError || !current) throw new Error('Documento no encontrado')

  const { data, error } = await db
    .from('doc_documentos')
    .update({
      contenido_generado: params.sections,
      version: (current.version as number) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.documentId)
    .eq('user_id', params.userId)
    .select('*')
    .single()
  if (error) throw new Error(`actualizarDocumentoDrafter: ${error.message}`)
  return data as DrafterDocumentRow
}

export async function cargarDocumentoDrafter(id: string, userId: string): Promise<DrafterDocumentRow | null> {
  const db = getDocDb()
  const { data, error } = await db
    .from('doc_documentos')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle()
  if (error || !data) return null
  return data as DrafterDocumentRow
}

export async function listarDocumentosDrafter(userId: string) {
  const db = getDocDb()
  const { data, error } = await db
    .from('doc_documentos')
    .select('id, tipo_documento, nombre, estado, version, created_at, updated_at')
    .eq('user_id', userId)
    .neq('tipo_documento', 'acta_jga')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data ?? []
}
