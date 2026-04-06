import { NextRequest, NextResponse } from 'next/server'
import { getTituloById } from '@/lib/supabase'
import { detalleTituloSunarp } from '@/lib/scraper'

/**
 * GET /api/siguelo/detalle-cronologia?id={tituloId}
 *
 * Intenta obtener la cronología de movimientos del título desde SUNARP.
 * NOTA: El endpoint requiere token de sesión; si SUNARP lo rechaza por auth
 * se devuelve un error descriptivo en lugar de 500.
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
    })
    return NextResponse.json({ entries })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al obtener cronología.'
    const isAuthError =
      msg.toLowerCase().includes('rechazado') ||
      msg.toLowerCase().includes('token') ||
      msg.toLowerCase().includes('autenticaci') ||
      msg.toLowerCase().includes('sesion') ||
      msg.toLowerCase().includes('acceso')
    return NextResponse.json(
      {
        error: isAuthError
          ? 'Cronología no disponible — requiere autenticación en SUNARP'
          : msg,
        authRequired: isAuthError,
      },
      { status: 422 }
    )
  }
}
