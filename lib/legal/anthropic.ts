import Anthropic from '@anthropic-ai/sdk'

export const LEGAL_MODEL = 'claude-sonnet-4-20250514'

export type TextBlock = { type: 'text'; text: string }
export type DocumentBlock = {
  type: 'document'
  source: { type: 'base64'; media_type: 'application/pdf'; data: string }
}

export type UserContent = string | Array<TextBlock | DocumentBlock>

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
  })
  const block = response.content[0]
  return block.type === 'text' ? block.text : ''
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
  })
  const block = response.content[0]
  return block.type === 'text' ? block.text : ''
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
  })

  let text = ''
  const toolCalls: Array<{ name: string; input: unknown }> = []
  for (const block of response.content) {
    if (block.type === 'text') text += block.text
    if (block.type === 'tool_use') toolCalls.push({ name: block.name, input: block.input })
  }

  return { text, toolCalls }
}
