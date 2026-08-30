import { createLegalToolMessage, type LegalTool } from '@/lib/legal/anthropic'
import type { ChatMessage } from '@/lib/legal/edit-with-ai/edit-service'
import type { DocumentTypeSchema } from '../schema/types'
import { jurisdictionLabel } from '../form-schemas'

const UPDATE_FIELDS_TOOL_NAME = 'update_fields'

export function buildUpdateFieldsTool(schema: DocumentTypeSchema): LegalTool {
  const properties: Record<string, { type: string; description?: string }> = {}
  for (const field of schema.fields) {
    properties[field.id] = { type: 'string', description: field.label }
  }

  return {
    name: UPDATE_FIELDS_TOOL_NAME,
    description:
      'Registra los valores de negocio que el usuario mencionó o confirmó en su mensaje. Solo incluye los campos sobre los que tengas información nueva o corregida — nunca inventes valores para campos no mencionados.',
    input_schema: { type: 'object', properties },
  }
}

function buildIntakeSystemPrompt(schema: DocumentTypeSchema, jurisdiction: string): string {
  const jurisLabel = jurisdictionLabel(jurisdiction)
  const fieldList = schema.fields
    .map(f => `- ${f.id}: ${f.label}${f.required ? ' (requerido)' : ''}`)
    .join('\n')

  return `Eres Arthur, un asistente legal que ayuda a completar la información de un ${schema.label} regido por las leyes de ${jurisLabel}, conversando en español con el usuario.

Campos del negocio a completar:
${fieldList}

En cada turno:
1. Si el mensaje del usuario contiene información nueva o corregida para alguno de estos campos, llama a la herramienta "${UPDATE_FIELDS_TOOL_NAME}" con esos valores. Nunca inventes datos no mencionados.
2. Responde con un mensaje breve y conversacional. Si todavía faltan campos marcados como requeridos, pregunta específicamente por esos (no por todos los campos, solo por los que faltan). Si ya no falta ningún campo requerido, dilo y sugiere generar el documento.
3. No repitas de vuelta todos los datos ya conocidos — solo confirma lo nuevo y pregunta lo que falta.`
}

export interface IntakeResult {
  message: string
  fields: Record<string, string>
  missingRequired: string[]
  readyToGenerate: boolean
}

export async function procesarMensajeIntake(params: {
  schema: DocumentTypeSchema
  jurisdiction: string
  fields: Record<string, string>
  messages: ChatMessage[]
  instruction: string
}): Promise<IntakeResult> {
  const system = buildIntakeSystemPrompt(params.schema, params.jurisdiction)
  const tool = buildUpdateFieldsTool(params.schema)

  const currentFieldsBlock = Object.entries(params.fields)
    .filter(([, v]) => v.trim())
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n')

  const conversationMessages: ChatMessage[] = [
    ...params.messages,
    {
      role: 'user',
      content: `Valores ya conocidos del negocio:\n${currentFieldsBlock || '(ninguno todavía)'}\n\n---\n\nMensaje del usuario: ${params.instruction}`,
    },
  ]

  const result = await createLegalToolMessage({
    system,
    messages: conversationMessages,
    tools: [tool],
    maxTokens: 2000,
  })

  const merged = { ...params.fields }
  for (const call of result.toolCalls) {
    if (call.name !== UPDATE_FIELDS_TOOL_NAME || typeof call.input !== 'object' || call.input === null) continue
    for (const [key, value] of Object.entries(call.input as Record<string, unknown>)) {
      if (typeof value === 'string' && value.trim()) merged[key] = value
    }
  }

  const missingRequired = params.schema.fields.filter(f => f.required && !merged[f.id]?.trim()).map(f => f.id)

  return {
    message: result.text,
    fields: merged,
    missingRequired,
    readyToGenerate: missingRequired.length === 0,
  }
}
