import { NextRequest } from 'next/server'
import { getJudicialSupabase } from '@/lib/supabase-judicial'
import { parseJudicialDocumentId } from '@/lib/judicial-document-messages'
import { Document, Packer, Paragraph, TextRun, PageBreak, AlignmentType } from 'docx'

export const runtime = 'nodejs'
export const maxDuration = 60

function safeFilePart(s: string): string {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60) || 'documento'
}

function todayYMD(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}${m}${dd}`
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as null | { documentId?: string }
  const documentId = parseJudicialDocumentId(body?.documentId)
  if (documentId == null) {
    return Response.json({ error: 'documentId inválido' }, { status: 400 })
  }

  const supabase = getJudicialSupabase()
  const { data: doc, error } = await supabase
    .from('escritos_judiciales')
    .select('id, caso_id, tipo, contenido, created_at, casos(numero_expediente)')
    .eq('id', documentId)
    .maybeSingle()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  if (!doc) return Response.json({ error: 'Documento no encontrado' }, { status: 404 })

  const contenido = String((doc as any).contenido || '')
  const tipo = String((doc as any).tipo || 'escrito')
  const expediente = String((doc as any).casos?.numero_expediente || (doc as any).caso_id || '')

  const paragraphs: Paragraph[] = []
  const lines = contenido.split(/\r?\n/)
  for (const line of lines) {
    if (line === '\f') {
      paragraphs.push(new Paragraph({ children: [new PageBreak()] }))
      continue
    }
    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        children: [
          new TextRun({
            text: line,
            font: 'Times New Roman',
            size: 24, // 12pt
          }),
        ],
      })
    )
  }

  const docx = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { orientation: 'portrait' },
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }, // 1 inch
          },
        },
        children: paragraphs.length ? paragraphs : [new Paragraph('')],
      },
    ],
  })

  const buffer = await Packer.toBuffer(docx)

  const filename = `${safeFilePart(tipo)}_${safeFilePart(expediente)}_${todayYMD()}.docx`
  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}

