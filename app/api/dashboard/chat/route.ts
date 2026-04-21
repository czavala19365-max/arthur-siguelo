import { chatWithProvider, type ChatMsg } from '@/lib/llm-providers'

// ── Búsqueda de partidas registrales (personas jurídicas) ─────────────────────

const PARTIDA_KEYWORDS = [
  'partida registral', 'número de partida', 'numero de partida',
  'partida de la empresa', 'buscar empresa', 'busca la empresa',
  'persona jurídica', 'persona juridica',
  'quiero saber la partida', 'dame la partida',
  'cual es la partida', 'cuál es la partida',
  'busca la partida', 'dame el número de partida',
]

function detectPartidaIntent(text: string): boolean {
  const lower = text.toLowerCase()
  // Require "partida" + "de" or direct keywords
  if (lower.includes('partida') && (lower.includes(' de ') || lower.includes('registral'))) return true
  return PARTIDA_KEYWORDS.some(kw => lower.includes(kw))
}

function extractCompanyName(text: string): string | null {
  const clean = text.replace(/[¿?¡!]/g, ' ').trim()
  const patterns = [
    // Greedy (.+) para capturar nombres con puntos internos como "S.A.C."
    /partida\s+(?:registral\s+)?de\s+la\s+empresa\s+(.+)$/i,
    /quiero\s+(?:saber|conocer)\s+la\s+partida\s+(?:registral\s+)?de\s+(.+)$/i,
    /(?:dame|busca|buscar|encuéntrame)\s+(?:la\s+)?partida\s+(?:registral\s+)?de\s+(.+)$/i,
    /(?:cuál|cual)\s+es\s+la\s+partida\s+(?:registral\s+)?de\s+(.+)$/i,
    /partida\s+registral\s+de\s+(.+)$/i,
    /partida\s+de\s+(.+)$/i,
    /empresa\s+(.+)$/i,
  ]
  for (const p of patterns) {
    const m = clean.match(p)
    // Quitar solo comas y espacios al final — mantener puntos internos de abreviaciones (S.A.C.)
    // Pero sí quitar punto final si es puntuación de oración (seguido de fin de string)
    const name = m?.[1]?.trim().replace(/,\s*$/, '').replace(/\.\s*$/, '')
    if (name && name.length >= 3) return name
  }
  return null
}

type PersonaJuridica = {
  numero: number
  partida: string
  razon: string
  siglas: string
  oficina: string
}

const SUNARP_ASP = 'https://www.sunarp.gob.pe/mconsultas/RelacionS01r.asp'
const SCRAPE_UA  = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

async function buscarEnSunarp(razon: string): Promise<{ resultados: PersonaJuridica[]; totalPaginas: number } | null> {
  try {
    const body = new URLSearchParams({ tRazon: razon.toUpperCase(), tSiglas: '', pagina: '1' })
    const res  = await fetch(SUNARP_ASP, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': SCRAPE_UA, 'Referer': 'https://www.sunarp.gob.pe/mconsultas/RelacionS01.asp', 'Origin': 'https://www.sunarp.gob.pe' },
      body:    body.toString(),
    })
    if (!res.ok) return null
    const html = await res.text()

    const totalPaginasMatch = html.match(/name="totalPaginas"[^>]*value="(\d+)"/)
    const totalPaginas = totalPaginasMatch ? parseInt(totalPaginasMatch[1], 10) : 1

    const rowRegex  = /<tr>\s*([\s\S]*?)\s*<\/tr>/gi
    const cellRegex = /<td[^>]*>\s*([\s\S]*?)\s*<\/td>/gi
    const resultados: PersonaJuridica[] = []
    let rowMatch: RegExpExecArray | null

    while ((rowMatch = rowRegex.exec(html)) !== null) {
      const rowHtml = rowMatch[1]
      if (rowHtml.includes('bgcolor=')) continue
      const cells: string[] = []
      let cellMatch: RegExpExecArray | null
      cellRegex.lastIndex = 0
      while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
        cells.push(cellMatch[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').trim())
      }
      if (cells.length === 5 && /^\d+$/.test(cells[0])) {
        resultados.push({
          numero:  parseInt(cells[0], 10),
          partida: cells[1].replace(/\s+/g, ''),
          razon:   cells[2].replace(/\s+/g, ' ').trim(),
          siglas:  cells[3].replace(/\s+/g, ' ').trim(),
          oficina: cells[4].replace(/\s+/g, ' ').trim(),
        })
      }
    }
    return { resultados, totalPaginas }
  } catch {
    return null
  }
}

function formatPartidaResponse(company: string, resultados: PersonaJuridica[], totalPaginas: number): string {
  if (resultados.length === 0) {
    return (
      `No encontré registros para **${company}** en el Registro de Personas Jurídicas de SUNARP.\n\n` +
      `Verifica el nombre exacto e intenta de nuevo en [Búsqueda de Partidas →](/dashboard/partidas-juridicas).\n\n` +
      `⚠ Esta información es orientativa. Verifica con un abogado o directamente en SUNARP.`
    )
  }

  const shown   = resultados.slice(0, 5)
  const hasMore = resultados.length > 5 || totalPaginas > 1
  const countLabel = totalPaginas > 1 ? `más de ${resultados.length}` : String(resultados.length)
  const resultLabel = resultados.length === 1 ? '**1 resultado**' : `**${countLabel} resultados**`

  let text = `Encontré ${resultLabel} para **${company}** en el Registro de Personas Jurídicas de SUNARP:\n\n`
  text += `| N° | Partida | Razón / Denominación | Oficina |\n`
  text += `|----|---------|----------------------|---------|\n`
  for (const r of shown) {
    text += `| ${r.numero} | \`${r.partida}\` | ${r.razon} | ${r.oficina} |\n`
  }
  if (hasMore) {
    text += `\nSe encontraron más resultados. [Ver todos →](/dashboard/partidas-juridicas)\n`
  }
  text += `\n⚠ Esta información es orientativa. Verifica con un abogado o directamente en SUNARP.`
  return text
}

