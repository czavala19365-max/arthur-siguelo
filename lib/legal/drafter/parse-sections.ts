import type { SeccionDrafter } from './types'

/** Extrae el primer objeto JSON de un texto, tolerando fences ```json``` o texto alrededor. */
export function extractJsonObject(text: string): unknown {
  const trimmed = text.trim()
  try {
    return JSON.parse(trimmed)
  } catch {
    const block = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (block) return JSON.parse(block[1].trim())
    const start = trimmed.indexOf('{')
    const end = trimmed.lastIndexOf('}')
    if (start < 0 || end <= start) throw new Error('Respuesta IA no es JSON válido')
    return JSON.parse(trimmed.slice(start, end + 1))
  }
}

/** Parsea `{ sections: [{ titulo?, contenido }] }` y asigna id/orden estables. */
export function parseGeneratedSections(text: string): SeccionDrafter[] {
  const parsed = extractJsonObject(text) as Record<string, unknown>
  if (!Array.isArray(parsed.sections)) {
    throw new Error('Respuesta IA inválida: falta sections')
  }
  return (parsed.sections as Array<Record<string, unknown>>).map((s, i) => {
    if (typeof s.contenido !== 'string') {
      throw new Error('Respuesta IA inválida: sección sin contenido')
    }
    return {
      id: `section-${i + 1}`,
      titulo: typeof s.titulo === 'string' ? s.titulo : undefined,
      contenido: s.contenido,
      orden: i,
    }
  })
}
