/**
 * Orquestador de alertas judiciales con extracción de fechas vía IA
 * Integra: PDF download → IA date extraction → iCalendar email
 */

import { enviarEmail } from './channels/email-channel'
import { findNextDueDate } from './extract-due-dates'
import type { MovimientoJudicialAlerta } from './alert-service'

interface DocumentoPDF {
  url: string;
  numeroExpediente: string;
}

/**
 * Descargar PDF desde URL (Supabase storage o externo)
 */
async function downloadPdfFromUrl(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/pdf' },
    })

    if (!response.ok || !response.body) {
      console.warn(`[PDF Download] Failed: ${response.status} ${url}`)
      return null
    }

    return await response.arrayBuffer().then(ab => Buffer.from(ab))
  } catch (err) {
    console.error('[PDF Download]', err instanceof Error ? err.message : String(err))
    return null
  }
}

/**
 * Procesar movimiento judicial: extraer fecha pendiente y enviar email
 *
 * @param email Email destinatario
 * @param movimiento Datos del movimiento judicial
 * @param documentoPdf URL del documento PDF (opcional)
 * @returns true si email fue enviado
 */
export async function procesarMovimientoConExtraccionDeecha(
  email: string,
  movimiento: MovimientoJudicialAlerta,
  documentoPdf?: string | null
): Promise<boolean> {
  if (!email || !email.includes('@')) {
    console.warn('[Judicial Alert] Invalid email:', email)
    return false
  }

  let fechaPendiente: { fecha: Date; descripcion: string } | undefined

  // Extraer fecha de PDF si existe
  if (documentoPdf && documentoPdf.startsWith('http')) {
    try {
      console.log('[PDF] Descargando:', documentoPdf)
      const pdfBuffer = await downloadPdfFromUrl(documentoPdf)

      if (pdfBuffer && pdfBuffer.length > 100) {
        console.log('[PDF] Analizando con IA...')
        const extracted = await findNextDueDate([
          {
            buffer: pdfBuffer,
            numeroExp: movimiento.numeroExpediente,
          },
        ])

        if (extracted?.dueDate && extracted.confidence > 40) {
          fechaPendiente = {
            fecha: new Date(extracted.dueDate),
            descripcion: extracted.description,
          }
          console.log('[Alert] Fecha extraída:', extracted.dueDate, extracted.description)
        }
      }
    } catch (err) {
      console.error('[PDF Extraction]', err instanceof Error ? err.message : String(err))
      // Continuar sin fecha extraída, igual enviar email
    }
  }

  // Enviar email (con .ics si hay fecha pendiente)
  return enviarEmail(email, movimiento, fechaPendiente)
}

/**
 * Alias más corto para usar en integraciones
 */
export const enviarAlertaJudicialConIA = procesarMovimientoConExtraccionDeecha
