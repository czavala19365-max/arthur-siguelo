/**
 * Integración: Después del scraping de CEJ, extrae fechas importantes de PDFs
 * y las guarda como audiencias judiciales para la agenda
 */

import { findNextDueDate } from './extract-due-dates'
import { addAudienciaJudicial } from './judicial-db'

interface DocumentoJudicial {
  nombre: string
  url: string
  numeroExp: string
}

/**
 * Descargar un documento desde una URL
 */
async function descargarDocumento(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url, {
      method: 'GET',
    })

    if (!response.ok) {
      console.warn(`[Documento] No se pudo descargar: ${response.status} ${url}`)
      return null
    }

    if (!response.body) {
      console.warn(`[Documento] Respuesta sin body: ${url}`)
      return null
    }

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    console.log(`[Documento] ✅ Descargado: ${url} (${buffer.length} bytes)`)
    return buffer
  } catch (err) {
    console.error(`[Documento] ❌ Error descargando ${url}:`, err instanceof Error ? err.message : String(err))
    return null
  }
}

/**
 * Procesa movimientos judiciales y extrae fechas de los PDFs asociados
 * Guarda automáticamente las fechas como audiencias
 *
 * @param casoId ID del caso
 * @param movimientos Array de movimientos con URLs de documentos
 * @returns Número de audiencias creadas
 */
export async function extraerYGuardarAudienciasDeMovimientos(
  casoId: number,
  movimientos: Array<{
    id?: number
    fecha?: string | null
    acto?: string | null
    sumilla?: string | null
    documento_url?: string | null
    tiene_documento?: boolean
  }>
): Promise<number> {
  console.log(`[Audiencias] 🔍 Procesando ${movimientos.length} movimientos para caso ${casoId}...`)

  if (movimientos.length === 0) {
    console.log('[Audiencias] ℹ️ Sin movimientos para procesar')
    return 0
  }

  // Filtrar movimientos con documentos
  const movimientosConDoc = movimientos.filter(
    m => m.documento_url &&  m.tiene_documento === true
  )

  console.log(`[Audiencias] 📄 ${movimientosConDoc.length} movimientos tienen documentos`)

  if (movimientosConDoc.length === 0) {
    console.log('[Audiencias] ⚠️ Ningún movimiento tiene documento')
    return 0
  }

  // Descargar PDFs
  const pdfBuffers: Array<{
    buffer: Buffer
    numeroExp: string
    movimiento: (typeof movimientos)[0]
  }> = []

  for (const mov of movimientosConDoc) {
    if (!mov.documento_url) continue

    const buffer = await descargarDocumento(mov.documento_url)
    if (buffer && buffer.length > 100) {
      // Mínimo 100 bytes para evitar archivos vacíos
      pdfBuffers.push({
        buffer,
        numeroExp: `${casoId}-${mov.id || Date.now()}`,
        movimiento: mov,
      })
    }
  }

  console.log(`[Audiencias] ✅ Se descargaron ${pdfBuffers.length} PDFs exitosamente`)

  if (pdfBuffers.length === 0) {
    console.log('[Audiencias] ⚠️ No se pudieron descargar PDFs válidos')
    return 0
  }

  // Extraer fechas usando IA
  let fechaExtraida
  try {
    console.log('[Audiencias] 🤖 Extrayendo fechas con IA...')
    fechaExtraida = await findNextDueDate(
      pdfBuffers.map(p => ({
        buffer: p.buffer,
        numeroExp: p.numeroExp,
      }))
    )
  } catch (err) {
    console.error('[Audiencias] ❌ Error al extraer fechas:', err instanceof Error ? err.message : String(err))
    return 0
  }

  if (!fechaExtraida || !fechaExtraida.dueDate) {
    console.warn('[Audiencias] ℹ️ No se encontraron fechas importantes en los PDFs')
    return 0
  }

  // Verificar si la confianza es suficiente
  if (fechaExtraida.confidence < 40) {
    console.warn(`[Audiencias] ⚠️ Confianza baja (${fechaExtraida.confidence}%), descartando fecha`)
    return 0
  }

  // Guardar como audiencia
  try {
    console.log(`[Audiencias] 💾 Guardando audiencia: ${fechaExtraida.description} para ${fechaExtraida.dueDate}`)

    // Convertir prioridad
    const tipoAudiencia = fechaExtraida.priority === 'alta' ? 'urgente'
      : fechaExtraida.priority === 'media' ? 'importante'
        : 'normal'

    await addAudienciaJudicial(
      casoId,
      fechaExtraida.description || 'Fecha importante extraída de documento',
      fechaExtraida.dueDate,
      tipoAudiencia
    )

    console.log(`[Audiencias] ✅ Audiencia guardada exitosamente`)
    return 1
  } catch (err) {
    console.error('[Audiencias] ❌ Error guardando audiencia:', err instanceof Error ? err.message : String(err))
    return 0
  }
}

/**
 * Extrae audiencias de todos los movimientos y evita duplicados
 * Busca patrones de fechas y eventos importantes
 */
export async function extraerAudienciasCompletas(
  casoId: number,
  movimientos: Array<{
    id?: number
    fecha?: string | null
    acto?: string | null
    sumilla?: string | null
    documento_url?: string | null
    tieneDocumento?: number | boolean
  }>
): Promise<Array<{
  fecha: string
  descripcion: string
  tipo: string
}>> {
  const audiencias: Array<{
    fecha: string
    descripcion: string
    tipo: string
  }> = []

  console.log(`[Extracción] 🔄 Extrayendo audiencias de ${movimientos.length} movimientos...`)

  // Buscar patrones en los actos/sumillas
  const palabrasClave = /audiencia|resolución|sentencia|auto|decreto|vencimiento|plazo|requerimiento/gi
  const fechasEncontradas = new Set<string>()

  for (const mov of movimientos) {
    const texto = `${mov.acto || ''} ${mov.sumilla || ''}`.toLowerCase()

    if (palabrasClave.test(texto) && mov.fecha) {
      // Verificar si no es duplicado
      if (!fechasEncontradas.has(mov.fecha)) {
        fechasEncontradas.add(mov.fecha)
        audiencias.push({
          fecha: mov.fecha,
          descripcion: mov.sumilla || mov.acto || 'Evento judicial',
          tipo: 'movimiento',
        })
      }
    }
  }

  console.log(`[Extracción] ✅ Se encontraron ${audiencias.length} audiencias de movimientos`)
  return audiencias
}
