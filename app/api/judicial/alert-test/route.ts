import { NextRequest, NextResponse } from 'next/server'
import { enviarAlertaMovimiento } from '@/lib/alert-service'
import { getAlertaConfigParaCaso, getCasoById } from '@/lib/judicial-db'

export const runtime = 'nodejs'

/**
 * GET /api/judicial/alert-test?casoId=123
 *
 * Endpoint de diagnóstico (no UI) para validar que Email/WhatsApp/Telegram
 * están funcionando en Vercel con las env vars actuales.
 *
 * Protegido con CRON_SECRET:
 *   Authorization: Bearer <CRON_SECRET>
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }

  const url = new URL(request.url)
  const casoIdRaw = url.searchParams.get('casoId') || ''
  const casoId = Number.parseInt(casoIdRaw, 10)
  if (!Number.isFinite(casoId) || casoId <= 0) {
    return NextResponse.json({ error: 'casoId inválido' }, { status: 400 })
  }

  const caso = await getCasoById(casoId)
  if (!caso) {
    return NextResponse.json({ error: 'Caso no encontrado' }, { status: 404 })
  }

  const cfg = await getAlertaConfigParaCaso(casoId)
  if (!cfg) {
    return NextResponse.json({ error: 'No hay configuración de alertas para este caso' }, { status: 400 })
  }

  const env = {
    resend: !!(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL),
    twilio: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
    telegram: !!process.env.TELEGRAM_BOT_TOKEN,
    baseUrl: process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || null,
  }

  const movimiento = {
    expedienteId: String(caso.id),
    numeroExpediente: caso.numero_expediente,
    descripcion: caso.ultimo_movimiento || 'Movimiento judicial (test)',
    nivelUrgencia: 'alta' as const,
    sugerenciaIA: 'TEST: si recibes este mensaje, el canal está OK.',
    casoNombre: caso.alias || caso.cliente || undefined,
  }

  const result = await enviarAlertaMovimiento(movimiento, cfg)

  return NextResponse.json({
    ok: true,
    env,
    config: {
      email: cfg.email || null,
      telefonoCelular: cfg.telefonoCelular || null,
      telegramChatId: cfg.telegramChatId || null,
      canalesActivos: cfg.canalesActivos,
      canalPorNivel: cfg.canalPorNivel || null,
    },
    movimiento,
    result,
  })
}

