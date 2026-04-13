import twilio from 'twilio'
import type { MovimientoJudicialAlerta } from '../alert-service'

function formatWhatsAppMessage(m: MovimientoJudicialAlerta): string {
  const lines: string[] = []

  if (m.nivelUrgencia === 'alta') {
    lines.push('[URGENTE]')
  } else if (m.nivelUrgencia === 'media') {
    lines.push('[Atencion]')
  }

  lines.push('Nuevo movimiento judicial')
  lines.push('')
  lines.push(`Expediente: ${m.numeroExpediente}`)

  if (m.casoNombre) {
    lines.push(`Caso: ${m.casoNombre}`)
  }

  lines.push('')
  lines.push('Actuacion:')
  lines.push(m.descripcion)

  if (m.plazosDias !== undefined) {
    lines.push('')
    lines.push(`Plazo: ${m.plazosDias} dias restantes`)
  }

  lines.push('')
  lines.push('Recomendacion Arthur-IA:')
  lines.push(m.sugerenciaIA)

  return lines.join('\n')
}

export async function enviarWhatsApp(
  telefono: string,
  movimiento: MovimientoJudicialAlerta
): Promise<boolean> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886'

  if (!accountSid || !authToken) {
    console.warn('[WhatsApp] Credenciales Twilio no configuradas')
    return false
  }

  try {
    const client = twilio(accountSid, authToken)
    const body = formatWhatsAppMessage(movimiento)
    const toNumber = telefono.startsWith('whatsapp:') ? telefono : `whatsapp:${telefono}`

    await client.messages.create({ from, to: toNumber, body })
    console.log(`[WhatsApp] Mensaje enviado a ${telefono}`)
    return true
  } catch (err) {
    console.error('[WhatsApp] Error:', err instanceof Error ? err.message : String(err))
    return false
  }
}
