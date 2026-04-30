'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'

interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
}

const DOC_TYPES = [
  { value: 'contestacion', label: 'Contestación de demanda' },
  { value: 'apelacion', label: 'Recurso de apelación' },
  { value: 'queja', label: 'Recurso de queja' },
  { value: 'escrito_impulso', label: 'Escrito de impulso' },
  { value: 'escrito_generico', label: 'Otro' },
]

export interface RedaccionProps {
  expedienteId: string
  documentId?: string
  onBack?: () => void
}

export default function JudicialRedaccion({ expedienteId, documentId, onBack }: RedaccionProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [tipo, setTipo] = useState('contestacion')
  const [isTyping, setIsTyping] = useState(false)
  const [documentContent, setDocumentContent] = useState('')
  const [currentDocumentId, setCurrentDocumentId] = useState<string | null>(documentId ?? null)
  const [loading, setLoading] = useState(true)
  const endRef = useRef<HTMLDivElement>(null)

  const isEditMode = useMemo(() => !!documentId, [documentId])
  // En modo edición nunca se puede cambiar tipo. En modo nuevo, se bloquea una vez creado el documento.
  const tipoLocked = useMemo(() => isEditMode || !!currentDocumentId, [isEditMode, currentDocumentId])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        if (documentId) {
          // 1) Cargar SIEMPRE el documento (panel derecho) aunque no haya historial o falle document_messages
          try {
            const docRes = await fetch(`/api/documento?documentId=${encodeURIComponent(documentId)}`)
            const docData = await docRes.json() as { document?: { tipo?: string; currentContent?: string } }
            if (!cancelled) {
              if (docData?.document?.tipo) setTipo(String(docData.document.tipo))
              setDocumentContent(String(docData?.document?.currentContent || ''))
              setCurrentDocumentId(documentId)
            }
          } catch {
            // ignore: el panel derecho quedará vacío si no se puede cargar
          }

          // 2) Luego cargar historial (panel izquierdo). Si no hay mensajes, mostrar fallback.
          try {
            const r = await fetch(`/api/documento/chat?documentId=${encodeURIComponent(documentId)}`)
            const data = await r.json() as {
              document?: { tipo?: string; currentContent?: string }
              messages?: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
              error?: string
            }
            if (cancelled) return

            if (data?.document?.tipo) setTipo(String(data.document.tipo))
            if (data?.document?.currentContent != null && String(data.document.currentContent).trim() !== '') {
              setDocumentContent(String(data.document.currentContent))
            }

            const loaded = (data?.messages || []).map(m => ({ role: m.role, content: m.content }))
            if (loaded.length > 0) {
              setMessages(loaded)
            } else {
              setMessages([
                {
                  role: 'assistant',
                  content: 'Este documento fue creado anteriormente. Puedes seguir editándolo escribiendo instrucciones abajo.',
                },
              ])
            }
          } catch {
            if (!cancelled) {
              setMessages([
                {
                  role: 'assistant',
                  content: 'Este documento fue creado anteriormente. Puedes seguir editándolo escribiendo instrucciones abajo.',
                },
              ])
            }
          }
        } else {
          // Modo nuevo: NO crear documento todavía. Se crea al primer envío.
          setMessages([])
          setDocumentContent('')
          setCurrentDocumentId(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId, expedienteId])

  async function send() {
    if (!input.trim() || isTyping) return
    const userMsg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setIsTyping(true)
    try {
      // Si aún no hay documento (modo nuevo), crearlo ahora con el tipo seleccionado
      let docId = currentDocumentId
      if (!docId) {
        const initRes = await fetch('/api/documento/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ init: true, expedienteId, tipo }),
        })
        const initData = await initRes.json() as { documentId?: string; initialMessage?: string; error?: string }
        if (initData?.error) {
          setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${initData.error}` }])
          return
        }
        if (initData?.documentId) {
          docId = String(initData.documentId)
          setCurrentDocumentId(docId)
        }
        // Mostrar mensaje inicial si aún no existe (historial estaba vacío)
        if (initData?.initialMessage) {
          setMessages(prev => {
            const hasAnyAssistant = prev.some(m => m.role === 'assistant')
            return hasAnyAssistant ? prev : [{ role: 'assistant', content: String(initData.initialMessage) }, ...prev]
          })
        }
      }
      if (!docId) return

      const res = await fetch('/api/documento/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: docId,
          message: userMsg,
          currentDocument: documentContent,
        }),
      })
      const data = await res.json() as { explanation?: string; document?: string; error?: string }
      if (data?.error) {
        setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${data.error}` }])
        return
      }
      const explanation = String(data?.explanation || 'Actualicé el documento.')
      const doc = String(data?.document || '')
      setMessages(prev => [...prev, { role: 'assistant', content: explanation }])
      if (doc) setDocumentContent(doc)
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error de conexión.' }])
    } finally {
      setIsTyping(false)
    }
  }

  async function downloadWord() {
    if (!currentDocumentId) return
    try {
      const res = await fetch('/api/documento/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: currentDocumentId }),
      })
      if (!res.ok) return
      const blob = await res.blob()
      const cd = res.headers.get('content-disposition') || ''
      const match = cd.match(/filename="([^"]+)"/i)
      const filename = match?.[1] || 'documento.docx'
      const objUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(objUrl)
    } catch {
      // ignore
    }
  }

  const backEl = onBack ? (
    <button
      type="button"
      onClick={onBack}
      style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', color: 'var(--muted)', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
    >
      ← Volver
    </button>
  ) : (
    <Link href={`/judicial/${expedienteId}`} style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', color: 'var(--muted)' }}>
      ← Volver
    </Link>
  )

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', height: '100vh' }}>
      <div style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--line)' }}>
        <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--line)', padding: '20px 28px' }}>
          {backEl}
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '20px', marginTop: '6px' }}>Arthur IA Judicial</div>
          <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {DOC_TYPES.map(t => (
              <button
                key={t.value}
                onClick={() => { if (!tipoLocked) setTipo(t.value) }}
                disabled={tipoLocked}
                style={{
                  background: tipo === t.value ? 'var(--ink)' : 'var(--surface)',
                  color: tipo === t.value ? 'var(--paper)' : 'var(--ink)',
                  border: '1px solid var(--line-strong)',
                  padding: '6px 12px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  cursor: tipoLocked ? 'not-allowed' : 'pointer',
                  opacity: tipoLocked && tipo !== t.value ? 0.6 : 1,
                }}
                title={tipoLocked ? 'El tipo no se puede cambiar en un documento existente' : undefined}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', background: 'var(--paper)' }}>
          {loading ? (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', textTransform: 'uppercase', color: 'var(--muted)' }}>Cargando...</div>
          ) : (
            <>
              {messages.map((m, i) => (
                <div key={i} style={{ marginBottom: '12px', display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{ maxWidth: '84%', background: m.role === 'user' ? 'var(--accent-navy)' : 'var(--surface)', color: 'var(--ink)', border: m.role === 'user' ? 'none' : '1px solid var(--line)', padding: '12px 14px', fontFamily: 'var(--font-body)', fontSize: '14px', whiteSpace: 'pre-wrap' }}>
                    {m.content}
                  </div>
                </div>
              ))}
              {isTyping && <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--muted)' }}>Arthur está redactando...</div>}
              <div ref={endRef} />
            </>
          )}
        </div>

        <div style={{ borderTop: '1px solid var(--line)', padding: '14px', display: 'flex', gap: '8px' }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send() } }}
            style={{ flex: 1, border: '1px solid var(--line-strong)', padding: '12px', minHeight: 48 }}
            placeholder="Escribe tu instrucción..."
            disabled={loading || isTyping}
          />
          <button
            onClick={() => void send()}
            disabled={loading || isTyping}
            style={{ border: 'none', background: 'var(--ink)', color: 'white', padding: '0 18px', fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', cursor: loading || isTyping ? 'not-allowed' : 'pointer', opacity: loading || isTyping ? 0.7 : 1 }}
          >
            Enviar
          </button>
        </div>
      </div>

      <div style={{ background: 'var(--paper)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--line)', padding: '20px 28px', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '20px' }}>Documento judicial</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => navigator.clipboard.writeText(documentContent).catch(() => { })} style={{ border: '1px solid var(--line-strong)', background: 'transparent', padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', cursor: 'pointer' }}>
              Copiar
            </button>
            <button onClick={() => void downloadWord()} style={{ border: '1px solid var(--line-strong)', background: 'transparent', padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', cursor: 'pointer' }}>
              Descargar Word
            </button>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '32px 40px' }}>
          {documentContent ? (
            <div style={{ maxWidth: '560px', margin: '0 auto', fontFamily: "'Times New Roman', Times, serif", fontSize: '13px', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
              {documentContent}
            </div>
          ) : (
            <div style={{ color: 'var(--muted)', fontFamily: 'var(--font-body)' }}>
              El borrador aparecerá aquí cuando Arthur complete la redacción.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

