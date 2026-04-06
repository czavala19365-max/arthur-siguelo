'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

// ── Types ───────────────────────────────────────────────────────────────────

type TituloData = {
  oficina_registral: string
  anio_titulo: string
  numero_titulo: string
  nombre_cliente: string
  email_cliente: string
}

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string            // display text (marker stripped)
  pendingTitulo?: TituloData // extracted from [[CONFIRMAR_TITULO:...]]
  addedTitulo?: { estado: string; id: string }
  confirmStatus?: 'idle' | 'loading' | 'success' | 'error'
  confirmError?: string
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const MARKER_RE = /\[\[CONFIRMAR_TITULO:(\{[^}]*\})\]\]/

function parseMessage(raw: string): { content: string; pendingTitulo?: TituloData } {
  const match = raw.match(MARKER_RE)
  if (!match) return { content: raw.trim() }
  try {
    const pendingTitulo = JSON.parse(match[1]) as TituloData
    return { content: raw.replace(MARKER_RE, '').trim(), pendingTitulo }
  } catch {
    return { content: raw.replace(MARKER_RE, '').trim() }
  }
}

function uid() {
  return Math.random().toString(36).slice(2)
}

const WELCOME: Message = {
  id: 'welcome',
  role: 'assistant',
  content: 'Hola, soy **Arthur**. ¿En qué puedo ayudarte hoy?\n\nPuedo responder consultas legales sobre SUNARP, ayudarte a dar seguimiento a un título registral, o guiarte en cualquier trámite registral.',
}

const QUICK_PROMPTS = [
  { label: '📋 Ver mis títulos',        text: '', href: '/dashboard/siguelo' },
  { label: '📅 Agenda de plazos',        text: '', href: '/dashboard/agenda' },
  { label: '⚖️ ¿Cómo subsanar una observación?', text: '¿Cuál es el procedimiento para subsanar una observación registral y cuál es el plazo?', href: '' },
]

// ── Message renderer ────────────────────────────────────────────────────────

function renderContent(text: string) {
  // Bold: **texto**
  const parts = text.split(/(\*\*[^*]+\*\*|\📖 Base legal:[^\n]+)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('📖 Base legal:')) {
      return (
        <span
          key={i}
          style={{
            display: 'block',
            marginTop: '10px',
            padding: '8px 12px',
            background: 'rgba(194,164,109,0.1)',
            borderLeft: '3px solid var(--accent)',
            fontFamily: 'var(--font-mono)',
            fontSize: '11.5px',
            color: 'var(--ink)',
            lineHeight: 1.5,
          }}
        >
          {part}
        </span>
      )
    }
    return <span key={i} style={{ whiteSpace: 'pre-wrap' }}>{part}</span>
  })
}

// ── Main component ──────────────────────────────────────────────────────────

