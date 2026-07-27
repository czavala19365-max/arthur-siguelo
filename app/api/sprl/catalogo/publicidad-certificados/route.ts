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

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CatalogRequestBody
    const codArea = String(body.codArea ?? '').trim()
    const tipoCert = String(body.tipoCert ?? '').trim()

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

    if (!token) {
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

      if (tokenExpired) {
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
    return NextResponse.json(
      { success: false, data: null, response: { codigo: '500', titulo: 'ERROR', tipo: 'E', mensaje: message } },
      { status: 500 },
    )
  }
}