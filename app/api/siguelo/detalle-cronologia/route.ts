import { NextRequest, NextResponse } from 'next/server'
import { getTituloById } from '@/lib/supabase'
import { detalleTituloSunarp, obtenerEsquelaSunarp} from '@/lib/scraper'
import { analizarEsquelasRegistrales } from '@/lib/registral-documento-extractor'

/**
 * GET /api/siguelo/detalle-cronologia?id={tituloId}
 *
 * Obtiene la cronología de movimientos del título desde SUNARP.
 * El campo token se envía como null (aceptado por la API pública de SUNARP).
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

  try {
    const entries = await detalleTituloSunarp({
      oficina_registral: titulo.oficina_registral,
      anio_titulo:       titulo.anio_titulo,
      numero_titulo:     titulo.numero_titulo,
      tipo_registro:     titulo.tipo_registro,
      area_registral:    titulo.area_registral,
    })

    const esquelaResponse = await obtenerEsquelaSunarp({
      oficina_registral: titulo.oficina_registral,
      anio_titulo: titulo.anio_titulo,
      numero_titulo: titulo.numero_titulo,
      area_registral: titulo.area_registral,
    })

    const esquelas = esquelaResponse.lstEsquela ?? esquelaResponse

    let esquelaIndex = 0
    const entriesConPdf = entries.map((mov) => {
      if (
        mov.desEstado === 'OBSERVADO' &&
        mov.etapa === 'SECCION REGISTRAL'
      ) {
        const pdfBase64 = esquelas[esquelaIndex]?.esquela ?? null

        esquelaIndex++

        return {
          ...mov,
          pdfBase64,
          tienePdf: Boolean(pdfBase64),
        }
      }

      return mov
    })
    // Filtrar solo los que tienen PDF
    const entriesConPdfValido = entriesConPdf.filter((e) => 'pdfBase64' in e)

    // Analizar solo los que tienen PDF
    //const entriesAnalizados = await analizarEsquelasRegistrales(entriesConPdfValido)

    // Combinar: analizados + sin PDF
    const entriesFinal = entriesConPdf.map((entry) => 
      //entriesAnalizados.find((a) => a.secuencia === entry.secuencia) ?? entry
      entry
    )

    return NextResponse.json({ 
      entries: entriesFinal
})
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al obtener cronología.'
    return NextResponse.json({ error: msg }, { status: 422 })
  }
}
