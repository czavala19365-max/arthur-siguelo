import {
  addMovimientoJudicial,
  getCasoById,
  getMovimientosByCaso,
  getAlertaConfigParaCaso,
  logNotificacionJudicial,
  updateCaso,
  updateMovimientoJudicial
} from '@/lib/judicial-db'
import type { CejCaseData } from '@/lib/cej-scraper'
import { clasificarMovimientoCEJ } from '@/lib/ai-service'
import { enviarAlertaMovimiento, type NivelUrgencia } from '@/lib/alert-service'

const CEJ_FETCH_TIMEOUT_MS = 180_000

async function fetchCejFromScraperService(numero: string, parte: string): Promise<CejCaseData> {
  const scraperUrl = process.env.CEJ_SCRAPER_URL?.trim()
  if (!scraperUrl) {
    const { scrapeCEJ } = await import('@/lib/cej-scraper')
    return scrapeCEJ(numero, parte)
  }

  const url = `${scraperUrl.replace(/\/$/, '')}/scrape`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ numero, parte }),
    signal: AbortSignal.timeout(CEJ_FETCH_TIMEOUT_MS),
  })

  let data: unknown = {}
  try {
    data = await res.json()
  } catch {
    data = {}
  }

  if (!res.ok) {
    const body = data as { error?: string; details?: string }
    const msg = body.details || body.error || res.statusText || `HTTP ${res.status}`
    console.error('[POLL] CEJ scraper service error:', res.status, msg)
    return {
      numeroExpediente: numero,
      organoJurisdiccional: '',
      distritoJudicial: '',
      juez: '',
      especialidad: '',
      proceso: '',
      etapa: '',
      estadoProceso: '',
      partes: [],
      actuaciones: [],
      totalActuaciones: 0,
      hash: '',
      portalDown: true,
      captchaDetected: false,
      captchaSolved: false,
      scrapedAt: new Date().toISOString(),
      error: msg,
    }
  }

  return data as CejCaseData
}

function movementKey(m: { fecha?: string | null; acto?: string | null; folio?: string | null; sumilla?: string | null }) {
  return `${m.fecha || ''}|${m.acto || ''}|${m.folio || ''}|${m.sumilla || ''}`
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const casoId = Number.parseInt(id, 10)
    const caso = await getCasoById(casoId)

    if (!caso) {
      return Response.json({ error: 'Caso no encontrado' }, { status: 404 })
    }

    const parte = caso.parte_procesal?.trim() || caso.partes || ''
    const result = await fetchCejFromScraperService(caso.numero_expediente, parte)

    if (result.portalDown) {
      return Response.json({
        changed: false,
        portalDown: true,
        movimientos: [],
        urgencia: 'info',
        sugerencia: 'Portal CEJ no disponible. Se mantiene el último estado conocido.',
        lastChecked: caso.last_checked,
      })
    }

    const changed = result.hash !== (caso.estado_hash || '') && result.hash !== ''
    const existing = await getMovimientosByCaso(casoId)
    const existingKeys = new Set(existing.map(m => movementKey(m)))

    console.log('[POLL] result.hash:', result.hash)
    console.log('[POLL] result.actuaciones count:', result.actuaciones?.length ?? 'undefined')
    console.log('[POLL] primera actuacion:', JSON.stringify(result.actuaciones?.[0], null, 2))

    const actuaciones = Array.isArray(result.actuaciones) ? result.actuaciones : []

    console.log('[POLL] existing movimientos en BD:', existing.length)
    console.log('[POLL] existingKeys sample:', [...existingKeys].slice(0, 2))
    const movimientos = actuaciones.map(a => ({
      fecha: a.fecha,
      acto: a.acto,
      folio: a.folio,
      sumilla: a.sumilla,
      tieneDocumento: a.tieneDocumento,
      documentoUrl: a.documentoUrl,
    }))
    const ultimoMovimiento =
      movimientos.length > 0
        ? [...movimientos].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())[0]
        : null
    const etapaProcesal = result.etapa || result.estadoProceso || ''

    const nuevos = movimientos.filter(m => !existingKeys.has(movementKey(m)))
    console.log('[POLL] nuevos a insertar:', nuevos.length)

    // 1) Guardar TODOS los nuevos en BD inmediatamente (sin IA)
    const inserted: Array<{ id: number; mov: (typeof nuevos)[0] }> = []
    for (const mov of nuevos) {
      const rowId = await addMovimientoJudicial(casoId, {
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
      inserted.push({ id: rowId, mov })
    }
    console.log('[POLL] insertados en BD:', inserted.length)

    // 2) Clasificar con IA solo el más reciente
    const enriched: Array<{ acto: string; sumilla: string; urgencia: 'alta' | 'normal' | 'info'; sugerencia: string }> = []
    if (inserted.length > 0) {
      const first = inserted[0]
      const cls = await clasificarMovimientoCEJ(
        first.mov.acto,
        first.mov.sumilla,
        caso.numero_expediente
      ).catch(() => ({ urgencia: 'info' as const, sugerencia: 'Revisar movimiento en CEJ.' }))

      // 3) Actualizar solo esa fila con el resultado de IA
      await updateMovimientoJudicial(first.id, { urgencia: cls.urgencia, ai_sugerencia: cls.sugerencia })

      enriched.push({ acto: first.mov.acto, sumilla: first.mov.sumilla, urgencia: cls.urgencia, sugerencia: cls.sugerencia })
    }

    // `ultimoMovimiento` ordena por fecha (misma intención que `result.actuaciones[0]` en la otra rama, con orden explícito).
    const last = ultimoMovimiento
    await updateCaso(casoId, {
      ultimo_movimiento: last?.sumilla || last?.acto || null,
      ultimo_movimiento_fecha: last?.fecha || null,
      etapa_procesal: etapaProcesal || result.etapa || null,
      juez: result.juez || null,
      estado_hash: result.hash || null,
      last_checked: result.scrapedAt,
    })

    if (enriched.length > 0) {
      const movToAlert = enriched[0]
      const suggestion = movToAlert.sugerencia || 'Revisar este movimiento judicial.'
      const urgenciaMap: Record<string, NivelUrgencia> = { alta: 'alta', normal: 'media', info: 'baja' }
      const nivel: NivelUrgencia = urgenciaMap[movToAlert.urgencia] ?? 'baja'
      const alertConfig = await getAlertaConfigParaCaso(casoId)

      if (alertConfig) {
        const alertaResult = await enviarAlertaMovimiento(
          {
            expedienteId: String(caso.id),
            numeroExpediente: caso.numero_expediente,
            descripcion: movToAlert.sumilla || movToAlert.acto,
            nivelUrgencia: nivel,
            sugerenciaIA: suggestion,
            casoNombre: caso.alias || caso.cliente || undefined,
          },
          alertConfig
        )
        for (const canal of alertaResult.canalesExitosos) {
          await logNotificacionJudicial(caso.id, canal, movToAlert.sumilla || movToAlert.acto, nivel, suggestion, true)
        }
        if (!alertaResult.enviado) {
          await logNotificacionJudicial(caso.id, 'ninguno', movToAlert.sumilla || movToAlert.acto, nivel, suggestion, false)
        }
      }
    }

    const first = enriched[0]
    return Response.json({
      changed,
      portalDown: false,
      movimientos: enriched,
      urgencia: first?.urgencia || 'info',
      sugerencia: first?.sugerencia || 'Sin movimientos nuevos.',
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[API] POST /casos/[id]/poll-now error:', msg)
    return Response.json({ error: msg, portalDown: true }, { status: 500 })
  }
}
