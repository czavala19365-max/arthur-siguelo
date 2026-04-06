'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

// ── Types ────────────────────────────────────────────────────────────────────

type TituloData = {
  oficina_registral: string
  anio_titulo: string
  numero_titulo: string
  nombre_cliente: string
  email_cliente: string
  whatsapp_cliente?: string
}

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  pendingTitulo?: TituloData
  addedTitulo?: { estado: string; id: string }
  confirmStatus?: 'idle' | 'loading' | 'success' | 'error'
  confirmError?: string
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const MARKER_RE = /\[\[CONFIRMAR_TITULO:([\s\S]*?)\]\]/

function parseMessage(raw: string): { content: string; pendingTitulo?: TituloData } {
  const match = raw.match(MARKER_RE)
  if (!match) return { content: raw.trim() }
  try {
    return { content: raw.replace(MARKER_RE, '').trim(), pendingTitulo: JSON.parse(match[1]) as TituloData }
  } catch {
    return { content: raw.replace(MARKER_RE, '').trim() }
  }
}

function uid() { return Math.random().toString(36).slice(2) }

function renderContent(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|📖 Base legal:[^\n]+)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('📖 Base legal:')) {
      return (
        <span key={i} style={{
          display: 'block', marginTop: '10px', padding: '8px 12px',
          background: 'rgba(194,164,109,0.1)', borderLeft: '3px solid var(--accent)',
          fontFamily: 'var(--font-mono)', fontSize: '11.5px',
          color: 'var(--ink)', lineHeight: 1.5,
        }}>
          {part}
        </span>
      )
    }
    return <span key={i} style={{ whiteSpace: 'pre-wrap' }}>{part}</span>
  })
}

// ── Props ────────────────────────────────────────────────────────────────────

interface Props {
  initialQuery: string
  onClose: () => void
}

// ── Component ────────────────────────────────────────────────────────────────

