export type PublicidadRegistralAssistantModuleKey = 'vigencia_poder_personas_juridicas'

export type VigenciaPoderFieldKey =
  | 'oficinaRegistral'
  | 'numero'
  | 'asiento'
  | 'cargoApoderado'
  | 'apellidoPaterno'
  | 'apellidoMaterno'
  | 'nombres'

export type VigenciaPoderAssistantState = Record<VigenciaPoderFieldKey, string> & {
  declarationAccepted: boolean
}

export type AssistantFieldUpdate = Partial<Record<VigenciaPoderFieldKey, string>>

export type AssistantMode = 'collecting' | 'review' | 'confirming' | 'ready'

export type AssistantFlowResponse = {
  moduleKey: PublicidadRegistralAssistantModuleKey
  message: string
  fieldUpdates: AssistantFieldUpdate
  declarationAccepted: boolean
  missingFields: VigenciaPoderFieldKey[]
  nextField: VigenciaPoderFieldKey | null
  mode: AssistantMode
  readyForReview: boolean
  shouldOpenSummary: boolean
  shouldSubmit: boolean
  confidence: 'low' | 'medium' | 'high'
  summaryText: string
}

export type AssistantMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type VigenciaSummaryData = {
  partida: string
  razSocCert: string
  refNumPart: string
  asiento: string
  cargoApoderado: string
  apellidoPaterno: string
  apellidoMaterno: string
  nombres: string
  oficinaRegistral: string
}

export const VIGENCIA_FIELD_ORDER: VigenciaPoderFieldKey[] = [
  'oficinaRegistral',
  'numero',
  'asiento',
  'cargoApoderado',
  'apellidoPaterno',
  'apellidoMaterno',
  'nombres',
]

export const VIGENCIA_FIELD_LABELS: Record<VigenciaPoderFieldKey, string> = {
  oficinaRegistral: 'Oficina registral',
  numero: 'Número de partida',
  asiento: 'Asiento',
  cargoApoderado: 'Cargo o apoderado',
  apellidoPaterno: 'Apellido paterno',
  apellidoMaterno: 'Apellido materno',
  nombres: 'Nombres',
}

export function isVigenciaPoderFieldKey(value: string): value is VigenciaPoderFieldKey {
  return value in FIELD_NORMALIZERS
}

const FIELD_NORMALIZERS: Record<VigenciaPoderFieldKey, (value: string) => string> = {
  oficinaRegistral: value => value.trim().replace(/\s+/g, ' ').toUpperCase(),
  numero: value => value.trim().replace(/\s+/g, ' '),
  asiento: value => value.trim().replace(/\s+/g, ' ').toUpperCase(),
  cargoApoderado: value => value.trim().replace(/\s+/g, ' ').toUpperCase(),
  apellidoPaterno: value => value.trim().replace(/\s+/g, ' ').toUpperCase(),
  apellidoMaterno: value => value.trim().replace(/\s+/g, ' ').toUpperCase(),
  nombres: value => value.trim().replace(/\s+/g, ' ').toUpperCase(),
}

export function createEmptyVigenciaAssistantState(): VigenciaPoderAssistantState {
  return {
    oficinaRegistral: '',
    numero: '',
    asiento: '',
    cargoApoderado: '',
    apellidoPaterno: '',
    apellidoMaterno: '',
    nombres: '',
    declarationAccepted: false,
  }
}

export function normalizeAssistantFieldValue(field: VigenciaPoderFieldKey, value: string) {
  return FIELD_NORMALIZERS[field](value)
}

export function mergeAssistantFieldUpdates(
  current: VigenciaPoderAssistantState,
  updates: AssistantFieldUpdate,
): VigenciaPoderAssistantState {
  const normalizedUpdates: Partial<Record<VigenciaPoderFieldKey, string>> = {}

  for (const [field, value] of Object.entries(updates)) {
    if (!isVigenciaPoderFieldKey(field)) continue
    normalizedUpdates[field] = normalizeAssistantFieldValue(field, String(value || ''))
  }

  return {
    ...current,
    ...normalizedUpdates,
  }
}

