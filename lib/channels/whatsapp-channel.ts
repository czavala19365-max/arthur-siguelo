import twilio from 'twilio'
import type { MovimientoJudicialAlerta } from '../alert-service'

/** Formato E.164 para Twilio (Peru: +51 + 9 digitos). */
export function normalizeWhatsAppE164(raw: string): string {
  const t = String(raw || '').trim()
  if (!t) return ''
  if (t.startsWith('whatsapp:')) return normalizeWhatsAppE164(t.slice(9))
  const digits = t.replace(/\D/g, '')
  if (!digits) return ''
  if (t.startsWith('+')) return `+${digits}`
  if (digits.startsWith('51') && digits.length >= 11) return `+${digits}`
  if (digits.length === 9) return `+51${digits}`
  return `+${digits}`
}

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
  lines.push('Ultima actuación:')
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
    const e164 = normalizeWhatsAppE164(telefono)
    if (!e164) {
      console.warn('[WhatsApp] Numero invalido:', telefono)
      return false
    }
    const toNumber = `whatsapp:${e164}`

    await client.messages.create({ from, to: toNumber, body })
    console.log(`[WhatsApp] Mensaje enviado a ${e164}`)
    return true
  } catch (err) {
    console.error('[WhatsApp] Error:', err instanceof Error ? err.message : String(err))
    return false
  }
}

export async function enviarSuscripcionWhatsApp(
  telefono: string,
  casoAlias: string,
  numeroExp: string
): Promise<boolean> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_WHATSAPP_FROM 
  const templateSid = process.env.TWILIO_TEMPLATE_SID

  if (!accountSid || !authToken) {
    console.warn('[WhatsApp] Credenciales Twilio no configuradas')
    return false
  }

  try {
    const client = twilio(accountSid, authToken)
    const messageBody = [
      'Hola!',
      'Ya estamos monitoreando tu caso:',
      '',
      `Alias: ${casoAlias}`,
      `Expediente: ${numeroExp}`,
      '',
      'Te enviaremos alertas cuando haya movimientos o fallos legales importantes.',
      '',
      'Gracias por usar Arthur-IA',
    ].join('\n')
    
    const e164 = normalizeWhatsAppE164(telefono)
    if (!e164) {
      console.warn('[WhatsApp] Numero invalido:', telefono)
      return false
    }

    await client.messages.create({
      from,
      to: `whatsapp:${e164}`,
      body: messageBody,
    })
    console.log(`[WhatsApp] Mensaje bienvenida enviado a ${e164}`)
    return true
  } catch (err) {
    console.error('[WhatsApp] Error suscripcion:', err instanceof Error ? err.message : String(err))
    return false
  }
}
