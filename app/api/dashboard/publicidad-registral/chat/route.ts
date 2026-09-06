import { chatWithProvider, type ChatMsg } from '@/lib/llm-providers'
import { GET as searchPersonasJuridicas } from '@/app/api/personas-juridicas/buscar/route'
import { NextRequest } from 'next/server'

type FormData = Record<string, string>

type SearchResult = {
  resultados: Array<{
    partida: string
    razon: string
    oficina: string
  }>
}

// Frases que indican que el nombre de empresa terminó y empieza otro dato del formulario.
const COMPANY_STOP_TOKENS = /\b(con\s+partida|partida\s*n[°º]?\.?|n[uú]mero\s*(?:de\s*)?partida|asiento|n[uú]mero\s*de\s*asiento|con\s+nombre|gerente|apoderado|director|presidente|administrador|representante|natural|jur[ií]dico)\b/i

// El buscador SUNARP hace match por prefijo exacto: quitamos el sufijo societario (S.A.C., S.A., etc.)
// porque su puntuación no coincide con la forma en que el usuario lo escribe ("sac" vs "S.A.C.").
const CORPORATE_SUFFIX_RE = /\s+(s\.?a\.?c\.?|s\.?a\.?a\.?|s\.?r\.?l\.?|e\.?i\.?r\.?l\.?|s\.?c\.?r\.?l\.?|s\.?a\.?)\s*$/i

function trimCompanyName(raw: string): string {
  const match = raw.match(COMPANY_STOP_TOKENS)
  const cut = match?.index !== undefined ? raw.slice(0, match.index) : raw
  return cut.trim().replace(/[,.\s]+$/, '')
}

function stripCorporateSuffix(name: string): string {
  const stripped = name.replace(CORPORATE_SUFFIX_RE, '').trim()
  return stripped.length >= 3 ? stripped : name
}

function extractCompanyName(text: string): string | null {
  const clean = text.replace(/[¿?¡!]/g, ' ').trim()
  const patterns = [
    /vigencia\s+de\s+poder\s+(?:(?:de|para)\s+)?(.+)$/i,
    /(?:raz[oó]n\s+social|denominaci[oó]n|empresa)\s*(?:es|:)?\s*(.+)$/i,
    /(?:buscar|busca|encuentra)\s+(?:la\s+)?(?:partida|empresa)\s+(?:de|para)?\s*(.+)$/i,
  ]

  for (const pattern of patterns) {
    const match = clean.match(pattern)
    const company = trimCompanyName(match?.[1]?.trim().replace(/[,.\s]+$/, '') ?? '')
    if (company && company.length >= 3) return stripCorporateSuffix(company)
  }
  return null
}

function extractCorrectedCompanyName(text: string): string | null {
  if (!/\b(corrige|corregir|cambia|cambiar|modifica|modificar|ahora|debe\s+ser)\b/i.test(text)) return null
  const company = text.match(/\b(?:raz[oó]n\s+social|empresa|denominaci[oó]n)\s*(?:ahora\s+)?(?:sea|es|a|por|:)?\s*(.+)$/i)?.[1]
  if (!company) return null
  const cleaned = stripCorporateSuffix(trimCompanyName(company))
  return cleaned.length >= 3 ? cleaned : null
}

async function searchCompany(request: Request, company: string): Promise<SearchResult | null> {
  try {
    const url = new URL('/api/personas-juridicas/buscar', request.url)
    url.searchParams.set('razon', company.toUpperCase())
    url.searchParams.set('siglas', '')
    url.searchParams.set('pagina', '1')
    const response = await searchPersonasJuridicas(new NextRequest(url.toString()))
    if (!response.ok) return null
    const data = await response.json() as SearchResult
    return data
  } catch {
    return null
  }
}

function buildFormData(current: FormData | undefined, result: SearchResult['resultados'][number]): FormData {
  return {
    oficinaRegistral: result.oficina,
    solicitarPor: current?.solicitarPor || 'partida',
    numeroPartida: result.partida,
    numero: result.partida,
    numeroAsiento: current?.numeroAsiento || '',
    cargoApoderado: current?.cargoApoderado || '',
    representante: current?.representante || '',
    apellidoPaterno: current?.apellidoPaterno || '',
    apellidoMaterno: current?.apellidoMaterno || '',
    nombres: current?.nombres || '',
    razonSocial: result.razon,
    datosAdicionales: current?.datosAdicionales || '',
  }
}

