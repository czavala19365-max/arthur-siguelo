'use client'

import { useEffect, useRef, useState } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const quickPrompts = [
  'Necesito redactar un escrito judicial.',
  'Quiero analizar un caso y sus riesgos legales.',
  'Necesito resumir un expediente y proponer estrategia.',
]

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^\)]+\))/g)

  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={index}>{part.slice(2, -2)}</strong>
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <code
              key={index}
              style={{
                background: 'rgba(194,164,109,0.12)',
                color: 'var(--accent)',
                padding: '2px 6px',
                borderRadius: '4px',
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
              }}
            >
              {part.slice(1, -1)}
            </code>
          )
        }
        const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
        if (linkMatch) {
          const [, label, href] = linkMatch
          return (
            <a key={index} href={href} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>
              {label}
            </a>
          )
        }
        return <span key={index}>{part}</span>
      })}
    </>
  )
}

function SimpleMarkdown({ text }: { text: string }) {
  const lines = text.split('\n')

  return (
    <div style={{ fontFamily: 'var(--font-body)', fontSize: '14px', lineHeight: 1.75, color: 'var(--ink)' }}>
      {lines.map((line, index) => {
        const trimmed = line.trim()

        if (!trimmed) {
          return <div key={index} style={{ height: '8px' }} />
        }

        if (trimmed.startsWith('### ')) {
          return <h3 key={index} style={{ margin: '14px 0 8px', fontSize: '15px', fontWeight: 700, fontFamily: 'var(--font-body)' }}>{trimmed.slice(4)}</h3>
        }

        if (trimmed.startsWith('## ')) {
          return <h2 key={index} style={{ margin: '16px 0 8px', fontSize: '16px', fontWeight: 700, fontFamily: 'var(--font-body)' }}>{trimmed.slice(3)}</h2>
        }

        if (trimmed.startsWith('# ')) {
          return <h1 key={index} style={{ margin: '18px 0 10px', fontSize: '18px', fontWeight: 700, fontFamily: 'var(--font-body)' }}>{trimmed.slice(2)}</h1>
        }

        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <div key={index} style={{ display: 'flex', gap: '10px', margin: '6px 0' }}>
              <span style={{ color: 'var(--accent)', fontWeight: 700 }}>•</span>
              <div style={{ flex: 1 }}>{renderInline(trimmed.slice(2))}</div>
            </div>
          )
        }

        if (/^\d+\. /.test(trimmed)) {
          return (
            <div key={index} style={{ display: 'flex', gap: '10px', margin: '6px 0' }}>
              <span style={{ color: 'var(--muted)', fontWeight: 700 }}>{trimmed.match(/^\d+\./)?.[0]}</span>
              <div style={{ flex: 1 }}>{renderInline(trimmed.replace(/^\d+\.\s*/, ''))}</div>
            </div>
          )
        }

        return <p key={index} style={{ margin: '0 0 8px', whiteSpace: 'pre-wrap' }}>{renderInline(trimmed)}</p>
      })}
    </div>
  )
}

