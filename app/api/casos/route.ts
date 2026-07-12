import { NextResponse } from 'next/server'
import { enviarSuscripcionWhatsApp } from '@/lib/channels/whatsapp-channel'
import { addMovimientoJudicial, createCaso, getAllCasosActivosForUser, getMovimientosByCaso, updateCaso, updateMovimientoJudicial, type Caso } from '@/lib/judicial-db'
import { isUserAdmin, requireAuthUser } from '@/lib/judicial-caso-access'
import { getAuthServerClient } from '@/lib/supabase-auth-server'
import { clasificarMovimientoCEJ } from '@/lib/ai-service'
import { enviarAlertaMovimiento } from '@/lib/alert-service'
import { getAlertaConfigParaCaso, logNotificacionJudicial } from '@/lib/judicial-db'
import { enviarAlertaJudicialConIA } from '@/lib/judicial-alerts'
import { extraerYGuardarAudienciasDeMovimientos } from '@/lib/judicial-documento-extractor'

export const runtime = 'nodejs'

type ScrapeFn = (typeof import('@/lib/cej-scraper'))['scrapeCEJ']
type CejCaseData = import('@/lib/cej-scraper').CejCaseData

async function fetchCejFromScraperService(numero: string, parte: string, scrapeCEJ: ScrapeFn): Promise<CejCaseData> {
  const scraperUrl = process.env.CEJ_SCRAPER_URL?.trim()
  if (!scraperUrl) return scrapeCEJ(numero, parte)

    console.log("===== FETCH CEJ =====");
    console.log("URL:", scraperUrl);

    const inicio = Date.now();


    

  const url = `${scraperUrl.replace(/\/$/, '')}/scrape`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ numero, parte }),
    signal: AbortSignal.timeout(180_000),
  })

    console.log("Tiempo fetch:", Date.now() - inicio);
    console.log("Status:", res.status);

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

/** VALIDACIÓN PURA: Solo scraping, sin guardar en BD. Retorna los datos o lanza error. */
async function validateCejScrape(numero_expediente: string, parte_procesal: string, scrapeCEJ: ScrapeFn): Promise<CejCaseData> {
  console.log("Antes del fetch");
  const parte = parte_procesal?.trim() || ''
  if (!parte) throw new Error('Parte procesal requerida')

  const scrapeResult = await fetchCejFromScraperService(numero_expediente, parte, scrapeCEJ)

  if (scrapeResult?.error && !scrapeResult.portalDown) {
    throw new Error(scrapeResult.error)
  }

  if (!scrapeResult || scrapeResult.portalDown) {
    const msg = scrapeResult?.error || 'Portal CEJ no disponible'
    throw new Error(`CEJ portal no disponible: ${msg}`)
  }

  if (scrapeResult.captchaDetected && !scrapeResult.captchaSolved) {
    throw new Error('No se pudo resolver el captcha de CEJ. Por favor, intenta nuevamente.')
  }

  return scrapeResult
}

/** Guarda los datos del scraping en una caso ya existente. */
async function persistCejScrapeToCaso(caso: Caso, scrapeResult: CejCaseData): Promise<void> {
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
      console.error('[API] addMovimientoJudicial failed:', movErr)
    }
  }

  console.log(`[API] CEJ sync: caso ${caso.id} — ${rows.length} movimientos guardados`)

  // Clasificación IA y envío de alertas
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
            documentoUrl: mov.documentoUrl || null,
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
      console.error('[API] Alert send failed:', e)
    }
  }
}

