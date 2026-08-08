import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const fetch = require('node-fetch')
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { HttpsProxyAgent } = require('https-proxy-agent')

type CatalogRequestBody = {
  codArea?: string
  tipoCert?: string
}


function getProxyAgent() {
  const proxyHost =
    process.env.SPRL_PROXY_SERVER ||
    'us.smartproxy.net'

  const proxyPort =
    process.env.SPRL_PROXY_PORT ||
    '3120'

  const proxyUser =
    process.env.SPRL_PROXY_USERNAME

  const proxyPass =
    process.env.SPRL_PROXY_PASSWORD

  if (!proxyUser || !proxyPass) {
    throw new Error('Faltan las credenciales de SmartProxy.')
  }

  const proxyUrl = `http://${proxyHost}:${proxyPort}`

  const proxyAuth = Buffer.from(
    `${proxyUser}:${proxyPass}`
  ).toString('base64')

  return new HttpsProxyAgent(proxyUrl, {
    keepAlive: true,
    rejectUnauthorized: false,
    headers: {
      'Proxy-Authorization': `Basic ${proxyAuth}`,
    },
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CatalogRequestBody

    const codArea = String(body.codArea ?? '').trim()
    const tipoCert = String(body.tipoCert ?? '').trim()

    /*
     * ============================================================
     * 1. OBTENER TOKEN
     * ============================================================
     */

    const token = request.cookies.get('sprl_access_token')

    /*
     * ============================================================
     * 2. OBTENER COOKIE SPRL
     * ============================================================
     */

    const rawCookieHeader = request.cookies.get('sprl_remote_cookie')

    console.log('[SPRL catalog] incoming request:', {
      codArea,
      tipoCert,
      hasToken: Boolean(token),
      hasCookie: Boolean(rawCookieHeader),
      cookie: rawCookieHeader,
      cookieNames: request.cookies.getAll().map(
        cookie => cookie.name
      ),
    })

    /*
     * ============================================================
     * 3. VALIDACIONES
     * ============================================================
     */

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

    if (!token) {
      console.log('[SPRL catalog] No hay accessToken')

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

    if (!rawCookieHeader) {
      console.log('[SPRL catalog] No hay cookie SPRL')

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

    /*
     * ============================================================
     * 4. DECODIFICAR COOKIE
     *
     * ESTO ES IMPORTANTE.
     *
     * El test que funcionó hizo:
     *
     * decodeURIComponent(sunarpCookieHeader)
     *
     * Por eso hacemos exactamente lo mismo aquí.
     * ============================================================
     */

    const rawCookie = rawCookieHeader?.value
    if(!rawCookie) {
      throw new Error('Cookie SPRL no tiene valor.')
    }
    let cookieHeader: string

    try {
      cookieHeader = decodeURIComponent(rawCookie)

      console.log('[SPRL catalog] Cookie decodificada:', {
        length: cookieHeader.length,
        hasJSessionId: cookieHeader.includes('JSESSIONID'),
        preview: cookieHeader.slice(0, 60),
      })
    } catch (error) {
      console.error(
        '[SPRL catalog] Error decodificando cookie:',
        error
      )

      return NextResponse.json(
        {
          success: false,
          data: null,
          response: {
            codigo: '400',
            titulo: 'ERROR',
            tipo: 'E',
            mensaje: 'La cookie SPRL no tiene un formato válido.',
          },
        },
        { status: 400 }
      )
    }

    /*
     * ============================================================
     * 5. CREAR EXACTAMENTE EL MISMO PROXY DEL TEST
     * ============================================================
     */

    const proxyAgent = getProxyAgent()

    console.log('[SPRL catalog] Proxy configurado:', {
      host:
        process.env.SPRL_PROXY_SERVER ||
        'us.smartproxy.net',

      port:
        process.env.SPRL_PROXY_PORT ||
        '3120',

      hasUser: Boolean(
        process.env.SPRL_PROXY_USERNAME 
      ),

      hasPassword: Boolean(
        process.env.SPRL_PROXY_PASSWORD 
      ),
    })

    /*
     * ============================================================
     * 6. HEADERS
     *
     * EXACTAMENTE COMO EL TEST QUE FUNCIONÓ
     * ============================================================
     */

    const requestHeaders = {
      'Content-Type': 'application/json',

      Accept: 'application/json, text/plain, */*',

      Authorization: `Bearer ${token}`,

      Cookie: cookieHeader,

      Origin: 'https://sprl.sunarp.gob.pe',

      Referer: 'https://sprl.sunarp.gob.pe/',

      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    }

    console.log('[SPRL catalog] Request SUNARP:', {
      codArea,
      tipoCert,
      token: token,
      cookie: cookieHeader,
      cookieLength: cookieHeader.length,
      hasJSessionId: cookieHeader.includes('JSESSIONID'),
    })

    /*
     * ============================================================
     * 7. FETCH
     *
     * ESTE ES EL FETCH DEL TEST QUE FUNCIONÓ
     * ============================================================
     */

    const response = await fetch(
      'https://api06-catalogo-sunarp-sprl.apps.ocp-prod.sunarp.gob.pe/v1/sunarp-services/catalogo/listarPublicidadCertificados',
      {
        method: 'POST',

        agent: proxyAgent,

        headers: requestHeaders,

        body: JSON.stringify({
          codArea,
          tipoCert,
        }),

        timeout: 30000,
      }
    )

    /*
     * ============================================================
     * 8. LEER RESPUESTA
     * ============================================================
     */

    const text = await response.text()

    console.log('[SPRL catalog] SUNARP response:', {
      status: response.status,
      ok: response.ok,
      bodyLength: text.length,
      bodyPreview: text.slice(0, 300),
    })

    /*
     * ============================================================
     * 9. PARSEAR JSON
     * ============================================================
     */

    let json: unknown = null

    try {
      json = JSON.parse(text)
    } catch {
      json = null
    }

    /*
     * ============================================================
     * 10. DEVOLVER RESPUESTA
     * ============================================================
     */

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
            text || 'SUNARP devolvió una respuesta vacía.',
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

    console.error(
      '[SPRL catalog] ERROR:',
      message
    )

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