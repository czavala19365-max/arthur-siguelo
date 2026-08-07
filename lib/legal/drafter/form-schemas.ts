import { DOCUMENT_SCHEMAS, DOCUMENT_TYPE_IDS, PRIMARY_DOCUMENT_TYPE_IDS, getDocumentSchema } from './schema/registry'
import type { DrafterField } from './schema/types'

export type { DrafterField, DrafterFieldType, DocumentTypeSchema } from './schema/types'

export type DocumentTypeId = (typeof DOCUMENT_TYPE_IDS)[number]

export const JURISDICTIONS = [
  { value: 'england_wales', label: 'Inglaterra y Gales' },
  { value: 'us_general', label: 'Estados Unidos (general)' },
  { value: 'new_york', label: 'Nueva York' },
  { value: 'california', label: 'California' },
  { value: 'singapore', label: 'Singapur' },
  { value: 'hong_kong', label: 'Hong Kong' },
  { value: 'uae_difc', label: 'EAU (DIFC)' },
  { value: 'kenya', label: 'Kenia' },
  { value: 'nigeria', label: 'Nigeria' },
  { value: 'south_africa', label: 'Sudáfrica' },
  { value: 'india', label: 'India' },
  { value: 'canada_ontario', label: 'Canadá (Ontario)' },
  { value: 'other', label: 'Otra' },
] as const

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
