import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

type CheckoutProvider = 'visa_mastercard' | 'saldo' | 'pagalo'
type CheckoutAction =
  | 'check-monto'
  | 'continue-preview'
  | 'info-boton'
  | 'vn-clientip'
  | 'vn-merchant-config'
  | 'vn-extend-session'
  | 'vn-document-types'

type CheckoutBody = {
  provider?: CheckoutProvider
  action?: CheckoutAction
  monto?: string
  sunarpSesionId?: string
  nombre?: string
  apellido?: string
  email?: string
  purchase?: string
  importe?: string
  ipClient?: string
  extendSessionId?: string
}

type VisaCheckMontoResponse = {
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

type VisaInfoBotonResponse = {
  success?: boolean
  data?: Record<string, unknown>
  response?: {
    code?: string
    title?: string
    description?: string
  }
}

type CheckoutHandler = (payload: CheckoutBody, request: NextRequest) => Promise<NextResponse>

const VISA_MERCHANT_ID = '260998823'

function getClientIpFromRequest(request: NextRequest) {
  const xForwardedFor = request.headers.get('x-forwarded-for') || ''
  const firstForwarded = xForwardedFor.split(',')[0]?.trim()
  if (firstForwarded) return firstForwarded

  const realIp = request.headers.get('x-real-ip')?.trim()
  if (realIp) return realIp

  return '127.0.0.1'
}

function extractSessionTokenFromPayload(payload: unknown) {
  const raw = JSON.stringify(payload)
  const match = raw.match(/[a-f0-9]{64}/i)
  return match?.[0] || ''
}

function normalizeMonto(value: string) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return null
  if (Number.isInteger(parsed)) return String(parsed)
  return parsed.toFixed(2)
}

function resolveSunarpAuthorization(request: NextRequest, payload: CheckoutBody) {
  const rawToken = String(
    payload.sunarpSesionId ||
    request.cookies.get('sprl_access_token')?.value ||
    request.cookies.get('sunarp_sesion_id')?.value ||
    '',
  ).trim()

  if (!rawToken) return ''
  if (/^bearer\s+/i.test(rawToken)) return rawToken
  return `Bearer ${rawToken}`
}

async function handleVisaMastercardCheckMonto(payload: CheckoutBody, request: NextRequest) {
  const authorization = resolveSunarpAuthorization(request, payload)

  const upstreamResponse = await fetch(
    'https://api02-visa-sprl-production.apps.paas.sunarp.gob.pe/v1/sunarp-services/visaoperaciones/check-monto',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Origin: 'https://sprl.sunarp.gob.pe',
        Referer: 'https://sprl.sunarp.gob.pe/',
        ...(authorization ? { Authorization: authorization } : {}),
      },
      body: JSON.stringify({ monto: payload.monto }),
      cache: 'no-store',
    },
  )

  const upstreamJson = (await upstreamResponse.json().catch(() => ({}))) as VisaCheckMontoResponse

  if (!upstreamResponse.ok || !upstreamJson.success || !upstreamJson.data?.purchase) {
    const upstreamError =
      upstreamJson.response?.description ||
      upstreamJson.response?.title ||
      `SUNARP Visa devolvió HTTP ${upstreamResponse.status}.`

    return NextResponse.json(
      {
        ok: false,
        provider: 'visa_mastercard',
        action: 'check-monto',
        error: upstreamError,
      },
      { status: 502 },
    )
  }

  return NextResponse.json({
    ok: true,
    provider: 'visa_mastercard',
    action: 'check-monto',
    data: {
      purchase: upstreamJson.data.purchase,
      monto: payload.monto,
    },
    upstream: {
      code: upstreamJson.response?.code || '',
      title: upstreamJson.response?.title || '',
      description: upstreamJson.response?.description || '',
    },
  })
}