const SYSTEM_PROMPT = `Eres un asistente exclusivo para completar un formulario de Certificado de Vigencia de Poder de Persona Jurídica.

Tu primera respuesta no la generas tú: el frontend ya muestra una presentación. Cuando el usuario escriba, analiza su mensaje y los DATOS_ACTUALES.
Pide todos los datos faltantes juntos, nunca uno por uno. Acepta que el usuario escriba varios datos en lenguaje natural.
Campos: oficinaRegistral, solicitarPor (partida, ficha o tomo_folio), numero, numeroAsiento opcional, cargoApoderado, representante (natural o juridico), apellidoPaterno, apellidoMaterno opcional, nombres, razonSocial y datosAdicionales opcional.
Si representante es juridico, no solicites apellidos ni nombres. Si falta la razón social, acepta frases como “quiero una vigencia de poder de Mesa 47”.
No inventes datos. Responde en español y sé breve.
Al final de TODA respuesta incluye una sola línea con este marcador JSON y todas sus claves. Conserva los valores de DATOS_ACTUALES y deja vacío lo que aún falte:
[[FORM_DATA:{"oficinaRegistral":"","solicitarPor":"partida","numero":"","numeroAsiento":"","cargoApoderado":"","representante":"natural","apellidoPaterno":"","apellidoMaterno":"","nombres":"","razonSocial":"","datosAdicionales":""}]]`

function removeFilledFieldQuestions(text: string, formData: FormData | undefined): string {
  if (!formData) return text
  const hasOffice = Boolean(formData.oficinaRegistral?.trim())
  const hasNumber = Boolean(formData.numero?.trim())
  const lines = text.split('\n')
  const filtered = lines.filter(line => {
    const normalized = line.toLowerCase()
    if (hasOffice && normalized.includes('oficina registral')) return false
    if (hasNumber && (normalized.includes('número de partida') || normalized.includes('numero de partida') || normalized.includes('número correspondiente') || normalized.includes('numero correspondiente'))) return false
    if (hasNumber && normalized.includes('número') && normalized.includes('partida')) return false
    if (hasNumber && normalized.includes('buscar por') && normalized.includes('partida')) return false
    return true
  })
  return filtered.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

function mergeFormData(current: FormData | undefined, incoming: FormData): FormData {
  const merged = { ...(current ?? {}) }
  for (const [key, value] of Object.entries(incoming)) {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      if ((key === 'numeroPartida' || key === 'numero') && (merged.numeroPartida || merged.numero)) continue
      merged[key] = String(value)
    }
  }
  return merged
}

function missingFields(formData: FormData): string[] {
  const missing: string[] = []

  if (!formData.solicitarPor?.trim()) {
    missing.push('si se solicita por partida, ficha o tomo/folio')
  }
  if (!(formData.numeroPartida || formData.numero)?.trim()) missing.push('el número correspondiente')
  if (!formData.numeroAsiento?.trim()) missing.push('el número de asiento')
  if (!formData.cargoApoderado?.trim()) missing.push('el cargo del apoderado')
  if (!formData.representante?.trim()) {
    missing.push('si el Representante es Natural o Jurídico')
  } else if (formData.representante.toLowerCase() === 'natural') {
    if (!formData.apellidoPaterno?.trim()) missing.push('el apellido paterno del representante')
    if (!formData.nombres?.trim()) missing.push('los nombres del representante')
  } else if (!formData.razonSocial?.trim()) {
    missing.push('la razón social del representante jurídico')
  }

  return missing
}

function buildMissingPrompt(formData: FormData): string {
  const missing = missingFields(formData)
  if (missing.length === 0) return 'Ya tengo todos los datos necesarios para completar la solicitud. Puedes revisar el formulario y enviarlo.'
  return `Para continuar, indícame ${missing.join(', ')}.`
}

function extractAsientoReply(text: string): string {
  const match = text.trim().match(/\b[A-Z]?\d[A-Z0-9-]*\b/i)
  return match?.[0] ?? ''
}

