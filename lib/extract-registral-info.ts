/**
 * Extrae fechas pendientes de documentos judiciales usando IA (Claude)
 * Análisis de PDFs/texto para encontrar plazos y fechas de vencimiento
 */

import Anthropic from '@anthropic-ai/sdk';


// Usar require para pdf-parse (CommonJS)
const pdfParse = require('pdf-parse');

export interface RegistralAnalysis {
  requiereSubsanacion: boolean;
  fechaLimite: string | null; 
  resumen: string;
  accionRecomendada: string;
  confidence: number;
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Extrae texto de un buffer PDF
 */
/**
 * 🔑 NUEVA FUNCIÓN - Extrae texto de PDFs con OCR como fallback
 */
async function extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
  try {
    console.log('[PDF Parse] Iniciando extracción de texto...');
    
    // PASO 1: Intentar con pdfParse
    const data = await pdfParse(pdfBuffer);
    const text = data.text || '';
    
    console.log(`[PDF Parse] ✅ Extracción directa: ${text.length} caracteres`);
    
    // Si extrae suficiente texto, devolver
    if (text.trim().length > 50) {
      return text;
    }

    // PASO 2: Si no hay texto, usar OCR
    console.log('[PDF Parse] ⚠️ PDF escaneado detectado, activando OCR...');
    return await extractWithOCR(pdfBuffer);
    
  } catch (err) {
    console.error('[PDF Parse] ❌ Error en extracción directa:', err instanceof Error ? err.message : String(err));
    console.log('[PDF Parse] 🔄 Intentando con OCR...');
    return await extractWithOCR(pdfBuffer);
  }
}

/**
 * 🔑 FUNCIÓN OCR - Claude Vision directamente del PDF
 */
async function extractWithOCR(pdfBuffer: Buffer): Promise<string> {
  try {
    console.log('[OCR] Extrayendo con Claude Vision...');
    
    // Convertir a base64
    const base64Pdf = pdfBuffer.toString('base64');

    // Enviar a Claude Vision
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: base64Pdf,
              },
            },
            {
              type: 'text',
              text: 'Extrae TODO el texto que veas en este documento PDF. Sé preciso y completo.',
            },
          ],
        },
      ],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    
    console.log(`[OCR] ✅ Extracción completada: ${text.length} caracteres`);
    return text;

  } catch (err) {
    console.error('[OCR] ❌ Error:', err instanceof Error ? err.message : String(err));
    return '';
  }
}

/**
 * Usa Claude para analizar el documento y extraer fechas pendientes
 */
export async function analyzeRegistralPDF(
  pdfBuffer: Buffer,
  numeroTitulo: string
): Promise<RegistralAnalysis> {
  try {
    console.log(`[Claude] Analizando esquela de título: ${numeroTitulo}`);
    const pdfText = await extractTextFromPDF(pdfBuffer);

    if (!pdfText || pdfText.length < 50) {
      console.warn('[Claude] ⚠️ Documento vacío o muy pequeño');
      return {
        requiereSubsanacion: false,
        fechaLimite: null,
        resumen: 'Documento insuficiente para análisis',
        accionRecomendada: 'N/A',
        confidence: 0,
      };
    }

    const textToAnalyze = pdfText.slice(0, 8000);
    console.log(`[Claude] 📄 Enviando ${textToAnalyze.length} caracteres a Claude...`);

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: `

Eres un abogado registral peruano especialista en títulos observados por SUNARP.

Debes analizar la siguiente esquela de observación.

OBJETIVO

Identificar únicamente:

- si el título requiere subsanación
- la fecha límite para subsanar (si existe)
- un resumen muy corto de la observación

NO inventes fechas.

Si la esquela NO indica expresamente una fecha límite,
devuelve fechaLimite = null.

RESPONDE EXCLUSIVAMENTE EN JSON.

Formato:

{
  "requiereSubsanacion": true,
  "fechaLimite": "2026-07-15",
  "resumen": "Debe adjuntarse copia certificada del poder.",
  "confidence": 95
}

Si no existe plazo:

{
  "requiereSubsanacion": true,
  "fechaLimite": null,
  "resumen": "Debe adjuntarse copia certificada del poder.",
  "confidence": 95
}

Si la esquela no contiene observaciones:

{
  "requiereSubsanacion": false,
  "fechaLimite": null,
  "resumen": "Sin observaciones.",
  "confidence": 100
}

DOCUMENTO:

${textToAnalyze}`,
        },
      ],
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
    console.log(`[Claude] 📝 Respuesta: ${responseText.substring(0, 100)}...`);

    try {
        const match = responseText.match(/\{[\s\S]*\}/);

        if (!match) {
          throw new Error('No se encontró JSON en la respuesta');
        }

        const parsed = JSON.parse(match[0]) as RegistralAnalysis;

        return parsed;
      } catch (parseErr) {
      console.error('[Claude] ❌ JSON inválido. Raw:', responseText);
      return {
        requiereSubsanacion: false,
        fechaLimite: null,
        resumen: 'Error al parsear respuesta',
        accionRecomendada: 'N/A',
        confidence: 0,
      };
    }
  } catch (err) {
    console.error('[Claude] ❌ Error fatal:', err instanceof Error ? err.message : String(err));
    return {
      requiereSubsanacion: false,
      fechaLimite: null,
      resumen: 'Error al analizar',
      accionRecomendada: 'N/A',
      confidence: 0,
    };
  }
}

/**
 * Procesar múltiples documentos y retornar el plazo más cercano
 */
export async function findNextDueDate(
  pdfBuffers: Array<{ buffer: Buffer; numeroExp: string }>
): Promise<RegistralAnalysis | null> {
  if (pdfBuffers.length === 0) {
    console.log('[PDF Extract] 🚫 No hay PDFs para procesar');
    return null;
  }

  console.log(`[PDF Extract] 🔍 Procesando ${pdfBuffers.length} PDF(s)...`);

  const results = await Promise.all(
    pdfBuffers.map(({ buffer, numeroExp }) =>
      analyzeRegistralPDF(buffer, numeroExp).catch((err) => {
        console.error(`[PDF Extract] ❌ Error procesando ${numeroExp}:`, err);
        return {
          requiereSubsanacion: false,
          fechaLimite: null,
          resumen: 'Error',
          confidence: 0,
        } as RegistralAnalysis;
      })
    )
  );
  
  const validDates = results.filter((r) => r.fechaLimite && r.confidence > 30);
  
  console.log(`[PDF Extract] 📊 Resultados: ${results.length} total, ${validDates.length} con fecha válida`);
  console.table(
    validDates.map(v => ({
      fechaLimite: v.fechaLimite,
      confidence: v.confidence,
      resumen: v.resumen?.substring(0, 60)
    }))
  );
  
  if (validDates.length === 0) {
    console.warn('[PDF Extract] ⚠️ Ninguna fecha con confianza > 30%');
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const futureDates = validDates.filter(d => {
    const due = new Date(d.fechaLimite!);
    due.setHours(0, 0, 0, 0);
    return due >= today;
  });

  if (futureDates.length === 0) {
    console.warn('[PDF Extract] ⚠️ No hay fechas futuras');
    return null;
  }

  const closest = futureDates.sort(
    (a, b) =>
      new Date(a.fechaLimite!).getTime() -
      new Date(b.fechaLimite!).getTime()
  )[0];

  console.log(`[PDF Extract] ✅ Fecha más cercana: ${closest.fechaLimite}`);
  return closest;
}