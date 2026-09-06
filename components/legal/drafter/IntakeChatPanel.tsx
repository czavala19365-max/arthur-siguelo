'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { legalStyles } from '@/lib/legal/styles'
import type { ChatMessage } from '@/lib/legal/edit-with-ai/edit-service'
import type { DocumentTypeId } from '@/lib/legal/drafter/form-schemas'

interface IntakeChatPanelProps {
  documentType: DocumentTypeId
  jurisdiction: string
  fields: Record<string, string>
  onFieldsUpdate: (fields: Record<string, string>) => void
  completedRequired: number
  totalRequired: number
}

export default function IntakeChatPanel({
  documentType,
  jurisdiction,
  fields,
  onFieldsUpdate,
  completedRequired,
  totalRequired,
}: IntakeChatPanelProps) {
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
        const res = await fetch('/api/legal/drafter/intake', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            documentType,
            jurisdiction,
            fields,
            messages,
            instruction: trimmed,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Error al procesar la solicitud')

        const assistantMessage: ChatMessage = { role: 'assistant', content: data.message }
        setMessages([...nextMessages, assistantMessage])
        onFieldsUpdate(data.fields ?? fields)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error')
        setInput(trimmed)
      } finally {
        setLoading(false)
      }
    },
    [documentType, jurisdiction, fields, loading, messages, onFieldsUpdate],
  )

  return (
    <div style={legalStyles.card}>
      {totalRequired > 0 && (
        <div style={{ marginBottom: 16, fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)' }}>
          {completedRequired} de {totalRequired} campos requeridos completos
        </div>
      )}

      <div ref={scrollRef} style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 420, overflowY: 'auto', marginBottom: 16 }}>
        {messages.length === 0 && (
          <p style={{ fontSize: 13, fontFamily: 'var(--font-body)', color: 'var(--muted)', margin: 0, lineHeight: 1.6 }}>
            Describe el negocio en tus palabras (ej. &quot;voy a prestar S/50,000 a una empresa, con 12% de interés&quot;).
            Arthur completará los campos automáticamente y solo preguntará por lo que falte.
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

      {error && <p style={{ fontSize: 12, color: '#b91c1c', marginBottom: 12 }}>{error}</p>}

      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <textarea
          rows={2}
          style={legalStyles.textarea}
          value={input}
          disabled={loading}
          placeholder="Describe el negocio..."
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
          style={{ ...legalStyles.btnPrimary, opacity: loading || !input.trim() ? 0.6 : 1 }}
          disabled={loading || !input.trim()}
          onClick={() => void sendMessage(input)}
        >
          Enviar
        </button>
      </div>
    </div>
  )
}
