import { findNextDueDate } from './extract-due-dates'
import { descargarEsquela } from './scraper'
import { supabase } from './supabase'

export async function extraerYGuardarPlazosDeEsquela(
  tituloId: string,
  oficinaRegistral: string,
  anioTitulo: number,
  numeroTitulo: string,
  areaRegistral: string
): Promise<number> {
  console.log(`[Plazos SUNARP] 🔍 Buscando esquelas de observación para título ${numeroTitulo}...`)

  try {
    const pdfBase64Array = await descargarEsquela({
      oficina_registral: oficinaRegistral,
      anio_titulo: anioTitulo,
      numero_titulo: numeroTitulo,
      area_registral: areaRegistral,
      estado: 'OBSERVADO'
    })

    if (!pdfBase64Array || pdfBase64Array.length === 0) {
      console.log('[Plazos SUNARP] ℹ️ No se encontraron esquelas PDF.')
      return 0
    }

    console.log(`[Plazos SUNARP] 📄 Se descargaron ${pdfBase64Array.length} esquelas.`)

    const docInputs = pdfBase64Array.map((b64, i) => ({
      buffer: Buffer.from(b64, 'base64'),
      numeroExp: `SUNARP-${numeroTitulo}-${i}`
    }))

    console.log('[Plazos SUNARP] 🤖 Extrayendo fechas con IA...')
    const fechaExtraida = await findNextDueDate(docInputs)

    if (!fechaExtraida || !fechaExtraida.dueDate) {
      console.warn('[Plazos SUNARP] ℹ️ No se encontraron fechas de vencimiento en las esquelas.')
      return 0
    }

    if (fechaExtraida.confidence < 40) {
      console.warn(`[Plazos SUNARP] ⚠️ Confianza baja (${fechaExtraida.confidence}%), descartando fecha.`)
      return 0
    }

    console.log(`[Plazos SUNARP] 💾 Guardando plazo registral: ${fechaExtraida.description} para ${fechaExtraida.dueDate}`)

    const { error } = await supabase
      .from('titulos_plazos')
      .insert({
        titulo_id: tituloId,
        descripcion: fechaExtraida.description || 'Plazo de subsanación de esquela',
        fecha_vencimiento: fechaExtraida.dueDate,
        tipo: 'subsanacion',
        completado: false
      })

    if (error) {
      console.error('[Plazos SUNARP] ❌ Error guardando en supabase:', error.message)
      return 0
    }

    // Marcar como procesado para no volver a descargar la misma esquela
    await supabase
      .from('titulos')
      .update({ esquelas_procesadas: true })
      .eq('id', tituloId)

    console.log(`[Plazos SUNARP] ✅ Plazo guardado exitosamente.`)
    return 1

  } catch (err) {
    console.error('[Plazos SUNARP] ❌ Error al procesar esquela:', err instanceof Error ? err.message : String(err))
    return 0
  }
}