async function handleVisaMastercardInfoBoton(payload: CheckoutBody, request: NextRequest) {
  const authorization = resolveSunarpAuthorization(request, payload)
  const nombre = String(payload.nombre || '').trim().toUpperCase()
  const apellido = String(payload.apellido || '').trim().toUpperCase()
  const email = String(payload.email || '').trim().toUpperCase()
  const purchase = String(payload.purchase || '').trim()
  const importe = String(payload.importe || payload.monto || '').trim()
  const ipClient = String(payload.ipClient || getClientIpFromRequest(request)).trim()

  if (!nombre || !apellido || !email || !purchase || !importe) {
    return NextResponse.json(
      { ok: false, error: 'Faltan datos para info-boton.' },
      { status: 400 },
    )
  }

  const infoBotonResponse = await fetch(
    'https://api02-visa-sprl-production.apps.paas.sunarp.gob.pe/v1/sunarp-services/visaoperaciones/info-boton',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Origin: 'https://sprl.sunarp.gob.pe',
        Referer: 'https://sprl.sunarp.gob.pe/',
        ...(authorization ? { Authorization: authorization } : {}),
      },
      body: JSON.stringify({ nombre, apellido, email, purchase, importe, ipClient }),
      cache: 'no-store',
    },
  )

  const infoBotonJson = (await infoBotonResponse.json().catch(() => ({}))) as VisaInfoBotonResponse

  if (!infoBotonResponse.ok || !infoBotonJson.success) {
    const upstreamError =
      infoBotonJson.response?.description ||
      infoBotonJson.response?.title ||
      `SUNARP Visa info-boton devolvió HTTP ${infoBotonResponse.status}.`

    return NextResponse.json({ ok: false, provider: 'visa_mastercard', action: 'info-boton', error: upstreamError }, { status: 502 })
  }

  const extendSessionId = extractSessionTokenFromPayload(infoBotonJson)

  return NextResponse.json({
    ok: true,
    provider: 'visa_mastercard',
    action: 'info-boton',
    data: {
      extendSessionId,
      payload: infoBotonJson.data || {},
    },
  })
}

async function handleVnClientIp() {
  const clientIpResponse = await fetch('https://apiprod.vnforapps.com/api.ecommerce/v2/clientip', {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
  })
  const clientIpJson = await clientIpResponse.json().catch(() => ({})) as Record<string, unknown>

  return NextResponse.json(
    {
      ok: clientIpResponse.ok,
      provider: 'visa_mastercard',
      action: 'vn-clientip',
      data: clientIpJson,
    },
    { status: clientIpResponse.ok ? 200 : 502 },
  )
}

async function handleVnMerchantConfig() {
  const configResponse = await fetch(`https://apiprod.vnforapps.com/api.ecommerce/v2/configuration/merchant/${VISA_MERCHANT_ID}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
  })
  const configJson = await configResponse.json().catch(() => ({})) as Record<string, unknown>

  return NextResponse.json(
    {
      ok: configResponse.ok,
      provider: 'visa_mastercard',
      action: 'vn-merchant-config',
      merchantId: VISA_MERCHANT_ID,
      data: configJson,
    },
    { status: configResponse.ok ? 200 : 502 },
  )
}

async function handleVnExtendSession(payload: CheckoutBody) {
  const extendSessionId = String(payload.extendSessionId || '').trim()

  if (!extendSessionId) {
    return NextResponse.json(
      {
        ok: false,
        provider: 'visa_mastercard',
        action: 'vn-extend-session',
        error: 'extendSessionId es obligatorio.',
      },
      { status: 400 },
    )
  }

  const extendResponse = await fetch(
    `https://apiprod.vnforapps.com/api.ecommerce/v2/session/management/extend/${VISA_MERCHANT_ID}/${extendSessionId}`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
    },
  )
  const extendJson = await extendResponse.json().catch(() => ({})) as Record<string, unknown>

  return NextResponse.json(
    {
      ok: extendResponse.ok,
      provider: 'visa_mastercard',
      action: 'vn-extend-session',
      extendSessionId,
      data: extendJson,
    },
    { status: extendResponse.ok ? 200 : 502 },
  )
}

async function handleVnDocumentTypes() {
  const documentTypeResponse = await fetch('https://static-content.vnforapps.com/v2/json/documentTypeEN.json', {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
  })

  const documentTypeJson = await documentTypeResponse.json().catch(() => ({})) as Record<string, unknown>

  return NextResponse.json(
    {
      ok: documentTypeResponse.ok,
      provider: 'visa_mastercard',
      action: 'vn-document-types',
      data: documentTypeJson,
    },
    { status: documentTypeResponse.ok ? 200 : 502 },
  )
}

