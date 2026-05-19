import { NextRequest, NextResponse } from 'next/server'
import { createLegalMessage } from '@/lib/legal/anthropic'

export const runtime = 'nodejs'
export const maxDuration = 60

const SYSTEM = `Eres un abogado corporativo peruano experto en derecho societario.
Redacta el texto narrativo formal para un punto de agenda de una Junta General de Accionistas,
en español jurídico peruano, estilo acta notarial.
Incluye párrafos con fórmulas como "El Presidente informó que..." y "Luego de una breve deliberación, la Junta acordó por unanimidad...".
Solo devuelve el texto del acuerdo, sin encabezados de sección.`

export async function POST(req: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY no configurada' }, { status: 500 })
    }

    const body = (await req.json()) as {
      companyName: string
      title: string
      description: string
    }

    const text = await createLegalMessage({
      system: SYSTEM,
      userContent: `Sociedad: ${body.companyName}\nPunto de agenda: ${body.title}\nDescripción: ${body.description}\n\nRedacta el texto del acuerdo para incluir en el acta.`,
      maxTokens: 1000,
    })

    return NextResponse.json({ text })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
