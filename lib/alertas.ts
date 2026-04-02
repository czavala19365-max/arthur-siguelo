import { Resend } from 'resend'
import twilio from 'twilio'
import type { Titulo } from '@/types'

export type DatosAlerta = {
  titulo: Titulo
  estadoAnterior: string
  estadoNuevo: string
  detectadoEn: string
}

// ── Email con Resend ──────────────────────────────────────────────────────────

function htmlEmail({ titulo, estadoAnterior, estadoNuevo, detectadoEn }: DatosAlerta): string {
  const fecha = new Date(detectadoEn).toLocaleString('es-PE', {
    timeZone: 'America/Lima',
    dateStyle: 'long',
    timeStyle: 'short',
  })

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e4e4e7">

        <!-- Cabecera -->
        <tr>
          <td style="background:#1d4ed8;padding:24px 32px">
            <p style="margin:0;color:#bfdbfe;font-size:12px;text-transform:uppercase;letter-spacing:1px">Arthur Síguelo</p>
            <h1 style="margin:4px 0 0;color:#ffffff;font-size:20px;font-weight:700">
              Cambio de estado detectado
            </h1>
          </td>
        </tr>

        <!-- Saludo -->
        <tr>
          <td style="padding:28px 32px 0">
            <p style="margin:0;color:#374151;font-size:15px">
              Hola <strong>${titulo.nombre_cliente}</strong>, detectamos un cambio en el estado de tu título registral.
            </p>
          </td>
        </tr>

        <!-- Datos del título -->
        <tr>
          <td style="padding:20px 32px">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0">
              <tr>
                <td style="padding:16px 20px;border-bottom:1px solid #e2e8f0">
                  <p style="margin:0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px">Oficina registral</p>
                  <p style="margin:4px 0 0;font-size:14px;color:#111827;font-weight:600">${titulo.oficina_registral}</p>
                </td>
              </tr>
              <tr>
                <td style="padding:16px 20px">
                  <p style="margin:0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px">Número de título</p>
                  <p style="margin:4px 0 0;font-size:14px;color:#111827;font-weight:600">${titulo.anio_titulo} — ${titulo.numero_titulo}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Cambio de estado -->
        <tr>
          <td style="padding:0 32px 28px">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="48%" style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px 20px">
                  <p style="margin:0;font-size:11px;color:#dc2626;text-transform:uppercase;letter-spacing:.5px">Estado anterior</p>
                  <p style="margin:6px 0 0;font-size:15px;color:#7f1d1d;font-weight:700">${estadoAnterior}</p>
                </td>
                <td width="4%" align="center" style="color:#9ca3af;font-size:20px">→</td>
                <td width="48%" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px 20px">
                  <p style="margin:0;font-size:11px;color:#16a34a;text-transform:uppercase;letter-spacing:.5px">Estado nuevo</p>
                  <p style="margin:6px 0 0;font-size:15px;color:#14532d;font-weight:700">${estadoNuevo}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Pie -->
        <tr>
          <td style="background:#f8fafc;border-top:1px solid #e4e4e7;padding:16px 32px">
            <p style="margin:0;font-size:12px;color:#9ca3af">
              Detectado el ${fecha} · Arthur Síguelo — Monitor de títulos registrales SUNARP
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function enviarAlertaEmail(datos: DatosAlerta): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error('RESEND_API_KEY no configurada.')

  const resend = new Resend(apiKey)
  const from = process.env.RESEND_FROM_EMAIL ?? 'alertas@arthur-siguelo.com'

  const { error } = await resend.emails.send({
    from,
    to: datos.titulo.email_cliente,
    subject: `⚠️ Cambio de estado — Título ${datos.titulo.numero_titulo}`,
    html: htmlEmail(datos),
  })

  if (error) throw new Error(`Resend error: ${error.message}`)
}

// ── WhatsApp con Twilio ───────────────────────────────────────────────────────

export async function enviarAlertaWhatsApp(datos: DatosAlerta): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_WHATSAPP_FROM

  if (!accountSid || !authToken || !from) {
    throw new Error('Credenciales de Twilio no configuradas.')
  }

  const client = twilio(accountSid, authToken)

  const fecha = new Date(datos.detectadoEn).toLocaleString('es-PE', {
    timeZone: 'America/Lima',
    dateStyle: 'short',
    timeStyle: 'short',
  })

  const mensaje =
    `📋 *Arthur Síguelo — Cambio de estado*\n\n` +
    `👤 Cliente: ${datos.titulo.nombre_cliente}\n` +
    `🏛️ Oficina: ${datos.titulo.oficina_registral}\n` +
    `📄 Título: ${datos.titulo.anio_titulo} — ${datos.titulo.numero_titulo}\n\n` +
    `🔴 Anterior: *${datos.estadoAnterior}*\n` +
    `🟢 Nuevo: *${datos.estadoNuevo}*\n\n` +
    `🕐 Detectado: ${fecha}`

  // Normalizar número: asegurar que tenga prefijo internacional
  const numero = datos.titulo.whatsapp_cliente.replace(/\s/g, '')
  const destino = numero.startsWith('+') ? numero : `+51${numero}`

  await client.messages.create({
    from: `whatsapp:${from}`,
    to: `whatsapp:${destino}`,
    body: mensaje,
  })
}
