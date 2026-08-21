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

// Frases que indican que el nombre de empresa terminó y empieza otro dato del formulario.
const COMPANY_STOP_TOKENS = /\b(con\s+partida|partida\s*n[°º]?\.?|n[uú]mero\s*(?:de\s*)?partida|asiento|n[uú]mero\s*de\s*asiento|con\s+nombre|gerente|apoderado|director|presidente|administrador|representante|natural|jur[ií]dico)\b/i

function trimCompanyName(raw: string): string {
  const match = raw.match(COMPANY_STOP_TOKENS)
  const cut = match?.index !== undefined ? raw.slice(0, match.index) : raw
  return cut.trim().replace(/[,.;\s]+$/, '')
}

// El buscador SUNARP hace match por prefijo exacto: quitamos el sufijo societario (S.A.C., S.A., etc.)
// porque su puntuación no coincide con la forma en que el usuario lo escribe ("sac" vs "S.A.C.").
const CORPORATE_SUFFIX_RE = /\s+(s\.?a\.?c\.?|s\.?a\.?a\.?|s\.?r\.?l\.?|e\.?i\.?r\.?l\.?|s\.?c\.?r\.?l\.?|s\.?a\.?)\s*$/i

function stripCorporateSuffix(name: string): string {
  const stripped = name.replace(CORPORATE_SUFFIX_RE, '').trim()
  return stripped.length >= 3 ? stripped : name
}

