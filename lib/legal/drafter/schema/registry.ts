import type { AccessoryDocumentRule, DocumentTypeSchema } from './types'

function nonEmpty(fields: Record<string, string>, id: string): boolean {
  return !!fields[id]?.trim()
}

const LOAN_ACCESSORY_RULES: AccessoryDocumentRule[] = [
  {
    id: 'pagare',
    condition: () => true,
    deriveFields: f => ({
      creditor: f.lender ?? '',
      debtor: f.borrower ?? '',
      amount: f.principal ?? '',
      interest: f.interest ?? '',
      maturity: f.term ?? '',
    }),
  },
  {
    id: 'cronograma_pagos',
    condition: () => true,
    deriveFields: f => ({
      debtor: f.borrower ?? '',
      amount: f.principal ?? '',
      schedule: f.term ?? '',
    }),
  },
  {
    id: 'reconocimiento_deuda',
    condition: () => true,
    deriveFields: f => ({
      creditor: f.lender ?? '',
      debtor: f.borrower ?? '',
      amount: f.principal ?? '',
      interest: f.interest ?? '',
    }),
  },
  {
    id: 'garantia',
    condition: f => nonEmpty(f, 'security'),
    deriveFields: f => ({
      creditor: f.lender ?? '',
      debtor: f.borrower ?? '',
      amount: f.principal ?? '',
      security_description: f.security ?? '',
    }),
  },
  {
    id: 'carta_desembolso',
    condition: f => nonEmpty(f, 'disbursement_instructions'),
    deriveFields: f => ({
      lender: f.lender ?? '',
      borrower: f.borrower ?? '',
      amount: f.principal ?? '',
      disbursement_instructions: f.disbursement_instructions ?? '',
    }),
  },
]

/**
 * Registro declarativo de tipos documentales. Agregar un tipo nuevo = agregar
 * un objeto acá, sin tocar componentes de UI (DynamicDrafterForm los renderiza
 * a partir de `fields`).
 */
