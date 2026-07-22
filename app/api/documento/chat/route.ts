import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getJudicialSupabase } from '@/lib/supabase-judicial'
import { getCasoById } from '@/lib/judicial-db'
import {
  insertDocumentMessage,
  listDocumentMessages,
  listRecentDocumentMessages,
  parseJudicialDocumentId,
} from '@/lib/judicial-document-messages'

export const runtime = 'nodejs'
export const maxDuration = 60

type Role = 'user' | 'assistant' | 'system'

function systemPrompt(): string {
  return `Eres Arthur IA, asistente legal experto en derecho procesal peruano. Estás ayudando a un abogado a redactar y perfeccionar un escrito judicial.

REGLAS:
- Responde SIEMPRE en español
- Cita normas peruanas exactas: nombre completo de la ley y número de artículo
- Si no estás seguro de una norma, dilo explícitamente — NUNCA inventes citas legales
- Mantén el formato legal peruano estándar (sumilla, encabezado al juzgado, identificación de parte, fundamentos de hecho, fundamentos de derecho, medios probatorios, anexos, otrosí digo)
- Clasifica sugerencias de riesgo como ALTO / MEDIO / BAJO cuando sea relevante

FORMATO DE RESPUESTA:
Siempre responde con estas dos secciones:

[EXPLICACION]
(Breve explicación de qué cambiaste y por qué, 2-3 oraciones máximo)

[DOCUMENTO]
(El documento COMPLETO actualizado con los cambios aplicados)`
}

function parseClaudeResponse(text: string): { explanation: string; document: string } {
  const raw = String(text || '')
  const expMatch = raw.match(/\[EXPLICACION\]([\s\S]*?)\[DOCUMENTO\]/i)
  const docMatch = raw.match(/\[DOCUMENTO\]([\s\S]*)$/i)
  const explanation = (expMatch?.[1] ?? '').trim()
  const document = (docMatch?.[1] ?? '').trim()
  if (document) return { explanation: explanation || 'Documento actualizado.', document }
  return { explanation: 'Documento actualizado.', document: raw.trim() }
}

function pickContent(row: Record<string, unknown>): string {
  return String(row?.current_content || row?.contenido || row?.content || '')
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const documentId = parseJudicialDocumentId(url.searchParams.get('documentId'))
  if (documentId == null) {
    return NextResponse.json({ error: 'documentId inválido' }, { status: 400 })
  }

  const supabase = getJudicialSupabase()
  const { data: doc, error: docErr } = await supabase
    .from('escritos_judiciales')
    .select('*')
    .eq('id', documentId)
    .maybeSingle()
  if (docErr) return NextResponse.json({ error: docErr.message }, { status: 500 })
  if (!doc) return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 })

  let msgs
  try {
    msgs = await listDocumentMessages(documentId)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  if (msgs.length === 0) {
    const snap = pickContent(doc as Record<string, unknown>)
    try {
      await insertDocumentMessage({ documentId, role: 'system', content: systemPrompt(), documentSnapshot: null })
      await insertDocumentMessage({
        documentId,
        role: 'assistant',
        content: 'Documento cargado. Indícame qué cambios necesitas y lo iré actualizando en tiempo real.',
        documentSnapshot: snap || null,
      })
      msgs = await listDocumentMessages(documentId)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      return NextResponse.json({ error: msg }, { status: 500 })
    }
  }

  return NextResponse.json({
    document: {
      id: (doc as { id: number }).id,
      expedienteId: (doc as { caso_id: number }).caso_id,
      tipo: (doc as { tipo: string }).tipo,
      currentContent: pickContent(doc as Record<string, unknown>),
      createdAt: (doc as { created_at: string }).created_at,
    },
    messages: msgs.map(m => ({
      id: m.id,
      role: m.role as Role,
      content: m.content,
      createdAt: m.created_at,
    })),
  })
}

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
  }

  try {
    const body = await req.json().catch(() => null) as null | {
      expedienteId?: string
      documentId?: string
      tipo?: string
      init?: boolean
      message?: string
      currentDocument?: string
    }
    if (!body) return NextResponse.json({ error: 'Body inválido' }, { status: 400 })

    const supabase = getJudicialSupabase()

    if (body.init) {
      const expedienteId = parseJudicialDocumentId(body.expedienteId)
      if (expedienteId == null) {
        return NextResponse.json({ error: 'expedienteId inválido' }, { status: 400 })
      }
      const tipo = String(body.tipo || 'contestacion')

      const caso = await getCasoById(expedienteId)
      if (!caso) return NextResponse.json({ error: 'Caso no encontrado' }, { status: 404 })

      const { data: inserted, error } = await supabase
        .from('escritos_judiciales')
        .insert({ caso_id: expedienteId, tipo, contenido: '' })
        .select('id, tipo')
        .single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      const insertedId = parseJudicialDocumentId((inserted as { id: number }).id)
      if (insertedId == null) {
        return NextResponse.json({ error: 'ID de documento inválido al crear escrito' }, { status: 500 })
      }

      const last = (caso as { movimientos?: Array<{ acto?: string | null; fecha?: string | null }> }).movimientos?.[0]
      const intro = `Revisé el expediente ${caso.numero_expediente}. El último movimiento fue ${last?.acto || 'sin dato'} del ${last?.fecha || 'sin fecha'}. Para redactar tu escrito, necesito algunos datos.`

      await insertDocumentMessage({ documentId: insertedId, role: 'system', content: systemPrompt(), documentSnapshot: null })
      await insertDocumentMessage({ documentId: insertedId, role: 'assistant', content: intro, documentSnapshot: null })

      return NextResponse.json({
        documentId: String(insertedId),
        tipo: (inserted as { tipo: string }).tipo,
        initialMessage: intro,
      })
    }

    const documentId = parseJudicialDocumentId(body.documentId)
    if (documentId == null) {
      return NextResponse.json({ error: 'documentId requerido' }, { status: 400 })
    }

    const message = String(body.message || '').trim()
    if (!message) return NextResponse.json({ error: 'message requerido' }, { status: 400 })

    const currentDocument = String(body.currentDocument || '').trim()

    const { data: doc, error: docErr } = await supabase
      .from('escritos_judiciales')
      .select('*')
      .eq('id', documentId)
      .maybeSingle()
    if (docErr) return NextResponse.json({ error: docErr.message }, { status: 500 })
    if (!doc) return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 })

    const history = await listRecentDocumentMessages(documentId, 10)

    const userContent = `Documento actual:
<<<
${currentDocument || pickContent(doc as Record<string, unknown>)}
>>>

Nueva instrucción:
${message}`

    await insertDocumentMessage({ documentId, role: 'user', content: message, documentSnapshot: null })

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 2500,
      system: systemPrompt(),
      messages: [
        ...history.map(h => ({ role: h.role, content: h.content })),
        { role: 'user', content: userContent },
      ],
    })

    const block = response.content[0]
    const text = block.type === 'text' ? block.text : ''
    const parsed = parseClaudeResponse(text)

    await insertDocumentMessage({
      documentId,
      role: 'assistant',
      content: parsed.explanation,
      documentSnapshot: parsed.document,
    })

    const { error: upErr } = await supabase
      .from('escritos_judiciales')
      .update({ contenido: parsed.document })
      .eq('id', documentId)
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

    return NextResponse.json({
      explanation: parsed.explanation,
      document: parsed.document,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error inesperado'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
