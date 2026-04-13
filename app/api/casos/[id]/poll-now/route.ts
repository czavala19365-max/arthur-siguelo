import {
  addMovimientoJudicial,
  getCasoById,
  getMovimientosByCaso,
  logNotificacionJudicial,
  updateCaso,
  updateMovimientoJudicial
} from '@/lib/db'
import { scrapeCEJ } from '@/lib/cej-scraper'
import { clasificarMovimientoCEJ } from '@/lib/ai-service'
import { sendJudicialEmail, sendJudicialWhatsApp } from '@/lib/notifications'

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
    const caso = getCasoById(casoId)

    if (!caso) {
      return Response.json({ error: 'Caso no encontrado' }, { status: 404 })
    }

    const result = await scrapeCEJ(caso.numero_expediente, caso.partes ?? '')

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
    const existing = getMovimientosByCaso(casoId)
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
      const rowId = addMovimientoJudicial(casoId, {
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
      updateMovimientoJudicial(first.id, { urgencia: cls.urgencia, ai_sugerencia: cls.sugerencia })

      enriched.push({ acto: first.mov.acto, sumilla: first.mov.sumilla, urgencia: cls.urgencia, sugerencia: cls.sugerencia })
    }

    const last = ultimoMovimiento
    updateCaso(casoId, {
      ultimo_movimiento: last?.sumilla || last?.acto || null,
      ultimo_movimiento_fecha: last?.fecha || null,
      etapa_procesal: etapaProcesal || null,
      juez: result.juez || null,
      estado_hash: result.hash || null,
      last_checked: result.scrapedAt,
    })

    const alta = enriched.find(m => m.urgencia === 'alta')
    if (alta) {
      const suggestion = alta.sugerencia || 'Revisar inmediatamente este movimiento judicial.'
      if (caso.whatsapp_number) {
        const ok = await sendJudicialWhatsApp(
          caso.whatsapp_number,
          caso.alias || caso.cliente || `Caso ${caso.id}`,
          alta.acto,
          'alta',
          suggestion,
          caso.id
        )
        logNotificacionJudicial(caso.id, 'whatsapp', alta.sumilla || alta.acto, 'alta', suggestion, ok)
      }
      if (caso.email) {
        const ok = await sendJudicialEmail(
          caso.email,
          caso.alias || caso.cliente || `Caso ${caso.id}`,
          alta.acto,
          alta.sumilla,
          'alta',
          suggestion,
          caso.id
        )
        logNotificacionJudicial(caso.id, 'email', alta.sumilla || alta.acto, 'alta', suggestion, ok)
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
