import { NextResponse } from 'next/server'
import { getTitulos, actualizarEstadoTitulo, registrarCambioEstado, getUltimoEstado } from '@/lib/supabase'
import { consultarTitulo } from '@/lib/scraper'
import { enviarAlertaEmail, enviarAlertaWhatsApp } from '@/lib/alertas'
import type { CronResumen, CronDetalleTitulo } from '@/types'

/**
 * POST /api/siguelo/actualizar-estado
 *
 * Actualización manual del estado de todos los títulos activos.
 * Misma lógica que el cron job pero invocado desde la UI.
 * Secuencial para no saturar la API de SUNARP ni 2captcha.
 */
export async function POST() {
  const titulos = await getTitulos()

  if (titulos.length === 0) {
    return NextResponse.json({
      total: 0, exitosos: 0, conCambios: 0, errores: 0, detalle: [],
    } satisfies CronResumen)
  }

  const resumen: CronResumen = {
    total:     titulos.length,
    exitosos:  0,
    conCambios: 0,
    errores:   0,
    detalle:   [],
  }

  for (const titulo of titulos) {
    const item: CronDetalleTitulo = {
      id:                titulo.id,
      numero_titulo:     titulo.numero_titulo,
      oficina_registral: titulo.oficina_registral,
    }

    try {
      const resultado = await consultarTitulo({
        oficina_registral: titulo.oficina_registral,
        anio_titulo:       titulo.anio_titulo,
        numero_titulo:     titulo.numero_titulo,
      })

      item.estado = resultado.estado
      resumen.exitosos++

      const estadoAnterior = await getUltimoEstado(titulo.id)
      const hayCambio = estadoAnterior !== null && estadoAnterior !== resultado.estado

      if (hayCambio) {
        await registrarCambioEstado({
          titulo_id:      titulo.id,
          estado_anterior: estadoAnterior!,
          estado_nuevo:   resultado.estado,
        })

        const datosAlerta = {
          titulo,
          estadoAnterior: estadoAnterior!,
          estadoNuevo:    resultado.estado,
          detectadoEn:    new Date().toISOString(),
        }

        await Promise.allSettled([
          enviarAlertaEmail(datosAlerta),
          enviarAlertaWhatsApp(datosAlerta),
        ])

        resumen.conCambios++
        item.cambio = true
      }

      await actualizarEstadoTitulo(titulo.id, resultado.estado, resultado.areaRegistral, resultado.numeroPartida, {
        fecha_presentacion: resultado.fechaHoraPresentacion,
        fecha_vencimiento:  resultado.fechaVencimiento,
        lugar_presentacion: resultado.lugarPresentacion,
        nombre_presentante: resultado.nombrePresentante,
        tipo_registro:      resultado.tipoRegistro,
        monto_devolucion:   resultado.montoDevo,
        indi_prorroga:      resultado.indiPror,
        indi_suspension:    resultado.indiSusp,
        pagos:              resultado.lstPagos,
        actos:              resultado.lstActos,
      })
    } catch (err) {
      item.error = err instanceof Error ? err.message : 'Error desconocido'
      resumen.errores++
    }

    resumen.detalle.push(item)
  }

  return NextResponse.json(resumen)
}
