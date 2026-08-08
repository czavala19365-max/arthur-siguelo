import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

type CatalogRequestBody = {
codArea?: string
tipoCert?: string
}

export async function POST(request: NextRequest) {
try {
const body = (await request.json()) as CatalogRequestBody


const codArea = String(body.codArea ?? '').trim()
const tipoCert = String(body.tipoCert ?? '').trim()

// ============================================================
// 1. VALIDAR DATOS
// ============================================================

if (!codArea || !tipoCert) {
  return NextResponse.json(
    {
      success: false,
      data: null,
      response: {
        codigo: '400',
        titulo: 'ERROR',
        tipo: 'E',
        mensaje: 'codArea y tipoCert son requeridos.',
      },
    },
    { status: 400 }
  )
}

// ============================================================
// 2. OBTENER TOKEN Y COOKIE DEL LOGIN SPRL
// ============================================================

const tokenCookie = request.cookies.get('sprl_access_token')
const remoteCookie = request.cookies.get('sprl_remote_cookie')

const accessToken = tokenCookie?.value || ''
const sunarpCookieHeader = remoteCookie?.value || ''

console.log('[SPRL catalog] Datos recibidos:', {
  codArea,
  tipoCert,
  hasAccessToken: Boolean(accessToken),
  accessTokenLength: accessToken.length,
  hasCookie: Boolean(sunarpCookieHeader),
  cookieLength: sunarpCookieHeader.length,
})

// ============================================================
// 3. VALIDAR TOKEN
// ============================================================

if (!accessToken) {
  console.log('[SPRL catalog] No existe sprl_access_token')

  return NextResponse.json(
    {
      success: false,
      data: null,
      response: {
        codigo: '401',
        titulo: 'ERROR',
        tipo: 'E',
        mensaje: 'Token SPRL expirado o no autenticado.',
      },
    },
    { status: 401 }
  )
}

// ============================================================
// 4. VALIDAR COOKIE
// ============================================================

if (!sunarpCookieHeader) {
  console.log('[SPRL catalog] No existe sprl_remote_cookie')

  return NextResponse.json(
    {
      success: false,
      data: null,
      response: {
        codigo: '401',
        titulo: 'ERROR',
        tipo: 'E',
        mensaje: 'Cookie SPRL no disponible.',
      },
    },
    { status: 401 }
  )
}

// ============================================================
// 5. URL DEL SCRAPER SERVICE
// ============================================================

const scraperUrl = String(
  process.env.SPRL_SCRAPER_URL || ''
).trim()

if (!scraperUrl) {
  console.error('[SPRL catalog] Falta SPRL_SCRAPER_URL')

  return NextResponse.json(
    {
      success: false,
      data: null,
      response: {
        codigo: '500',
        titulo: 'ERROR',
        tipo: 'E',
        mensaje: 'SPRL_SCRAPER_URL no está configurado.',
      },
    },
    { status: 500 }
  )
}

const catalogUrl =
  `${scraperUrl.replace(/\/+$/, '')}/sprl/catalog`

// ============================================================
// 6. LLAMAR A RAILWAY
// ============================================================

console.log('[SPRL catalog] Calling Railway:', {
  url: catalogUrl,
  codArea,
  tipoCert,
  hasAccessToken: Boolean(accessToken),
  hasCookie: Boolean(sunarpCookieHeader),
})

const response = await fetch(catalogUrl, {
  method: 'POST',

  headers: {
    'Content-Type': 'application/json',
  },

  body: JSON.stringify({
    codArea,
    tipoCert,
    accessToken,
    sunarpCookieHeader,
  }),

  signal: AbortSignal.timeout(30000),
})

// ============================================================
// 7. LEER RESPUESTA DE RAILWAY
// ============================================================

const text = await response.text()

console.log('[SPRL catalog] Railway response:', {
  status: response.status,
  ok: response.ok,
  bodyLength: text.length,
  bodyPreview: text.slice(0, 300),
})

// ============================================================
// 8. PARSEAR JSON
// ============================================================

let json: unknown = null

try {
  json = JSON.parse(text)
} catch {
  json = null
}

// ============================================================
// 9. DEVOLVER RESPUESTA AL FRONTEND
// ============================================================

if (json !== null) {
  return NextResponse.json(json, {
    status: response.status,
  })
}

return NextResponse.json(
  {
    success: false,
    data: null,
    response: {
      codigo: String(response.status),
      titulo: 'ERROR',
      tipo: 'E',
      mensaje:
        text || 'Railway devolvió una respuesta vacía.',
    },
  },
  {
    status: response.status,
  }
)


} catch (error) {
const message =
error instanceof Error
? error.message
: String(error)


console.error('[SPRL catalog] ERROR:', message)

return NextResponse.json(
  {
    success: false,
    data: null,
    response: {
      codigo: '500',
      titulo: 'ERROR',
      tipo: 'E',
      mensaje: message,
    },
  },
  {
    status: 500,
  }
)


}
}