function extractMessageFields(text: string): FormData {
  const inferred: FormData = {}
  const asiento = text.match(/\basiento\s*(?:n[°º]?\.?\s*)?[:#-]?\s*([A-Z]\d[A-Z0-9-]*)\b/i)?.[1]
  if (asiento) inferred.numeroAsiento = asiento

  const cargo = text.match(/\b(gerente\s+(?:general|gneral)|apoderado|director|presidente|administrador)\b/i)?.[1]
  if (cargo) inferred.cargoApoderado = cargo.replace(/gneral/i, 'general')

  const nombre = text.match(/\bcon\s+nombre\s+([a-záéíóúñ]+)\s+([a-záéíóúñ]+)(?:\s+([a-záéíóúñ]+))?\b/i)
  if (nombre) {
    inferred.representante = 'natural'
    inferred.nombres = nombre[1]
    inferred.apellidoPaterno = nombre[2]
    inferred.apellidoMaterno = nombre[3] ?? ''
  } else if (/\bnatural\b/i.test(text)) {
    inferred.representante = 'natural'
  } else if (/\bjur[ií]dico\b/i.test(text)) {
    inferred.representante = 'juridico'
  }

  if (/\bficha\b/i.test(text)) inferred.solicitarPor = 'ficha'
  else if (/\btomo\s*\/\s*folio\b/i.test(text)) inferred.solicitarPor = 'tomo_folio'
  else if (/\bpartida\b/i.test(text)) inferred.solicitarPor = 'partida'
  return inferred
}

function splitNaturalPersonName(value: string): FormData | null {
  const words = value.trim().replace(/\s+/g, ' ').split(' ').filter(Boolean)
  if (words.length < 2) return null

  return {
    representante: 'natural',
    nombres: words.length > 2 ? words.slice(0, -2).join(' ') : words[0],
    apellidoPaterno: words.length > 2 ? words.at(-2) ?? '' : words[1],
    apellidoMaterno: words.length > 2 ? words.at(-1) ?? '' : '',
    razonSocial: '',
  }
}

function extractCorrectionFields(text: string): FormData {
  if (!/\b(corrige|corregir|cambia|cambiar|modifica|modificar|ahora|debe\s+ser)\b/i.test(text)) return {}

  const corrected: FormData = {}
  const asiento = text.match(/\basiento\s*(?:n[°º]?\.?\s*)?(?:sea|es|a|por|:)?\s*([A-Z]\d[A-Z0-9-]*)\b/i)?.[1]
  if (asiento) corrected.numeroAsiento = asiento

  const cargo = text.match(/\b(?:cargo|apoderado)\s*(?:sea|es|a|por|:)?\s*(gerente\s+(?:general|gneral)|apoderado|director|presidente|administrador)\b/i)?.[1]
    ?? text.match(/\b(gerente\s+(?:general|gneral)|apoderado|director|presidente|administrador)\b/i)?.[1]
  if (cargo) corrected.cargoApoderado = cargo.replace(/gneral/i, 'general')

  const name = text.match(/\b(?:nombre|a\s+nombre\s+de)\b(?:\s+(?:(?:ahora\s+)?(?:sea|es|a|por))\s+|\s*:\s*|\s+)([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+)+)\s*$/i)?.[1]
  const naturalPerson = name ? splitNaturalPersonName(name) : null
  if (naturalPerson) Object.assign(corrected, naturalPerson)

  const nombres = text.match(/\bnombres?\s*(?:ahora\s+)?(?:sea|es|a|por|:)?\s*([a-záéíóúñ ]+?)(?:[,.]|$)/i)?.[1]?.trim()
  if (nombres && !naturalPerson) corrected.nombres = nombres
  const apellidoPaterno = text.match(/\bapellido\s+paterno\s*(?:ahora\s+)?(?:sea|es|a|por|:)?\s*([a-záéíóúñ]+)\b/i)?.[1]
  if (apellidoPaterno) corrected.apellidoPaterno = apellidoPaterno
  const apellidoMaterno = text.match(/\bapellido\s+materno\s*(?:ahora\s+)?(?:sea|es|a|por|:)?\s*([a-záéíóúñ]+)\b/i)?.[1]
  if (apellidoMaterno) corrected.apellidoMaterno = apellidoMaterno

  if (/\brepresentante\s*(?:sea|es|a|por|:)?\s*jur[ií]dico\b/i.test(text)) corrected.representante = 'juridico'
  if (/\brepresentante\s*(?:sea|es|a|por|:)?\s*natural\b/i.test(text)) corrected.representante = 'natural'

  const partida = text.match(/\bpartida\s*(?:n[°º]?\.?\s*)?(?:sea|es|a|por|:)?\s*(\d+[A-Z0-9-]*)\b/i)?.[1]
  if (partida) {
    corrected.numeroPartida = partida
    corrected.numero = partida
  }

  if (/\boficina\s+registral\s*(?:sea|es|a|por|:)?\s*/i.test(text)) {
    const office = text.match(/\boficina\s+registral\s*(?:sea|es|a|por|:)?\s*([a-záéíóúñ ]+?)(?:[,.]|$)/i)?.[1]?.trim()
    if (office) corrected.oficinaRegistral = office
  }

  const additionalData = text.match(/\b(?:datos?\s+adicionales?|descripci[oó]n)\s*(?:ahora\s+)?(?:sea|es|a|por|:)?\s*(.+)$/i)?.[1]?.trim()
  if (additionalData) corrected.datosAdicionales = additionalData

  if (/\bficha\b/i.test(text)) corrected.solicitarPor = 'ficha'
  else if (/\btomo\s*\/\s*folio\b/i.test(text)) corrected.solicitarPor = 'tomo_folio'
  else if (/\bpartida\b/i.test(text)) corrected.solicitarPor = 'partida'
  return corrected
}

function applyCorrections(current: FormData, corrections: FormData): FormData {
  const updated = { ...current }
  for (const [key, value] of Object.entries(corrections)) {
    if (value !== undefined) updated[key] = value
  }
  return updated
}

function inferInitialFormReply(text: string, previousText: string): FormData {
  const inferred: FormData = {}
  const normalized = text.trim()
  const parts = normalized.split(',').map(part => part.trim()).filter(Boolean)
  const isInitialBatch = /si se solicita por partida|partida, ficha o tomo|número de asiento/i.test(previousText)

  if (!isInitialBatch) return inferred
  if (/\bficha\b/i.test(normalized)) inferred.solicitarPor = 'ficha'
  else if (/\bpartida\b/i.test(normalized)) inferred.solicitarPor = 'partida'
  else if (/tomo\s*\/\s*folio/i.test(normalized)) inferred.solicitarPor = 'tomo_folio'

  const numberPart = parts.find(part => /\b[A-Z]?\d[A-Z0-9-]*\b/i.test(part) && !/gerente|natural|jur[ií]dico/i.test(part))
  if (numberPart) {
    const number = numberPart.match(/\b[A-Z]?\d[A-Z0-9-]*\b/i)?.[0] ?? numberPart
    inferred.numeroPartida = number
    inferred.numeroAsiento = number
  }
  const cargo = normalized.match(/\b(gerente\s+(?:general|gneral)|apoderado|director|presidente|administrador)\b/i)?.[1]
  if (cargo) inferred.cargoApoderado = cargo.replace(/gneral/i, 'general')
  if (/\bnatural\b/i.test(normalized)) inferred.representante = 'natural'
  if (/\bjur[ií]dico\b/i.test(normalized)) inferred.representante = 'juridico'

  const nameParts = parts.find(part => part.split(/\s+/).length >= 3 && !/gerente|natural|jur[ií]dico|ficha|partida|tomo/i.test(part))
  if (nameParts && inferred.representante === 'natural') {
    const names = nameParts.split(/\s+/)
    inferred.nombres = names.slice(0, -2).join(' ')
    inferred.apellidoPaterno = names.at(-2) ?? ''
    inferred.apellidoMaterno = names.at(-1) ?? ''
  }
  return inferred
}

function inferNaturalNameReply(text: string, previousText: string, formData: FormData): FormData {
  if (
    !/apellido paterno/i.test(previousText) ||
    !/nombres/i.test(previousText) ||
    formData.representante?.toLowerCase() !== 'natural'
  ) return {}

  const words = text.trim().replace(/[,.]+/g, ' ').split(/\s+/).filter(Boolean)
  if (words.length < 3) return {}

  return {
    nombres: words.slice(0, -2).join(' '),
    apellidoPaterno: words[words.length - 2],
    apellidoMaterno: words[words.length - 1],
  }
}

function isFichaWithoutAsiento(text: string): boolean {
  return /\bficha\b/i.test(text) && !/asiento\s*[:#-]?\s*[A-Z0-9-]+/i.test(text)
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      messages: ChatMsg[]
      formData?: FormData
    }
    const messages = body.messages ?? []
    const lastMessage = messages[messages.length - 1]
    const previousMessage = messages[messages.length - 2]
    let effectiveFormData = { ...(body.formData ?? {}) }

    if (lastMessage?.role === 'user') {
      const corrections = extractCorrectionFields(lastMessage.content)
      effectiveFormData = applyCorrections(effectiveFormData, corrections)
      effectiveFormData = mergeFormData(effectiveFormData, extractMessageFields(lastMessage.content))
      const inferred = inferInitialFormReply(lastMessage.content, previousMessage?.content ?? '')
      effectiveFormData = mergeFormData(effectiveFormData, inferred)
      const naturalName = inferNaturalNameReply(lastMessage.content, previousMessage?.content ?? '', effectiveFormData)
      effectiveFormData = mergeFormData(effectiveFormData, naturalName)
    }

    if (
      lastMessage?.role === 'user' &&
      previousMessage?.role === 'assistant' &&
      /número de asiento|numero de asiento/i.test(previousMessage.content) &&
      !effectiveFormData.numeroAsiento?.trim()
    ) {
      const asiento = extractAsientoReply(lastMessage.content)
      if (asiento) effectiveFormData.numeroAsiento = asiento
    }
    const company = lastMessage?.role === 'user'
      ? extractCompanyName(lastMessage.content) ?? extractCorrectedCompanyName(lastMessage.content)
      : null

    if (company) {
      const search = await searchCompany(request, company)
      const result = search?.resultados?.[0]
      if (result) {
        const formData = buildFormData(effectiveFormData, result)
        formData.numeroPartida = formData.numero
        return Response.json({
          text: `${buildMissingPrompt(formData)}\n\n[[FORM_DATA:${JSON.stringify(formData)}]]`,
        })
      }
    }

    const currentData = `\nDATOS_ACTUALES:\n${JSON.stringify(effectiveFormData)}`
    const result = await chatWithProvider(messages, 'anthropic', `${SYSTEM_PROMPT}${currentData}`)
    if (result.text) {
      const markerIndex = result.text.indexOf('[[FORM_DATA:')
      const visibleText = markerIndex >= 0 ? result.text.slice(0, markerIndex) : result.text
      const marker = markerIndex >= 0 ? result.text.slice(markerIndex) : ''
      let mergedData = effectiveFormData
      if (marker) {
        try {
          const markerData = JSON.parse(marker.match(/\[\[FORM_DATA:([\s\S]*?)\]\]/)?.[1] ?? '{}') as FormData
          mergedData = mergeFormData(effectiveFormData, markerData)
        } catch { }
      }
      if (lastMessage?.role === 'user' && previousMessage?.role === 'assistant') {
        mergedData = applyCorrections(mergedData, extractCorrectionFields(lastMessage.content))
        const inferred = inferInitialFormReply(lastMessage.content, previousMessage.content)
        mergedData = mergeFormData(mergedData, inferred)
        const naturalName = inferNaturalNameReply(lastMessage.content, previousMessage.content, mergedData)
        mergedData = mergeFormData(mergedData, naturalName)
      }
      if (effectiveFormData.numeroAsiento) mergedData.numeroAsiento = effectiveFormData.numeroAsiento
      if (effectiveFormData.numeroPartida || effectiveFormData.numero) {
        mergedData.numeroPartida = effectiveFormData.numeroPartida || effectiveFormData.numero
        mergedData.numero = mergedData.numeroPartida
      }
      const prompt = buildMissingPrompt(mergedData)
      const outputMarker = `[[FORM_DATA:${JSON.stringify(mergedData)}]]`
      return Response.json({ ...result, text: `${prompt}\n\n${outputMarker}` })
    }
    return Response.json(result)
  } catch {
    return Response.json({ error: 'No pude procesar los datos. Intenta nuevamente.' }, { status: 500 })
  }
}
