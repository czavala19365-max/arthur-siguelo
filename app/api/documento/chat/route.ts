import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getJudicialSupabase } from '@/lib/supabase-judicial'
import { getCasoById } from '@/lib/judicial-db'

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
  // Fallback: treat all as document
  return { explanation: 'Documento actualizado.', document: raw.trim() }
}

function pickContent(row: any): string {
  return String(row?.current_content || row?.contenido || row?.content || '')
}

async function insertMessage(params: {
  documentId: number
  role: Role
  content: string
  documentSnapshot?: string | null
}) {
  const supabase = getJudicialSupabase()
  await supabase.from('document_messages').insert({
    document_id: params.documentId,
    role: params.role,
    content: params.content,
    document_snapshot: params.documentSnapshot ?? null,
  })
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const documentIdRaw = url.searchParams.get('documentId') || ''
  const documentId = Number.parseInt(documentIdRaw, 10)
  if (!Number.isFinite(documentId) || documentId <= 0) {
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

  const { data: msgs, error: msgErr } = await supabase
    .from('document_messages')
    .select('id, role, content, created_at')
    .eq('document_id', documentId)
    .order('created_at', { ascending: true })
  if (msgErr) return NextResponse.json({ error: msgErr.message }, { status: 500 })

  // Si el documento fue creado antes de esta feature, puede no tener historial.
  // Inicializamos una vez con un system prompt + mensaje "Documento cargado..." (con snapshot) para habilitar modo edición.
  if (!msgs || msgs.length === 0) {
    const snap = String((doc as any).contenido || '')
    await insertMessage({ documentId, role: 'system', content: systemPrompt(), documentSnapshot: null })
    await insertMessage({
      documentId,
      role: 'assistant',
      content: 'Documento cargado. Indícame qué cambios necesitas y lo iré actualizando en tiempo real.',
      documentSnapshot: snap || null,
    })
    const { data: seeded } = await supabase
      .from('document_messages')
      .select('id, role, content, created_at')
      .eq('document_id', documentId)
      .order('created_at', { ascending: true })
    return NextResponse.json({
      document: {
        id: doc.id,
        expedienteId: doc.caso_id,
        tipo: doc.tipo,
        currentContent: doc.contenido,
        createdAt: doc.created_at,
      },
      messages: (seeded ?? []).map(m => ({
        id: (m as any).id,
        role: (m as any).role as Role,
        content: (m as any).content as string,
        createdAt: (m as any).created_at as string,
      })),
    })
  }

  return NextResponse.json({
    document: {
      id: (doc as any).id,
      expedienteId: (doc as any).caso_id,
      tipo: (doc as any).tipo,
      currentContent: pickContent(doc),
      createdAt: (doc as any).created_at,
    },
    messages: (msgs ?? []).map(m => ({
      id: (m as any).id,
      role: (m as any).role as Role,
      content: (m as any).content as string,
      createdAt: (m as any).created_at as string,
    })),
  })
}

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
  }

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

  // ── Init: create document record and seed assistant intro message ──────────
  if (body.init) {
    const expedienteId = Number.parseInt(String(body.expedienteId || ''), 10)
    if (!Number.isFinite(expedienteId) || expedienteId <= 0) {
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

    const last = (caso as any).movimientos?.[0] as { acto?: string | null; fecha?: string | null } | undefined
    const intro = `Revisé el expediente ${caso.numero_expediente}. El último movimiento fue ${last?.acto || 'sin dato'} del ${last?.fecha || 'sin fecha'}. Para redactar tu escrito, necesito algunos datos.`

    await insertMessage({ documentId: Number(inserted.id), role: 'system', content: systemPrompt(), documentSnapshot: null })
    await insertMessage({ documentId: Number(inserted.id), role: 'assistant', content: intro, documentSnapshot: null })

    return NextResponse.json({
      documentId: String(inserted.id),
      tipo: inserted.tipo,
      initialMessage: intro,
    })
  }

  // ── Chat: update an existing document ────────────────────────────────────
  const documentId = Number.parseInt(String(body.documentId || ''), 10)
  if (!Number.isFinite(documentId) || documentId <= 0) {
    return NextResponse.json({ error: 'documentId requerido' }, { status: 400 })
  }

  const message = String(body.message || '').trim()
  if (!message) return NextResponse.json({ error: 'message requerido' }, { status: 400 })

  const currentDocument = String(body.currentDocument || '').trim()

  // Load doc + last 10 msgs
  const { data: doc, error: docErr } = await supabase
    .from('escritos_judiciales')
    .select('*')
    .eq('id', documentId)
    .maybeSingle()
  if (docErr) return NextResponse.json({ error: docErr.message }, { status: 500 })
  if (!doc) return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 })

  const { data: lastMsgs } = await supabase
    .from('document_messages')
    .select('role, content')
    .eq('document_id', documentId)
    .order('created_at', { ascending: false })
    .limit(10)

  const history = [...(lastMsgs ?? [])].reverse().map(m => ({
    role: (m as any).role === 'assistant' ? 'assistant' : 'user',
    content: String((m as any).content || ''),
  })) as Array<{ role: 'user' | 'assistant'; content: string }>

  const userContent = `Documento actual:
<<<
${currentDocument || pickContent(doc)}
>>>

Nueva instrucción:
${message}`

  // Save user message first
  await insertMessage({ documentId, role: 'user', content: message, documentSnapshot: null })

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
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

  // Save assistant message + snapshot, then update doc content
  await insertMessage({
    documentId,
    role: 'assistant',
    content: parsed.explanation,
    documentSnapshot: parsed.document,
  })

  await supabase
    .from('escritos_judiciales')
    .update({ contenido: parsed.document })
    .eq('id', documentId)

  return NextResponse.json({
    explanation: parsed.explanation,
    document: parsed.document,
  })
}

