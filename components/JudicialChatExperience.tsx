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
  const [messages, setMessages] = useState<Message[]>([])
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

  const active = !!input.trim()

  return (
    <>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        .judicial-qbox:focus-within { border-color: rgba(194,164,109,0.55) !important; box-shadow: 0 4px 32px rgba(194,164,109,0.08), 0 2px 20px rgba(0,0,0,0.05) !important; }
        .judicial-chip { display: inline-flex; align-items: center; gap: 8px; padding: 9px 18px; background: var(--surface); border: 1px solid var(--line); border-radius: 100px; font-family: var(--font-body); font-size: 13px; font-weight: 500; color: var(--ink); text-decoration: none; transition: background 0.15s, border-color 0.15s; white-space: nowrap; cursor: pointer; }
        .judicial-chip:hover { background: rgba(194,164,109,0.1); border-color: rgba(194,164,109,0.4); }
        .judicial-send { transition: background 0.2s, color 0.2s, opacity 0.2s, border-color 0.2s; }
        .judicial-send:hover:not(:disabled) { opacity: 0.82; }
        @media (max-width: 640px) { .judicial-home { padding: 40px 20px 60px !important; } }
      `}</style>
      <div className="judicial-home" style={{ padding: '64px 48px 80px', background: 'var(--paper)', minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '5px 14px', background: 'rgba(194,164,109,0.1)', border: '1px solid rgba(194,164,109,0.3)', borderRadius: '100px', fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--accent)', marginBottom: '22px', animation: 'fadeUp 0.45s ease forwards' }}>
          Arthur AI · Poder Judicial
        </div>
        <h1 style={{ fontFamily: 'var(--font-body)', fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 600, color: 'var(--ink)', lineHeight: 1.15, letterSpacing: '-0.01em', textAlign: 'center', marginBottom: '14px', animation: 'fadeUp 0.45s ease 0.04s both' }}>
          Tu proceso judicial, en un solo lugar.
        </h1>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '16px', color: 'var(--muted)', lineHeight: 1.6, textAlign: 'center', maxWidth: '560px', margin: '0 0 36px', animation: 'fadeUp 0.45s ease 0.08s both' }}>
          Analiza expedientes, prepara estrategias y redacta documentos con inteligencia artificial.
        </p>
        <div style={{ width: '100%', maxWidth: '760px', marginBottom: '14px', animation: 'fadeUp 0.45s ease 0.12s both' }}>
          <div className="judicial-qbox" style={{ border: '1.5px solid var(--line)', borderRadius: '16px', background: 'var(--paper)', boxShadow: '0 2px 20px rgba(0,0,0,0.05)', overflow: 'hidden', transition: 'border-color 0.2s, box-shadow 0.2s' }}>
            <textarea value={input} onChange={event => setInput(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void sendMessage() } }} placeholder="Escribe una pregunta o dime qué necesitas hacer..." rows={3} style={{ width: '100%', padding: '20px 24px 10px', border: 'none', outline: 'none', background: 'transparent', fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--ink)', lineHeight: 1.65, resize: 'none', boxSizing: 'border-box', display: 'block' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px 14px', borderTop: '1px solid var(--line-faint)' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.65 }}>Enter para enviar</span>
              <button className="judicial-send" onClick={() => void sendMessage()} disabled={!active || isTyping} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 22px', background: active && !isTyping ? 'var(--accent)' : 'var(--surface)', color: active && !isTyping ? '#141414' : 'var(--muted)', border: `1px solid ${active && !isTyping ? 'var(--accent)' : 'var(--line)'}`, borderRadius: '8px', fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600, cursor: active && !isTyping ? 'pointer' : 'default' }}>
                Consultar
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </button>
            </div>
          </div>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '11.5px', color: 'var(--muted)', textAlign: 'center', marginTop: '11px', opacity: 0.6 }}>Arthur AI puede cometer errores. Verifica la información importante.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap', animation: 'fadeUp 0.45s ease 0.18s both' }}>
          {[
            ['📋', 'Analizar expediente'],
            ['📄', 'Resumir resolución'],
            ['⚖️', 'Estrategia procesal'],
          ].map(([icon, label]) => <button key={label} className="judicial-chip" type="button" onClick={() => setInput(label)}><span>{icon}</span><span>{label}</span></button>)}
        </div>
        {messages.length > 0 && (
          <div ref={endRef} style={{ width: '100%', maxWidth: '760px', marginTop: '28px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {messages.map((message, index) => <div key={`${message.role}-${index}`} style={{ alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '86%', padding: '13px 16px', borderRadius: '8px', background: message.role === 'user' ? 'rgba(194,164,109,0.12)' : 'var(--surface)', border: '1px solid var(--line)', color: 'var(--ink)', fontFamily: 'var(--font-body)', fontSize: '14px', lineHeight: 1.6 }}>{message.role === 'assistant' ? <SimpleMarkdown text={message.content} /> : message.content}</div>)}
            {isTyping && <div style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontSize: '11px', textTransform: 'uppercase' }}>Analizando tu consulta...</div>}
          </div>
        )}
      </div>
    </>
  )
}
