import { after, NextResponse } from 'next/server'
import { addMovimientoJudicial, createCaso, getAllCasosActivos, updateCaso, updateMovimientoJudicial, type Caso } from '@/lib/judicial-db'
import { clasificarMovimientoCEJ } from '@/lib/ai-service'
import { enviarAlertaMovimiento } from '@/lib/alert-service'
import { getAlertaConfigParaCaso, logNotificacionJudicial } from '@/lib/judicial-db'

export const runtime = 'nodejs'

type ScrapeFn = (typeof import('@/lib/cej-scraper'))['scrapeCEJ']
type CejCaseData = import('@/lib/cej-scraper').CejCaseData

async function fetchCejFromScraperService(numero: string, parte: string, scrapeCEJ: ScrapeFn): Promise<CejCaseData> {
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
    console.error('[API] CEJ scraper service error:', res.status, msg)
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

/** Sincroniza CEJ → DB (misma lógica que el POST antiguo, pero puede ejecutarse en segundo plano). */
async function runInitialCejSync(caso: Caso, scrapeCEJ: ScrapeFn) {
  let scrapeResult: Awaited<ReturnType<ScrapeFn>> | null = null
  const parte = caso.parte_procesal?.trim() || caso.partes || ''
  try {
    scrapeResult = await fetchCejFromScraperService(caso.numero_expediente, parte, scrapeCEJ)
  } catch (err) {
    console.error('[API] Initial CEJ poll error (background):', err)
    await updateCaso(caso.id, { last_checked: new Date().toISOString() })
    return
  }

  if (!scrapeResult || scrapeResult.portalDown) {
    await updateCaso(caso.id, { last_checked: scrapeResult?.scrapedAt ?? new Date().toISOString() })
    return
  }

  if (scrapeResult.captchaDetected && !scrapeResult.captchaSolved) {
    await updateCaso(caso.id, { last_checked: scrapeResult.scrapedAt })
    return
  }

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

  const rows: Array<{
    id: number
    mov: (typeof movimientos)[0]
  }> = []
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
      console.error('[API] addMovimientoJudicial failed (background):', movErr)
    }
  }

  console.log(`[API] CEJ sync: caso ${caso.id} — ${rows.length} filas guardadas; clasificando IA…`)

  // Enviar alerta solo para el movimiento más reciente (si existe) luego de clasificarlo.
  // Mantiene el comportamiento consistente con "Revisar ahora" (no spamear por cada fila).
  let mostRecentToAlert: { mov: (typeof movimientos)[0]; cls: { urgencia: 'alta' | 'normal' | 'info'; sugerencia: string } } | null = null
  for (const { id, mov } of rows) {
    const cls = await clasificarMovimientoCEJ(
      mov.acto ?? '',
      mov.sumilla ?? '',
      caso.numero_expediente
    ).catch(() => ({ urgencia: 'info' as const, sugerencia: 'Revisar movimiento en CEJ.' }))
    try {
      await updateMovimientoJudicial(id, { urgencia: cls.urgencia, ai_sugerencia: cls.sugerencia })
    } catch (e) {
      console.error('[API] updateMovimientoJudicial failed:', e)
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
          },
          cfg
        )
        for (const canal of alertaResult.canalesExitosos) {
          await logNotificacionJudicial(caso.id, canal, descripcion, nivel, cls.sugerencia || '', true)
        }
        if (!alertaResult.enviado) {
          await logNotificacionJudicial(caso.id, 'ninguno', descripcion, nivel, cls.sugerencia || '', false)
        }
      }
    } catch (e) {
      console.error('[API] Initial alert send failed:', e)
    }
  }

  console.log(`[API] CEJ sync finished for caso ${caso.id}: ${movimientos.length} movimientos persistidos`)
}

export async function GET() {
  try {
    const casos = await getAllCasosActivos()
    return Response.json(casos)
  } catch (error) {
    console.error('[API] GET /casos error:', error)
    return NextResponse.json(
      {
        error: 'Error al obtener procesos judiciales',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>

    const pollHours = Number(body.polling_frequency_hours ?? 4)
    const caso = await createCaso({
      numero_expediente: String(body.numero_expediente ?? ''),
      distrito_judicial: String(body.distrito_judicial ?? 'Lima'),
      organo_jurisdiccional: body.organo_jurisdiccional ? String(body.organo_jurisdiccional) : null,
      tipo_proceso: body.tipo_proceso ? String(body.tipo_proceso) : null,
      partes: body.parte ? String(body.parte) : null,
      parte_procesal: body.parte_procesal ? String(body.parte_procesal) : null,
      cliente: body.cliente ? String(body.cliente) : null,
      alias: body.alias ? String(body.alias) : null,
      prioridad: (body.prioridad as 'alta' | 'media' | 'baja') || 'baja',
      polling_frequency_hours: Number.isFinite(pollHours) && pollHours > 0 ? pollHours : 4,
      whatsapp_number: body.whatsapp_number ? String(body.whatsapp_number) : null,
      email: body.email ? String(body.email) : null,
      activo: 1,
      estado: 'activo',
    })

    let scrapeCEJ: (typeof import('@/lib/cej-scraper'))['scrapeCEJ']
    try {
      const mod = await import('@/lib/cej-scraper')
      scrapeCEJ = mod.scrapeCEJ
    } catch (modErr) {
      console.error('[API] POST /casos: no se pudo cargar el módulo CEJ (Playwright/stealth):', modErr)
      await updateCaso(caso.id, { last_checked: new Date().toISOString() })
      return Response.json(
        {
          ...caso,
          success: true,
          portalDown: true,
          message:
            'Caso guardado en la base de datos. La consulta automática al CEJ no está disponible en este entorno (revisa consola del servidor).',
        },
        { status: 201 }
      )
    }

    // No esperar al scrape: `after()` asegura que Next ejecute el trabajo tras enviar la respuesta (no se pierde como con void suelto).
    // La sincronización completa (movimientos + IA) vive en `runInitialCejSync` — equivalente al flujo inline de la rama bot, pero en background.
    after(() =>
      runInitialCejSync(caso, scrapeCEJ).catch(err => {
        console.error('[API] runInitialCejSync error:', err)
      })
    )

    return Response.json(
      {
        ...caso,
        success: true,
        syncPending: true,
        message:
          'Caso guardado. Sincronizando con el CEJ en segundo plano (1–3 min). La lista se actualizará al terminar.',
      },
      { status: 201 }
    )
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[API] POST /casos error:', error)
    return Response.json(
      { error: 'Error al crear proceso judicial', detail: msg },
      { status: 500 }
    )
  }
}
