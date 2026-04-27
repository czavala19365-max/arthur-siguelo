import {
  getAllTramites,
  updateTramite,
  addHistorial,
  logNotification,
  getAllCasosActivos,
  updateCaso,
  addMovimientoJudicial,
  getAlertaConfigParaCaso,
  logNotificacionJudicial,
} from '@/lib/db'
import { scrapeTitulo } from '@/lib/sunarp-scraper'
import { scrapeCEJ } from '@/lib/cej-scraper'
import { getNextStepSuggestion } from '@/lib/ai-service'
import { sendWhatsApp, sendEmail, sendJudicialWhatsApp, sendJudicialEmail } from '@/lib/notifications'
import { enviarAlertaMovimiento } from '@/lib/alert-service'

declare global {
  var _arthurSchedulerStarted: boolean
}

export function startScheduler() {
  if (global._arthurSchedulerStarted) return
  global._arthurSchedulerStarted = true
  console.log('[Scheduler] Starting background polling loop')
  runLoop().catch(err => console.error('[Scheduler] Fatal loop error:', err))
  runJudicialLoop().catch(err => console.error('[Scheduler Judicial] Fatal loop error:', err))
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function runLoop() {
  while (true) {
    try {
      const tramites = getAllTramites()

      for (const tramite of tramites) {
        try {
          const intervalMs = (tramite.polling_frequency_hours || 4) * 60 * 60 * 1000
          const lastChecked = tramite.last_checked ? new Date(tramite.last_checked).getTime() : 0

          if (Date.now() - lastChecked < intervalMs) continue

          console.log(`[Scheduler] Polling tramite ${tramite.id}: ${tramite.alias}`)
          const result = await scrapeTitulo(
            tramite.numero_titulo,
            tramite.anio,
            tramite.oficina_registral,
            tramite.tipo,
          )

          if (result.portalDown) {
            updateTramite(tramite.id, { last_checked: new Date().toISOString() })
            continue
          }

          const changed = result.hash !== tramite.estado_hash && result.hash !== ''

          updateTramite(tramite.id, {
            estado_actual: result.estado,
            estado_hash: result.hash,
            observacion_texto: result.observacion || undefined,
            calificador: result.calificador || undefined,
            last_checked: result.scrapedAt,
          })

          addHistorial(tramite.id, result.estado, result.observacion || null, result.hash, changed)

          if (changed) {
            const suggestion = await getNextStepSuggestion(
              result.estado,
              result.observacion || null,
              tramite.tipo,
              tramite.alias,
            ).catch(() => '')

            const msgText = `Estado actualizado: ${result.estado}`

            if (tramite.whatsapp_number) {
              const ok = await sendWhatsApp(
                tramite.whatsapp_number,
                tramite.alias,
                result.estado,
                msgText,
                suggestion,
                tramite.id,
              ).catch(() => false)
              logNotification(tramite.id, 'whatsapp', result.estado, msgText, ok)
            }

            if (tramite.email) {
              const ok = await sendEmail(
                tramite.email,
                tramite.alias,
                result.estado,
                msgText,
                suggestion,
                result.observacion || null,
                tramite.id,
              ).catch(() => false)
              logNotification(tramite.id, 'email', result.estado, msgText, ok)
            }
          }

          await sleep(2000) // rate-limit between requests
        } catch (err) {
          console.error(`[Scheduler] Error polling tramite ${tramite.id}:`, err)
        }
      }
    } catch (err) {
      console.error('[Scheduler] Loop iteration error:', err)
    }

    await sleep(5 * 60 * 1000) // check every 5 minutes
  }
}

async function runJudicialLoop() {
  while (true) {
    try {
      const casos = await getAllCasosActivos()
      for (const caso of casos) {
        try {
          const intervalMs = (caso.polling_frequency_hours || 4) * 60 * 60 * 1000
          const lastChecked = caso.last_checked ? new Date(caso.last_checked).getTime() : 0
          if (Date.now() - lastChecked < intervalMs) continue

          console.log(`[Scheduler Judicial] Polling caso ${caso.id}: ${caso.alias}`)

          const parte = caso.parte_procesal?.trim() || ''

          if (!parte) {
            console.warn(`[Scheduler Judicial] Caso ${caso.id} (${caso.alias}) sin parte_procesal configurada — saltando`)
            await updateCaso(caso.id, { last_checked: new Date().toISOString() })
            continue
          }

          const result = await scrapeCEJ(caso.numero_expediente, parte)
          await updateCaso(caso.id, { last_checked: new Date().toISOString() })
          if (!result || result.portalDown || !result.actuaciones?.length) continue

          const ultimaActuacion = result.actuaciones[0]
          const nuevoHash = ultimaActuacion?.sumilla || ''
          const changed = nuevoHash !== (caso.estado_hash || '') && nuevoHash !== ''
          if (!changed) continue

          await addMovimientoJudicial(caso.id, {
            fecha: ultimaActuacion.fecha,
            acto: ultimaActuacion.acto,
            folio: ultimaActuacion.folio || '',
            sumilla: ultimaActuacion.sumilla || '',
            es_nuevo: true,
            urgencia: 'info',
          })

          await updateCaso(caso.id, {
            estado_hash: nuevoHash,
            ultimo_movimiento: ultimaActuacion.acto,
            ultimo_movimiento_fecha: ultimaActuacion.fecha,
            last_checked: new Date().toISOString(),
          })

          const sugerencia = await getNextStepSuggestion(
            ultimaActuacion.acto,
            ultimaActuacion.sumilla || null,
            'judicial',
            caso.alias || '',
          ).catch(() => '')

          const urgencia = ['plazo', 'sentencia', 'audiencia'].some(w =>
            ultimaActuacion.acto?.toLowerCase().includes(w),
          )
            ? 'alta'
            : 'normal'

          const alertaConfig = await getAlertaConfigParaCaso(caso.id)
          if (alertaConfig) {
            const nivel = (urgencia === 'alta' ? 'alta' : 'media') as const
            const descripcion = ultimaActuacion.sumilla || ultimaActuacion.acto || ''
            const alertaResult = await enviarAlertaMovimiento(
              {
                expedienteId: String(caso.id),
                numeroExpediente: caso.numero_expediente,
                descripcion,
                nivelUrgencia: nivel,
                sugerenciaIA: sugerencia || 'Revisar movimiento en CEJ.',
                casoNombre: caso.alias || undefined,
              },
              alertaConfig
            ).catch(() => ({ enviado: false, canalesExitosos: [] as string[] }))

            for (const canal of alertaResult.canalesExitosos) {
              await logNotificacionJudicial(caso.id, canal, descripcion, nivel, sugerencia, true)
            }
            if (!alertaResult.enviado) {
              await logNotificacionJudicial(caso.id, 'ninguno', descripcion, nivel, sugerencia, false)
            }
          }

          await sleep(3000)
        } catch (err) {
          console.error(`[Scheduler Judicial] Error en caso ${caso.id}:`, err)
        }
      }
    } catch (err) {
      console.error('[Scheduler Judicial] Loop error:', err)
    }
    await sleep(5 * 60 * 1000)
  }
}
