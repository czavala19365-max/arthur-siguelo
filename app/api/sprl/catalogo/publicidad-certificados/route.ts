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

const fallbackCatalog: CatalogResponse = {
  success: true,
  data: [
    {
      certificadoID: 75,
      codGrupoLibroArea: 1,
      nombreCertificado: 'Certificado Registral Inmobiliario con firma electronica',
      desGrupoLibroArea: 'Propiedad Inmueble Predial',
      tpoCertificado: 'Q',
    },
    {
      certificadoID: 85,
      codGrupoLibroArea: 1,
      nombreCertificado: 'Certificado de Cargas y Gravámenes',
      desGrupoLibroArea: 'Propiedad Inmueble Predial',
      tpoCertificado: 'G',
    },
    {
      certificadoID: 92,
      codGrupoLibroArea: 1,
      nombreCertificado: 'Certificado Positivo del Registro de Predios',
      desGrupoLibroArea: 'Propiedad Inmueble Predial',
      tpoCertificado: 'P',
    },
    {
      certificadoID: 93,
      codGrupoLibroArea: 1,
      nombreCertificado: 'Certificado Negativo del Registro de Predios',
      desGrupoLibroArea: 'Propiedad Inmueble Predial',
      tpoCertificado: 'N',
    },
    {
      certificadoID: 74,
      codGrupoLibroArea: 1,
      nombreCertificado: 'Certificado de Busqueda Catastral',
      desGrupoLibroArea: 'Propiedad Inmueble Predial',
      tpoCertificado: 'B',
    },
    {
      certificadoID: 97,
      codGrupoLibroArea: 20,
      nombreCertificado: 'Certificado de Cargas y Gravamenes Reg. Naves y Embarcaciones',
      desGrupoLibroArea: 'Registro de Embarcaciones Pesqueras',
      tpoCertificado: 'G',
    },
  ],
  response: {
    codigo: '000',
    titulo: 'INFO',
    tipo: 'I',
    mensaje: 'OPERACIÓN CORRECTA.',
  },
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
      if (codArea === '21000' && tipoCert === 'C') {
        return NextResponse.json(fallbackCatalog)
      }

      return NextResponse.json(
        { success: false, data: null, response: { codigo: '998', titulo: 'ERROR', tipo: 'E', mensaje: 'No ingresa un token' } },
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