export default function JudicialChatExperience() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        'Buenos días. Estoy aquí para apoyar en análisis, estrategia y redacción jurídica. Puede indicarme el asunto, el expediente o el tipo de requerimiento que necesita resolver.',
    },
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  async function sendMessage(textOverride?: string) {
    const value = (textOverride ?? input).trim()
    if (!value || isTyping) return

    const userMessage: Message = { role: 'user', content: value }
    const nextMessages = [...messages, userMessage]
    setMessages(nextMessages)
    setInput('')
    setIsTyping(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages.map(message => ({ role: message.role, content: message.content })) }),
      })

      const data = await res.json() as { text?: string; message?: string; error?: string }
      const reply = data.text ?? data.message ?? data.error ?? 'No hay respuesta disponible en este momento.'

      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'No se pudo conectar con el asistente. Inténtelo nuevamente.' }])
    } finally {
      setIsTyping(false)
    }
  }

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes dotPulse {
          0%, 80%, 100% { opacity: 0.35; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
        .judicial-chat-input:focus {
          border-color: rgba(194,164,109,0.7) !important;
          box-shadow: 0 0 0 4px rgba(194,164,109,0.10) !important;
        }
        .judicial-chip:hover {
          border-color: rgba(194,164,109,0.45) !important;
          background: rgba(194,164,109,0.06) !important;
        }
      `}</style>

      <div
        style={{
          minHeight: '100vh',
          background: 'var(--paper)',
          color: 'var(--ink)',
          display: 'flex',
          flexDirection: 'column',
          animation: 'fadeUp 0.35s ease',
        }}
      >
        <div
          style={{
            borderBottom: '1px solid var(--line)',
            background: 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(8px)',
            padding: '20px 32px',
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          <div
            style={{
              maxWidth: '980px',
              margin: '0 auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '20px',
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.14em',
                  color: 'var(--accent)',
                  marginBottom: '8px',
                }}
              >
                Arthur AI · Judicial
              </div>
              <h1
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(28px, 3vw, 38px)',
                  margin: 0,
                  fontWeight: 600,
                  letterSpacing: '-0.04em',
                  color: 'var(--ink)',
                }}
              >
                Asistente legal
              </h1>
            </div>

            <button
              type="button"
              onClick={() => setMessages([{ role: 'assistant', content: 'Buenas tardes. Estoy aquí para apoyar en análisis, estrategia y redacción jurídica. Puede indicarme el asunto, el expediente o el tipo de requerimiento que necesita resolver.' }])}
              style={{
                background: 'transparent',
                border: '1px solid var(--line)',
                color: 'var(--ink)',
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                padding: '10px 16px',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              Nueva conversación
            </button>
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '32px 20px 24px' }}>
          <div style={{ width: '100%', maxWidth: '980px' }}>
            {messages.length === 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
                
              </div>
            )}

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '18px',
                minHeight: '380px',
              }}
            >
              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  style={{
                    display: 'flex',
                    justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                  }}
                >
                  {message.role === 'assistant' ? (
                    <div
                      style={{
                        maxWidth: '820px',
                        width: '100%',
                        background: 'rgba(194,164,109,0.04)',
                        border: '1px solid rgba(194,164,109,0.18)',
                        borderLeft: '4px solid var(--accent)',
                        borderRadius: '14px',
                        padding: '18px 18px 16px',
                        boxShadow: '0 12px 28px rgba(20,20,20,0.03)',
                      }}
                    >
                      <div
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '10px',
                          letterSpacing: '0.12em',
                          textTransform: 'uppercase',
                          color: 'var(--muted)',
                          marginBottom: '10px',
                        }}
                      >
                        Arthur IA
                      </div>
                      <SimpleMarkdown text={message.content} />
                    </div>
                  ) : (
                    <div
                      style={{
                        maxWidth: '720px',
                        background: 'var(--ink)',
                        color: 'var(--paper)',
                        borderRadius: '14px',
                        padding: '14px 18px',
                        boxShadow: '0 12px 28px rgba(20,20,20,0.08)',
                      }}
                    >
                      <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'var(--font-body)', fontSize: '14px', lineHeight: 1.7 }}>
                        {message.content}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {isTyping && (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div
                    style={{
                      width: '220px',
                      background: 'rgba(194,164,109,0.04)',
                      border: '1px solid rgba(194,164,109,0.18)',
                      borderLeft: '4px solid var(--accent)',
                      borderRadius: '14px',
                      padding: '16px 18px',
                    }}
                  >
                    <div
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '10px',
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        color: 'var(--muted)',
                        marginBottom: '10px',
                      }}
                    >
                      Arthur IA
                    </div>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      {[0, 1, 2].map(item => (
                        <div
                          key={item}
                          style={{
                            width: '7px',
                            height: '7px',
                            borderRadius: '50%',
                            background: 'var(--accent)',
                            animation: 'dotPulse 1.1s infinite',
                            animationDelay: `${item * 0.15}s`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div ref={endRef} />
          </div>
        </div>

        <div
          style={{
            position: 'sticky',
            bottom: 0,
            background: 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(10px)',
            borderTop: '1px solid var(--line)',
            padding: '18px 20px 26px',
          }}
        >
          <div style={{ maxWidth: '980px', margin: '0 auto' }}>
            <div
              style={{
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-end',
              }}
            >
              <textarea
                value={input}
                onChange={event => setInput(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    void sendMessage()
                  }
                }}
                rows={3}
                placeholder="Escriba su consulta jurídica..."
                className="judicial-chat-input"
                style={{
                  flex: 1,
                  resize: 'none',
                  border: '1px solid var(--line)',
                  borderRadius: '12px',
                  background: 'var(--surface)',
                  color: 'var(--ink)',
                  fontFamily: 'var(--font-body)',
                  fontSize: '15px',
                  lineHeight: 1.7,
                  padding: '14px 16px',
                  outline: 'none',
                  minHeight: '76px',
                }}
              />

              <button
                type="button"
                onClick={() => void sendMessage()}
                disabled={!input.trim() || isTyping}
                style={{
                  border: 'none',
                  background: input.trim() && !isTyping ? 'var(--accent)' : 'var(--surface)',
                  color: input.trim() && !isTyping ? '#141414' : 'var(--muted)',
                  borderRadius: '12px',
                  padding: '14px 22px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  cursor: input.trim() && !isTyping ? 'pointer' : 'not-allowed',
                  minWidth: '120px',
                  height: '76px',
                }}
              >
                Enviar
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
