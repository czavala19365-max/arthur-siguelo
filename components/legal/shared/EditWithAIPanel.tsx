'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChatMessage } from '@/lib/legal/edit-with-ai/edit-service'
import type { CambioDrafter, SeccionDrafter } from '@/lib/legal/drafter/types'

const QUICK_CHIPS = [
  'Hazlo bilateral',
  'Agrega cláusula de confidencialidad',
  'Elimina arbitraje',
  'Convierte la jurisdicción en Lima',
  'Hazlo más favorable para mi cliente',
] as const

interface EditWithAIPanelProps {
  documentId: string
  sections: SeccionDrafter[]
  onSectionsUpdate: (sections: SeccionDrafter[], cambios: CambioDrafter[]) => void
  open: boolean
  onClose: () => void
}

function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}

function EditPanelContent({ documentId, sections, onSectionsUpdate, onClose }: EditWithAIPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  const sendInstruction = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || loading) return

      const userMessage: ChatMessage = { role: 'user', content: trimmed }
      const nextMessages = [...messages, userMessage]
      setMessages(nextMessages)
      setInput('')
      setError('')
      setLoading(true)

      try {
        const res = await fetch('/api/legal/drafter/refine', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            documentId,
            sections,
            instruction: trimmed,
            messages: nextMessages,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Error al procesar la solicitud')

        const assistantMessage: ChatMessage = { role: 'assistant', content: data.message }
        setMessages([...nextMessages, assistantMessage])
        onSectionsUpdate(data.sections, data.cambios_realizados ?? [])
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error')
        setInput(trimmed)
      } finally {
        setLoading(false)
      }
    },
    [documentId, loading, messages, onSectionsUpdate, sections],
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--paper)' }}>
      <div
        style={{
          height: 52,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          background: 'var(--surface)',
          borderBottom: '1px solid var(--line)',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: 'var(--accent)',
          }}
        >
          Editar con IA
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          style={{
            width: 32,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: '1px solid var(--line)',
            color: 'var(--accent)',
            cursor: 'pointer',
          }}
        >
          <CloseIcon />
        </button>
      </div>

      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.length === 0 && (
          <p style={{ fontSize: 13, fontFamily: 'var(--font-body)', color: 'var(--muted)', margin: 0, lineHeight: 1.6 }}>
            Describe qué quieres cambiar en el documento (ej. &quot;hazlo bilateral&quot;, &quot;agrega cláusula de
            confidencialidad&quot;). Arthur modifica solo lo necesario, sin regenerar todo desde cero.
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '85%',
              padding: '12px 16px',
              fontSize: 13,
              fontFamily: 'var(--font-body)',
              lineHeight: 1.6,
              background: m.role === 'user' ? 'var(--surface)' : 'transparent',
              border: m.role === 'user' ? '1px solid var(--line)' : 'none',
              borderLeft: m.role === 'assistant' ? '2px solid var(--accent)' : undefined,
              color: 'var(--ink)',
            }}
          >
            {m.content}
          </div>
        ))}
        {loading && (
          <div style={{ alignSelf: 'flex-start', color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Analizando...
          </div>
        )}
      </div>

      {error && <p style={{ margin: '0 16px 8px', fontSize: 12, color: '#b91c1c' }}>{error}</p>}

      <div style={{ flexShrink: 0, display: 'flex', gap: 8, overflowX: 'auto', padding: '8px 16px' }}>
        {QUICK_CHIPS.map(chip => (
          <button
            key={chip}
            type="button"
            disabled={loading}
            onClick={() => setInput(prev => (prev ? `${prev} ${chip}` : chip))}
            style={{
              flexShrink: 0,
              background: 'transparent',
              border: '1px solid var(--line)',
              color: 'var(--accent)',
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              padding: '6px 12px',
              cursor: 'pointer',
            }}
          >
            {chip}
          </button>
        ))}
      </div>

      <div style={{ flexShrink: 0, borderTop: '1px solid var(--line)', padding: '12px 16px', background: 'var(--surface)' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <textarea
            style={{
              flex: 1,
              background: 'var(--paper)',
              border: '1px solid var(--line)',
              color: 'var(--ink)',
              padding: '10px 12px',
              fontSize: 13,
              fontFamily: 'var(--font-body)',
              lineHeight: 1.5,
              outline: 'none',
              resize: 'vertical',
              maxHeight: 120,
              minHeight: 44,
            }}
            value={input}
            disabled={loading}
            placeholder="Describe qué modificar..."
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void sendInstruction(input)
              }
            }}
          />
          <button
            type="button"
            disabled={loading || !input.trim()}
            onClick={() => void sendInstruction(input)}
            style={{
              width: 40,
              height: 40,
              flexShrink: 0,
              background: 'var(--accent)',
              color: '#141414',
              border: 'none',
              cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
              opacity: loading || !input.trim() ? 0.5 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label="Enviar"
          >
            <SendIcon />
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Componente controlado (open/onClose vienen del padre) para poder compartir
 * una única instancia entre varios documentos generados a la vez, en vez de
 * montar un botón flotante por documento.
 */
export default function EditWithAIPanel(props: EditWithAIPanelProps) {
  const { open, onClose } = props
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  return (
    <>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.4)',
          zIndex: 50,
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 300ms ease-out',
        }}
        onClick={onClose}
        aria-hidden={!open}
      />

      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: isMobile ? '100vw' : 420,
          zIndex: 51,
          borderLeft: '1px solid var(--line)',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 300ms ease-out',
          pointerEvents: open ? 'auto' : 'none',
        }}
        onClick={e => e.stopPropagation()}
      >
        <EditPanelContent {...props} />
      </div>
    </>
  )
}
