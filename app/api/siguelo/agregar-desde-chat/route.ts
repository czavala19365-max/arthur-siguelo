import { revalidatePath } from 'next/cache'
import { createTitulo, actualizarEstadoTitulo, getTituloById } from '@/lib/supabase'
import { consultarTitulo } from '@/lib/scraper'
import { enviarConfirmacionAgregado } from '@/lib/alertas'

// Espejo exacto de agregarYConsultarTitulo() en app/actions.ts
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

    const { oficina_registral, numero_titulo, nombre_cliente, email_cliente, whatsapp_cliente } = body
    const anio_titulo = parseInt(String(body.anio_titulo), 10)

    console.log('[agregar-desde-chat] Body recibido:', JSON.stringify({
      oficina_registral, anio_titulo, numero_titulo, nombre_cliente, email_cliente,
      whatsapp_cliente: whatsapp_cliente ? '***' : '(vacío)',
    }))

    // ── 1. Guardar en Supabase primero (igual que agregarYConsultarTitulo) ──
    let tituloId: string
    try {
      tituloId = await createTitulo({
        oficina_registral,
        anio_titulo,
        numero_titulo,
        nombre_cliente,
        email_cliente,
        whatsapp_cliente: whatsapp_cliente ?? '',
        proyecto: null,
        asunto: null,
        registro: null,
        abogado: null,
        notaria: null,
        ultimo_estado: null,
        ultima_consulta: null,
        area_registral: null,
        numero_partida: null,
      })
      console.log('[agregar-desde-chat] Supabase insert OK, id:', tituloId)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[agregar-desde-chat] Error Supabase insert:', msg)
      return Response.json({ success: false, error: `Error al guardar en base de datos: ${msg}` }, { status: 500 })
    }

    // ── 2. Consultar estado en SUNARP (igual que agregarYConsultarTitulo) ──
    try {
      const resultado = await consultarTitulo({ oficina_registral, anio_titulo, numero_titulo })
      console.log('[agregar-desde-chat] SUNARP result:', { estado: resultado.estado, detalle: resultado.detalle })

      await actualizarEstadoTitulo(tituloId, resultado.estado, resultado.areaRegistral, resultado.numeroPartida)

      // ── 3. Email de confirmación (no bloquea si falla) ──
      const tituloGuardado = await getTituloById(tituloId)
      if (tituloGuardado) {
        enviarConfirmacionAgregado({
          titulo: tituloGuardado,
          estado: resultado.estado,
          detalle: resultado.detalle ?? undefined,
          registradoEn: new Date().toISOString(),
        }).catch((err: unknown) => {
          console.error('[agregar-desde-chat] Error email:', err instanceof Error ? err.message : err)
        })
      }

      revalidatePath('/dashboard/siguelo')
      return Response.json({
        success: true,
        id: tituloId,
        estado: resultado.estado,
        detalle: resultado.detalle ?? null,
      })
    } catch (scrapeErr) {
      // Título ya guardado — éxito parcial (igual que agregarYConsultarTitulo)
      const msg = scrapeErr instanceof Error ? scrapeErr.message : String(scrapeErr)
      console.warn('[agregar-desde-chat] Scraper falló (título guardado sin estado):', msg)
      revalidatePath('/dashboard/siguelo')
      return Response.json({ success: true, id: tituloId, estado: null, detalle: null })
    }

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[agregar-desde-chat] Error inesperado:', msg)
    return Response.json({ success: false, error: msg }, { status: 500 })
  }
}
