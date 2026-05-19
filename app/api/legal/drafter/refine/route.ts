import { NextRequest, NextResponse } from 'next/server'
import { createLegalConversation } from '@/lib/legal/anthropic'
import { REFINE_SYSTEM } from '@/lib/legal/drafter/prompts'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY no configurada' }, { status: 500 })
    }

    const body = (await req.json()) as {
      document: string
      instruction: string
      history?: Array<{ role: 'user' | 'assistant'; content: string }>
    }

    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
      ...(body.history || []),
      {
        role: 'user',
        content: `Current document:\n\n${body.document}\n\n---\n\nRevision instruction: ${body.instruction}\n\nReturn the complete revised document.`,
      },
    ]

    const document = await createLegalConversation({
      system: REFINE_SYSTEM,
      messages,
      maxTokens: 4000,
    })

    return NextResponse.json({ document })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
