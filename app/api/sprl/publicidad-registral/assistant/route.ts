import { NextRequest, NextResponse } from 'next/server'
import { chatWithProvider } from '@/lib/llm-providers'
import {
  buildVigenciaAssistantPrompt,
  canSubmitVigenciaAssistantState,
  createEmptyVigenciaAssistantState,
  getNextVigenciaField,
  mergeAssistantFieldUpdates,
  isVigenciaPoderFieldKey,
  normalizeAssistantFieldValue,
  type AssistantFlowResponse,
  type AssistantMessage,
  type PublicidadRegistralAssistantModuleKey,
  type VigenciaPoderAssistantState,
  type VigenciaPoderFieldKey,
  VIGENCIA_FIELD_LABELS,
} from '@/lib/sprl/publicidad-registral-assistant'

export const runtime = 'nodejs'

type AssistantBody = {
  moduleKey?: PublicidadRegistralAssistantModuleKey
  messages?: AssistantMessage[]
  state?: Partial<VigenciaPoderAssistantState>
  certificateName?: string
}

type ParsedAssistantResponse = AssistantFlowResponse

function parseJsonBlock(text: string) {
  const trimmed = text.trim()
  const direct = tryParseJson(trimmed)
  if (direct) return direct

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenced) {
    const parsed = tryParseJson(fenced[1].trim())
    if (parsed) return parsed
  }

  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start >= 0 && end > start) {
    return tryParseJson(trimmed.slice(start, end + 1))
  }

  return null
}

function tryParseJson(text: string) {
  try {
    return JSON.parse(text) as Record<string, unknown>
  } catch {
    return null
  }
}

function normalizeState(partial?: Partial<VigenciaPoderAssistantState>): VigenciaPoderAssistantState {
  const base = createEmptyVigenciaAssistantState()
  return {
    ...base,
    ...(partial || {}),
    oficinaRegistral: normalizeAssistantFieldValue('oficinaRegistral', partial?.oficinaRegistral || ''),
    numero: normalizeAssistantFieldValue('numero', partial?.numero || ''),
    asiento: normalizeAssistantFieldValue('asiento', partial?.asiento || ''),
    cargoApoderado: normalizeAssistantFieldValue('cargoApoderado', partial?.cargoApoderado || ''),
    apellidoPaterno: normalizeAssistantFieldValue('apellidoPaterno', partial?.apellidoPaterno || ''),
    apellidoMaterno: normalizeAssistantFieldValue('apellidoMaterno', partial?.apellidoMaterno || ''),
    nombres: normalizeAssistantFieldValue('nombres', partial?.nombres || ''),
    declarationAccepted: Boolean(partial?.declarationAccepted),
  }
}

function buildDeterministicResponse(state: VigenciaPoderAssistantState, moduleKey: PublicidadRegistralAssistantModuleKey): ParsedAssistantResponse {
  const nextField = getNextVigenciaField(state)
  const canSubmit = canSubmitVigenciaAssistantState(state)
  const labels = VIGENCIA_FIELD_LABELS

  if (!nextField && !state.declarationAccepted) {
    return {
      moduleKey,
      message: 'Ya tengo los datos principales. Solo falta que aceptes la declaración para continuar con la solicitud.',
      fieldUpdates: {},
      declarationAccepted: false,
      missingFields: [],
      nextField: null,
      mode: 'collecting',
      readyForReview: false,
      shouldOpenSummary: false,
      shouldSubmit: false,
      confidence: 'high',
      summaryText: 'Falta la declaración para continuar.',
    }
  }

  if (!canSubmit) {
    return {
      moduleKey,
      message: nextField
        ? `Indícame ${labels[nextField].toLowerCase()} para continuar.`
        : 'Indícame el siguiente dato para continuar.',
      fieldUpdates: {},
      declarationAccepted: false,
      missingFields: nextField ? [nextField] : [],
      nextField,
      mode: 'collecting',
      readyForReview: false,
      shouldOpenSummary: false,
      shouldSubmit: false,
      confidence: 'medium',
      summaryText: 'Datos incompletos.',
    }
  }

  return {
    moduleKey,
    message: 'Tengo todos los datos. ¿Confirmas que deseas revisar el resumen y continuar con la solicitud de vigencia de poder?',
    fieldUpdates: {},
    declarationAccepted: true,
    missingFields: [],
    nextField: null,
    mode: 'review',
    readyForReview: true,
    shouldOpenSummary: true,
    shouldSubmit: false,
    confidence: 'high',
    summaryText: 'Datos completos para revisión.',
  }
}

