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

/** Twilio Content Variables no acepta saltos de línea, tabs ni espacios repetidos. */
function sanitizeTemplateVariable(value: unknown): string {
  return String(value ?? '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/ {2,}/g, ' ')
    .trim()
}

export async function enviarWhatsApp(
  telefono: string,
  movimiento: MovimientoJudicialAlerta
): Promise<boolean> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_WHATSAPP_FROM
  const contentSid = process.env.TWILIO_TEMPLATE_SID

  if (!accountSid || !authToken) {
    console.warn('[WhatsApp] Credenciales Twilio no configuradas')
    return false
  }

  if (!contentSid || !from) {
    console.warn('[WhatsApp] TWILIO_TEMPLATE_SID o TWILIO_WHATSAPP_FROM no configurado')
    return false
  }

  const numeroExpediente = sanitizeTemplateVariable(movimiento.numeroExpediente)
  const descripcion = sanitizeTemplateVariable(movimiento.descripcion)
  if (!numeroExpediente || !descripcion) {
    console.warn('[WhatsApp] La plantilla necesita numeroExpediente y descripcion')
    return false
  }

  try {
    const client = twilio(accountSid, authToken)
    const e164 = normalizeWhatsAppE164(telefono)
    if (!e164) {
      console.warn('[WhatsApp] Numero invalido:', telefono)
      return false
    }
    const toNumber = `whatsapp:${e164}`
    const contentVariables = JSON.stringify({
      '2': numeroExpediente,
      '3': descripcion,
    })

    console.log('[WhatsApp] Enviando template', {
      contentSid,
      variables: { '2': numeroExpediente.length, '3': descripcion.length },
    })

    await client.messages.create({
      from,
      to: toNumber,
      contentSid: contentSid,
      contentVariables,
    })
    console.log(`[WhatsApp] Mensaje enviado a ${e164}`)
    return true
  } catch (err) {
    const twilioError = err as { message?: string; code?: number; status?: number; moreInfo?: string }
    console.error('[WhatsApp] Error:', {
      message: twilioError.message || String(err),
      code: twilioError.code,
      status: twilioError.status,
      moreInfo: twilioError.moreInfo,
      contentSid,
    })
    return false
  }
}

function newNormalizeWhatsAppE164(telefono: string): string | null {
  const limpio = telefono.replace(/[^\d+]/g, '')

  if (!limpio) return null

  if (limpio.startsWith('+')) {
    return limpio
  }

  // Perú
  if (limpio.startsWith('9') && limpio.length === 9) {
    return `+51${limpio}`
  }

  return null
}

export async function enviarWhatsAppPublicidadRegistral(
  telefono: string,
  solicitud: {
    numeroPartida: string
    oficinaRegistral: string
    cargoApoderado: string
    representante: string
    razonSocial?: string
    apellidoPaterno?: string
    apellidoMaterno?: string
    nombres?: string
  },
): Promise<boolean> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_WHATSAPP_FROM
  const contentSid = process.env.TWILIO_TEMPLATE_SID

  if (!accountSid || !authToken) {
    console.warn('[WhatsApp PR] Credenciales Twilio no configuradas')
    return false
  }

  if (!contentSid || !from) {
    console.warn('[WhatsApp PR] TWILIO_TEMPLATE_SID o TWILIO_WHATSAPP_FROM no configurado')
    return false
  }

  try {
    const client = twilio(accountSid, authToken)

    const e164 = newNormalizeWhatsAppE164(telefono)

    if (!e164) {
      console.warn('[WhatsApp PR] Numero invalido:', telefono)
      return false
    }

    const nombre =
      solicitud.representante === 'juridico'
        ? solicitud.razonSocial ?? ''
        : `${solicitud.nombres ?? ''} ${solicitud.apellidoPaterno ?? ''} ${solicitud.apellidoMaterno ?? ''}`.trim()

    const numeroPartida = sanitizeTemplateVariable(
      solicitud.numeroPartida,
    )

    const descripcion = sanitizeTemplateVariable(
      `Nueva solicitud de Vigencia de Poder | Oficina: ${solicitud.oficinaRegistral} | Solicitante: ${nombre} | Cargo: ${solicitud.cargoApoderado}`,
    )

    if (!numeroPartida || !descripcion) {
      console.warn('[WhatsApp PR] La plantilla necesita numeroPartida y descripcion')
      return false
    }

    const contentVariables = JSON.stringify({
      '2': numeroPartida,
      '3': descripcion,
    })

    console.log('[WhatsApp PR] Enviando template', {
      contentSid,
      variables: {
        '2': numeroPartida,
        '3': descripcion.length,
      },
    })

    await client.messages.create({
      from,
      to: `whatsapp:${e164}`,
      contentSid,
      contentVariables,
    })

    console.log(`[WhatsApp PR] Mensaje enviado a ${e164}`)

    return true
  } catch (err) {
    const twilioError = err as {
      message?: string
      code?: number
      status?: number
      moreInfo?: string
    }

    console.error('[WhatsApp PR] Error:', {
      message: twilioError.message || String(err),
      code: twilioError.code,
      status: twilioError.status,
      moreInfo: twilioError.moreInfo,
      contentSid,
    })

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
