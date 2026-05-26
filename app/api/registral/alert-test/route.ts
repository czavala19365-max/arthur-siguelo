import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? ''
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const email = req.nextUrl.searchParams.get('email')
  if (!email) {
    return NextResponse.json({ error: 'Falta ?email=destinatario@correo.com' }, { status: 400 })
  }

  const apiKey = process.env.RESEND_API_KEY_JUDICIAL || process.env.RESEND_API_KEY
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'alertas@arthur-legal.com'

  if (!apiKey) {
    return NextResponse.json({ error: 'RESEND_API_KEY no configurada' }, { status: 500 })
  }

  try {
    const resend = new Resend(apiKey)
    const { data, error } = await resend.emails.send({
      from: `Arthur-IA Legal <${fromEmail}>`,
      to: email,
      subject: '✅ Test Arthur-IA – Email registral funcionando',
      html: `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f0e8;font-family:'Inter',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0e8;padding:40px 20px;">
    <tr><td>
      <table width="600" cellpadding="0" cellspacing="0" style="margin:0 auto;background:#fff;border:1px solid rgba(15,15,15,0.08);">
        <tr>
          <td style="background:#1a3a5c;padding:28px 32px;">
            <div style="font-family:Georgia,serif;font-size:24px;color:#fff;font-style:italic;">Arthur-IA</div>
            <div style="font-family:'Courier New',monospace;font-size:10px;color:rgba(245,240,232,0.5);text-transform:uppercase;letter-spacing:0.15em;margin-top:4px;">Legal · SUNARP & CEJ</div>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <h2 style="color:#0f0f0f;margin:0 0 16px;">Sistema de alertas funcionando</h2>
            <p style="color:#444;font-size:14px;line-height:1.7;">Si recibes este email, el sistema de alertas de Arthur-IA está correctamente configurado para enviar notificaciones registrales y judiciales desde <strong>${fromEmail}</strong>.</p>
          </td>
        </tr>
        <tr>
          <td style="background:#f5f0e8;padding:16px 32px;border-top:1px solid rgba(15,15,15,0.08);">
            <p style="font-family:'Courier New',monospace;font-size:10px;color:#6b6560;margin:0;text-align:center;">Arthur-IA Legal – Sistema unificado de alertas</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
      text: 'Si recibes este email, el sistema de alertas de Arthur-IA está funcionando correctamente.',
    })

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, emailId: data?.id, to: email, from: fromEmail })
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}

