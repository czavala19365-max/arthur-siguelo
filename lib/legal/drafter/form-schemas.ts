export type DocumentTypeId =
  | 'loan_agreement'
  | 'share_purchase'
  | 'legal_memo'
  | 'legal_letter'

export interface FormField {
  id: string
  label: string
  placeholder?: string
  rows?: number
}

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

export const DOCUMENT_TYPES: Array<{ id: DocumentTypeId; label: string }> = [
  { id: 'loan_agreement', label: 'Contrato de préstamo' },
  { id: 'share_purchase', label: 'Contrato de compraventa de acciones' },
  { id: 'legal_memo', label: 'Memorándum legal' },
  { id: 'legal_letter', label: 'Carta legal' },
]

const LOAN_FIELDS: FormField[] = [
  { id: 'lender', label: 'Prestamista (nombre y datos)', rows: 2 },
  { id: 'borrower', label: 'Prestatario (nombre y datos)', rows: 2 },
  { id: 'principal', label: 'Monto principal y moneda', rows: 2 },
  { id: 'interest', label: 'Tasa de interés y método de cálculo', rows: 2 },
  { id: 'term', label: 'Plazo y calendario de pagos', rows: 3 },
  { id: 'security', label: 'Garantías / colateral', rows: 3 },
  { id: 'covenants', label: 'Covenantes financieros y operativos', rows: 3 },
  { id: 'events_default', label: 'Eventos de incumplimiento', rows: 3 },
  { id: 'governing_law', label: 'Ley aplicable y jurisdicción (detalle)', rows: 2 },
  { id: 'special_terms', label: 'Términos especiales adicionales', rows: 3 },
]

const SPA_FIELDS: FormField[] = [
  { id: 'buyer', label: 'Comprador (nombre y datos)', rows: 2 },
  { id: 'seller', label: 'Vendedor (nombre y datos)', rows: 2 },
  { id: 'target', label: 'Sociedad objetivo / activos', rows: 2 },
  { id: 'purchase_price', label: 'Precio de compra y estructura', rows: 3 },
  { id: 'closing_conditions', label: 'Condiciones de cierre', rows: 3 },
  { id: 'reps_warranties', label: 'Representaciones y garantías clave', rows: 4 },
  { id: 'indemnities', label: 'Indemnizaciones y límites', rows: 3 },
  { id: 'non_compete', label: 'No competencia / confidencialidad', rows: 2 },
  { id: 'governing_law', label: 'Ley aplicable y jurisdicción (detalle)', rows: 2 },
  { id: 'special_terms', label: 'Términos especiales adicionales', rows: 3 },
]

const MEMO_FIELDS: FormField[] = [
  { id: 'to', label: 'Destinatario', rows: 1 },
  { id: 'from', label: 'Remitente', rows: 1 },
  { id: 're', label: 'Asunto / RE', rows: 1 },
  { id: 'background', label: 'Antecedentes', rows: 4 },
  { id: 'issues', label: 'Cuestiones jurídicas planteadas', rows: 4 },
  { id: 'analysis', label: 'Análisis solicitado (puntos clave)', rows: 4 },
  { id: 'facts', label: 'Hechos relevantes', rows: 4 },
  { id: 'authorities', label: 'Normativa / precedentes a considerar', rows: 3 },
  { id: 'recommendation', label: 'Recomendación esperada', rows: 3 },
  { id: 'deadline', label: 'Urgencia / plazo', rows: 1 },
]

const LETTER_FIELDS: FormField[] = [
  { id: 'sender', label: 'Remitente (nombre, cargo, dirección)', rows: 2 },
  { id: 'recipient', label: 'Destinatario (nombre, cargo, dirección)', rows: 2 },
  { id: 'date', label: 'Fecha de la carta', rows: 1 },
  { id: 'subject', label: 'Asunto', rows: 1 },
  { id: 'purpose', label: 'Propósito de la carta', rows: 3 },
  { id: 'background', label: 'Antecedentes', rows: 3 },
  { id: 'demands', label: 'Solicitudes / exigencias', rows: 3 },
  { id: 'legal_basis', label: 'Fundamento legal', rows: 3 },
  { id: 'deadline', label: 'Plazo de respuesta', rows: 2 },
  { id: 'tone', label: 'Tono deseado (formal, firme, conciliador)', rows: 1 },
]

export function getFieldsForType(type: DocumentTypeId): FormField[] {
  switch (type) {
    case 'loan_agreement':
      return LOAN_FIELDS
    case 'share_purchase':
      return SPA_FIELDS
    case 'legal_memo':
      return MEMO_FIELDS
    case 'legal_letter':
      return LETTER_FIELDS
    default:
      return LOAN_FIELDS
  }
}

export function jurisdictionLabel(value: string): string {
  return JURISDICTIONS.find(j => j.value === value)?.label ?? value
}

export function documentTypeLabel(type: DocumentTypeId): string {
  return DOCUMENT_TYPES.find(d => d.id === type)?.label ?? type
}
