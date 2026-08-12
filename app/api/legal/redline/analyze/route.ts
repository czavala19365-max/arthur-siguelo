import { NextRequest, NextResponse } from 'next/server'
import { createLegalMessage } from '@/lib/legal/anthropic'

export const runtime = 'nodejs'
export const maxDuration = 60

const SYSTEM = `You are a senior legal document reviewer. Analyze document changes and respond with valid JSON only.
No markdown fences.

Schema:
{
  "annotations": [{ "index": number, "reason": "explanation in Spanish" }],
  "summary": "overall analysis in Spanish"
}

For each change index provided, explain the likely legal or commercial purpose of that change briefly.`

export async function POST(req: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY no configurada' }, { status: 500 })
    }

    const body = (await req.json()) as {
      changes: Array<{ index: number; type: string; oldText: string; newText: string }>
    }

    const changeList = (body.changes || [])
      .slice(0, 40)
      .map(c => `[${c.index}] (${c.type}) OLD: "${c.oldText.slice(0, 200)}" NEW: "${c.newText.slice(0, 200)}"`)
      .join('\n')

    const raw = await createLegalMessage({
      system: SYSTEM,
      userContent: `Analyze these document changes:\n\n${changeList}`,
      maxTokens: 1000,
    })

    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { annotations: [], summary: raw }

    return NextResponse.json(parsed)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