function extractCompanyName(text: string): string | null {
  const clean = text.replace(/[¿?¡!]/g, ' ').trim()
  const patterns = [
    /vigencia\s+de\s+poder\s+(?:(?:de|para)\s+)?(.+)$/i,
    /(?:raz[oó]n\s+social|denominaci[oó]n|empresa)\s*(?:es|:)?\s*(.+)$/i,
  ]

  for (const pattern of patterns) {
    const match = clean.match(pattern)
    const company = trimCompanyName(match?.[1]?.trim().replace(/[,.;\s]+$/, '') ?? '')
    if (company && company.length >= 3) return stripCorporateSuffix(company)
  }

  const isSimpleCompany = /^[a-záéíóúñ0-9][a-záéíóúñ0-9 .&-]+$/i.test(clean)
  const containsFormInstruction = /^(por|representante|cargo|oficina|partida|ficha|tomo|asiento|natural|jur[ií]dica?\b)/i.test(clean)
  if (isSimpleCompany && !containsFormInstruction) return stripCorporateSuffix(trimCompanyName(clean))
  return null
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
        .vigencia-chat { --chat-ink: #143d38; --chat-muted: #5d7d77; --chat-panel: #f8fcfa; --chat-cyan: #167f73; --chat-accent: #d6a943; position: relative; isolation: isolate; overflow: hidden; margin: 0 0 34px; border: 1px solid #a8cec6; border-radius: 8px; background: var(--chat-panel); box-shadow: 0 20px 44px rgba(35, 90, 80, .14), 0 0 0 4px rgba(22, 127, 115, .07); font-family: var(--font-body); }
        .vigencia-chat::before { content: ''; position: absolute; z-index: -1; inset: 0; opacity: .5; background-image: linear-gradient(90deg, rgba(22, 127, 115, .12) 1px, transparent 1px), linear-gradient(rgba(22, 127, 115, .12) 1px, transparent 1px); background-size: 24px 24px; }
        .vigencia-chat::after { content: ''; position: absolute; inset: 0; z-index: -1; border: 1px solid rgba(214, 169, 67, .35); border-radius: 5px; pointer-events: none; }
        .vigencia-chat__header { position: relative; padding: 23px 26px; display: flex; align-items: center; gap: 15px; color: #f8fcfa; background: #287e73; border-bottom: 1px solid #a17d2c; overflow: hidden; }
        .vigencia-chat__header::after { content: 'IA · EN LÍNEA'; position: absolute; top: 14px; right: 24px; color: #e9c768; font: 700 10px/1 var(--font-body); }
        .vigencia-chat__avatar { position: relative; z-index: 1; width: 48px; height: 48px; display: grid; place-items: center; flex: 0 0 auto; border: 1px solid #d1f2eb; border-radius: 50%; background: #f8fcfa; color: var(--chat-cyan); box-shadow: 0 0 0 5px rgba(209, 242, 235, .18), 0 0 20px rgba(209, 242, 235, .35); font: 800 21px/1 var(--font-body); }
        .vigencia-chat__title { position: relative; z-index: 1; color: inherit; font: 700 21px/1.15 var(--font-body); letter-spacing: 0; }
        .vigencia-chat__hint { position: relative; z-index: 1; margin-top: 5px; color: #d1f2eb; font: 500 12px/1.35 var(--font-body); letter-spacing: 0; }
        .vigencia-chat__messages { height: 285px; overflow-y: auto; padding: 24px 26px; display: flex; flex-direction: column; gap: 14px; overscroll-behavior: contain; scrollbar-color: #167f73 #eaf5f1; }
        .vigencia-chat__welcome { max-width: 480px; padding: 15px 17px; border: 1px solid #a8cec6; border-left: 3px solid var(--chat-cyan); background: #f4fbf8; color: #28534d; font: 15px/1.55 var(--font-body); box-shadow: 0 7px 18px rgba(35,90,80,.09); }
        .vigencia-chat__message { max-width: min(86%, 600px); padding: 13px 16px; border-radius: 7px; color: var(--chat-ink); font: 15px/1.55 var(--font-body); white-space: pre-wrap; box-shadow: 0 5px 14px rgba(35,90,80,.1); }
        .vigencia-chat__message--user { align-self: flex-end; border: 1px solid #d5b86c; background: #fff8e3; border-bottom-right-radius: 1px; }
        .vigencia-chat__message--assistant { align-self: flex-start; border: 1px solid #a8cec6; background: #f4fbf8; border-bottom-left-radius: 1px; }
        .vigencia-chat__loading { align-self: flex-start; color: var(--chat-cyan); font: 700 12px var(--font-body); letter-spacing: 0; }
        .vigencia-chat__composer { display: flex; gap: 12px; padding: 18px 22px 22px; border-top: 1px solid #a8cec6; background: #eaf5f1; }
        .vigencia-chat__input { flex: 1; min-height: 54px; max-height: 110px; resize: vertical; box-sizing: border-box; padding: 15px 16px; border: 1px solid #91bcb3; border-radius: 5px; outline: none; background: #fffefa; color: var(--chat-ink); font: 15px/1.45 var(--font-body); box-shadow: inset 0 1px 12px rgba(35,90,80,.06); transition: border-color .18s ease, box-shadow .18s ease; }
        .vigencia-chat__input::placeholder { color: #769991; }
        .vigencia-chat__input:focus { border-color: var(--chat-cyan); box-shadow: inset 0 1px 12px rgba(35,90,80,.06), 0 0 0 3px rgba(22,127,115,.15); }
        .vigencia-chat__send { width: 58px; height: 54px; align-self: flex-end; border: 1px solid #176a60; border-radius: 5px; background: #287e73; color: #f8fcfa; cursor: pointer; font-size: 25px; line-height: 1; box-shadow: 0 0 16px rgba(22,127,115,.2); transition: transform .15s ease, box-shadow .15s ease, background .15s ease; }
        .vigencia-chat__send:hover:not(:disabled) { background: #166f64; transform: translateY(-1px); box-shadow: 0 0 22px rgba(22,127,115,.35); }
        .vigencia-chat__send:active:not(:disabled) { transform: translateY(1px); box-shadow: 0 0 9px rgba(22,127,115,.2); }
        .vigencia-chat__send:disabled { opacity: .4; cursor: default; box-shadow: none; }
        @media (max-width: 560px) { .vigencia-chat__header { padding: 19px 17px; } .vigencia-chat__header::after { top: 12px; right: 14px; } .vigencia-chat__messages { height: 260px; padding: 18px 17px; } .vigencia-chat__composer { padding: 14px; } .vigencia-chat__title { max-width: 220px; font-size: 18px; } }
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