export default function HomeDashboard() {
  const [messages, setMessages] = useState<Message[]>([WELCOME])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const bottomRef  = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLTextAreaElement>(null)

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function send(text?: string) {
    const q = (text ?? input).trim()
    if (!q || loading) return
    setInput('')

    const userMsg: Message = { id: uid(), role: 'user', content: q }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    try {
      const history = [...messages, userMsg]
        .filter(m => m.id !== 'welcome')
        .map(m => ({ role: m.role, content: m.content }))

      const res = await fetch('/api/dashboard/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      })
      const data = await res.json() as { text?: string; error?: string }
      const raw = data.text ?? data.error ?? 'Sin respuesta del servidor.'
      const { content, pendingTitulo } = parseMessage(raw)

      setMessages(prev => [...prev, {
        id: uid(),
        role: 'assistant',
        content,
        pendingTitulo,
        confirmStatus: pendingTitulo ? 'idle' : undefined,
      }])
    } catch {
      setMessages(prev => [...prev, {
        id: uid(),
        role: 'assistant',
        content: 'Error de conexión. Por favor intenta de nuevo.',
      }])
    } finally {
      setLoading(false)
    }
  }

  async function confirmarTitulo(msgId: string, data: TituloData) {
    setMessages(prev => prev.map(m =>
      m.id === msgId ? { ...m, confirmStatus: 'loading' } : m
    ))
    try {
      const res = await fetch('/api/siguelo/agregar-desde-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const result = await res.json() as { success?: boolean; id?: string; estado?: string; error?: string }
      if (result.success) {
        setMessages(prev => prev.map(m =>
          m.id === msgId
            ? { ...m, confirmStatus: 'success', addedTitulo: { estado: result.estado ?? 'REGISTRADO', id: result.id ?? '' } }
            : m
        ))
        // Confirmación en el chat
        setMessages(prev => [...prev, {
          id: uid(),
          role: 'assistant',
          content: `✅ Título agregado al seguimiento exitosamente.\n\nEstado obtenido de SUNARP: **${result.estado ?? 'SIN DATOS'}**\n\nRecibirás alertas automáticas cuando haya cambios en el estado del título.`,
        }])
      } else {
        setMessages(prev => prev.map(m =>
          m.id === msgId ? { ...m, confirmStatus: 'error', confirmError: result.error ?? 'Error al agregar' } : m
        ))
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error de conexión'
      setMessages(prev => prev.map(m =>
        m.id === msgId ? { ...m, confirmStatus: 'error', confirmError: msg } : m
      ))
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes blink {
          0%, 80%, 100% { opacity: 0; }
          40%           { opacity: 1; }
        }
        .typing-dot {
          display: inline-block; width: 6px; height: 6px;
          border-radius: 50%; background: var(--muted);
          animation: blink 1.4s infinite ease-in-out both;
        }
        .typing-dot:nth-child(2) { animation-delay: 0.2s; }
        .typing-dot:nth-child(3) { animation-delay: 0.4s; }
        .msg-bubble { animation: fadeUp 0.25s ease forwards; }
        .quick-pill {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 7px 14px;
          background: var(--surface); border: 1px solid var(--line);
          border-radius: 100px;
          font-family: var(--font-body); font-size: 12px; font-weight: 500;
          color: var(--ink); text-decoration: none; cursor: pointer;
          white-space: nowrap;
          transition: background 0.15s, border-color 0.15s;
        }
        .quick-pill:hover {
          background: rgba(194,164,109,0.1);
          border-color: rgba(194,164,109,0.4);
        }
        .send-btn {
          transition: background 0.2s, opacity 0.2s;
        }
        .send-btn:hover:not(:disabled) { opacity: 0.82; }
        .confirm-btn {
          transition: background 0.15s, opacity 0.15s;
        }
        .confirm-btn:hover:not(:disabled) { opacity: 0.82; }
      `}</style>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: 'var(--paper)',
        overflow: 'hidden',
      }}>

        {/* ── Header ────────────────────────────────── */}
        <div style={{
          padding: '20px 32px 16px',
          borderBottom: '1px solid var(--line)',
          background: 'var(--paper)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '32px', height: '32px',
              background: 'var(--accent)',
              borderRadius: '8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-display)',
              fontSize: '16px', fontWeight: 700,
              color: '#141414',
              flexShrink: 0,
            }}>
              A
            </div>
            <div>
              <div style={{
                fontFamily: 'var(--font-body)',
                fontSize: 'clamp(15px, 2vw, 18px)',
                fontWeight: 600,
                color: 'var(--ink)',
                lineHeight: 1.2,
              }}>
                Todo SUNARP, en un solo lugar.
              </div>
              <div style={{
                fontFamily: 'var(--font-body)',
                fontSize: '12px',
                color: 'var(--muted)',
                marginTop: '2px',
              }}>
                Tu asistente legal registral con IA
              </div>
            </div>
          </div>
        </div>

        {/* ── Message list ──────────────────────────── */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px 32px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}>
          {messages.map(msg => (
            <div
              key={msg.id}
              className="msg-bubble"
              style={{
                display: 'flex',
                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                alignItems: 'flex-start',
                gap: '10px',
                maxWidth: '100%',
              }}
            >
              {/* Avatar */}
              {msg.role === 'assistant' && (
                <div style={{
                  width: '28px', height: '28px',
                  background: 'var(--accent)',
                  borderRadius: '6px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-display)',
                  fontSize: '13px', fontWeight: 700,
                  color: '#141414',
                  flexShrink: 0,
                  marginTop: '2px',
                }}>
                  A
                </div>
              )}

              {/* Bubble */}
              <div style={{
                maxWidth: msg.role === 'user' ? '72%' : '82%',
                padding: '12px 16px',
                background: msg.role === 'user'
                  ? 'rgba(194,164,109,0.15)'
                  : 'var(--surface)',
                border: `1px solid ${msg.role === 'user' ? 'rgba(194,164,109,0.3)' : 'var(--line)'}`,
                borderRadius: msg.role === 'user'
                  ? '16px 4px 16px 16px'
                  : '4px 16px 16px 16px',
                fontFamily: 'var(--font-body)',
                fontSize: '14px',
                color: 'var(--ink)',
                lineHeight: 1.65,
              }}>
                {renderContent(msg.content)}

                {/* Confirm title card */}
                {msg.pendingTitulo && msg.confirmStatus !== 'success' && (
                  <div style={{
                    marginTop: '14px',
                    padding: '12px 14px',
                    background: 'var(--paper)',
                    border: '1px solid var(--line)',
                    borderRadius: '8px',
                  }}>
                    <div style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '10px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      color: 'var(--accent)',
                      marginBottom: '10px',
                    }}>
                      Confirmar seguimiento
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px', marginBottom: '12px' }}>
                      {Object.entries({
                        Oficina: msg.pendingTitulo.oficina_registral,
                        Año: msg.pendingTitulo.anio_titulo,
                        Número: msg.pendingTitulo.numero_titulo,
                        Cliente: msg.pendingTitulo.nombre_cliente,
                        Email: msg.pendingTitulo.email_cliente,
                      }).map(([k, v]) => (
                        <div key={k}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', textTransform: 'uppercase', color: 'var(--muted)' }}>{k}</span>
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
                        width: '100%',
                        padding: '10px',
                        background: msg.confirmStatus === 'loading' ? 'var(--surface)' : 'var(--accent)',
                        color: msg.confirmStatus === 'loading' ? 'var(--muted)' : '#141414',
                        border: 'none',
                        borderRadius: '6px',
                        fontFamily: 'var(--font-body)',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: msg.confirmStatus === 'loading' ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {msg.confirmStatus === 'loading' ? 'Consultando SUNARP...' : '✓ Confirmar y agregar'}
                    </button>
                  </div>
                )}

                {/* Success state */}
                {msg.confirmStatus === 'success' && msg.addedTitulo && (
                  <div style={{
                    marginTop: '10px',
                    padding: '8px 12px',
                    background: 'rgba(34,197,94,0.1)',
                    border: '1px solid rgba(34,197,94,0.25)',
                    borderRadius: '6px',
                    fontFamily: 'var(--font-body)',
                    fontSize: '12px',
                    color: '#166534',
                  }}>
                    ✅ Agregado · Estado: <strong>{msg.addedTitulo.estado}</strong>
                    {' · '}
                    <Link href="/dashboard/siguelo" style={{ color: '#166534', fontWeight: 600 }}>
                      Ver títulos →
                    </Link>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <div style={{
                width: '28px', height: '28px',
                background: 'var(--accent)',
                borderRadius: '6px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-display)',
                fontSize: '13px', fontWeight: 700,
                color: '#141414', flexShrink: 0,
              }}>A</div>
              <div style={{
                padding: '12px 16px',
                background: 'var(--surface)',
                border: '1px solid var(--line)',
                borderRadius: '4px 16px 16px 16px',
                display: 'flex', alignItems: 'center', gap: '4px',
              }}>
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* ── Input area ────────────────────────────── */}
        <div style={{
          borderTop: '1px solid var(--line)',
          padding: '12px 32px 16px',
          background: 'var(--paper)',
          flexShrink: 0,
        }}>
          {/* Quick pills */}
          <div style={{
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap',
            marginBottom: '12px',
          }}>
            {QUICK_PROMPTS.map(p => (
              p.href
                ? <Link key={p.label} href={p.href} className="quick-pill">{p.label}</Link>
                : (
                  <button
                    key={p.label}
                    className="quick-pill"
                    onClick={() => send(p.text)}
                    disabled={loading}
                    style={{ border: 'none', fontFamily: 'var(--font-body)' }}
                  >
                    {p.label}
                  </button>
                )
            ))}
          </div>

          {/* Textarea + send */}
          <div style={{
            display: 'flex',
            gap: '10px',
            alignItems: 'flex-end',
          }}>
            <div style={{
              flex: 1,
              border: '1.5px solid var(--line)',
              borderRadius: '12px',
              background: 'var(--paper)',
              overflow: 'hidden',
              transition: 'border-color 0.2s',
            }}
              onFocus={() => {}}
              className="input-wrap"
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Pregunta sobre SUNARP o dime qué necesitas hacer..."
                rows={1}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  fontFamily: 'var(--font-body)',
                  fontSize: '14px',
                  color: 'var(--ink)',
                  lineHeight: 1.5,
                  resize: 'none',
                  boxSizing: 'border-box',
                  display: 'block',
                  maxHeight: '120px',
                  overflowY: 'auto',
                }}
              />
            </div>
            <button
              className="send-btn"
              onClick={() => send()}
              disabled={!input.trim() || loading}
              style={{
                width: '42px', height: '42px',
                flexShrink: 0,
                background: input.trim() && !loading ? 'var(--accent)' : 'var(--surface)',
                color: input.trim() && !loading ? '#141414' : 'var(--muted)',
                border: `1px solid ${input.trim() && !loading ? 'var(--accent)' : 'var(--line)'}`,
                borderRadius: '10px',
                cursor: input.trim() && !loading ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
          </div>
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: '11px',
            color: 'var(--muted)',
            textAlign: 'center',
            marginTop: '8px',
            opacity: 0.55,
          }}>
            Arthur AI puede cometer errores. Verifica la información importante.
          </p>
        </div>
      </div>
    </>
  )
}