export const DOCUMENT_SCHEMAS: Record<string, DocumentTypeSchema> = {
  loan_agreement: {
    id: 'loan_agreement',
    label: 'Contrato de préstamo',
    supportedJurisdictions: 'all',
    role: 'primary',
    accessoryDocuments: LOAN_ACCESSORY_RULES,
    fields: [
      { id: 'lender', label: 'Prestamista (nombre y datos)', type: 'textarea', rows: 2, required: true },
      { id: 'borrower', label: 'Prestatario (nombre y datos)', type: 'textarea', rows: 2, required: true },
      { id: 'principal', label: 'Monto principal y moneda', type: 'textarea', rows: 2, required: true },
      { id: 'interest', label: 'Tasa de interés y método de cálculo', type: 'textarea', rows: 2 },
      { id: 'term', label: 'Plazo y calendario de pagos', type: 'textarea', rows: 3 },
      { id: 'security', label: 'Garantías / colateral', type: 'textarea', rows: 3 },
      { id: 'covenants', label: 'Covenantes financieros y operativos', type: 'textarea', rows: 3 },
      { id: 'events_default', label: 'Eventos de incumplimiento', type: 'textarea', rows: 3 },
      { id: 'governing_law', label: 'Ley aplicable y jurisdicción (detalle)', type: 'textarea', rows: 2 },
      { id: 'disbursement_instructions', label: 'Instrucciones de desembolso (si requiere carta aparte)', type: 'textarea', rows: 2 },
      { id: 'special_terms', label: 'Términos especiales adicionales', type: 'textarea', rows: 3 },
    ],
  },
  pagare: {
    id: 'pagare',
    label: 'Pagaré',
    supportedJurisdictions: 'all',
    role: 'accessory',
    fields: [
      { id: 'creditor', label: 'Acreedor', type: 'textarea', rows: 2 },
      { id: 'debtor', label: 'Deudor', type: 'textarea', rows: 2 },
      { id: 'amount', label: 'Monto y moneda', type: 'textarea', rows: 2 },
      { id: 'interest', label: 'Interés', type: 'textarea', rows: 2 },
      { id: 'maturity', label: 'Vencimiento', type: 'textarea', rows: 2 },
    ],
  },
  cronograma_pagos: {
    id: 'cronograma_pagos',
    label: 'Cronograma de pagos',
    supportedJurisdictions: 'all',
    role: 'accessory',
    fields: [
      { id: 'debtor', label: 'Deudor', type: 'textarea', rows: 2 },
      { id: 'amount', label: 'Monto y moneda', type: 'textarea', rows: 2 },
      { id: 'schedule', label: 'Plazo y calendario', type: 'textarea', rows: 3 },
    ],
  },
  reconocimiento_deuda: {
    id: 'reconocimiento_deuda',
    label: 'Reconocimiento de deuda',
    supportedJurisdictions: 'all',
    role: 'accessory',
    fields: [
      { id: 'creditor', label: 'Acreedor', type: 'textarea', rows: 2 },
      { id: 'debtor', label: 'Deudor', type: 'textarea', rows: 2 },
      { id: 'amount', label: 'Monto y moneda', type: 'textarea', rows: 2 },
      { id: 'interest', label: 'Interés', type: 'textarea', rows: 2 },
    ],
  },
  garantia: {
    id: 'garantia',
    label: 'Garantía',
    supportedJurisdictions: 'all',
    role: 'accessory',
    fields: [
      { id: 'creditor', label: 'Acreedor', type: 'textarea', rows: 2 },
      { id: 'debtor', label: 'Deudor', type: 'textarea', rows: 2 },
      { id: 'amount', label: 'Monto garantizado', type: 'textarea', rows: 2 },
      { id: 'security_description', label: 'Descripción de la garantía', type: 'textarea', rows: 3 },
    ],
  },
  carta_desembolso: {
    id: 'carta_desembolso',
    label: 'Carta de desembolso',
    supportedJurisdictions: 'all',
    role: 'accessory',
    fields: [
      { id: 'lender', label: 'Prestamista', type: 'textarea', rows: 2 },
      { id: 'borrower', label: 'Prestatario', type: 'textarea', rows: 2 },
      { id: 'amount', label: 'Monto y moneda', type: 'textarea', rows: 2 },
      { id: 'disbursement_instructions', label: 'Instrucciones de desembolso', type: 'textarea', rows: 3 },
    ],
  },
  share_purchase: {
    id: 'share_purchase',
    label: 'Contrato de compraventa de acciones',
    supportedJurisdictions: 'all',
    role: 'primary',
    fields: [
      { id: 'buyer', label: 'Comprador (nombre y datos)', type: 'textarea', rows: 2, required: true },
      { id: 'seller', label: 'Vendedor (nombre y datos)', type: 'textarea', rows: 2, required: true },
      { id: 'target', label: 'Sociedad objetivo / activos', type: 'textarea', rows: 2 },
      { id: 'purchase_price', label: 'Precio de compra y estructura', type: 'textarea', rows: 3, required: true },
      { id: 'closing_conditions', label: 'Condiciones de cierre', type: 'textarea', rows: 3 },
      { id: 'reps_warranties', label: 'Representaciones y garantías clave', type: 'textarea', rows: 4 },
      { id: 'indemnities', label: 'Indemnizaciones y límites', type: 'textarea', rows: 3 },
      { id: 'non_compete', label: 'No competencia / confidencialidad', type: 'textarea', rows: 2 },
      { id: 'governing_law', label: 'Ley aplicable y jurisdicción (detalle)', type: 'textarea', rows: 2 },
      { id: 'special_terms', label: 'Términos especiales adicionales', type: 'textarea', rows: 3 },
    ],
  },
  legal_memo: {
    id: 'legal_memo',
    label: 'Memorándum legal',
    supportedJurisdictions: 'all',
    role: 'primary',
    fields: [
      { id: 'to', label: 'Destinatario', type: 'text', required: true },
      { id: 'from', label: 'Remitente', type: 'text', required: true },
      { id: 're', label: 'Asunto / RE', type: 'text' },
      { id: 'background', label: 'Antecedentes', type: 'textarea', rows: 4 },
      { id: 'issues', label: 'Cuestiones jurídicas planteadas', type: 'textarea', rows: 4, required: true },
      { id: 'analysis', label: 'Análisis solicitado (puntos clave)', type: 'textarea', rows: 4 },
      { id: 'facts', label: 'Hechos relevantes', type: 'textarea', rows: 4 },
      { id: 'authorities', label: 'Normativa / precedentes a considerar', type: 'textarea', rows: 3 },
      { id: 'recommendation', label: 'Recomendación esperada', type: 'textarea', rows: 3 },
      { id: 'deadline', label: 'Urgencia / plazo', type: 'text' },
    ],
  },
  legal_letter: {
    id: 'legal_letter',
    label: 'Carta legal',
    supportedJurisdictions: 'all',
    role: 'primary',
    fields: [
      { id: 'sender', label: 'Remitente (nombre, cargo, dirección)', type: 'textarea', rows: 2, required: true },
      { id: 'recipient', label: 'Destinatario (nombre, cargo, dirección)', type: 'textarea', rows: 2, required: true },
      { id: 'date', label: 'Fecha de la carta', type: 'date' },
      { id: 'subject', label: 'Asunto', type: 'text' },
      { id: 'purpose', label: 'Propósito de la carta', type: 'textarea', rows: 3, required: true },
      { id: 'background', label: 'Antecedentes', type: 'textarea', rows: 3 },
      { id: 'demands', label: 'Solicitudes / exigencias', type: 'textarea', rows: 3 },
      { id: 'legal_basis', label: 'Fundamento legal', type: 'textarea', rows: 3 },
      { id: 'deadline', label: 'Plazo de respuesta', type: 'textarea', rows: 2 },
      {
        id: 'tone',
        label: 'Tono deseado',
        type: 'select',
        options: [
          { value: 'formal', label: 'Formal' },
          { value: 'firme', label: 'Firme' },
          { value: 'conciliador', label: 'Conciliador' },
        ],
      },
    ],
  },
}

export const DOCUMENT_TYPE_IDS = Object.keys(DOCUMENT_SCHEMAS)

/** Ids elegibles en el selector de "Tipo de documento" — excluye los accesorios (pagaré, cronograma, etc.). */
export const PRIMARY_DOCUMENT_TYPE_IDS = DOCUMENT_TYPE_IDS.filter(id => DOCUMENT_SCHEMAS[id].role !== 'accessory')

export function getDocumentSchema(id: string): DocumentTypeSchema {
  return DOCUMENT_SCHEMAS[id] ?? DOCUMENT_SCHEMAS.loan_agreement
}