async function handleVisaMastercardContinuePreview(payload: CheckoutBody, request: NextRequest) {
  const infoBotonResponse = await handleVisaMastercardInfoBoton(payload, request)

  const infoBotonJson = (await infoBotonResponse.json().catch(() => ({}))) as {
    ok?: boolean
    error?: string
    data?: {
      extendSessionId?: string
      payload?: Record<string, unknown>
    }
  }

  if (!infoBotonResponse.ok || !infoBotonJson.ok) {
    return NextResponse.json(
      {
        ok: false,
        provider: 'visa_mastercard',
        action: 'continue-preview',
        error: infoBotonJson.error || 'No se pudo ejecutar info-boton.',
      },
      { status: 502 },
    )
  }


  const clientIpResponse = await handleVnClientIp()
  const merchantConfigResponse = await handleVnMerchantConfig()

  const extendSessionId = infoBotonJson.data?.extendSessionId || ''

  const extendResponse = await handleVnExtendSession({
    extendSessionId,
  })

  const documentTypesResponse = await handleVnDocumentTypes()


  const clientIpJson = await clientIpResponse.json().catch(() => ({}))
  const merchantConfigJson = await merchantConfigResponse.json().catch(() => ({}))
  const extendJson = await extendResponse.json().catch(() => ({}))
  const documentTypesJson = await documentTypesResponse.json().catch(() => ({}))


  /**
   * CONFIG QUE USA window.VisanetCheckout.configure()
   */
  const configuration = {
    sessiontoken: extendSessionId,

    merchantid: VISA_MERCHANT_ID,

    method: 'POST',

    channel: 'web',

    merchantname: 'SUNARP - SPRL',

    purchasenumber: payload.purchase,

    cardholdername: payload.nombre,

    cardholderlastname: payload.apellido,

    cardholderemail: payload.email,

    amount: payload.importe,

    expirationminutes: 20,

    timeouturl: 'about:blank',

    merchantlogo:
      'https://www.sunarp.gob.pe/seccion/img/bg.png',

    action:
      merchantConfigJson?.data?.action ||
      '',

    currency: 'PEN',

    recurrenceamount: '0.00',

    isrecurrence: false,

    complete: function(response: unknown) {
      console.log('PAGO COMPLETADO VISA', response)
    },
  }


  return NextResponse.json({
    ok: true,
    provider: 'visa_mastercard',
    action: 'continue-preview',

    data: {

      configuration,

      extendSessionId,

      infoBoton: infoBotonJson,

      clientIp: clientIpJson,

      merchantConfig: merchantConfigJson,

      extendSession: extendJson,

      documentTypes: documentTypesJson,
    },
  })
}

const CHECKOUT_HANDLERS: Record<string, CheckoutHandler> = {
  'visa_mastercard:check-monto': handleVisaMastercardCheckMonto,
  'visa_mastercard:info-boton': handleVisaMastercardInfoBoton,
  'visa_mastercard:vn-clientip': async () => handleVnClientIp(),
  'visa_mastercard:vn-merchant-config': async () => handleVnMerchantConfig(),
  'visa_mastercard:vn-extend-session': async payload => handleVnExtendSession(payload),
  'visa_mastercard:vn-document-types': async () => handleVnDocumentTypes(),
  'visa_mastercard:continue-preview': handleVisaMastercardContinuePreview,
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CheckoutBody

    const provider = String(body.provider || 'visa_mastercard').trim() as CheckoutProvider
    const action = String(body.action || 'check-monto').trim() as CheckoutAction

    const montoRaw = String(body.monto || body.importe || '').trim()
    const requiresMonto = action === 'check-monto' || action === 'continue-preview' || action === 'info-boton'
    const montoNormalized = requiresMonto ? normalizeMonto(montoRaw) : null

    if (requiresMonto && !montoNormalized) {
      return NextResponse.json({ ok: false, error: 'monto/importe inválido.' }, { status: 400 })
    }

    const payloadWithMonto: CheckoutBody = {
      ...body,
      monto: montoNormalized || undefined,
      importe: montoNormalized || body.importe,
    }

    const handlerKey = `${provider}:${action}`
    const handler = CHECKOUT_HANDLERS[handlerKey]

    if (!handler) {
      return NextResponse.json(
        { ok: false, error: `Flujo no soportado (${handlerKey}).` },
        { status: 400 },
      )
    }

    return handler(payloadWithMonto, request)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al procesar checkout.'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
