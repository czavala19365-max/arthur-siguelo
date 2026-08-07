import Anthropic from '@anthropic-ai/sdk'

export const LEGAL_MODEL = 'claude-sonnet-5'

/**
 * Sonnet 5 activa razonamiento adaptativo cuando no se especifica `thinking`.
 * Lo desactivamos para mantener costo y latencia predecibles: el presupuesto de
 * `max_tokens` se destina íntegro al documento. Para subir calidad en redacción
 * compleja, cambiar a `{ type: 'adaptive' }` (consume más tokens).
 */
const LEGAL_THINKING = { type: 'disabled' } as const

export type TextBlock = { type: 'text'; text: string }
export type DocumentBlock = {
  type: 'document'
  source: { type: 'base64'; media_type: 'application/pdf'; data: string }
}

export type UserContent = string | Array<TextBlock | DocumentBlock>

/**
 * Concatena todos los bloques de texto de la respuesta. No asumimos que
 * content[0] sea texto: según el modelo y la configuración, el primer bloque
 * puede ser de otro tipo (thinking, tool_use) y devolveríamos vacío en silencio.
 */
function extractText(content: Anthropic.ContentBlock[]): string {
  return content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('')
}

export function getAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY no configurada')
  return new Anthropic({ apiKey })
}

export async function createLegalMessage(opts: {
  system: string
  userContent: UserContent
  maxTokens: number
}): Promise<string> {
  const client = getAnthropicClient()
  const response = await client.messages.create({
    model: LEGAL_MODEL,
    max_tokens: opts.maxTokens,
    system: opts.system,
    messages: [{ role: 'user', content: opts.userContent }],
    thinking: LEGAL_THINKING,
  })
  return extractText(response.content)
}

export async function createLegalConversation(opts: {
  system: string
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
  maxTokens: number
}): Promise<string> {
  const client = getAnthropicClient()
  const response = await client.messages.create({
    model: LEGAL_MODEL,
    max_tokens: opts.maxTokens,
    system: opts.system,
    messages: opts.messages.map(m => ({ role: m.role, content: m.content })),
    thinking: LEGAL_THINKING,
  })
  return extractText(response.content)
}

export interface LegalTool {
  name: string
  description: string
  input_schema: {
    type: 'object'
    properties: Record<string, { type: string; description?: string }>
  }
}

export interface LegalToolMessageResult {
  text: string
  toolCalls: Array<{ name: string; input: unknown }>
}

/**
 * Igual que createLegalConversation, pero permite pasar `tools` para extracción
 * estructurada (ej. intake conversacional) y devuelve tanto el texto como los
 * bloques tool_use de la respuesta, en vez de solo el texto.
 */
export async function createLegalToolMessage(opts: {
  system: string
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
  tools: LegalTool[]
  maxTokens: number
}): Promise<LegalToolMessageResult> {
  const client = getAnthropicClient()
  const response = await client.messages.create({
    model: LEGAL_MODEL,
    max_tokens: opts.maxTokens,
    system: opts.system,
    messages: opts.messages.map(m => ({ role: m.role, content: m.content })),
    tools: opts.tools,
    tool_choice: { type: 'auto' },
    thinking: LEGAL_THINKING,
  })

  let text = ''
  const toolCalls: Array<{ name: string; input: unknown }> = []
  for (const block of response.content) {
    if (block.type === 'text') text += block.text
    if (block.type === 'tool_use') toolCalls.push({ name: block.name, input: block.input })
  }

  return { text, toolCalls }
}
