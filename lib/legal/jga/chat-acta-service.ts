import { LEGAL_PHRASES } from '@/lib/document-intelligence/constants'
import type { DatosJGA, SeccionActa } from '@/lib/document-intelligence/types'
import { formatMonto, nombreTipoSocietario } from '@/lib/document-intelligence/utils'
import { createLegalConversation, LEGAL_MODEL } from '@/lib/legal/anthropic'

export type CambioRealizado = {
  seccion: string
  tipo_cambio: 'agregado' | 'modificado' | 'eliminado'
  descripcion: string
}

export type ChatActaResponse = {
  message: string
  secciones_actualizadas: SeccionActa[]
  cambios_realizados: CambioRealizado[]
}

export type ChatMessage = { role: 'user' | 'assistant'; content: string }

function formatAccionistas(datos: DatosJGA): string {
  return datos.accionistas
    .map(
      a =>
        `- ${a.nombre_completo}, identificado con DNI N° ${a.dni}: ${a.num_acciones} ${a.num_acciones === 1 ? 'acción' : 'acciones'} (${LEGAL_PHRASES.shares})`,
    )
    .join('\n')
}

function formatAgenda(datos: DatosJGA): string {
  if (datos.agenda.length === 0) return '(sin puntos de agenda)'
  return datos.agenda.map(p => `${p.numero}. ${p.titulo} (${p.tipo_operacion})`).join('\n')
}

function formatSecciones(secciones: SeccionActa[]): string {
  return secciones
    .map(s => `[${s.tipo}${s.titulo ? ` — ${s.titulo}` : ''}]\n${s.contenido}`)
    .join('\n\n---\n\n')
}

function buildSystemPrompt(datos: DatosJGA, secciones: SeccionActa[]): string {
  const s = datos.sociedad
  return `Eres Arthur-IA, asistente legal especializado en derecho societario peruano. Estás ayudando a un abogado a perfeccionar un acta de Junta General de Accionistas.

CONTEXTO DEL ACTA ACTUAL:
Sociedad: ${s.razon_social} (${nombreTipoSocietario(s.tipo_societario)})
Capital social: ${formatMonto(s.capital_social, s.moneda_capital)}
Accionistas:
${formatAccionistas(datos)}
Agenda actual:
${formatAgenda(datos)}

ACTA GENERADA ACTUAL:
${formatSecciones(secciones)}

FRASES LEGALES ESTÁNDAR (úsalas cuando corresponda):
${JSON.stringify(LEGAL_PHRASES, null, 2)}

REGLAS:
- Cuando el usuario pida agregar un punto de agenda: agrégalo a la sección de agenda; genera el desarrollo completo (antecedentes, justificación, propuesta del Presidente); genera el ACUERDO con cláusulas jurídicas robustas; si incluye poderes, genera las facultades detalladas; cita la Ley General de Sociedades cuando corresponda.
- Cuando el usuario pida modificar algo: modifica SOLO la sección afectada; mantén el resto del acta intacto; explica qué cambiaste.
- Cuando el usuario dé datos (montos, nombres, DNI, acciones): usa formato peruano S/ 500,000.00 (Quinientos mil y 00/100 Soles); acciones: "${LEGAL_PHRASES.shares}"; DNI siempre con "identificado con DNI N°".
- Cuando el usuario pida opinión legal: sugiere la redacción más segura; cita artículos específicos de la LGS (Ley N° 26887); advierte sobre riesgos si los hay.
- Siempre responde en español.
- Siempre devuelve el acta COMPLETA actualizada (todas las secciones), no solo el fragmento modificado.
- NO inventes datos — si falta información, marca con [●].

FORMATO DE RESPUESTA:
Responde SIEMPRE en formato JSON con esta estructura exacta (sin markdown, sin texto adicional):
{
  "message": "Explicación de lo que hice (en español, breve)",
  "secciones_actualizadas": [
    {
      "titulo": "string opcional",
      "contenido": "texto de la sección",
      "tipo": "encabezado|introduccion|quorum|agenda|desarrollo|acuerdo|cierre|firmas|certificacion"
    }
  ],
  "cambios_realizados": [
    {
      "seccion": "nombre_seccion",
      "tipo_cambio": "agregado|modificado|eliminado",
      "descripcion": "qué se cambió"
    }
  ]
}`
}

function parseChatResponse(text: string): ChatActaResponse {
  const trimmed = text.trim()
  let parsed: unknown

  try {
    parsed = JSON.parse(trimmed)
  } catch {
    const block = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (block) {
      parsed = JSON.parse(block[1].trim())
    } else {
      const start = trimmed.indexOf('{')
      const end = trimmed.lastIndexOf('}')
      if (start < 0 || end <= start) throw new Error('Respuesta IA no es JSON válido')
      parsed = JSON.parse(trimmed.slice(start, end + 1))
    }
  }

  const obj = parsed as Record<string, unknown>
  if (typeof obj.message !== 'string') throw new Error('Respuesta IA inválida: falta message')
  if (!Array.isArray(obj.secciones_actualizadas)) {
    throw new Error('Respuesta IA inválida: falta secciones_actualizadas')
  }

  const secciones = obj.secciones_actualizadas as SeccionActa[]
  for (const sec of secciones) {
    if (typeof sec.contenido !== 'string' || typeof sec.tipo !== 'string') {
      throw new Error('Respuesta IA inválida: sección mal formada')
    }
  }

  const cambios = Array.isArray(obj.cambios_realizados)
    ? (obj.cambios_realizados as CambioRealizado[])
    : []

  return {
    message: obj.message,
    secciones_actualizadas: secciones,
    cambios_realizados: cambios,
  }
}

export async function chatActaJGA(params: {
  messages: ChatMessage[]
  secciones: SeccionActa[]
  datos: DatosJGA
}): Promise<ChatActaResponse> {
  if (params.messages.length === 0) {
    throw new Error('Se requiere al menos un mensaje')
  }

  const system = buildSystemPrompt(params.datos, params.secciones)
  const raw = await createLegalConversation({
    system,
    messages: params.messages,
    maxTokens: 8000,
  })

  return parseChatResponse(raw)
}

export { LEGAL_MODEL }