function maybeApplyConfirmation(state: VigenciaPoderAssistantState, lastMessage: string) {
  const lower = lastMessage.toLowerCase()
  if (!canSubmitVigenciaAssistantState(state)) return false
  return /^(si|sí|confirmo|confirmar|adelante|continuar|envía|enviar|ok|okay|listo)\b/.test(lower)
}

function buildFallbackFromConversation(
  moduleKey: PublicidadRegistralAssistantModuleKey,
  state: VigenciaPoderAssistantState,
  messages: AssistantMessage[],
): ParsedAssistantResponse {
  const lastUserMessage = [...messages].reverse().find(message => message.role === 'user')?.content || ''
  if (maybeApplyConfirmation(state, lastUserMessage)) {
    return {
      moduleKey,
      message: 'Confirmación recibida. Estoy enviando la solicitud con los datos ya completados.',
      fieldUpdates: {},
      declarationAccepted: true,
      missingFields: [],
      nextField: null,
      mode: 'ready',
      readyForReview: true,
      shouldOpenSummary: true,
      shouldSubmit: true,
      confidence: 'high',
      summaryText: 'Usuario confirmó el envío.',
    }
  }

  return buildDeterministicResponse(state, moduleKey)
}

function mergeStateWithHeuristics(state: VigenciaPoderAssistantState, lastMessage: string) {
  const text = lastMessage.trim()
  const nextState = { ...state }

  if (/^(si|sí|confirmo|confirmar|adelante|continuar|ok|okay|listo)\b/i.test(text)) {
    nextState.declarationAccepted = true
  }

  if (!nextState.oficinaRegistral && /\b(?:LIMA|AREQUIPA|CUSCO|CALLAO|PIURA|TRUJILLO|ICA|HUANCAYO|HUARAZ|CHICLAYO|PUNO|TACNA)\b/i.test(text)) {
    const office = text.match(/\b(?:LIMA|AREQUIPA|CUSCO|CALLAO|PIURA|TRUJILLO|ICA|HUANCAYO|HUARAZ|CHICLAYO|PUNO|TACNA)\b/i)?.[0] || ''
    nextState.oficinaRegistral = normalizeAssistantFieldValue('oficinaRegistral', office)
  }

  if (!nextState.numero) {
    const partidaMatch = text.match(/\b(?:partida|n[úu]mero|numero)\s*[:#-]?\s*([A-Z0-9\-\/]{4,})/i)
    if (partidaMatch?.[1]) nextState.numero = normalizeAssistantFieldValue('numero', partidaMatch[1])
  }

  if (!nextState.asiento) {
    const asientoMatch = text.match(/\basiento\s*[:#-]?\s*([A-Z0-9\-\/]{1,})/i)
    if (asientoMatch?.[1]) nextState.asiento = normalizeAssistantFieldValue('asiento', asientoMatch[1])
  }

  if (!nextState.cargoApoderado) {
    const cargoPatterns = [
      /\ba nombre del\s+([a-záéíóúüñ\s]+?)(?:[.,;]|\s+y\s|\s+con\s|$)/i,
      /\bcomo\s+([a-záéíóúüñ\s]+?)(?:[.,;]|\s+y\s|\s+con\s|$)/i,
      /\bgerente general\b/i,
      /\bgerente comercial\b/i,
      /\bgerente\b/i,
      /\brepresentante legal\b/i,
      /\bapoderado\b/i,
    ]

    for (const pattern of cargoPatterns) {
      const match = text.match(pattern)
      if (!match) continue

      const cargo = match[1] || match[0]
      nextState.cargoApoderado = normalizeAssistantFieldValue('cargoApoderado', cargo)
      break
    }
  }

  return nextState
}

function buildHeuristicFieldUpdates(
  before: VigenciaPoderAssistantState,
  after: VigenciaPoderAssistantState,
): ParsedAssistantResponse['fieldUpdates'] {
  const updates: ParsedAssistantResponse['fieldUpdates'] = {}

  for (const field of Object.keys(after) as Array<keyof VigenciaPoderAssistantState>) {
    if (field === 'declarationAccepted') continue
    if (!isVigenciaPoderFieldKey(field)) continue
    if (after[field] && after[field] !== before[field]) {
      updates[field] = after[field]
    }
  }

  return updates
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null) as AssistantBody | null
    if (!body) {
      return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
    }

    const moduleKey = body.moduleKey || 'vigencia_poder_personas_juridicas'
    if (moduleKey !== 'vigencia_poder_personas_juridicas') {
      return NextResponse.json({ error: 'Módulo no soportado por este MVP' }, { status: 400 })
    }

    const messages = Array.isArray(body.messages) ? body.messages : []
    const state = normalizeState(body.state)
    const lastUserMessage = [...messages].reverse().find(message => message.role === 'user')?.content || ''
    const mergedState = mergeStateWithHeuristics(state, lastUserMessage)
    const heuristicFieldUpdates = buildHeuristicFieldUpdates(state, mergedState)

    const prompt = buildVigenciaAssistantPrompt({
      messages,
      state: mergedState,
      certificateName: 'Certificado de Vigencia de Poder de Personas Jurídicas',
    })

    if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'placeholder') {
      return NextResponse.json(buildFallbackFromConversation(moduleKey, mergedState, messages))
    }

    const result = await chatWithProvider(
      messages.length > 0 ? messages : [{ role: 'user', content: 'Comenzar flujo de vigencia de poder.' }],
      'anthropic',
      prompt.system,
    )

    const parsed = parseJsonBlock(result.text)
    if (!parsed) {
      return NextResponse.json(buildFallbackFromConversation(moduleKey, mergedState, messages))
    }

    const fieldUpdates = (parsed.fieldUpdates && typeof parsed.fieldUpdates === 'object' ? parsed.fieldUpdates : {}) as Record<string, string>
    const normalizedFieldUpdates: ParsedAssistantResponse['fieldUpdates'] = {}
    for (const [field, value] of Object.entries(fieldUpdates)) {
      if (!isVigenciaPoderFieldKey(field)) continue
      normalizedFieldUpdates[field] = normalizeAssistantFieldValue(field, String(value || ''))
    }

    const response: ParsedAssistantResponse = {
      moduleKey,
      message: String(parsed.message || 'Continuemos con la solicitud.'),
      fieldUpdates: {
        ...heuristicFieldUpdates,
        ...normalizedFieldUpdates,
      },
      declarationAccepted: Boolean(parsed.declarationAccepted ?? mergedState.declarationAccepted),
      missingFields: Array.isArray(parsed.missingFields) ? (parsed.missingFields as VigenciaPoderFieldKey[]) : [],
      nextField: (parsed.nextField as VigenciaPoderFieldKey | null) ?? getNextVigenciaField(mergedState),
      mode: (parsed.mode as ParsedAssistantResponse['mode']) || 'collecting',
      readyForReview: Boolean(parsed.readyForReview),
      shouldOpenSummary: Boolean(parsed.shouldOpenSummary),
      shouldSubmit: Boolean(parsed.shouldSubmit),
      confidence: (parsed.confidence as ParsedAssistantResponse['confidence']) || 'medium',
      summaryText: String(parsed.summaryText || ''),
    }

    if (response.shouldSubmit && !canSubmitVigenciaAssistantState(mergeAssistantFieldUpdates(mergedState, response.fieldUpdates))) {
      response.shouldSubmit = false
    }

    if (!response.message.trim()) {
      return NextResponse.json(buildFallbackFromConversation(moduleKey, mergedState, messages))
    }

    return NextResponse.json(response)
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: msg || 'No se pudo procesar el asistente.' }, { status: 500 })
  }
}
