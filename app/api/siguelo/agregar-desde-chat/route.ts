import { createTitulo } from '@/lib/supabase'
import { scrapeTitulo } from '@/lib/sunarp-scraper'
import { resolveOficinaCode } from '@/lib/scraper'

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      oficina_registral: string
      anio_titulo: string | number
      numero_titulo: string
      nombre_cliente: string
      email_cliente: string
      whatsapp_cliente?: string
    }

    const { oficina_registral, anio_titulo, numero_titulo, nombre_cliente, email_cliente, whatsapp_cliente } = body

    console.log('[agregar-desde-chat] Body recibido:', JSON.stringify({
      oficina_registral, anio_titulo, numero_titulo, nombre_cliente, email_cliente,
      whatsapp_cliente: whatsapp_cliente ? '***' : '(vacío)',
    }))

    // Convertir nombre de oficina ("LIMA") al código numérico ("0101") que espera el scraper
    const oficinaCodigo = resolveOficinaCode(oficina_registral)
    console.log('[agregar-desde-chat] Código de oficina resuelto:', oficinaCodigo, '(para:', oficina_registral, ')')
    if (!oficinaCodigo) {
      return Response.json({
        success: false,
        error: `Oficina registral no reconocida: "${oficina_registral}". Usa el nombre exacto (ej: LIMA, AREQUIPA, CUSCO).`,
      }, { status: 400 })
    }

    // Consulta el estado actual en SUNARP
    const scrape = await scrapeTitulo(
      numero_titulo,
      String(anio_titulo),
      oficinaCodigo,
    )

    console.log('[agregar-desde-chat] Scrape result:', {
      estado: scrape.estado,
      observacion: scrape.observacion,
      isObservado: scrape.isObservado,
      isInscrito: scrape.isInscrito,
      portalDown: scrape.portalDown,
    })

    // Guarda en Supabase
    const id = await createTitulo({
      oficina_registral,
      anio_titulo: Number(anio_titulo),
      numero_titulo,
      nombre_cliente,
      email_cliente,
      whatsapp_cliente: whatsapp_cliente ?? '',
      proyecto: null,
      asunto: null,
      registro: null,
      abogado: null,
      notaria: null,
      ultimo_estado: scrape.estado,
      ultima_consulta: scrape.scrapedAt,
      area_registral: null,
      numero_partida: null,
    })

    console.log('[agregar-desde-chat] Supabase insert OK, id:', id)

    return Response.json({
      success: true,
      id,
      estado: scrape.estado,
      observacion: scrape.observacion || null,
      isObservado: scrape.isObservado,
      isInscrito: scrape.isInscrito,
      portalDown: scrape.portalDown,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[API] agregar-desde-chat error:', msg)
    return Response.json({ success: false, error: msg }, { status: 500 })
  }
}
