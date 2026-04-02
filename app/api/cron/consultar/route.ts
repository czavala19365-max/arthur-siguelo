import { NextRequest, NextResponse } from 'next/server'
import { getTitulos, actualizarEstadoTitulo, registrarCambioEstado, getUltimoEstado } from '@/lib/supabase'
import { consultarTitulo } from '@/lib/scraper'
import type { CronResumen, CronDetalleTitulo } from '@/types'

/**
 * GET /api/cron/consultar
 *
 * Llamado por Vercel Cron Jobs 3 veces al día.
 * Protegido con CRON_SECRET para que solo Vercel pueda ejecutarlo.
 */
export async function GET(request: NextRequest) {
  // ── Validar secret de Vercel Cron ────────────────────────────────────────
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }

  const titulos = await getTitulos()

  if (titulos.length === 0) {
    return NextResponse.json({ message: 'Sin títulos para consultar.', total: 0 })
  }

  const resumen: CronResumen = {
    total: titulos.length,
    exitosos: 0,
    conCambios: 0,
    errores: 0,
    detalle: [],
  }

  // ── Consultar cada título de forma secuencial ────────────────────────────
  // Secuencial (no paralelo) para no saturar la API de SUNARP ni 2captcha
  for (const titulo of titulos) {
    const item: CronDetalleTitulo = {
      id: titulo.id,
      numero_titulo: titulo.numero_titulo,
      oficina_registral: titulo.oficina_registral,
    }

    try {
      const resultado = await consultarTitulo({
        oficina_registral: titulo.oficina_registral,
        anio_titulo: titulo.anio_titulo,
        numero_titulo: titulo.numero_titulo,
      })

      item.estado = resultado.estado
      resumen.exitosos++

      // ── Comparar con estado anterior ─────────────────────────────────────
      const estadoAnterior = await getUltimoEstado(titulo.id)
      const hayCAmbio = estadoAnterior !== null && estadoAnterior !== resultado.estado

      if (hayCAmbio) {
        await registrarCambioEstado({
          titulo_id: titulo.id,
          estado_anterior: estadoAnterior!,
          estado_nuevo: resultado.estado,
        })
        resumen.conCambios++
        item.cambio = true
      }

      // Siempre actualizar el estado actual y timestamp de última consulta
      await actualizarEstadoTitulo(titulo.id, resultado.estado)
    } catch (err) {
      item.error = err instanceof Error ? err.message : 'Error desconocido'
      resumen.errores++
    }

    resumen.detalle.push(item)
  }

  return NextResponse.json(resumen)
}
