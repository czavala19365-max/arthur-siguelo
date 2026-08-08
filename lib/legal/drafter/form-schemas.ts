import { DOCUMENT_SCHEMAS, DOCUMENT_TYPE_IDS, PRIMARY_DOCUMENT_TYPE_IDS, getDocumentSchema } from './schema/registry'
import type { DrafterField } from './schema/types'

export type { DrafterField, DrafterFieldType, DocumentTypeSchema } from './schema/types'
<<<<<<< HEAD
=======

export type DocumentTypeId = (typeof DOCUMENT_TYPE_IDS)[number]
>>>>>>> b18de3c87f15f1b14dc0f6da03a87062ff3bdd70

export type DocumentTypeId = (typeof DOCUMENT_TYPE_IDS)[number]

// El redactor opera exclusivamente bajo legislación peruana. Se mantiene el
// arreglo (en vez de una constante suelta) para no romper a los consumidores
// existentes de JURISDICTIONS / jurisdictionLabel.
export const JURISDICTIONS = [{ value: 'peru', label: 'Perú' }] as const

export const DEFAULT_JURISDICTION = 'peru'

export const DOCUMENT_TYPES: Array<{ id: DocumentTypeId; label: string }> = PRIMARY_DOCUMENT_TYPE_IDS.map(id => ({
  id,
  label: DOCUMENT_SCHEMAS[id].label,
}))

export function getFieldsForType(type: DocumentTypeId): DrafterField[] {
  return getDocumentSchema(type).fields
}

export function jurisdictionLabel(value: string): string {
  return JURISDICTIONS.find(j => j.value === value)?.label ?? value
}

export function documentTypeLabel(type: DocumentTypeId): string {
  return DOCUMENT_SCHEMAS[type]?.label ?? type
}