export async function GET(request: Request) {
  try {
    const auth = await requireAuthUser()
    if ('response' in auth) return auth.response

    const url = new URL(request.url)
    const asUserId = url.searchParams.get('as_user_id')
    let targetUserId = auth.user.id

    if (asUserId) {
      if (!(await isUserAdmin(auth.user.id))) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
      }
      targetUserId = asUserId
    }

    const casos = await getAllCasosActivosForUser(targetUserId)
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
    const supabase = await getAuthServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json() as Record<string, unknown>

    const numero_expediente = String(body.numero_expediente ?? '')
    const parte_procesal = body.parte_procesal ? String(body.parte_procesal) : null

    // ─────────────────────────────────────────────────────────────
    // PASO 1: VALIDAR SCRAPING PRIMERO (sin crear el caso aún)
    // ─────────────────────────────────────────────────────────────
    const hasRailwayScraper = !!process.env.CEJ_SCRAPER_URL?.trim()

    let scrapeCEJ: ScrapeFn
    let scrapeResult: CejCaseData | null = null

    if (hasRailwayScraper) {
      scrapeCEJ = (async () => {
        throw new Error('Railway scraper should handle this request')
      }) as unknown as ScrapeFn
    } else {
      try {
        const mod = await import('@/lib/cej-scraper')
        scrapeCEJ = mod.scrapeCEJ
      } catch (modErr) {
        console.error('[API] POST /casos: no se pudo cargar cej-scraper:', modErr)
        scrapeCEJ = (async () => {
          throw new Error('Playwright no disponible en este entorno')
        }) as unknown as ScrapeFn
      }
    }

    // Intentar validación de scraping
    try {
      scrapeResult = await validateCejScrape(numero_expediente, parte_procesal || '', scrapeCEJ)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[API] CEJ validation failed:', msg)
      return Response.json(
        { error: 'No se pudo verificar el expediente. Revise los datos ingresados e intente nuevamente.', detail: msg },
        { status: 400 }
      )
    }

    // ─────────────────────────────────────────────────────────────
    // PASO 2: Si validación OK → crear el caso
    // ─────────────────────────────────────────────────────────────
    const pollHours = Number(body.polling_frequency_hours ?? 4)
    const caso = await createCaso({
      user_id: user.id,
      numero_expediente,
      distrito_judicial: String(body.distrito_judicial ?? 'Lima'),
      organo_jurisdiccional: body.organo_jurisdiccional ? String(body.organo_jurisdiccional) : null,
      tipo_proceso: body.tipo_proceso ? String(body.tipo_proceso) : null,
      partes: body.parte ? String(body.parte) : null,
      parte_procesal,
      cliente: body.cliente ? String(body.cliente) : null,
      alias: body.alias ? String(body.alias) : null,
      prioridad: (body.prioridad as 'alta' | 'media' | 'baja') || 'baja',
      polling_frequency_hours: Number.isFinite(pollHours) && pollHours > 0 ? pollHours : 4,
      whatsapp_number: body.whatsapp_number ? String(body.whatsapp_number) : null,
      email: body.email ? String(body.email) : null,
      activo: 1,
      estado: 'activo',
    })

    // ─────────────────────────────────────────────────────────────
    // PASO 3: Guardar datos del scraping en el caso creado
    // ─────────────────────────────────────────────────────────────
    try {
      await persistCejScrapeToCaso(caso, scrapeResult)
    } catch (err) {
      console.error('[API] persistCejScrapeToCaso error:', err)
      // No fallar si esto falla, solo loguear
    }

    // ─────────────────────────────────────────────────────────────
    // PASO 4: Extraer audiencias y enviar notificaciones
    // ─────────────────────────────────────────────────────────────
    try {
      console.log('[API] 🎯 Iniciando extracción de audiencias de documentos...')
      const movimientos = await getMovimientosByCaso(caso.id)
      if (movimientos.length > 0) {
        const audienciasCreadas = await extraerYGuardarAudienciasDeMovimientos(caso.id, movimientos)
        console.log(`[API] ✅ Se crearon ${audienciasCreadas} audiencias`)
      }
    } catch (err) {
      console.error('[API] Error extrayendo audiencias:', err instanceof Error ? err.message : String(err))
    }

    if (caso.whatsapp_number && caso.whatsapp_number.trim() !== '') {
      enviarSuscripcionWhatsApp(caso.whatsapp_number, caso.alias || caso.cliente || 'Sin alias', caso.numero_expediente).catch(e => console.error(e))
    }

    return Response.json(
      {
        ...caso,
        success: true,
        syncPending: false,
        message: 'Caso guardado y sincronizado.',
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