import { Resend } from 'resend'
import type { MovimientoJudicialAlerta, NivelUrgencia } from '../alert-service'
import { getAppBaseUrl } from '@/lib/app-url'
import { generateICalendar, icsToBuffer } from '../calendar-ics'

function buildSubject(m: MovimientoJudicialAlerta): string {
  const num = m.numeroExpediente
  if (m.nivelUrgencia === 'alta') return `[URGENTE] Movimiento judicial – Exp. ${num}`
  if (m.nivelUrgencia === 'media') return `[Atención] Movimiento judicial – Exp. ${num}`
  return `Actualización judicial – Exp. ${num}`
}

function urgenciaHtml(nivel: NivelUrgencia): string {
  if (nivel === 'alta') {
    return '<p style="color:#c0392b;font-weight:700;font-size:14px;margin:0 0 16px;">URGENCIA ALTA</p>'
  }
  if (nivel === 'media') {
    return '<p style="color:#e67e22;font-weight:700;font-size:14px;margin:0 0 16px;">Urgencia media</p>'
  }
  return ''
}

function buildHtml(m: MovimientoJudicialAlerta, fechaPendiente?: { fecha: Date; descripcion: string }): string {
  const base = getAppBaseUrl()
  const casoLine = m.casoNombre
    ? `<tr><td style="padding:4px 0;font-size:14px;color:#444;">Caso: ${m.casoNombre}</td></tr>`
    : ''
  const plazoLine =
    m.plazosDias !== undefined
      ? `<tr><td style="padding:12px 0 4px;font-size:14px;color:#444;">Plazo: ${m.plazosDias} días restantes</td></tr>`
      : ''

  const fechaPendienteHtml = fechaPendiente
    ? `
        <tr>
          <td style="padding:20px 32px 0;">
            <div style="border-left:4px solid #f39c12;background:rgba(243,156,18,0.08);padding:16px 20px;">
              <div style="font-family:'Courier New',monospace;font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:#d68910;margin-bottom:6px;">⏰ FECHA PENDIENTE IDENTIFICADA</div>
              <p style="margin:6px 0;color:#0f0f0f;font-size:14px;line-height:1.5;"><strong>${fechaPendiente.descripcion}</strong></p>
              <p style="margin:6px 0;color:#0f0f0f;font-size:14px;"><strong>Fecha: ${new Date(fechaPendiente.fecha).toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric' })}</strong></p>
              <p style="margin:12px 0 0;color:#6b6560;font-size:12px;">Haz clic en el botón "Agregar a calendario" en tu cliente de email para programar automáticamente este evento.</p>
            </div>
          </td>
        </tr>
      `
    : ''

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f0e8;font-family:'Inter',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0e8;padding:40px 20px;">
    <tr><td>
      <table width="600" cellpadding="0" cellspacing="0" style="margin:0 auto;background:white;border:1px solid rgba(15,15,15,0.08);">
        <tr>
          <td style="background:#1a3a5c;padding:28px 32px;">
            <div style="font-family:Georgia,serif;font-size:24px;color:white;font-style:italic;">Arthur-IA</div>
            <div style="font-family:'Courier New',monospace;font-size:10px;color:rgba(245,240,232,0.5);text-transform:uppercase;letter-spacing:0.15em;margin-top:4px;">Poder Judicial · CEJ</div>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px 0;">
            <div style="font-family:'Courier New',monospace;font-size:10px;text-transform:uppercase;letter-spacing:0.12em;color:#6b6560;margin-bottom:8px;">NUEVO MOVIMIENTO JUDICIAL</div>
            ${urgenciaHtml(m.nivelUrgencia)}
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td style="padding:4px 0;font-size:14px;color:#444;">Expediente: ${m.numeroExpediente}</td></tr>
              ${casoLine}
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px 0;">
            <div style="font-family:'Courier New',monospace;font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:#6b6560;margin-bottom:6px;">ACTUACIÓN</div>
            <p style="margin:0;color:#0f0f0f;font-size:15px;line-height:1.7;">${m.descripcion}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px 0;">
            <table width="100%" cellpadding="0" cellspacing="0">
              ${plazoLine}
            </table>
          </td>
        </tr>
        ${fechaPendienteHtml}
        <tr>
          <td style="padding:20px 32px 0;">
            <div style="border-left:4px solid #1e8449;background:rgba(39,174,96,0.06);padding:16px 20px;">
              <div style="font-family:'Courier New',monospace;font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:#1e8449;margin-bottom:6px;">RECOMENDACIÓN ARTHUR-IA</div>
              <p style="margin:0;color:#0f0f0f;font-size:14px;line-height:1.7;">${m.sugerenciaIA}</p>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;text-align:center;">
            <a href="${base}/judicial/${m.expedienteId}" style="display:inline-block;background:#0f0f0f;color:#f5f0e8;font-family:'Courier New',monospace;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;padding:14px 28px;text-decoration:none;">Ver detalle completo →</a>
          </td>
        </tr>
        <tr>
          <td style="background:#f5f0e8;padding:16px 32px;border-top:1px solid rgba(15,15,15,0.08);">
            <p style="font-family:'Courier New',monospace;font-size:10px;color:#6b6560;margin:0;text-align:center;">Arthur-IA Legal – Sistema automatizado de seguimiento judicial</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function buildText(m: MovimientoJudicialAlerta, fechaPendiente?: { fecha: Date; descripcion: string }): string {
  const lines: string[] = []
  if (m.nivelUrgencia === 'alta') lines.push('URGENCIA ALTA\n')
  else if (m.nivelUrgencia === 'media') lines.push('Urgencia media\n')

  lines.push('Nuevo movimiento judicial')
  lines.push(`Expediente: ${m.numeroExpediente}`)
  if (m.casoNombre) lines.push(`Caso: ${m.casoNombre}`)
  lines.push('')
  lines.push(`Actuación: ${m.descripcion}`)
  if (m.plazosDias !== undefined) lines.push(`Plazo: ${m.plazosDias} días restantes`)
  if (fechaPendiente) {
    lines.push('')
    lines.push('⏰ FECHA PENDIENTE IDENTIFICADA')
    lines.push(fechaPendiente.descripcion)
    lines.push(`Fecha: ${new Date(fechaPendiente.fecha).toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric' })}`)
  }
  lines.push('')
  lines.push(`Recomendación Arthur-IA: ${m.sugerenciaIA}`)
  return lines.join('\n')
}

export async function enviarEmail(
  destinatario: string,
  movimiento: MovimientoJudicialAlerta,
  fechaPendiente?: { fecha: Date; descripcion: string }
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY_JUDICIAL || process.env.RESEND_API_KEY
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'alertas@arthur-legal.com'

  if (!apiKey) {
    console.warn('[Email] RESEND_API_KEY_JUDICIAL ni RESEND_API_KEY configurados')
    return false
  }

  try {
    const resend = new Resend(apiKey)

    // Generar iCalendar si existe fecha pendiente
    let attachments: Array<{ filename: string; content: string }> | undefined

    if (fechaPendiente) {
      const icalendarEvent = generateICalendar({
        title: `Plazo Judicial: ${movimiento.casoNombre || movimiento.numeroExpediente}`,
        description: fechaPendiente.descripcion,
        startDate: new Date(fechaPendiente.fecha),
        // Añadir 1 día para que sea end date (eventos de un día completo)
        endDate: new Date(new Date(fechaPendiente.fecha).getTime() + 24 * 60 * 60 * 1000),
        attendeeEmail: destinatario,
      })

      attachments = [
        {
          filename: `plazo-judicial-${movimiento.numeroExpediente.replace(/\//g, '-')}.ics`,
          content: icalendarEvent,
        },
      ]
    }

    const { data, error } = await resend.emails.send({
      from: `Arthur-IA Legal <${fromEmail}>`,
      to: destinatario,
      subject: buildSubject(movimiento),
      html: buildHtml(movimiento, fechaPendiente),
      text: buildText(movimiento, fechaPendiente),
      attachments,
    })

    if (error) {
      console.error('[Email] Error de Resend:', error.name, error.message)
      if (error.name === 'validation_error' && error.message.includes('testing emails')) {
        console.warn('\n⚠️ ATENCIÓN: Resend está en modo prueba. Solo puedes enviar al email registrado en Resend. Si enviaste a otro correo, Resend lo bloquerá.\n')
      }
      return false
    }

    console.log(`[Email] Enviado a ${destinatario}${fechaPendiente ? ' (con .ics adjunto)' : ''} (ID: ${data?.id})`)
    return true
  } catch (err) {
    console.error('[Email] Error:', err instanceof Error ? err.message : String(err))
    return false
  }
}
