import { NextRequest, NextResponse } from 'next/server'
import { scrapeCEJ, type CejCaseData } from '@/lib/cej-scraper'
import { getNextStepSuggestion } from '@/lib/ai-service'
import { enviarAlertaMovimiento } from '@/lib/alert-service'
import {
  getJudicialSupabase,
} from '@/lib/supabase-judicial'
import {
  addMovimientoJudicial,
  getAlertaConfigParaCaso,
  logNotificacionJudicial,
  updateCaso,
  type Caso,
} from '@/lib/judicial-db'

// Vercel cron protection
export const runtime = 'nodejs'
export const maxDuration = 60

function isAuthorized(req: NextRequest): boolean {
  const auth = req.headers.get('authorization') ?? ''
  return auth === `Bearer ${process.env.CRON_SECRET}`
}

async function fetchCej(numero: string, parte: string): Promise<CejCaseData> {
  const scraperUrl = process.env.CEJ_SCRAPER_URL?.trim()
  if (!scraperUrl) return scrapeCEJ(numero, parte)

  const url = `${scraperUrl.replace(/\/$/, '')}/scrape`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ numero, parte }),
    signal: AbortSignal.timeout(180_000),
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
    console.error('[CronJudicial] CEJ scraper service error:', res.status, msg)
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

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const started = Date.now()
  const supabase = getJudicialSupabase()

  const results: Array<{ casoId: number; status: string; canales?: string[] }> = []

  try {
    const { data: casosRaw, error } = await supabase
      .from('casos')
      .select('*')
      .eq('activo', true)
      .is('archived_at', null)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) throw new Error(`Supabase error: ${error.message}`)

    const casos = (casosRaw ?? []) as unknown as Caso[]
    if (!casos.length) {
      return NextResponse.json({ ok: true, message: 'No hay casos activos', results: [] })
    }

    const now = Date.now()

    for (const caso of casos) {
      // Hard stop to respect Vercel maxDuration
      if (Date.now() - started > 55_000) {
        results.push({ casoId: Number(caso.id), status: 'timeout_guard_stop' })
        break
      }

      try {
        const intervalMs = (Number(caso.polling_frequency_hours) || 4) * 60 * 60 * 1000
        const lastChecked = caso.last_checked ? new Date(caso.last_checked).getTime() : 0
        if (now - lastChecked < intervalMs) {
          results.push({ casoId: caso.id, status: 'skipped' })
          continue
        }

        const parte = (caso.parte_procesal?.trim() || caso.partes || '').trim()
        if (!parte) {
          await updateCaso(caso.id, { last_checked: new Date().toISOString() })
          results.push({ casoId: caso.id, status: 'sin_parte_procesal' })
          continue
        }

        const cej = await fetchCej(caso.numero_expediente, parte)
        await updateCaso(caso.id, { last_checked: new Date().toISOString() })

        if (!cej || cej.portalDown || !Array.isArray(cej.actuaciones) || cej.actuaciones.length === 0) {
          results.push({ casoId: caso.id, status: 'sin_actuaciones' })
          continue
        }

        const ultimaActuacion = cej.actuaciones[0]
        const nuevoHash = String(ultimaActuacion?.sumilla || '').trim()
        const changed = nuevoHash !== String(caso.estado_hash || '') && nuevoHash !== ''

        if (!changed) {
          results.push({ casoId: caso.id, status: 'sin_cambios' })
          continue
        }

        await addMovimientoJudicial(caso.id, {
          fecha: ultimaActuacion.fecha ?? null,
          acto: ultimaActuacion.acto ?? null,
          folio: ultimaActuacion.folio ?? null,
          sumilla: ultimaActuacion.sumilla ?? null,
          es_nuevo: true,
          urgencia: 'info',
          tiene_documento: !!ultimaActuacion.tieneDocumento,
          documento_url: ultimaActuacion.documentoUrl || null,
        })

        await updateCaso(caso.id, {
          estado_hash: nuevoHash,
          ultimo_movimiento: ultimaActuacion.sumilla || ultimaActuacion.acto || null,
          ultimo_movimiento_fecha: ultimaActuacion.fecha || null,
          last_checked: cej.scrapedAt,
        })

        const sugerencia = await getNextStepSuggestion(
          ultimaActuacion.acto || '',
          ultimaActuacion.sumilla || null,
          'judicial',
          caso.alias || '',
        ).catch(() => 'Revisar movimiento en CEJ.')

        const actoLower = String(ultimaActuacion.acto || '').toLowerCase()
        const esUrgente = ['plazo', 'sentencia', 'audiencia'].some(w => actoLower.includes(w))
        const nivel: 'alta' | 'media' = esUrgente ? 'alta' : 'media'
        const descripcion = String(ultimaActuacion.sumilla || ultimaActuacion.acto || '').trim()

        const alertaConfig = await getAlertaConfigParaCaso(caso.id)
        if (!alertaConfig) {
          results.push({ casoId: caso.id, status: 'cambio_sin_config_alertas' })
          continue
        }

        const alertaResult = await enviarAlertaMovimiento(
          {
            expedienteId: String(caso.id),
            numeroExpediente: caso.numero_expediente,
            descripcion,
            nivelUrgencia: nivel,
            sugerenciaIA: sugerencia,
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

        results.push({
          casoId: caso.id,
          status: alertaResult.enviado ? 'alerta_enviada' : 'alerta_fallida',
          canales: alertaResult.canalesExitosos,
        })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error(`[CronJudicial] Error caso ${caso.id}:`, msg)
        results.push({ casoId: caso.id, status: `error: ${msg}` })
      }
    }

    return NextResponse.json({
      ok: true,
      total: casos.length,
      processed: results.length,
      elapsedMs: Date.now() - started,
      results,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[CronJudicial] Fatal error:', msg)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}

