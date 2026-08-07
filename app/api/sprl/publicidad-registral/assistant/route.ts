import { NextRequest, NextResponse } from 'next/server'
import {
  canSubmitVigenciaAssistantState,
  createEmptyVigenciaAssistantState,
  getVigenciaMissingFields,
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

type UserIntent =
  | 'create'
  | 'update'
  | 'confirm'

type ExtractedEntities = {
  numero?: string
  oficinaRegistral?: string
  asiento?: string
  cargoApoderado?: string
  apellidoPaterno?: string
  apellidoMaterno?: string
  nombres?: string
  razonSocial?: string
  declarationAccepted?: boolean
}

function detectIntent(text: string): UserIntent {

  const value = text.toLowerCase()

  if (
    /\b(cambia|cambiar|corrige|corregir|modifica|modificar|actualiza|actualizar|reemplaza)\b/.test(value)
  ) {
    return 'update'
  }

  if (
    /^(solicitar|confirmo|confirmar|enviar|envía|proceder|adelante)\b/.test(value)
  ) {
    return 'confirm'
  }

  return 'create'
}

function cleanMessage(text: string) {

  return text

    .replace(
      /^quiero\s+/i,
      ''
    )

    .replace(
      /^necesito\s+/i,
      ''
    )

    .replace(
      /^una\s+/i,
      ''
    )

    .replace(
      /^vigencia\s+de\s+poder(?:\s+de\s+personas\s+jur[íi]dicas)?\s+de\s+/i,
      ''
    )

    .replace(
      /^(cambia|corrige|actualiza|modifica)\s+(el\s+)?nombre\s+a\s+/i,
      ''
    )

    .replace(
      /^(cambia|corrige|actualiza|modifica)\s+/i,
      ''
    )

    .replace(
      /\s+/g,
      ' '
    )

    .trim()

}

function applyEntityUpdates(

  state: VigenciaPoderAssistantState,

  updates: ExtractedEntities,

  intent: UserIntent

): VigenciaPoderAssistantState {

  const next = { ...state }

  const overwrite = intent === 'update'

  const fields: Array<keyof ExtractedEntities> = [

    'numero',

    'oficinaRegistral',

    'asiento',

    'cargoApoderado',

    'apellidoPaterno',

    'apellidoMaterno',

    'nombres'

  ]

  for (const field of fields) {

    const value = updates[field]

    if (!value)
      continue

    if (overwrite) {

      ;(next as any)[field] = normalizeAssistantFieldValue(
        field as VigenciaPoderFieldKey,
        value
      )

    } else {

      if (!(next as any)[field]) {

        ;(next as any)[field] = normalizeAssistantFieldValue(
          field as VigenciaPoderFieldKey,
          value
        )

      }

    }

  }

  if (updates.declarationAccepted) {

    next.declarationAccepted = true

  }

  return next

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
  const missingFields = getVigenciaMissingFields(state)
  const nextField = missingFields[0] ?? null
  const canSubmit = canSubmitVigenciaAssistantState(state)
  const labels = VIGENCIA_FIELD_LABELS

  const formatMissingFields = (fields: VigenciaPoderFieldKey[]) => {
    const fieldLabels = fields.map(field => labels[field])
    if (fieldLabels.length === 0) return ''
    if (fieldLabels.length === 1) return fieldLabels[0]
    if (fieldLabels.length === 2) return `${fieldLabels[0]} y ${fieldLabels[1]}`
    return `${fieldLabels.slice(0, -1).join(', ')} y ${fieldLabels[fieldLabels.length - 1]}`
  }

  if (!nextField && !state.declarationAccepted) {
    return {
      moduleKey,
      message: 'Ya tengo los datos principales. ¿Aceptas la declaración para continuar con la solicitud?',
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
      message: missingFields.length > 0
        ? `Me faltan ${formatMissingFields(missingFields)}. Envíamelos en un solo mensaje para continuar.`
        : 'Indícame el siguiente dato para continuar.',
      fieldUpdates: {},
      declarationAccepted: false,
      missingFields,
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
    message: 'Tengo todos los datos. Si están correctos, responde "SOLICITAR" para enviarlos. Si quieres corregir algo, escríbelo ahora.',
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
  const explicitSubmit = /^(solicitar|enviar|env[íi]a|confirmo env[ií]o|confirmar env[ií]o|proceder|procedo|adelante con la solicitud)\b/.test(lower)
  if (!explicitSubmit) return false

  const missingFields = getVigenciaMissingFields(state)
  return missingFields.length === 0 && state.declarationAccepted
}

function looksLikeRazonSocialCandidate(text: string) {
  const normalized = text.trim().toUpperCase().replace(/\s+/g, ' ')
  if (normalized.length < 3) return false

  const companyMarkers = [
    /\bSOCIEDAD\b/,
    /\bS\.?A\.?\b/,
    /\bS\.?A\.?C\.?\b/,
    /\bS\.?R\.?L\.?\b/,
    /\bE\.?I\.?R\.?L\.?\b/,
    /\bLTDA\.?\b/,
    /\bEMPRESA\b/,
    /\bDENOMINACI[ÓO]N\b/,
    /\bCONSORCIO\b/,
    /\bCOOPERATIVA\b/,
    /\bASOCIACION\b/,
    /\bCOMPAÑ[II]A\b/,
    /\bC[IÍ]A\.?\b/,
  ]

  if (companyMarkers.some(pattern => pattern.test(normalized))) return true

  const words = normalized.split(' ').filter(Boolean)
  return words.length >= 2 && /[A-ZÁÉÍÓÚÜÑ]/.test(normalized) && /\d/.test(normalized)
}

function extractRazonSocialCandidate(text: string): string | null {

  const clean = cleanMessage(text)
    .replace(/[¿?¡!]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  if (!clean)
    return null

  // Si explícitamente menciona razón social o empresa
  const explicitPatterns = [

    /(?:empresa|raz[oó]n social|denominaci[oó]n)\s*(?:es|:)?\s+(.+)$/i,

    /(?:de la empresa|de la sociedad)\s+(.+)$/i,

  ]

  for (const pattern of explicitPatterns) {

    const match = clean.match(pattern)

    if (match?.[1]) {

      return match[1]
        .trim()
        .replace(/[.,;]+$/, '')

    }

  }

  // Si parece un nombre de persona NO buscar empresa

  if (looksLikePersonNameText(clean))
    return null

  // Si contiene palabras típicas de empresa

  if (looksLikeRazonSocialCandidate(clean))
    return clean

  // Caso importante:
  //
  // Mesa 247
  // Constructora ABC
  // Grupo Romero
  // Clínica Internacional
  //

  const words = clean.split(' ')

  if (words.length >= 2)
    return clean

  return null

}

async function resolvePartidaFromRazonSocial(requestUrl: string, razonSocial: string) {
  const endpoint = new URL('/api/personas-juridicas/buscar', requestUrl)
  endpoint.searchParams.set('razon', razonSocial)
  endpoint.searchParams.set('pagina', '1')

  const response = await fetch(endpoint.toString(), {
    method: 'GET',
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) return null

  const data = await response.json().catch(() => null) as { resultados?: Array<{ partida?: string; oficina?: string }> } | null
  const first = data?.resultados?.[0]
  const partida = String(first?.partida || '').trim()
  if (!partida) return null

  return {
    numero: partida,
    oficinaRegistral: String(first?.oficina || '').trim(),
  }
}

function applyPersonNameHeuristics(state: VigenciaPoderAssistantState, text: string, intent:string) {
  const nextState = { ...state }
  const normalizedText = text.trim().replace(/\s+/g, ' ')
  const tokens = normalizedText
    .toUpperCase()
    .split(' ')
    .map(token => token.trim())
    .filter(Boolean)

  const missingApellidoPaterno = !nextState.apellidoPaterno.trim()
  const missingApellidoMaterno = !nextState.apellidoMaterno.trim()
  const missingNombres = !nextState.nombres.trim()

  if (!missingApellidoPaterno && !missingApellidoMaterno && !missingNombres) {
    return nextState
  }

  if (tokens.length === 0) {
    return nextState
  }

  if (tokens.length === 1) {
    const nextMissingField = (['apellidoPaterno', 'apellidoMaterno', 'nombres'] as const).find(
      field => !nextState[field].trim(),
    )

    if (nextMissingField) {
      nextState[nextMissingField] = normalizeAssistantFieldValue(nextMissingField, tokens[0])
    }

    return nextState
  }

  let endIndex = tokens.length - 1

  if (missingApellidoMaterno && endIndex >= 0) {
    nextState.apellidoMaterno = normalizeAssistantFieldValue('apellidoMaterno', tokens[endIndex])
    endIndex -= 1
  }

  if (missingApellidoPaterno && endIndex >= 0) {
    nextState.apellidoPaterno = normalizeAssistantFieldValue('apellidoPaterno', tokens[endIndex])
    endIndex -= 1
  }

  if (missingNombres && endIndex >= 0) {
    nextState.nombres = normalizeAssistantFieldValue('nombres', tokens.slice(0, endIndex + 1).join(' '))
  }

  return nextState
}

function looksLikePersonNameText(text: string) {
  const normalized = text.trim().replace(/\s+/g, ' ')
  if (!normalized) return false

  const upper = normalized.toUpperCase()
  const blockedWords = [
    'VIGENCIA',
    'PODER',
    'PARTIDA',
    'ASIENTO',
    'Razon Social',
    'RAZON SOCIAL',
    'DENOMINACION',
    'EMPRESA',
    'SOCIEDAD',
    'REGISTRAL',
    'OFICINA',
    'BUSCA',
    'BUSCAR',
    'QUIERO',
    'NECESITO',
    'DAME',
    'CONSULTA',
    'CONSULTAR',
  ]

  if (blockedWords.some(word => upper.includes(word))) return false
  if (/\d/.test(upper)) return false

  const tokens = upper.split(' ').filter(Boolean)
  return tokens.length >= 1 && tokens.length <= 4
}

function splitResponseSegments(text: string) {
  return text
    .replace(/[，；]/g, ',')
    .split(/[,\n;]/)
    .map(segment => segment.trim())
    .filter(Boolean)
}

function looksLikeAsientoValue(segment: string) {
  const value = segment.trim().toUpperCase().replace(/\s+/g, '')
  return /^[A-Z]\d{3,}$/.test(value) || /^[A-Z]{1,3}\d{2,}[A-Z0-9-]*$/.test(value)
}

function parsePersonNameSegment(segment: string) {
  const value = segment.trim().replace(/\s+/g, ' ')
  const tokens = value.split(' ').filter(Boolean)
  if (tokens.length < 2 || tokens.length > 6) return null
  if (/\d/.test(value)) return null
  if (looksLikeRazonSocialCandidate(value)) return null
  if (/\b(GERENTE|REPRESENTANTE|APODERADO|PODER|VIGENCIA|PARTIDA|ASIENTO|OFICINA|EMPRESA|SOCIEDAD)\b/i.test(value)) return null
  if (!looksLikePersonNameText(value)) return null

  const upperTokens = tokens.map(token => token.toUpperCase())
  if (upperTokens.length === 2) {
    return {
      apellidoPaterno: upperTokens[0],
      apellidoMaterno: upperTokens[1],
      nombres: '',
    }
  }

  if (upperTokens.length === 3) {
    return {
      apellidoPaterno: upperTokens[1],
      apellidoMaterno: upperTokens[2],
      nombres: upperTokens[0],
    }
  }

  return {
    apellidoPaterno: upperTokens[upperTokens.length - 2],
    apellidoMaterno: upperTokens[upperTokens.length - 1],
    nombres: upperTokens.slice(0, upperTokens.length - 2).join(' '),
  }
}

function isCargoSegment(segment: string) {
  const upper = segment.trim().toUpperCase().replace(/\s+/g, ' ')
  if (!upper) return false
  const cargoPhrases = [
    'GERENTE GENERAL',
    'GERENTE COMERCIAL',
    'GERENTE',
    'REPRESENTANTE LEGAL',
    'APODERADO',
  ]

  if (cargoPhrases.some(phrase => upper === phrase || upper.includes(phrase))) return true
  if (/^A NOMBRE DEL\b/i.test(upper)) return true
  if (/^COMO\b/i.test(upper)) return true
  return false
}

function extractEntities(
    text: string,
): ExtractedEntities {

    const entities: ExtractedEntities = {}

    const upper = text.toUpperCase()

    //-----------------------------------
    // Oficina
    //-----------------------------------

    const office =
        upper.match(
            /\b(LIMA|AREQUIPA|CUSCO|CALLAO|PIURA|ICA|TRUJILLO|HUANCAYO|PUNO|TACNA|CHICLAYO|HUARAZ)\b/
        )

    if (office) {

        entities.oficinaRegistral = office[1]

    }

    //-----------------------------------
    // Partida
    //-----------------------------------

    const partida =
        text.match(
            /\b(?:PARTIDA|NUMERO|NÚMERO)\s*[:#-]?\s*([A-Z0-9\-\/]{4,})/i
        )

    if (partida) {

        entities.numero = partida[1]

    }

    //-----------------------------------
    // Asiento
    //-----------------------------------

    const asiento =
        text.match(
            /\bASIENTO\s*[:#-]?\s*([A-Z0-9\-\/]+)/i
        )

    if (asiento) {

        entities.asiento = asiento[1]

    }

    //-----------------------------------
    // Cargo
    //-----------------------------------

    const cargo =
        text.match(
            /\b(GERENTE GENERAL|GERENTE COMERCIAL|GERENTE|REPRESENTANTE LEGAL|APODERADO)\b/i
        )

    if (cargo) {

        entities.cargoApoderado = cargo[1]

    }

    //-----------------------------------
    // Nombre completo
    //-----------------------------------

    const cleanName =

        text

        .replace(
            /^(cambia|corrige|actualiza|modifica)\s+/i,
            ''
        )

        .replace(
            /^(el\s+)?nombre\s+a\s+/i,
            ''
        )

        .trim()

    const person = parsePersonNameSegment(cleanName)

    if (person) {

        entities.apellidoPaterno =
            person.apellidoPaterno

        entities.apellidoMaterno =
            person.apellidoMaterno

        entities.nombres =
            person.nombres

    }

    //-----------------------------------
    // Declaración
    //-----------------------------------

    if (

        /^(si|sí|ok|okay|confirmo|adelante|continuar|listo)$/i

            .test(text.trim())

    ) {

        entities.declarationAccepted = true

    }

    //-----------------------------------
    // Empresa
    //-----------------------------------

    const empresa =
        extractRazonSocialCandidate(text)

    if (empresa) {

        entities.razonSocial = empresa

    }

    return entities

}

async function mergeStateWithHeuristics(state: VigenciaPoderAssistantState, lastMessage: string, requestUrl: string) {
  const intent=detectIntent(lastMessage)
  const text = cleanMessage(lastMessage)
  const nextState = { ...state }
  let handledStructuredField = false
  const razonSocialCandidate = extractRazonSocialCandidate(text)

  const entities = extractEntities(text)

    Object.assign(

        nextState,

        applyEntityUpdates(
            nextState,
            entities,
            intent
        )

    )

    handledStructuredField = Object.keys(entities).length>0


  if (!nextState.oficinaRegistral && /\b(?:LIMA|AREQUIPA|CUSCO|CALLAO|PIURA|TRUJILLO|ICA|HUANCAYO|HUARAZ|CHICLAYO|PUNO|TACNA)\b/i.test(text)) {
    const office = text.match(/\b(?:LIMA|AREQUIPA|CUSCO|CALLAO|PIURA|TRUJILLO|ICA|HUANCAYO|HUARAZ|CHICLAYO|PUNO|TACNA)\b/i)?.[0] || ''
    nextState.oficinaRegistral = normalizeAssistantFieldValue('oficinaRegistral', office)
    handledStructuredField = true
  }

  if (!nextState.numero) {
    const partidaMatch = text.match(/\b(?:partida|n[úu]mero|numero)\s*[:#-]?\s*([A-Z0-9\-\/]{4,})/i)
    if (partidaMatch?.[1]) {
      nextState.numero = normalizeAssistantFieldValue('numero', partidaMatch[1])
      handledStructuredField = true
    }
  }

  if (!nextState.asiento) {
    const asientoMatch = text.match(/\basiento\s*[:#-]?\s*([A-Z0-9\-\/]{1,})/i)
    if (asientoMatch?.[1]) {
      nextState.asiento = normalizeAssistantFieldValue('asiento', asientoMatch[1])
      handledStructuredField = true
    }
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
      handledStructuredField = true
      break
    }
  }

  if (!nextState.numero && razonSocialCandidate) {
    const resolved = await resolvePartidaFromRazonSocial(requestUrl, razonSocialCandidate)
    if (resolved?.numero) {
      nextState.numero = normalizeAssistantFieldValue('numero', resolved.numero)
      if (!nextState.oficinaRegistral && resolved.oficinaRegistral) {
        nextState.oficinaRegistral = normalizeAssistantFieldValue('oficinaRegistral', resolved.oficinaRegistral)
      }
      handledStructuredField = true
    }
  }

  if (!handledStructuredField) {
    if (!looksLikePersonNameText(text) || razonSocialCandidate) {
      return nextState
    }

    return applyPersonNameHeuristics(nextState, text, intent)
  }

  return nextState
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
    const mergedState = await mergeStateWithHeuristics(state, lastUserMessage, request.url)
    const heuristicFieldUpdates = buildHeuristicFieldUpdates(state, mergedState)
    const hasHeuristicUpdates = Object.keys(heuristicFieldUpdates).length > 0

    if (maybeApplyConfirmation(mergedState, lastUserMessage)) {
      return NextResponse.json({
        ...buildFallbackFromConversation(moduleKey, mergedState, messages),
        fieldUpdates: heuristicFieldUpdates,
      })
    }

    if (canSubmitVigenciaAssistantState(mergedState) && hasHeuristicUpdates) {
      return NextResponse.json({
        moduleKey,
        message: 'Datos actualizados. Si están correctos, responde "SOLICITAR" para enviarlos. Si quieres corregir algo más, escríbelo ahora.',
        fieldUpdates: heuristicFieldUpdates,
        declarationAccepted: true,
        missingFields: [],
        nextField: null,
        mode: 'review',
        readyForReview: true,
        shouldOpenSummary: true,
        shouldSubmit: false,
        confidence: 'high',
        summaryText: 'Datos actualizados para revisión.',
      })
    }

    const response = buildDeterministicResponse(mergedState, moduleKey)

    return NextResponse.json({
      ...response,
      fieldUpdates: {
        ...heuristicFieldUpdates,
        ...response.fieldUpdates,
      },
      declarationAccepted: Boolean(response.declarationAccepted || mergedState.declarationAccepted),
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: msg || 'No se pudo procesar el asistente.' }, { status: 500 })
  }
}
