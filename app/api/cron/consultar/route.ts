import { NextRequest, NextResponse } from 'next/server'
import { getTitulos, actualizarEstadoTitulo, registrarCambioEstado, getUltimoEstado } from '@/lib/supabase'
import { consultarTitulo, detalleTituloSunarp } from '@/lib/scraper'
import { enviarAlertaEmail, enviarAlertaWhatsApp } from '@/lib/alertas'
import { normalizarEstado } from '@/lib/estados'
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
      const hayCambio = estadoAnterior !== null && estadoAnterior !== resultado.estado

      if (hayCambio) {
        const detectadoEn = new Date().toISOString()

        // 1. Guardar en historial
        await registrarCambioEstado({
          titulo_id: titulo.id,
          estado_anterior: estadoAnterior!,
          estado_nuevo: resultado.estado,
        })

        // 2. Enviar alertas (email + WhatsApp en paralelo, sin bloquear si una falla)
        const datosAlerta = {
          titulo,
          estadoAnterior: estadoAnterior!,
          estadoNuevo: resultado.estado,
          detectadoEn,
        }

        const [emailResult, waResult] = await Promise.allSettled([
          enviarAlertaEmail(datosAlerta),
          enviarAlertaWhatsApp(datosAlerta),
        ])

        if (emailResult.status === 'rejected') {
          console.error(`[cron] Email falló para ${titulo.numero_titulo}:`, emailResult.reason)
        }
        if (waResult.status === 'rejected') {
          console.error(`[cron] WhatsApp falló para ${titulo.numero_titulo}:`, waResult.reason)
        }

        resumen.conCambios++
        item.cambio = true
      }

      // ── Fecha real de ingreso a EN CALIFICACIÓN (desde cronología SUNARP) ─
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
            califEntries.sort((a, b) => (parseInt(b.secuencia) || 0) - (parseInt(a.secuencia) || 0))
            fechaIngresoCalif = califEntries[0].fecha
            console.log(`[cron] fecha_ingreso_calificacion para ${titulo.numero_titulo}: ${fechaIngresoCalif}`)
          }
        } catch (err) {
          console.warn(`[cron] cronología ${titulo.numero_titulo}:`, err instanceof Error ? err.message : err)
        }
      }

      // Siempre actualizar el estado actual y timestamp de última consulta
      await actualizarEstadoTitulo(titulo.id, resultado.estado, resultado.areaRegistral, resultado.numeroPartida, {
        fecha_presentacion:         resultado.fechaHoraPresentacion,
        fecha_vencimiento:          resultado.fechaVencimiento,
        lugar_presentacion:         resultado.lugarPresentacion,
        nombre_presentante:         resultado.nombrePresentante,
        tipo_registro:              resultado.tipoRegistro,
        monto_devolucion:           resultado.montoDevo,
        indi_prorroga:              resultado.indiPror,
        indi_suspension:            resultado.indiSusp,
        pagos:                      resultado.lstPagos,
        actos:                      resultado.lstActos,
        fecha_ingreso_calificacion: fechaIngresoCalif,
      })
    } catch (err) {
      item.error = err instanceof Error ? err.message : 'Error desconocido'
      resumen.errores++
    }

    resumen.detalle.push(item)
  }

  return NextResponse.json(resumen)
}
