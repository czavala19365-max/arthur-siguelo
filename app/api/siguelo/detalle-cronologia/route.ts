import { NextRequest, NextResponse } from 'next/server'
import { getTituloById } from '@/lib/supabase'
import { detalleTituloSunarp, obtenerEsquelaSunarp } from '@/lib/scraper'

type CachedCronologia = {
  expiresAt: number
  payload: { entries: unknown[] }
}

const CRONOLOGIA_CACHE_TTL_MS = 45_000
const cronologiaCache = new Map<string, CachedCronologia>()

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

  const cached = cronologiaCache.get(id)
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.payload)
  }

  try {
    const entries = await detalleTituloSunarp({
      oficina_registral: titulo.oficina_registral,
      anio_titulo: titulo.anio_titulo,
      numero_titulo: titulo.numero_titulo,
      tipo_registro: titulo.tipo_registro,
      area_registral: titulo.area_registral,
    })

    const requiresEsquela = entries.some(
      (mov) => mov.desEstado === 'OBSERVADO' && mov.etapa === 'SECCION REGISTRAL'
    )

    const esquelaResponse = requiresEsquela
      ? await obtenerEsquelaSunarp({
        oficina_registral: titulo.oficina_registral,
        anio_titulo: titulo.anio_titulo,
        numero_titulo: titulo.numero_titulo,
        area_registral: titulo.area_registral,
      }).catch(() => null)
      : null

    const esquelas = esquelaResponse ? (esquelaResponse.lstEsquela ?? esquelaResponse) : []

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
    const entriesFinal = entriesConPdf

    const payload = { entries: entriesFinal }
    cronologiaCache.set(id, {
      expiresAt: Date.now() + CRONOLOGIA_CACHE_TTL_MS,
      payload,
    })

    return NextResponse.json(payload)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al obtener cronología.'
    return NextResponse.json({ error: msg }, { status: 422 })
  }
}