export function getVigenciaMissingFields(state: VigenciaPoderAssistantState): VigenciaPoderFieldKey[] {
  return VIGENCIA_FIELD_ORDER.filter(field => !state[field]?.trim())
}

export function getNextVigenciaField(state: VigenciaPoderAssistantState): VigenciaPoderFieldKey | null {
  return VIGENCIA_FIELD_ORDER.find(field => !state[field]?.trim()) ?? null
}

export function canSubmitVigenciaAssistantState(state: VigenciaPoderAssistantState) {
  return VIGENCIA_FIELD_ORDER.every(field => state[field].trim().length > 0) && state.declarationAccepted
}

export function buildVigenciaSummary(data: VigenciaSummaryData) {
  return [
    `Oficina: ${data.oficinaRegistral || '—'}`,
    `Partida: ${data.partida || '—'}`,
    `Asiento: ${data.asiento || '—'}`,
    `Cargo o apoderado: ${data.cargoApoderado || '—'}`,
    `Apellidos y nombres: ${[data.apellidoPaterno, data.apellidoMaterno, data.nombres].filter(Boolean).join(' ') || '—'}`,
    `Razón social: ${data.razSocCert || '—'}`,
    `Referencia: ${data.refNumPart || '—'}`,
  ].join('\n')
}

export function buildVigenciaAssistantPrompt(args: {
  messages: AssistantMessage[]
  state: VigenciaPoderAssistantState
  certificateName: string
}) {
  const currentState = args.state
  const missingFields = getVigenciaMissingFields(currentState)
  const nextField = getNextVigenciaField(currentState)

  return {
    system: `Eres Arthur, un asistente transaccional de SUNARP.

Objetivo: completar SOLO el flujo de "Vigencia de Poder de Personas Jurídicas".

Reglas obligatorias:
1. Haz una sola pregunta a la vez.
2. Si el usuario aporta varios datos en un solo mensaje, extrae todos los datos útiles.
3. Mantén el orden del flujo: oficina registral, número de partida, asiento, cargo o apoderado, apellido paterno, apellido materno, nombres y declaración.
4. No respondas sobre otros módulos. Si el usuario menciona otro trámite, explica que por ahora este asistente solo cubre vigencias de poder.
5. Cuando todos los datos estén completos, pide confirmación para revisar el resumen.
6. Solo marca shouldSubmit=true si el usuario confirma explícitamente que desea continuar.
7. No inventes datos.
8. Devuelve únicamente JSON válido con esta forma:
{
  "message": "texto para el usuario",
  "fieldUpdates": {"oficinaRegistral":"..."},
  "declarationAccepted": false,
  "missingFields": ["numero"],
  "nextField": "numero" | null,
  "mode": "collecting" | "review" | "confirming" | "ready",
  "readyForReview": false,
  "shouldOpenSummary": false,
  "shouldSubmit": false,
  "confidence": "low" | "medium" | "high",
  "summaryText": "resumen breve"
}

El campo declarationAccepted debe ser true solo cuando el usuario confirme explícitamente que desea continuar o acepte la declaración.

Contexto del certificado: ${args.certificateName}
Estado actual:
- Oficina registral: ${currentState.oficinaRegistral || '[vacío]'}
- Número: ${currentState.numero || '[vacío]'}
- Asiento: ${currentState.asiento || '[vacío]'}
- Cargo o apoderado: ${currentState.cargoApoderado || '[vacío]'}
- Apellido paterno: ${currentState.apellidoPaterno || '[vacío]'}
- Apellido materno: ${currentState.apellidoMaterno || '[vacío]'}
- Nombres: ${currentState.nombres || '[vacío]'}
- Declaración: ${currentState.declarationAccepted ? 'aceptada' : 'pendiente'}

Si falta un dato, formula la siguiente pregunta concreta sobre el siguiente campo pendiente. Si ya están todos los datos, pide confirmación para abrir el resumen y continuar con la solicitud.
`,
    userMessages: args.messages,
    missingFields,
    nextField,
  }
}
