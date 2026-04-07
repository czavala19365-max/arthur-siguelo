import { addMovimientoJudicial, createCaso, getAllCasosActivos, updateCaso } from '@/lib/db'
import { clasificarMovimientoCEJ } from '@/lib/ai-service'
import { scrapeCEJ } from '@/lib/cej-scraper'

export async function GET() {
  try {
    const casos = getAllCasosActivos()
    return Response.json(casos)
  } catch (error) {
    console.error('[API] GET /casos error:', error)
    return Response.json({ error: 'Error al obtener procesos judiciales' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>

    const caso = createCaso({
      numero_expediente: String(body.numero_expediente ?? ''),
      distrito_judicial: String(body.distrito_judicial ?? 'Lima'),
      organo_jurisdiccional: body.organo_jurisdiccional ? String(body.organo_jurisdiccional) : null,
      tipo_proceso: body.tipo_proceso ? String(body.tipo_proceso) : null,
      partes: body.parte ? String(body.parte) : null,
      cliente: body.cliente ? String(body.cliente) : null,
      alias: body.alias ? String(body.alias) : null,
      prioridad: (body.prioridad as 'alta' | 'media' | 'baja') || 'baja',
      polling_frequency_hours: Number(body.polling_frequency_hours ?? 4),
      whatsapp_number: body.whatsapp_number ? String(body.whatsapp_number) : null,
      email: body.email ? String(body.email) : null,
      activo: 1,
      estado: 'activo',
    })

    // Await CEJ scraping (blocks until done or timeout)
    let scrapeResult: Awaited<ReturnType<typeof scrapeCEJ>> | null = null
    try {
      scrapeResult = await scrapeCEJ(caso.numero_expediente)
    } catch (err) {
      console.error('[API] Initial CEJ poll error:', err)
    }

    if (!scrapeResult || scrapeResult.portalDown) {
      updateCaso(caso.id, { last_checked: scrapeResult?.scrapedAt ?? new Date().toISOString() })
      return Response.json({
        ...caso,
        success: true,
        portalDown: true,
        message: 'Caso guardado. Portal CEJ no disponible ahora.',
      }, { status: 201 })
    }

    if (scrapeResult.captchaDetected && !scrapeResult.captchaSolved) {
      updateCaso(caso.id, { last_checked: scrapeResult.scrapedAt })
      return Response.json({
        ...caso,
        success: true,
        captchaFailed: true,
        message: 'Caso guardado. Captcha no resuelto — reintentará en próxima revisión.',
      }, { status: 201 })
    }

    // Scraping succeeded — update caso with real data
    const movimientos = scrapeResult.actuaciones.map(a => ({
      fecha: a.fecha,
      acto: a.acto,
      folio: a.folio,
      sumilla: a.sumilla,
    }))

    const first =
      movimientos.length > 0
        ? [...movimientos].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())[0]
        : null

    const etapaProcesal = scrapeResult.etapa || scrapeResult.estadoProceso || ''
    const partesText = scrapeResult.partes.map(p => `${p.rol}: ${p.nombre}`).join(' | ') || null

    updateCaso(caso.id, {
      ultimo_movimiento: first?.sumilla || first?.acto || null,
      ultimo_movimiento_fecha: first?.fecha || null,
      etapa_procesal: etapaProcesal || null,
      juez: scrapeResult.juez || null,
      organo_jurisdiccional: scrapeResult.organoJurisdiccional || null,
      partes: partesText,
      estado_hash: scrapeResult.hash || null,
      last_checked: scrapeResult.scrapedAt,
    })

    for (const mov of movimientos.slice(0, 10)) {
      const cls = await clasificarMovimientoCEJ(
        mov.acto,
        mov.sumilla,
        caso.numero_expediente
      ).catch(() => ({ urgencia: 'info' as const, sugerencia: 'Revisar movimiento en CEJ.' }))

      addMovimientoJudicial(caso.id, {
        fecha: mov.fecha,
        acto: mov.acto,
        folio: mov.folio,
        sumilla: mov.sumilla,
        es_nuevo: true,
        urgencia: cls.urgencia,
        ai_sugerencia: cls.sugerencia,
      })
    }

    return Response.json({
      ...caso,
      success: true,
      movimientosCount: movimientos.length,
    }, { status: 201 })
  } catch (error) {
    console.error('[API] POST /casos error:', error)
    return Response.json({ error: 'Error al crear proceso judicial' }, { status: 500 })
  }
}
