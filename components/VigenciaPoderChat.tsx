'use client'

import { useEffect, useRef, useState } from 'react'

type FormData = Record<string, string>
type Message = { role: 'user' | 'assistant'; content: string }
type SearchResponse = {
  resultados: Array<{ partida: string; razon: string; oficina: string }>
}

interface Props {
  formData: FormData
  onFormData: (data: FormData) => void
}

const FORM_DATA_RE = /\[\[FORM_DATA:([\s\S]*?)\]\]/

function normalizeChatData(data: FormData, userText: string, previousAssistantText: string, currentPartida: string): FormData {
  const normalized = { ...data }
  if (currentPartida) {
    normalized.numeroPartida = currentPartida
    normalized.numero = currentPartida
  }
  const isInitialBatch = /si se solicita por partida|partida, ficha o tomo|número de asiento/i.test(previousAssistantText)
  const isFichaReply = /\bficha\b/i.test(userText) && (isInitialBatch || userText.includes(','))
  const fichaNumber = userText.match(/\b[A-Z]?\d[A-Z0-9-]*\b/i)?.[0]

  if (isFichaReply && fichaNumber && !/asiento\s*[:#-]?\s*[A-Z0-9-]+/i.test(userText)) {
    if (!normalized.numeroPartida && !normalized.numero) {
      normalized.numeroPartida = fichaNumber
      normalized.numero = fichaNumber
    }
    normalized.numeroAsiento = fichaNumber
  }

  if (/número de asiento|numero de asiento/i.test(previousAssistantText)) {
    const asiento = userText.trim().match(/^\s*(?:asiento\s*)?([A-Z]?\d[A-Z0-9-]*)\s*$/i)?.[1]
    if (asiento) normalized.numeroAsiento = asiento
  }
  return normalized
}

function extractCompanyName(text: string): string | null {
  const clean = text.replace(/[¿?¡!]/g, ' ').trim()
  const patterns = [
    /vigencia\s+de\s+poder\s+(?:(?:de|para)\s+)?(.+)$/i,
    /(?:raz[oó]n\s+social|denominaci[oó]n|empresa)\s*(?:es|:)?\s*(.+)$/i,
  ]

  for (const pattern of patterns) {
    const match = clean.match(pattern)
    const company = match?.[1]?.trim().replace(/[,.;\s]+$/, '')
    if (company && company.length >= 3) return company
  }

  const isSimpleCompany = /^[a-záéíóúñ0-9][a-záéíóúñ0-9 .&-]+$/i.test(clean)
  const containsFormInstruction = /^(por|representante|cargo|oficina|partida|ficha|tomo|asiento|natural|jur[ií]dica?\b)/i.test(clean)
  return isSimpleCompany && !containsFormInstruction ? clean : null
}

async function searchCompany(company: string): Promise<SearchResponse | null> {
  const params = new URLSearchParams({ razon: company.toUpperCase(), siglas: '', pagina: '1' })
  const response = await fetch(`/api/personas-juridicas/buscar?${params}`)
  if (!response.ok) return null
  return await response.json() as SearchResponse
}

export default function VigenciaPoderChat({ formData, onFormData }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = messagesRef.current
    if (container) container.scrollTop = container.scrollHeight
  }, [messages, loading])

  async function send() {
    const text = input.trim()
    if (!text || loading) return

    const userMessage: Message = { role: 'user', content: text }
    const nextMessages = [...messages, userMessage]
    setMessages(nextMessages)
    setInput('')
    setLoading(true)

    try {
      const company = extractCompanyName(text)
      if (company) {
        const search = await searchCompany(company)
        const result = search?.resultados?.[0]
        if (result) {
          const updatedFormData = {
            ...formData,
            oficinaRegistral: result.oficina,
            numeroPartida: result.partida,
            numero: result.partida,
            razonSocial: result.razon,
          }
          onFormData(updatedFormData)

          const response = await fetch('/api/dashboard/publicidad-registral/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: nextMessages,
              formData: updatedFormData,
            }),
          })
          const data = await response.json() as { text?: string; error?: string }
          const raw = data.text ?? data.error ?? '¿Qué tipo de representante necesitas: natural o jurídico?'
          const match = raw.match(FORM_DATA_RE)
          if (match) {
            try {
              onFormData(normalizeChatData(JSON.parse(match[1]) as FormData, text, nextMessages[nextMessages.length - 2]?.content ?? '', updatedFormData.numeroPartida || updatedFormData.numero || ''))
            } catch { }
          }
          setMessages(current => [...current, {
            role: 'assistant',
            content: raw.replace(FORM_DATA_RE, '').trim(),
          }])
          return
        }
      }

      const response = await fetch('/api/dashboard/publicidad-registral/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages, formData }),
      })
      const data = await response.json() as { text?: string; error?: string }
      const raw = data.text ?? data.error ?? 'No recibí una respuesta.'
      const match = raw.match(FORM_DATA_RE)

      if (match) {
        try {
          onFormData(normalizeChatData(JSON.parse(match[1]) as FormData, text, nextMessages[nextMessages.length - 2]?.content ?? '', formData.numeroPartida || formData.numero || ''))
        } catch {
          // Keep the assistant response visible if the model returns invalid JSON.
        }
      }

      setMessages(current => [...current, {
        role: 'assistant',
        content: raw.replace(FORM_DATA_RE, '').trim(),
      }])
    } catch {
      setMessages(current => [...current, {
        role: 'assistant',
        content: 'No pude conectar con el asistente. Intenta nuevamente.',
      }])
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void send()
    }
  }

  return (
    <section className="vigencia-chat">
      <style>{`
        .vigencia-chat { border: 1px solid var(--line); background: var(--paper); margin-bottom: 24px; }
        .vigencia-chat__header { padding: 14px 18px; border-bottom: 1px solid var(--line); display: flex; align-items: center; gap: 10px; }
        .vigencia-chat__avatar { width: 28px; height: 28px; display: grid; place-items: center; background: var(--accent); color: #141414; border-radius: 5px; font-weight: 700; }
        .vigencia-chat__title { color: var(--ink); font: 600 14px var(--font-body); }
        .vigencia-chat__hint { color: var(--muted); font: 11px var(--font-mono); margin-top: 2px; }
        .vigencia-chat__messages { height: 190px; overflow-y: auto; padding: 16px 18px; display: flex; flex-direction: column; gap: 10px; overscroll-behavior: contain; }
        .vigencia-chat__welcome { color: var(--muted); font: 14px/1.5 var(--font-body); }
        .vigencia-chat__message { max-width: 86%; padding: 9px 12px; border-radius: 9px; color: var(--ink); font: 14px/1.5 var(--font-body); white-space: pre-wrap; }
        .vigencia-chat__message--user { align-self: flex-end; background: rgba(194,164,109,.16); border: 1px solid rgba(194,164,109,.3); }
        .vigencia-chat__message--assistant { align-self: flex-start; background: var(--surface); border: 1px solid var(--line); }
        .vigencia-chat__loading { color: var(--muted); font: 12px var(--font-mono); }
        .vigencia-chat__composer { display: flex; gap: 8px; padding: 12px 18px 14px; border-top: 1px solid var(--line); }
        .vigencia-chat__input { flex: 1; min-height: 40px; max-height: 90px; resize: vertical; box-sizing: border-box; padding: 9px 12px; border: 1px solid var(--line); border-radius: 6px; outline: none; background: var(--paper); color: var(--ink); font: 14px/1.4 var(--font-body); }
        .vigencia-chat__input:focus { border-color: var(--accent); }
        .vigencia-chat__send { width: 40px; height: 40px; align-self: flex-end; border: 0; border-radius: 6px; background: var(--accent); color: #141414; cursor: pointer; font-size: 18px; }
        .vigencia-chat__send:disabled { opacity: .45; cursor: default; }
      `}</style>
      <div className="vigencia-chat__header">
        <div className="vigencia-chat__avatar">A</div>
        <div>
          <div className="vigencia-chat__title">Arthur te ayudará con tu vigencia de poder</div>
          <div className="vigencia-chat__hint">Escribe todos los datos que tengas en un solo mensaje</div>
        </div>
      </div>
      <div ref={messagesRef} className="vigencia-chat__messages">
        {messages.length === 0 && <div className="vigencia-chat__welcome">Te ayudaré a completar los datos de tu vigencia de poder.</div>}
        {messages.map((message, index) => (
          <div key={`${message.role}-${index}`} className={`vigencia-chat__message vigencia-chat__message--${message.role}`}>
            {message.content}
          </div>
        ))}
        {loading && <div className="vigencia-chat__loading">Buscando y completando datos...</div>}
      </div>
      <div className="vigencia-chat__composer">
        <textarea
          className="vigencia-chat__input"
          value={input}
          onChange={event => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ej.: quiero una vigencia de poder de Mesa 47"
          rows={1}
        />
        <button className="vigencia-chat__send" type="button" onClick={() => void send()} disabled={!input.trim() || loading} aria-label="Enviar">
          ↑
        </button>
      </div>
    </section>
  )
}
