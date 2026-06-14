'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { DatosJGA, SeccionActa } from '@/lib/document-intelligence/types'
import type { CambioRealizado, ChatMessage } from '@/lib/legal/jga/chat-acta-service'

const QUICK_CHIPS = [
  'Agregar punto de agenda',
  'Modificar accionistas',
  'Agregar poderes',
  'Cambiar montos',
  'Revisar redacción',
] as const

type JgaChatWidgetProps = {
  secciones: SeccionActa[]
  datos: DatosJGA
  onSeccionesUpdate: (secciones: SeccionActa[], cambios: CambioRealizado[]) => void
}

function ChatIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
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

type DrawerContentProps = {
  secciones: SeccionActa[]
  datos: DatosJGA
  onSeccionesUpdate: (secciones: SeccionActa[], cambios: CambioRealizado[]) => void
  onClose: () => void
}

function JgaChatDrawerContent({ secciones, datos, onSeccionesUpdate, onClose }: DrawerContentProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  const sendMessage = useCallback(
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
        const res = await fetch('/api/documentos/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: nextMessages,
            acta_actual: { secciones, datos_jga: datos },
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Error al procesar la solicitud')

        const assistantMessage: ChatMessage = { role: 'assistant', content: data.message }
        setMessages([...nextMessages, assistantMessage])
        const cambios = (data.cambios_realizados ?? []) as CambioRealizado[]
        onSeccionesUpdate(data.secciones_actualizadas, cambios)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error')
        setInput(trimmed)
      } finally {
        setLoading(false)
      }
    },
    [datos, loading, messages, onSeccionesUpdate, secciones],
  )

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: '#111111',
      }}
    >
      <div
        style={{
          height: 52,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          background: '#0a0a0a',
          borderBottom: '1px solid rgba(201, 168, 76, 0.1)',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: '#c9a84c',
          }}
        >
          Chat IA
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar chat"
          style={{
            width: 32,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: '1px solid rgba(201, 168, 76, 0.2)',
            color: '#c9a84c',
            cursor: 'pointer',
            borderRadius: 0,
          }}
          onMouseOver={e => {
            e.currentTarget.style.background = 'rgba(201, 168, 76, 0.1)'
          }}
          onMouseOut={e => {
            e.currentTarget.style.background = 'transparent'
          }}
        >
          <CloseIcon />
        </button>
      </div>

      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {messages.length === 0 && (
          <p
            style={{
              fontSize: 13,
              fontFamily: 'var(--font-body)',
              color: 'rgba(255,255,255,0.45)',
              margin: 0,
              lineHeight: 1.6,
            }}
          >
            Describe qué quieres agregar o modificar en el acta. La IA actualizará el preview en tiempo real.
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
              background: m.role === 'user' ? 'rgba(201, 168, 76, 0.1)' : 'rgba(255,255,255,0.03)',
              border: m.role === 'user' ? '1px solid rgba(201, 168, 76, 0.2)' : 'none',
              borderLeft: m.role === 'assistant' ? '2px solid #c9a84c' : undefined,
              borderRadius: 0,
              color: 'rgba(255,255,255,0.85)',
            }}
          >
            {m.content}
          </div>
        ))}
        {loading && (
          <div
            style={{
              alignSelf: 'flex-start',
              color: 'rgba(201, 168, 76, 0.75)',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            Analizando...
          </div>
        )}
      </div>

      {error && (
        <p style={{ margin: '0 16px 8px', fontSize: 12, color: '#c0392b' }}>{error}</p>
      )}

      <div
        style={{
          flexShrink: 0,
          display: 'flex',
          gap: 8,
          overflowX: 'auto',
          padding: '8px 16px',
        }}
      >
        {QUICK_CHIPS.map(chip => (
          <button
            key={chip}
            type="button"
            disabled={loading}
            onClick={() => setInput(prev => (prev ? `${prev} ${chip}` : chip))}
            style={{
              flexShrink: 0,
              background: 'transparent',
              border: '1px solid rgba(201, 168, 76, 0.2)',
              color: '#c9a84c',
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              padding: '6px 12px',
              cursor: 'pointer',
              borderRadius: 0,
            }}
            onMouseOver={e => {
              e.currentTarget.style.background = 'rgba(201, 168, 76, 0.1)'
            }}
            onMouseOut={e => {
              e.currentTarget.style.background = 'transparent'
            }}
          >
            {chip}
          </button>
        ))}
      </div>

      <div
        style={{
          flexShrink: 0,
          borderTop: '1px solid rgba(201, 168, 76, 0.1)',
          padding: '12px 16px',
          background: '#0a0a0a',
        }}
      >
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <textarea
            style={{
              flex: 1,
              background: '#0a0a0a',
              border: '1px solid rgba(201, 168, 76, 0.2)',
              color: 'rgba(255,255,255,0.85)',
              padding: '10px 12px',
              fontSize: 13,
              fontFamily: 'var(--font-body)',
              lineHeight: 1.5,
              borderRadius: 0,
              outline: 'none',
              resize: 'vertical',
              maxHeight: 120,
              minHeight: 44,
            }}
            value={input}
            disabled={loading}
            placeholder="Describe qué agregar o modificar..."
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void sendMessage(input)
              }
            }}
          />
          <button
            type="button"
            disabled={loading || !input.trim()}
            onClick={() => void sendMessage(input)}
            style={{
              width: 40,
              height: 40,
              flexShrink: 0,
              background: '#c9a84c',
              color: '#0a0a0a',
              border: 'none',
              cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
              opacity: loading || !input.trim() ? 0.5 : 1,
              borderRadius: 0,
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

export default function JgaChatWidget({ secciones, datos, onSeccionesUpdate }: JgaChatWidgetProps) {
  const [open, setOpen] = useState(false)
  const [pendingChanges, setPendingChanges] = useState(0)
  const [unreviewedCount, setUnreviewedCount] = useState(0)
  const [isMobile, setIsMobile] = useState(false)
  const [hoverBubble, setHoverBubble] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  const handleOpen = () => {
    setOpen(true)
    setPendingChanges(0)
    setUnreviewedCount(0)
  }

  const handleClose = () => {
    setOpen(false)
    setPendingChanges(unreviewedCount)
  }

  const handleSeccionesUpdate = useCallback(
    (updated: SeccionActa[], cambios: CambioRealizado[]) => {
      onSeccionesUpdate(updated, cambios)
      const count = cambios.length > 0 ? cambios.length : 1
      setUnreviewedCount(count)
      if (!open) setPendingChanges(count)
    },
    [onSeccionesUpdate, open],
  )

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={handleOpen}
          aria-label="Abrir chat IA"
          onMouseEnter={() => setHoverBubble(true)}
          onMouseLeave={() => setHoverBubble(false)}
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            width: 56,
            height: 56,
            zIndex: 50,
            background: hoverBubble ? '#d4b35a' : '#c9a84c',
            color: '#0a0a0a',
            border: 'none',
            cursor: 'pointer',
            borderRadius: 0,
            boxShadow: '0 4px 20px rgba(201, 168, 76, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.15s ease',
          }}
        >
          <ChatIcon />
          {pendingChanges > 0 && (
            <span
              style={{
                position: 'absolute',
                top: -4,
                right: -4,
                width: 18,
                height: 18,
                borderRadius: '50%',
                background: '#c0392b',
                color: '#fff',
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: 1,
              }}
            >
              {pendingChanges > 9 ? '9+' : pendingChanges}
            </span>
          )}
        </button>
      )}

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
        onClick={handleClose}
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
          borderLeft: '1px solid rgba(201, 168, 76, 0.15)',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 300ms ease-out',
          pointerEvents: open ? 'auto' : 'none',
        }}
        onClick={e => e.stopPropagation()}
      >
        <JgaChatDrawerContent
          secciones={secciones}
          datos={datos}
          onSeccionesUpdate={handleSeccionesUpdate}
          onClose={handleClose}
        />
      </div>
    </>
  )
}
