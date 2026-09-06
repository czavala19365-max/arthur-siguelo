import { getDocDb } from '@/lib/document-intelligence/db'
import type { DrafterDocumentInput } from '../document-service'
import type { DocumentTypeId } from '../form-schemas'
import type { SeccionDrafter } from '../types'

export interface DrafterPrecedente {
  id: string
  userId: string
  sociedadId: string | null
  nombreReferencia: string
  tipoDocumento: DocumentTypeId
  version: number
  createdAt: string
  updatedAt: string
}

function mapPrecedenteRow(row: Record<string, unknown>): DrafterPrecedente {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    sociedadId: row.sociedad_id != null ? String(row.sociedad_id) : null,
    nombreReferencia: String(row.nombre_referencia),
    tipoDocumento: row.tipo_documento as DocumentTypeId,
    version: Number(row.version ?? 1),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}

export async function guardarComoPrecedenteDrafter(params: {
  userId: string
  sociedadId?: string | null
  nombre: string
  input: DrafterDocumentInput
  sections: SeccionDrafter[]
}): Promise<DrafterPrecedente> {
  const db = getDocDb()
  const { data, error } = await db
    .from('doc_precedentes')
    .insert({
      user_id: params.userId,
      sociedad_id: params.sociedadId ?? null,
      nombre_referencia: params.nombre,
      tipo_documento: params.input.documentType,
      datos_jga: params.input,
      secciones_generadas: params.sections,
      version: 1,
    })
    .select('*')
    .single()
  if (error) throw new Error(`guardarComoPrecedenteDrafter: ${error.message}`)

  const precedente = mapPrecedenteRow(data as Record<string, unknown>)

  const { error: versionError } = await db.from('doc_precedente_versiones').insert({
    precedente_id: precedente.id,
    version: 1,
    datos_entrada: params.input,
    secciones_generadas: params.sections,
  })
  if (versionError) throw new Error(`guardarComoPrecedenteDrafter (version): ${versionError.message}`)

  return precedente
}

export async function listarPrecedentesDrafter(params: {
  userId: string
  documentType: DocumentTypeId
  sociedadId: string | null
}): Promise<DrafterPrecedente[]> {
  const db = getDocDb()
  let q = db
    .from('doc_precedentes')
    .select('id, user_id, sociedad_id, nombre_referencia, tipo_documento, version, created_at, updated_at')
    .eq('user_id', params.userId)
    .eq('tipo_documento', params.documentType)

  q = params.sociedadId === null ? q.is('sociedad_id', null) : q.eq('sociedad_id', params.sociedadId)

  const { data, error } = await q.order('created_at', { ascending: false })
  if (error) throw new Error(`listarPrecedentesDrafter: ${error.message}`)
  return (data ?? []).map(row => mapPrecedenteRow(row as Record<string, unknown>))
}

export async function cargarPrecedenteDrafter(
  precedenteId: string,
  userId: string,
): Promise<{ input: DrafterDocumentInput; sections: SeccionDrafter[] | null } | null> {
  const db = getDocDb()
  const { data, error } = await db
    .from('doc_precedentes')
    .select('datos_jga, secciones_generadas')
    .eq('id', precedenteId)
    .eq('user_id', userId)
    .maybeSingle()
  if (error || !data) return null
  return {
    input: data.datos_jga as DrafterDocumentInput,
    sections: (data.secciones_generadas as SeccionDrafter[] | null) ?? null,
  }
}

export async function guardarNuevaVersion(params: {
  precedenteId: string
  userId: string
  input: DrafterDocumentInput
  sections: SeccionDrafter[]
}): Promise<DrafterPrecedente> {
  const db = getDocDb()
  const { data: current, error: fetchError } = await db
    .from('doc_precedentes')
    .select('version')
    .eq('id', params.precedenteId)
    .eq('user_id', params.userId)
    .maybeSingle()
  if (fetchError || !current) throw new Error('Precedente no encontrado')

  const nextVersion = Number(current.version ?? 1) + 1

  const { data, error } = await db
    .from('doc_precedentes')
    .update({
      datos_jga: params.input,
      secciones_generadas: params.sections,
      version: nextVersion,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.precedenteId)
    .eq('user_id', params.userId)
    .select('*')
    .single()
  if (error) throw new Error(`guardarNuevaVersion: ${error.message}`)

  const { error: versionError } = await db.from('doc_precedente_versiones').insert({
    precedente_id: params.precedenteId,
    version: nextVersion,
    datos_entrada: params.input,
    secciones_generadas: params.sections,
  })
  if (versionError) throw new Error(`guardarNuevaVersion (version): ${versionError.message}`)

  return mapPrecedenteRow(data as Record<string, unknown>)
}

export async function listarVersiones(
  precedenteId: string,
  userId: string,
): Promise<Array<{ id: string; version: number; createdAt: string }>> {
  const db = getDocDb()
  const { data: owned } = await db
    .from('doc_precedentes')
    .select('id')
    .eq('id', precedenteId)
    .eq('user_id', userId)
    .maybeSingle()
  if (!owned) throw new Error('Precedente no encontrado')

  const { data, error } = await db
    .from('doc_precedente_versiones')
    .select('id, version, created_at')
    .eq('precedente_id', precedenteId)
    .order('version', { ascending: false })
  if (error) throw new Error(`listarVersiones: ${error.message}`)
  return (data ?? []).map(row => ({
    id: String(row.id),
    version: Number(row.version),
    createdAt: String(row.created_at),
  }))
}

export async function restaurarVersion(params: {
  precedenteId: string
  userId: string
  version: number
}): Promise<{ input: DrafterDocumentInput; sections: SeccionDrafter[] | null }> {
  const db = getDocDb()
  const { data: owned } = await db
    .from('doc_precedentes')
    .select('id')
    .eq('id', params.precedenteId)
    .eq('user_id', params.userId)
    .maybeSingle()
  if (!owned) throw new Error('Precedente no encontrado')

  const { data: versionRow, error } = await db
    .from('doc_precedente_versiones')
    .select('datos_entrada, secciones_generadas')
    .eq('precedente_id', params.precedenteId)
    .eq('version', params.version)
    .maybeSingle()
  if (error || !versionRow) throw new Error('Versión no encontrada')

  const input = versionRow.datos_entrada as DrafterDocumentInput
  const sections = (versionRow.secciones_generadas as SeccionDrafter[] | null) ?? null

  await guardarNuevaVersion({ precedenteId: params.precedenteId, userId: params.userId, input, sections: sections ?? [] })

  return { input, sections }
}