// ── System prompt ─────────────────────────────────────────────────────────────

const SUNARP_SYSTEM = `Eres Arthur, un asistente legal especializado en el Sistema de Registro Público del Perú (SUNARP).

Tienes conocimiento profundo sobre:
- Títulos registrales: calificación, observaciones, liquidaciones, inscripciones y tachas
- Plazos registrales: plazos de calificación (7 días hábiles), subsanación de observaciones (35 días hábiles), recursos de apelación (3 días hábiles ante el Tribunal Registral)
- Tipos de registro: Personas Jurídicas, Propiedad Inmueble, Propiedad Vehicular, Predios, Mandatos y Poderes, etc.
- Normativa: Reglamento General de los Registros Públicos (RGRP), TUO del Reglamento, Directivas de SUNARP
- Procedimientos: presentación de títulos, liquidación de derechos registrales, vigencias de poder, copias literales, certificados registrales

REGLAS DE RESPUESTA:
1. Responde siempre en español, de forma clara y precisa
2. Cita la base legal específica (artículo, norma, directiva) cuando aplique — usa el formato "📖 Base legal: [artículo/norma]"
3. Indica plazos relevantes cuando los haya
4. Sugiere el siguiente paso práctico
5. Sé conciso pero completo
6. Si no estás seguro de una norma exacta, indícalo claramente
7. Incluye al final: "⚠ Esta información es orientativa. Verifica con un abogado o directamente en SUNARP."

FLUJO PARA AGREGAR TÍTULO A SEGUIMIENTO:
Cuando el usuario quiera agregar un título (detecta frases como "agregar título", "seguimiento", "monitorear", "añadir título", "registrar título"):

1. Inicia el flujo pidiendo los datos UNO POR UNO en este orden:
   - Oficina Registral (ej: LIMA, AREQUIPA, CUSCO, etc.)
   - Año del título (4 dígitos, ej: 2024)
   - Número del título (ej: 00012345)
   - Nombre del cliente o expediente
   - Email para alertas automáticas
   - Número de WhatsApp para alertas (incluye código de país, ej: +51 999 999 999). Si el usuario no quiere darlo, acepta "sin WhatsApp" y deja el campo vacío.

2. Cuando tengas TODOS los datos obligatorios (WhatsApp es opcional), muestra un resumen claro:
   "✅ Resumen del título a agregar:
   • Oficina: [oficina]
   • Año: [año]
   • Número: [numero]
   • Cliente: [cliente]
   • Email alertas: [email]
   • WhatsApp: [whatsapp o "No proporcionado"]

   ¿Confirmas agregar este título al seguimiento?"

3. Al final del mensaje con el resumen, incluye EXACTAMENTE esta línea (sin espacios adicionales, todo en una sola línea):
   [[CONFIRMAR_TITULO:{"oficina_registral":"VALOR","anio_titulo":"VALOR","numero_titulo":"VALOR","nombre_cliente":"VALOR","email_cliente":"VALOR","whatsapp_cliente":"VALOR"}]]

   Si el usuario no proporcionó WhatsApp, usa "" como valor de whatsapp_cliente.
   Solo incluye ese marcador cuando el usuario haya dado todos los datos y hayas mostrado el resumen.

BÚSQUEDA DE PARTIDAS REGISTRALES (PERSONAS JURÍDICAS):
Cuando el usuario pregunte por la partida registral de una empresa o persona jurídica, usa la herramienta de búsqueda de partidas de SUNARP para dar una respuesta precisa con el número de partida. Siempre menciona la oficina registral donde está inscrita.

NAVEGACIÓN — cuando el usuario mencione:
- "ver mis títulos", "lista de títulos", "mis seguimientos" → responde con "Puedes ver todos tus títulos en [Ver Títulos Registrales →](/dashboard/siguelo)"
- "ver agenda", "mis plazos", "vencimientos" → responde con "Revisa tu agenda en [Ver Agenda →](/dashboard/agenda)"
- "búsqueda de partidas", "personas jurídicas", "buscar empresa" → responde con "Puedes buscar en [Búsqueda de Partidas →](/dashboard/partidas-juridicas)"

Responde siempre en español.`

export async function POST(request: Request) {
  try {
    const body     = await request.json() as { messages: ChatMsg[] }
    const messages = body.messages
    const lastMsg  = messages[messages.length - 1]

    // ── Intercepción: búsqueda de partida registral ───────────────────────────
    if (lastMsg?.role === 'user' && detectPartidaIntent(lastMsg.content)) {
      const company = extractCompanyName(lastMsg.content)
      if (company) {
        console.log(`[dashboard/chat] Búsqueda partida: "${company}"`)
        const search = await buscarEnSunarp(company)
        if (search) {
          const text = formatPartidaResponse(company, search.resultados, search.totalPaginas)
          return Response.json({ text })
        }
      }
    }

    // ── Ruta normal: Claude ───────────────────────────────────────────────────
    const result = await chatWithProvider(messages, 'anthropic', SUNARP_SYSTEM)
    return Response.json(result)
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[API] dashboard/chat error:', msg)
    return Response.json(
      { error: 'Asistente no disponible temporalmente. Por favor intenta más tarde.' },
      { status: 500 },
    )
  }
}
