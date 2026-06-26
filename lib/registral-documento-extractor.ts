import {
  analyzeRegistralPDF,
  type RegistralAnalysis
} from './extract-registral-info'
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

export async function analizarEsquelasRegistrales<
  T extends {
    pdfBase64?: string | null
  }
>(
  entries: T[]
): Promise<Array<T & {
  analysis?: RegistralAnalysis
}>> { 
  const resultados: Array<T & { analysis?: RegistralAnalysis }> = []

  for (const entry of entries) {
    console.log('[EXTRACTOR] Entry:', {
      tienePdf: !!entry.pdfBase64,
      pdfLength: entry.pdfBase64?.length ?? 0,
      pdfPrefix: entry.pdfBase64?.substring(0, 50) ?? 'null'
    })

    if (!entry.pdfBase64) {
      resultados.push(entry)
      continue
    }

    // 🔍 DEBUG: Validar que el base64 sea correcto
    try {
      const cleanBase64 = entry.pdfBase64.trim().replace(/\s+/g, '');
      const buffer = Buffer.from(cleanBase64, 'base64');

      const pdfMagic = buffer.toString('ascii', 0, 4)
      console.log('[EXTRACTOR] PDF Magic:', pdfMagic, pdfMagic === '%PDF' ? '✅' : '❌')

      if (pdfMagic !== '%PDF') {
        throw new Error('Base64 decodificado no es un PDF válido')
      }

      const analysis = await analyzeRegistralPDF(buffer, 'TITULO')
      resultados.push({ ...entry, analysis })
      
    } catch (err) {
      console.error('[EXTRACTOR] ❌ Error:', err)
      resultados.push(entry)
    }
  }

  console.log('[EXTRACTOR] Total resultados:', resultados.length)
  return resultados
}