import { NextResponse } from 'next/server'
import { getTitulos } from '@/lib/supabase'
import { generarExcelTitulos } from '@/lib/excel'

/**
 * GET /api/siguelo/descargar-reporte-excel
 *
 * Genera y devuelve el reporte de títulos activos en formato Excel (.xlsx).
 * Compatible con todos los navegadores incluyendo Safari iOS.
 */
export async function GET() {
  const titulos = await getTitulos()
  console.log(`[descargar-reporte-excel] Generando Excel con ${titulos.length} títulos`)

  const buffer = generarExcelTitulos(titulos)
  const fecha  = new Date().toLocaleDateString('es-PE', { timeZone: 'America/Lima' }).replace(/\//g, '-')

  // NextResponse requiere Uint8Array/ArrayBuffer, no Buffer de Node
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type':        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="reporte-titulos-arthur-${fecha}.xlsx"`,
      'Cache-Control':       'no-store',
    },
  })
}
