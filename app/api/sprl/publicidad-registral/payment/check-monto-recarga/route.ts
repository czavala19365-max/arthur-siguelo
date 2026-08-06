import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

type Body = {
  monto?: string
}

type UpstreamResponse = {
  success?: boolean
  data?: {
    purchase?: string
  }
  response?: {
    code?: string
    title?: string
    description?: string
  }
}

function resolveSunarpAuthorization(request: NextRequest) {
  const rawToken = String(
    request.cookies.get('sprl_access_token')?.value ||
    request.cookies.get('sunarp_sesion_id')?.value ||
    '',
  ).trim()

  if (!rawToken) return ''
  if (/^bearer\s+/i.test(rawToken)) return rawToken
  return `Bearer ${rawToken}`
}

function normalizeMonto(value: string) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return null
  if (Number.isInteger(parsed)) return String(parsed)
  return parsed.toFixed(2)
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Body
    const monto = normalizeMonto(String(body.monto || '').trim())

    if (!monto) {
      return NextResponse.json({ ok: false, error: 'monto inválido.' }, { status: 400 })
    }

    const upstreamResponse = await fetch(
      'https://api02-visa-sprl-production.apps.paas.sunarp.gob.pe/v1/sunarp-services/visaoperaciones/check-monto-recarga',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Origin: 'https://sprl.sunarp.gob.pe',
          Referer: 'https://sprl.sunarp.gob.pe/',
          ...(resolveSunarpAuthorization(request) ? { Authorization: resolveSunarpAuthorization(request) } : {}),
        },
        body: JSON.stringify({ monto }),
        cache: 'no-store',
      },
    )

    const upstreamJson = (await upstreamResponse.json().catch(() => ({}))) as UpstreamResponse

    if (!upstreamResponse.ok || !upstreamJson.success || !upstreamJson.data?.purchase) {
      const upstreamError =
        upstreamJson.response?.description ||
        upstreamJson.response?.title ||
        `SUNARP Visa devolvió HTTP ${upstreamResponse.status}.`

      return NextResponse.json(
        {
          ok: false,
          provider: 'visa_mastercard',
          action: 'check-monto-recarga',
          error: upstreamError,
        },
        { status: 502 },
      )
    }

    return NextResponse.json({
      ok: true,
      provider: 'visa_mastercard',
      action: 'check-monto-recarga',
      data: {
        purchase: upstreamJson.data.purchase,
        monto,
      },
      upstream: {
        code: upstreamJson.response?.code || '',
        title: upstreamJson.response?.title || '',
        description: upstreamJson.response?.description || '',
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al procesar check-monto-recarga.'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}