import { NextRequest, NextResponse } from 'next/server'
import { getCasoById, getCasoByNumeroExpediente } from '@/lib/judicial-db'
import type { CejCaseData } from '@/lib/cej-scraper'
import { procesarCejScrapeEnCaso } from '@/lib/cej-postprocess'

export const runtime = 'nodejs'
export const maxDuration = 300

function isAuthorized(req: NextRequest): boolean {
  const expected = process.env.CEJ_POSTPROCESS_SECRET?.trim() || process.env.CRON_SECRET?.trim()
  if (!expected) return false
  return (req.headers.get('x-internal-secret') ?? '') === expected
}

export async function POST(req: NextRequest) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
    const caseIdRaw = body.caseId ?? body.casoId
    const caseId = Number.parseInt(String(caseIdRaw ?? ''), 10)
    const numeroExpediente = String(body.numeroExpediente ?? body.numero_expediente ?? '').trim()
    const scrapeResult = (body.scrapeResult ?? body.result) as CejCaseData | undefined

    if (!scrapeResult) {
      return NextResponse.json({ error: 'scrapeResult es requerido' }, { status: 400 })
    }

    if (scrapeResult.portalDown) {
      return NextResponse.json({ ok: true, processed: false, reason: 'portal_down' })
    }

    let caso = Number.isFinite(caseId) ? await getCasoById(caseId) : null
    if (!caso && numeroExpediente) {
      caso = await getCasoByNumeroExpediente(numeroExpediente)
    }

    if (!caso) {
      return NextResponse.json({ ok: true, processed: false, reason: 'case_not_found' })
    }

    const result = await procesarCejScrapeEnCaso(caso, scrapeResult)
    return NextResponse.json({ ok: true, processed: true, casoId: caso.id, ...result })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[API] POST /internal/cej/postprocess error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}