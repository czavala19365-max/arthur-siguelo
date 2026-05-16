import { isValidAccessCode, logPanelAccess } from '@/lib/panel-access-log'

function clientIp(request: Request): string | null {
  const xf = request.headers.get('x-forwarded-for')
  if (xf) return xf.split(',')[0]?.trim() || null
  return request.headers.get('x-real-ip')
}

export async function POST(request: Request) {
  try {
    const { email, code } = (await request.json()) as { email: string; code: string }

    if (!email?.trim() || !code?.trim()) {
      return Response.json({ success: false, error: 'Completa todos los campos' }, { status: 400 })
    }

    if (!isValidAccessCode(code)) {
      return Response.json({ success: false, error: 'Código de acceso incorrecto' }, { status: 401 })
    }

    const normalizedEmail = email.trim().toLowerCase()
    await logPanelAccess({
      email: normalizedEmail,
      ip: clientIp(request),
      userAgent: request.headers.get('user-agent'),
    })

    return Response.json({ success: true })
  } catch {
    return Response.json({ success: false, error: 'Error en la solicitud' }, { status: 500 })
  }
}
