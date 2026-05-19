import { NextRequest, NextResponse } from 'next/server'
import { createLegalMessage } from '@/lib/legal/anthropic'
import { CHECKLIST_SYSTEM, buildChecklistUserPrompt } from '@/lib/legal/checklist/prompts'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY no configurada' }, { status: 500 })
    }

    const body = (await req.json()) as {
      dealName: string
      transactionType: string
      buyer: string
      seller: string
      leadCounsel: string
      targetClosingDate: string
    }

    const raw = await createLegalMessage({
      system: CHECKLIST_SYSTEM,
      userContent: buildChecklistUserPrompt(body),
      maxTokens: 1000,
    })

    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'No se pudo parsear la respuesta de la IA' }, { status: 500 })
    }

    const data = JSON.parse(jsonMatch[0])
    return NextResponse.json(data)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
