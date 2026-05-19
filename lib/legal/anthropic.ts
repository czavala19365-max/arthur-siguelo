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
