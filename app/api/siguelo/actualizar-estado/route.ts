import { NextResponse } from 'next/server'
import { getTitulos, actualizarEstadoTitulo, registrarCambioEstado, getUltimoEstado } from '@/lib/supabase'
import { consultarTitulo, detalleTituloSunarp } from '@/lib/scraper'
import { enviarAlertaEmail, enviarAlertaWhatsApp } from '@/lib/alertas'
import { normalizarEstado } from '@/lib/estados'
import type { CronResumen, CronDetalleTitulo } from '@/types'

/**
 * POST /api/siguelo/actualizar-estado
 *
 * Actualización manual del estado de todos los títulos activos.
 * Misma lógica que el cron job pero invocado desde la UI.
 * Secuencial para no saturar la API de SUNARP ni 2captcha.
 */
export async function POST() {
  try {
    const titulos = await getTitulos()

    if (titulos.length === 0) {
      return NextResponse.json({
        total: 0, exitosos: 0, conCambios: 0, errores: 0, detalle: [],
      } satisfies CronResumen)
    }

    const resumen: CronResumen = {
      total:      titulos.length,
      exitosos:   0,
      conCambios: 0,
      errores:    0,
      detalle:    [],
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
            titulo_id:       titulo.id,
            estado_anterior: estadoAnterior!,
            estado_nuevo:    resultado.estado,
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

        // ── Fecha real de ingreso a EN CALIFICACIÓN (desde cronología SUNARP) ─────
        // Se consulta cuando: (a) el título acaba de entrar a EN CALIFICACIÓN, o
        // (b) el título ya estaba en EN CALIFICACIÓN pero aún no tenemos la fecha exacta.
        // La cronología tiene el campo `fecha` con la fecha real según SUNARP,
        // a diferencia de detectado_en (que es cuando nuestro sistema lo detectó).
        let fechaIngresoCalif: string | undefined = undefined
        const estadoNorm = normalizarEstado(resultado.estado)

        if (estadoNorm === 'EN CALIFICACION' && (hayCambio || !titulo.fecha_ingreso_calificacion)) {
          try {
            const cronologia = await detalleTituloSunarp({
              oficina_registral: titulo.oficina_registral,
              anio_titulo:       titulo.anio_titulo,
              numero_titulo:     titulo.numero_titulo,
              tipo_registro:     titulo.tipo_registro,
              area_registral:    titulo.area_registral,
            })

            const califEntries = cronologia.filter(
              e => normalizarEstado(e.desEstado) === 'EN CALIFICACION'
            )

            if (califEntries.length > 0) {
              // Ordenar por secuencia desc para obtener la entrada más reciente
              califEntries.sort((a, b) => (parseInt(b.secuencia) || 0) - (parseInt(a.secuencia) || 0))
              fechaIngresoCalif = califEntries[0].fecha
              console.log(`[actualizar-estado] fecha_ingreso_calificacion para ${titulo.numero_titulo}: ${fechaIngresoCalif}`)
            }
          } catch (err) {
            // No es fatal — el título se actualiza igual, sin la fecha exacta de calificación
            console.warn(`[actualizar-estado] cronología ${titulo.numero_titulo}:`, err instanceof Error ? err.message : err)
          }
        }

        await actualizarEstadoTitulo(titulo.id, resultado.estado, resultado.areaRegistral, resultado.numeroPartida, {
          fecha_presentacion:       resultado.fechaHoraPresentacion,
          fecha_vencimiento:        resultado.fechaVencimiento,
          lugar_presentacion:       resultado.lugarPresentacion,
          nombre_presentante:       resultado.nombrePresentante,
          tipo_registro:            resultado.tipoRegistro,
          monto_devolucion:         resultado.montoDevo,
          indi_prorroga:            resultado.indiPror,
          indi_suspension:          resultado.indiSusp,
          pagos:                    resultado.lstPagos,
          actos:                    resultado.lstActos,
          fecha_ingreso_calificacion: fechaIngresoCalif,
        })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error desconocido'
        console.error(`[actualizar-estado] título ${titulo.numero_titulo}:`, msg)
        item.error = msg
        resumen.errores++
      }

      resumen.detalle.push(item)
    }

    console.log(`[actualizar-estado] completado: ${resumen.exitosos}/${resumen.total} ok, ${resumen.conCambios} cambios, ${resumen.errores} errores`)
    return NextResponse.json(resumen)

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido al actualizar títulos.'
    console.error('[actualizar-estado] error fatal:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
