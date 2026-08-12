import { NextRequest, NextResponse } from 'next/server'
import { createLegalMessage } from '@/lib/legal/anthropic'
import { CHECKLIST_SYSTEM, TRANSACTION_TYPES, buildChecklistUserPrompt } from '@/lib/legal/checklist/prompts'

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
      transactionTypeValue?: string
      buyer: string
      seller: string
      leadCounsel: string
      targetClosingDate: string
    }

    const typeValue = body.transactionTypeValue || body.transactionType
    const typeLabel =
      TRANSACTION_TYPES.find(t => t.value === typeValue)?.label || body.transactionType

    const raw = await createLegalMessage({
      system: CHECKLIST_SYSTEM,
      userContent: buildChecklistUserPrompt({
        dealName: body.dealName,
        transactionType: typeLabel,
        transactionTypeValue: typeValue,
        buyer: body.buyer,
        seller: body.seller,
        leadCounsel: body.leadCounsel,
        targetClosingDate: body.targetClosingDate,
      }),
      maxTokens: 2000,
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
