import { createHash } from 'node:crypto'

import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

const CATALOGO_URL =
  'https://api06-catalogo-sunarp-sprl.apps.ocp-prod.sunarp.gob.pe/v1/sunarp-services/catalogo/listarPublicidadCertificados'

type CatalogRequestBody = {
  codArea?: string
  tipoCert?: string
}

type CatalogResponse = {
  success: boolean
  data: Array<{
    certificadoID: number
    codGrupoLibroArea: number
    nombreCertificado: string
    desGrupoLibroArea: string
    tpoCertificado: string
  }> | null
  response?: {
    codigo: string
    titulo: string
    tipo: string
    mensaje: string
  }
}

function fingerprintToken(token: string) {
  return createHash('sha256').update(token).digest('hex').slice(0, 12)
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CatalogRequestBody
    const codArea = String(body.codArea ?? '').trim()
    const tipoCert = String(body.tipoCert ?? '').trim()

    console.log('[SPRL catalog] incoming request:', {
      url: request.url,
      host: request.headers.get('host'),
      xForwardedHost: request.headers.get('x-forwarded-host'),
      xForwardedProto: request.headers.get('x-forwarded-proto'),
      codArea,
      tipoCert,
      hasCookie: Boolean(request.cookies.get('sprl_access_token')?.value),
      hasAuthHeader: Boolean(request.headers.get('authorization')),
      cookieNames: request.cookies.getAll().map(cookie => cookie.name),
    })

    if (!codArea || !tipoCert) {
      return NextResponse.json(
        { success: false, data: null, response: { codigo: '400', titulo: 'ERROR', tipo: 'E', mensaje: 'codArea y tipoCert son requeridos.' } },
        { status: 400 },
      )
    }

    const token =
      request.cookies.get('sprl_access_token')?.value ||
      request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
      process.env.SPRL_CATALOGO_TOKEN ||
      ''

    console.log('[SPRL catalog] token resolution:', {
      fromCookie: Boolean(request.cookies.get('sprl_access_token')?.value),
      fromAuthHeader: Boolean(request.headers.get('authorization')),
      fromEnv: Boolean(process.env.SPRL_CATALOGO_TOKEN),
      tokenLength: token.length,
      tokenFingerprint: token ? fingerprintToken(token) : null,
    })

    if (!token) {
      console.log('[SPRL catalog] missing token, returning 401')
      return NextResponse.json(
        { success: false, data: null, response: { codigo: '401', titulo: 'ERROR', tipo: 'E', mensaje: 'Token SPRL expirado o no autenticado.' } },
        { status: 401 },
      )
    }

    const response = await fetch(CATALOGO_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/plain, */*',
        Authorization: `Bearer ${token}`,
        Origin: 'https://sprl.sunarp.gob.pe',
        Referer: 'https://sprl.sunarp.gob.pe/',
      },
      body: JSON.stringify({ codArea, tipoCert }),
    })

    const text = await response.text()
    console.log('[SPRL catalog] upstream response:', {
      status: response.status,
      ok: response.ok,
      bodyPreview: text.slice(0, 250),
    })
    let json: unknown = null
    try {
      json = JSON.parse(text)
    } catch {
      json = null
    }

    if (!response.ok) {
      const status = response.status
      const bodyText = text.toLowerCase()
      const tokenExpired =
        status === 401 ||
        status === 403 ||
        bodyText.includes('token') ||
        bodyText.includes('expir') ||
        bodyText.includes('autentic') ||
        bodyText.includes('no ingresa un token')

      console.log('[SPRL catalog] upstream auth classification:', {
        status,
        tokenExpired,
        hasTokenText: bodyText.includes('token'),
        hasExpiredText: bodyText.includes('expir'),
        hasAuthText: bodyText.includes('autentic'),
        hasMissingTokenText: bodyText.includes('no ingresa un token'),
      })

      if (tokenExpired) {
        console.log('[SPRL catalog] token expired or not authenticated detected')
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
          { status: 401 },
        )
      }

      return NextResponse.json(
        json ?? {
          success: false,
          data: null,
          response: {
            codigo: String(response.status),
            titulo: 'ERROR',
            tipo: 'E',
            mensaje: 'El catálogo SUNARP respondió con error.',
          },
        },
        { status: response.status },
      )
    }

    return NextResponse.json(json)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al consultar el catálogo'
    console.error('[SPRL catalog] error:', message)
    return NextResponse.json(
      { success: false, data: null, response: { codigo: '500', titulo: 'ERROR', tipo: 'E', mensaje: message } },
      { status: 500 },
    )
  }
}