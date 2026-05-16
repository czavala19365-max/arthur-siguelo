import { NextRequest } from 'next/server'
import { getJudicialSupabase } from '@/lib/supabase-judicial'
import { parseJudicialDocumentId } from '@/lib/judicial-document-messages'

export const runtime = 'nodejs'
export const maxDuration = 60

function pickContent(row: any): string {
  return String(row?.current_content || row?.contenido || row?.content || '')
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const documentId = parseJudicialDocumentId(url.searchParams.get('documentId'))
  if (documentId == null) {
    return Response.json({ error: 'documentId inválido' }, { status: 400 })
  }

  const supabase = getJudicialSupabase()
  const { data: doc, error } = await supabase
    .from('escritos_judiciales')
    .select('*')
    .eq('id', documentId)
    .maybeSingle()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  if (!doc) return Response.json({ error: 'Documento no encontrado' }, { status: 404 })

  return Response.json({
    document: {
      id: (doc as any).id,
      expedienteId: (doc as any).caso_id,
      tipo: String((doc as any).tipo || ''),
      currentContent: pickContent(doc),
      createdAt: (doc as any).created_at,
    },
  })
}

