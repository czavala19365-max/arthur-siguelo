import { NextRequest, NextResponse } from 'next/server'
import { getTituloById } from '@/lib/supabase'
import { getOficinaCodes } from '@/lib/scraper'

/**
 * GET /api/siguelo/reporte-resumen?id={tituloId}
 *
 * Genera el reporte resumen PDF de un título desde SUNARP.
 * Endpoint: imprimir-sunarp-production.apps.paas.sunarp.gob.pe/imprimir/api/ReporteST
 * Payload: plain JSON (sin encriptar, sin X-IBM-Client-Id)
 * Compatible con laptop y Safari iOS (responde con Content-Type: application/pdf).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'Parámetro id requerido.' }, { status: 400 })
  }

  const titulo = await getTituloById(id)
  if (!titulo) {
    return NextResponse.json({ error: 'Título no encontrado.' }, { status: 404 })
  }
  if (!titulo.area_registral) {
    return NextResponse.json(
      { error: 'Consulta el estado del título primero para obtener el área registral.' },
      { status: 400 }
    )
  }

  const oficinaCodes = getOficinaCodes(titulo.oficina_registral)
  if (!oficinaCodes) {
    return NextResponse.json(
      { error: `Oficina registral no reconocida: "${titulo.oficina_registral}"` },
      { status: 400 }
    )
  }

  const numeroTitulo = titulo.numero_titulo.padStart(8, '0')

  const payload = {
    codigoZona:     oficinaCodes.zona,
    codigoOficina:  oficinaCodes.oficina,
    anioTitulo:     String(titulo.anio_titulo),
    numeroTitulo,
    idAreaRegistro: titulo.area_registral,
    nombreOficina:  titulo.oficina_registral,
    ip:             '0.0.0.0',
    userApp:        'siguelo',
    userCrea:       'siguelo',
    status:         'A',
  }

  let pdfBase64: string
  try {
    const response = await fetch(
      'https://imprimir-sunarp-production.apps.paas.sunarp.gob.pe/imprimir/api/ReporteST',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    )
    if (!response.ok) {
      throw new Error(`ReporteST respondió HTTP ${response.status}`)
    }
    const data = await response.json() as {
      codigoRespuesta: string
      descripcionRespuesta?: string
      lstAnotacion?: Array<{ paginaReporte: string }>
    }
    if (data.codigoRespuesta !== '0000') {
      throw new Error(data.descripcionRespuesta ?? `Error ${data.codigoRespuesta}`)
    }
    const paginaReporte = data.lstAnotacion?.[0]?.paginaReporte
    if (!paginaReporte) {
      throw new Error('SUNARP no devolvió el reporte PDF.')
    }
    pdfBase64 = paginaReporte
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al generar el reporte.'
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  const buffer = Buffer.from(pdfBase64, 'base64')
  const filename = `reporte-${titulo.anio_titulo}-${titulo.numero_titulo}.pdf`

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length':      String(buffer.length),
      'Cache-Control':       'no-store',
    },
  })
}
