import { NextRequest, NextResponse } from 'next/server'
import { createLegalMessage } from '@/lib/legal/anthropic'
import { parseAttachmentsServer, flattenAttachmentBlocks, type AttachmentInput } from '@/lib/legal/file-attachments'
import { DRAFTER_SYSTEM, buildDrafterUserPrompt } from '@/lib/legal/drafter/prompts'
import type { DocumentTypeId } from '@/lib/legal/drafter/form-schemas'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY no configurada' }, { status: 500 })
    }

    const body = (await req.json()) as {
      documentType: DocumentTypeId
      jurisdiction: string
      fields: Record<string, string>
      attachments?: AttachmentInput[]
    }

    const prompt = buildDrafterUserPrompt({
      documentType: body.documentType,
      jurisdiction: body.jurisdiction,
      fields: body.fields || {},
    })

    const content: Array<{ type: 'text'; text: string } | import('@/lib/legal/anthropic').DocumentBlock> = [
      { type: 'text', text: prompt },
    ]

    if (body.attachments?.length) {
      const parsed = await parseAttachmentsServer(body.attachments)
      content.push(...flattenAttachmentBlocks(parsed))
    }

    const document = await createLegalMessage({
      system: DRAFTER_SYSTEM,
      userContent: content,
      maxTokens: 4000,
    })

    return NextResponse.json({ document })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