export default function ChatModal({ initialQuery, onClose }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [ready, setReady]       = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)

  // Animate in + send initial query
  useEffect(() => {
    requestAnimationFrame(() => setReady(true))
    if (initialQuery.trim()) {
      sendMessage(initialQuery.trim())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  async function sendMessage(text: string) {
    const q = text.trim()
    if (!q || loading) return

    const userMsg: Message = { id: uid(), role: 'user', content: q }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    try {
      const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }))
      const res  = await fetch('/api/dashboard/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      })
      const data = await res.json() as { text?: string; error?: string }
      const raw  = data.text ?? data.error ?? 'Sin respuesta del servidor.'
      const { content, pendingTitulo } = parseMessage(raw)

      setMessages(prev => [...prev, {
        id: uid(), role: 'assistant', content,
        pendingTitulo,
        confirmStatus: pendingTitulo ? 'idle' : undefined,
      }])
    } catch {
      setMessages(prev => [...prev, { id: uid(), role: 'assistant', content: 'Error de conexión. Intenta de nuevo.' }])
    } finally {
      setLoading(false)
    }
  }

  async function send() {
    const q = input.trim()
    if (!q) return
    setInput('')
    await sendMessage(q)
  }

  async function confirmarTitulo(msgId: string, data: TituloData) {
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, confirmStatus: 'loading' } : m))
    try {
      const res = await fetch('/api/siguelo/agregar-desde-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const result = await res.json() as { success?: boolean; id?: string; estado?: string; error?: string }
      if (result.success) {
        setMessages(prev => prev.map(m =>
          m.id === msgId ? { ...m, confirmStatus: 'success', addedTitulo: { estado: result.estado ?? 'REGISTRADO', id: result.id ?? '' } } : m
        ))
        setMessages(prev => [...prev, {
          id: uid(), role: 'assistant',
          content: `✅ Título agregado al seguimiento.\n\nEstado en SUNARP: **${result.estado ?? 'SIN DATOS'}**\n\nRecibirás alertas automáticas cuando haya cambios.`,
        }])
      } else {
        setMessages(prev => prev.map(m =>
          m.id === msgId ? { ...m, confirmStatus: 'error', confirmError: result.error ?? 'Error al agregar' } : m
        ))
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error de conexión'
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, confirmStatus: 'error', confirmError: msg } : m))
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <>
      <style>{`
        @keyframes overlayIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes panelSlide { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeUp     { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes blink      { 0%, 80%, 100% { opacity: 0; } 40% { opacity: 1; } }
        .modal-dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: var(--muted); animation: blink 1.4s infinite ease-in-out both; }
        .modal-dot:nth-child(2) { animation-delay: .2s; }
        .modal-dot:nth-child(3) { animation-delay: .4s; }
        .msg-in { animation: fadeUp 0.22s ease forwards; }
        .modal-close { transition: background 0.15s, color 0.15s; }
        .modal-close:hover { background: var(--surface) !important; color: var(--ink) !important; }
        .modal-send  { transition: background 0.2s, opacity 0.2s; }
        .modal-send:hover:not(:disabled) { opacity: 0.82; }
        .confirm-btn { transition: opacity 0.15s; }
        .confirm-btn:hover:not(:disabled) { opacity: 0.82; }
      `}</style>

      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.45)',
          zIndex: 1000,
          animation: 'overlayIn 0.2s ease forwards',
        }}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed',
        top: '50%', left: '50%',
        transform: ready ? 'translate(-50%,-50%)' : 'translate(-50%, calc(-50% + 24px))',
        opacity: ready ? 1 : 0,
        transition: 'transform 0.3s ease, opacity 0.3s ease',
        width: 'min(92vw, 900px)',
        height: 'min(90vh, 860px)',
        background: 'var(--paper)',
        border: '1px solid var(--line)',
        boxShadow: '0 24px 80px rgba(0,0,0,0.22)',
        zIndex: 1001,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        borderRadius: '4px',
      }}>

        {/* Modal header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px',
          borderBottom: '1px solid var(--line)',
          flexShrink: 0,
          background: 'var(--paper)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '28px', height: '28px',
              background: 'var(--accent)', borderRadius: '6px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 700,
              color: '#141414',
            }}>A</div>
            <div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 600, color: 'var(--ink)' }}>
                Arthur — Asistente Legal SUNARP
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--accent)', marginTop: '1px' }}>
                Claude claude-sonnet-4-6 · Especializado en registros públicos
              </div>
            </div>
          </div>
          <button
            className="modal-close"
            onClick={onClose}
            style={{
              width: '32px', height: '32px',
              background: 'transparent', border: '1px solid var(--line)',
              borderRadius: '6px', cursor: 'pointer',
              color: 'var(--muted)', fontSize: '18px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-body)',
            }}
          >
            ×
          </button>
        </div>

        {/* Messages */}
        <div style={{
          flex: 1, overflowY: 'auto',
          padding: '20px 24px',
          display: 'flex', flexDirection: 'column', gap: '14px',
        }}>
          {messages.length === 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              height: '100%', fontFamily: 'var(--font-mono)', fontSize: '11px',
              textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)',
              opacity: 0.5,
            }}>
              Consultando a Arthur…
            </div>
          )}

          {messages.map(msg => (
            <div
              key={msg.id}
              className="msg-in"
              style={{
                display: 'flex',
                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                alignItems: 'flex-start',
                gap: '10px',
              }}
            >
              {msg.role === 'assistant' && (
                <div style={{
                  width: '26px', height: '26px', flexShrink: 0, marginTop: '2px',
                  background: 'var(--accent)', borderRadius: '6px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-display)', fontSize: '12px', fontWeight: 700, color: '#141414',
                }}>A</div>
              )}

              <div style={{
                maxWidth: msg.role === 'user' ? '70%' : '82%',
                padding: '11px 15px',
                background: msg.role === 'user' ? 'rgba(194,164,109,0.15)' : 'var(--surface)',
                border: `1px solid ${msg.role === 'user' ? 'rgba(194,164,109,0.3)' : 'var(--line)'}`,
                borderRadius: msg.role === 'user' ? '14px 3px 14px 14px' : '3px 14px 14px 14px',
                fontFamily: 'var(--font-body)', fontSize: '14px',
                color: 'var(--ink)', lineHeight: 1.65,
              }}>
                {renderContent(msg.content)}

                {/* Confirm card */}
                {msg.pendingTitulo && msg.confirmStatus !== 'success' && (
                  <div style={{
                    marginTop: '12px', padding: '12px 14px',
                    background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '8px',
                  }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--accent)', marginBottom: '10px' }}>
                      Confirmar seguimiento
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 20px', marginBottom: '12px' }}>
                      {Object.entries({
                        Oficina: msg.pendingTitulo.oficina_registral,
                        Año: msg.pendingTitulo.anio_titulo,
                        Número: msg.pendingTitulo.numero_titulo,
                        Cliente: msg.pendingTitulo.nombre_cliente,
                        Email: msg.pendingTitulo.email_cliente,
                        ...(msg.pendingTitulo.whatsapp_cliente ? { WhatsApp: msg.pendingTitulo.whatsapp_cliente } : {}),
                      }).map(([k, v]) => (
                        <div key={k}>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', textTransform: 'uppercase', color: 'var(--muted)' }}>{k}</div>
                          <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--ink)', fontWeight: 500 }}>{v}</div>
                        </div>
                      ))}
                    </div>
                    {msg.confirmStatus === 'error' && (
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: '#dc2626', marginBottom: '8px' }}>
                        ⚠ {msg.confirmError}
                      </div>
                    )}
                    <button
                      className="confirm-btn"
                      onClick={() => confirmarTitulo(msg.id, msg.pendingTitulo!)}
                      disabled={msg.confirmStatus === 'loading'}
                      style={{
                        width: '100%', padding: '10px',
                        background: msg.confirmStatus === 'loading' ? 'var(--surface)' : 'var(--accent)',
                        color: msg.confirmStatus === 'loading' ? 'var(--muted)' : '#141414',
                        border: 'none', borderRadius: '6px',
                        fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600,
                        cursor: msg.confirmStatus === 'loading' ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {msg.confirmStatus === 'loading' ? 'Consultando SUNARP...' : '✓ Confirmar y agregar'}
                    </button>
                  </div>
                )}

                {msg.confirmStatus === 'success' && msg.addedTitulo && (
                  <div style={{
                    marginTop: '10px', padding: '8px 12px',
                    background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
                    borderRadius: '6px', fontFamily: 'var(--font-body)', fontSize: '12px', color: '#166534',
                  }}>
                    ✅ Agregado · Estado: <strong>{msg.addedTitulo.estado}</strong>{' · '}
                    <Link href="/dashboard/siguelo" style={{ color: '#166534', fontWeight: 600 }}>Ver títulos →</Link>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <div style={{
                width: '26px', height: '26px', flexShrink: 0,
                background: 'var(--accent)', borderRadius: '6px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-display)', fontSize: '12px', fontWeight: 700, color: '#141414',
              }}>A</div>
              <div style={{
                padding: '12px 16px',
                background: 'var(--surface)', border: '1px solid var(--line)',
                borderRadius: '3px 14px 14px 14px',
                display: 'flex', alignItems: 'center', gap: '4px',
              }}>
                <span className="modal-dot" />
                <span className="modal-dot" />
                <span className="modal-dot" />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{
          borderTop: '1px solid var(--line)',
          padding: '12px 20px 14px',
          background: 'var(--paper)', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Continúa la conversación..."
              rows={1}
              style={{
                flex: 1, padding: '10px 14px',
                border: '1.5px solid var(--line)', borderRadius: '10px',
                outline: 'none', background: 'var(--paper)',
                fontFamily: 'var(--font-body)', fontSize: '14px',
                color: 'var(--ink)', lineHeight: 1.5,
                resize: 'none', boxSizing: 'border-box',
                maxHeight: '100px', overflowY: 'auto',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = 'rgba(194,164,109,0.55)' }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--line)' }}
            />
            <button
              className="modal-send"
              onClick={send}
              disabled={!input.trim() || loading}
              style={{
                width: '38px', height: '38px', flexShrink: 0,
                background: input.trim() && !loading ? 'var(--accent)' : 'var(--surface)',
                color: input.trim() && !loading ? '#141414' : 'var(--muted)',
                border: `1px solid ${input.trim() && !loading ? 'var(--accent)' : 'var(--line)'}`,
                borderRadius: '8px',
                cursor: input.trim() && !loading ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
