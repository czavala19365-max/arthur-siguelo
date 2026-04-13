import type { MovimientoJudicialAlerta } from '../alert-service'

function formatTelegramMessage(m: MovimientoJudicialAlerta): string {
  const lines: string[] = []

  if (m.nivelUrgencia === 'alta') {
    lines.push('\u{1F534} *URGENCIA ALTA*')
    lines.push('')
  } else if (m.nivelUrgencia === 'media') {
    lines.push('\u{1F7E1} *Urgencia media*')
    lines.push('')
  }

  lines.push('Nuevo movimiento judicial')
  lines.push('')
  lines.push(`Expediente: ${escapeMarkdown(m.numeroExpediente)}`)

  if (m.casoNombre) {
    lines.push(`Caso: ${escapeMarkdown(m.casoNombre)}`)
  }

  lines.push('')
  lines.push('Actuacion:')
  lines.push(escapeMarkdown(m.descripcion))

  if (m.plazosDias !== undefined) {
    lines.push('')
    lines.push(`Plazo: ${m.plazosDias} dias restantes`)
  }

  lines.push('')
  lines.push('Recomendacion Arthur-IA:')
  lines.push(escapeMarkdown(m.sugerenciaIA))

  return lines.join('\n')
}

function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&')
}

export async function enviarTelegram(
  chatId: string,
  movimiento: MovimientoJudicialAlerta
): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) {
    console.warn('[Telegram] TELEGRAM_BOT_TOKEN no configurado')
    return false
  }

  try {
    const text = formatTelegramMessage(movimiento)
    const url = `https://api.telegram.org/bot${token}/sendMessage`

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      console.error(`[Telegram] HTTP ${res.status}: ${body}`)
      return false
    }

    console.log(`[Telegram] Mensaje enviado a chat_id=${chatId}`)
    return true
  } catch (err) {
    console.error('[Telegram] Error:', err instanceof Error ? err.message : String(err))
    return false
  }
}
