export type DrafterFieldType = 'text' | 'textarea' | 'number' | 'currency' | 'date' | 'select' | 'group'

export interface DrafterFieldOption {
  value: string
  label: string
}

export interface DrafterField {
  id: string
  label: string
  type: DrafterFieldType
  required?: boolean
  placeholder?: string
  rows?: number
  options?: DrafterFieldOption[]
  /** Solo para type 'group': sub-campos repetibles (ej. fiadores, garantías). */
  fields?: DrafterField[]
  repeatable?: boolean
}

export interface AccessoryDocumentRule {
  /** id de un DocumentTypeSchema con role 'accessory' en el registry. */
  id: string
  condition: (fields: Record<string, string>) => boolean
  /** Deriva los campos del documento accesorio a partir de los del primario, sin intervención del usuario. */
  deriveFields: (fields: Record<string, string>) => Record<string, string>
}

export interface DocumentTypeSchema {
  id: string
  label: string
  /** 'all' o lista de values de JURISDICTIONS soportados por este tipo de documento. */
  supportedJurisdictions: string[] | 'all'
  fields: DrafterField[]
  /** 'primary' (elegible en el selector) o 'accessory' (solo se genera vía accessoryDocuments de un primario). */
  role?: 'primary' | 'accessory'
  /** Documentos que se generan automáticamente junto con este, según condición. */
  accessoryDocuments?: AccessoryDocumentRule[]
}
