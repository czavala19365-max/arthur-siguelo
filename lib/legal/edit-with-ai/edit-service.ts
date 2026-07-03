import { createLegalConversation } from '@/lib/legal/anthropic'
import { REFINE_SYSTEM } from '@/lib/legal/drafter/prompts'
import { extractJsonObject } from '@/lib/legal/drafter/parse-sections'
import type { CambioDrafter, SeccionDrafter } from '@/lib/legal/drafter/types'

export type ChatMessage = { role: 'user' | 'assistant'; content: string }

export interface EditDocumentResponse {
  message: string
  sections: SeccionDrafter[]
  cambios_realizados: CambioDrafter[]
}

function formatSections(secciones: SeccionDrafter[]): string {
  return secciones
    .slice()
    .sort((a, b) => a.orden - b.orden)
    .map(s => `[${s.titulo ?? 'section'}]\n${s.contenido}`)
    .join('\n\n---\n\n')
}

function parseEditResponse(text: string): EditDocumentResponse {
  const obj = extractJsonObject(text) as Record<string, unknown>
  if (typeof obj.message !== 'string') throw new Error('Respuesta IA inválida: falta message')
  if (!Array.isArray(obj.sections)) throw new Error('Respuesta IA inválida: falta sections')

  const sections: SeccionDrafter[] = (obj.sections as Array<Record<string, unknown>>).map((s, i) => {
    if (typeof s.contenido !== 'string') throw new Error('Respuesta IA inválida: sección mal formada')
    return {
      id: `section-${i + 1}`,
      titulo: typeof s.titulo === 'string' ? s.titulo : undefined,
      contenido: s.contenido,
      orden: i,
    }
  })

  const cambios = Array.isArray(obj.cambios_realizados) ? (obj.cambios_realizados as CambioDrafter[]) : []

  return { message: obj.message, sections, cambios_realizados: cambios }
}

/**
 * Editor de documentos con IA reutilizable entre módulos (patrón generalizado a
 * partir de lib/legal/jga/chat-acta-service.ts). Recibe secciones + una
 * instrucción y devuelve el documento completo actualizado + qué cambió,
 * pidiéndole al modelo que module solo lo necesario, nunca que regenere todo.
 */
export async function editarDocumentoConIA(params: {
  messages: ChatMessage[]
  sections: SeccionDrafter[]
  instruction: string
  context?: string
}): Promise<EditDocumentResponse> {
  const contextBlock = params.context ? `Business context:\n${params.context}\n\n---\n\n` : ''

  const conversationMessages: ChatMessage[] = [
    ...params.messages,
    {
      role: 'user',
      content: `${contextBlock}Current document sections:\n\n${formatSections(params.sections)}\n\n---\n\nRevision instruction: ${params.instruction}`,
    },
  ]

  const raw = await createLegalConversation({
    system: REFINE_SYSTEM,
    messages: conversationMessages,
    maxTokens: 8000,
  })

  return parseEditResponse(raw)
}
