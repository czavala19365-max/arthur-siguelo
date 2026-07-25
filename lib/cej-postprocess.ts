import { clasificarMovimientoCEJ } from './ai-service'
import { enviarAlertaMovimiento } from './alert-service'
import {
  addMovimientoJudicial,
  getAlertaConfigParaCaso,
  logNotificacionJudicial,
  updateCaso,
  updateMovimientoJudicial,
  type Caso,
} from './judicial-db'
import type { CejCaseData } from './cej-scraper'

export async function procesarCejScrapeEnCaso(
  caso: Caso,
  scrapeResult: CejCaseData,
): Promise<{ movimientosGuardados: number }> {
  const actuaciones = Array.isArray(scrapeResult.actuaciones) ? scrapeResult.actuaciones : []
  const partesScrape = Array.isArray(scrapeResult.partes) ? scrapeResult.partes : []

  const movimientos = actuaciones.map(a => ({
    fecha: a.fecha,
    acto: a.acto,
    folio: a.folio,
    sumilla: a.sumilla,
    tieneDocumento: a.tieneDocumento,
    documentoUrl: a.documentoUrl,
  }))

  const first =
    movimientos.length > 0
      ? [...movimientos].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())[0]
      : null

  const etapaProcesal = scrapeResult.etapa || scrapeResult.estadoProceso || ''
  const partesText = partesScrape.map(p => `${p.rol}: ${p.nombre}`).join(' | ') || null

  await updateCaso(caso.id, {
    ultimo_movimiento: first?.sumilla || first?.acto || null,
    ultimo_movimiento_fecha: first?.fecha || null,
    etapa_procesal: etapaProcesal || null,
    juez: scrapeResult.juez || null,
    organo_jurisdiccional: scrapeResult.organoJurisdiccional || null,
    partes: partesText,
    estado_hash: scrapeResult.hash || null,
    last_checked: scrapeResult.scrapedAt,
  })

  const rows: Array<{ id: number; mov: (typeof movimientos)[0] }> = []
  for (const mov of movimientos) {
    try {
      const rowId = await addMovimientoJudicial(caso.id, {
        fecha: mov.fecha,
        acto: mov.acto,
        folio: mov.folio,
        sumilla: mov.sumilla,
        es_nuevo: true,
        urgencia: 'info',
        ai_sugerencia: null,
        tiene_documento: mov.tieneDocumento,
        documento_url: mov.documentoUrl || null,
      })
      rows.push({ id: rowId, mov })
    } catch (movErr) {
      console.error('[CEJ Postprocess] addMovimientoJudicial failed:', movErr)
    }
  }

  console.log(`[CEJ Postprocess] caso ${caso.id} — ${rows.length} movimientos guardados`)

  let mostRecentToAlert: { mov: (typeof movimientos)[0]; cls: { urgencia: 'alta' | 'normal' | 'info'; sugerencia: string } } | null = null
  for (const { id, mov } of rows) {
    const cls = await clasificarMovimientoCEJ(
      mov.acto ?? '',
      mov.sumilla ?? '',
      caso.numero_expediente,
    ).catch(() => ({ urgencia: 'info' as const, sugerencia: 'Revisar movimiento en CEJ.' }))

    try {
      await updateMovimientoJudicial(id, { urgencia: cls.urgencia, ai_sugerencia: cls.sugerencia })
    } catch (e) {
      console.error('[CEJ Postprocess] updateMovimientoJudicial failed:', e)
    }

    if (!mostRecentToAlert) {
      mostRecentToAlert = { mov, cls }
    }
  }

  if (mostRecentToAlert) {
    try {
      const cfg = await getAlertaConfigParaCaso(caso.id)
      if (cfg) {
        const { mov, cls } = mostRecentToAlert
        const nivel: 'alta' | 'media' | 'baja' =
          cls.urgencia === 'alta' ? 'alta' : cls.urgencia === 'normal' ? 'media' : 'baja'
        const descripcion = mov.sumilla || mov.acto || 'Movimiento judicial'

        const alertaResult = await enviarAlertaMovimiento(
          {
            expedienteId: String(caso.id),
            numeroExpediente: caso.numero_expediente,
            descripcion,
            nivelUrgencia: nivel,
            sugerenciaIA: cls.sugerencia || 'Revisar movimiento en CEJ.',
            casoNombre: caso.alias || caso.cliente || undefined,
            documentoUrl: mov.documentoUrl || null,
          },
          cfg,
        )

        for (const canal of alertaResult.canalesExitosos) {
          await logNotificacionJudicial(caso.id, canal, descripcion, nivel, cls.sugerencia || '', true)
        }
        if (!alertaResult.enviado) {
          await logNotificacionJudicial(caso.id, 'ninguno', descripcion, nivel, cls.sugerencia || '', false)
        }
      }
    } catch (e) {
      console.error('[CEJ Postprocess] Alert send failed:', e)
    }
  }

  return { movimientosGuardados: rows.length }
}