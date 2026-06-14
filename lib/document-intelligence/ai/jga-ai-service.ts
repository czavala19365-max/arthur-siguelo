import Anthropic from '@anthropic-ai/sdk'
import { nombreTipoSocietario } from '../utils'
import type { DatosJGA, PuntoAgenda } from '../types'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const MODEL = 'claude-sonnet-4-6'

const SYSTEM_PROMPT_BASE = `Eres un asistente legal especializado en derecho societario peruano.
Tu función es redactar la sección de "Desarrollo" de un punto de agenda de una Junta General de Accionistas.

REGLAS ESTRICTAS:
1. Escribe en tercera persona, narrando lo que "el Presidente manifestó/indicó/expuso"
2. Usa lenguaje formal corporativo peruano
3. Cita la Ley General de Sociedades (Ley N° 26887) cuando sea relevante
4. Incluye contexto, justificación y propuesta antes del acuerdo
5. NO generes el ACUERDO — solo el desarrollo/exposición
6. Usa defined terms entre comillas: (en adelante, el "Financiamiento")
7. Montos en formato peruano: US$ 1'000,000.00 seguido de letras entre paréntesis si se proporcionan
8. NO inventes datos — usa los proporcionados y marca [●] para faltantes
9. Sigue el nivel de detalle de estudios como DLA Piper, Rodrigo Elías, Payet`

export async function generarDesarrolloIA(
  punto: PuntoAgenda,
  datos: DatosJGA,
): Promise<string> {
  const systemPrompt = `${SYSTEM_PROMPT_BASE}

CONTEXTO:
Sociedad: ${datos.sociedad.razon_social} (${nombreTipoSocietario(datos.sociedad.tipo_societario)})
Capital: ${datos.sociedad.moneda_capital} ${datos.sociedad.capital_social}
Tipo de operación: ${punto.tipo_operacion}
Datos de la operación: ${JSON.stringify(punto.datos_operacion)}`

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2000,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: `Redacta únicamente la sección de DESARROLLO (exposición del Presidente) para el punto de agenda "${punto.titulo}". No incluyas encabezados ni el acuerdo.`,
      },
    ],
  })

  const block = response.content[0]
  return block.type === 'text' ? block.text.trim() : ''
}
