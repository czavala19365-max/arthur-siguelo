/**
 * Extrae fechas pendientes de documentos judiciales usando IA (Claude)
 * Análisis de PDFs/texto para encontrar plazos y fechas de vencimiento
 */

import Anthropic from '@anthropic-ai/sdk';

// Usar require para pdf-parse (CommonJS)
const pdfParse = require('pdf-parse');

export interface ExtractedDueDate {
  dueDate: string | null;
  description: string;
  priority: 'alta' | 'media' | 'baja';
  confidence: number;
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Extrae texto de un buffer PDF
 */
async function extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
  try {
    console.log('[PDF Parse] Iniciando extracción de texto...');
    const data = await pdfParse(pdfBuffer);
    const text = data.text || '';
    console.log(`[PDF Parse] ✅ Extracción exitosa: ${text.length} caracteres`);
    return text;
  } catch (err) {
    console.error('[PDF Parse] ❌ Error:', err instanceof Error ? err.message : String(err));
    return '';
  }
}

/**
 * Usa Claude para analizar el documento y extraer fechas pendientes
 */
export async function extractDueDatesFromPDF(
  pdfBuffer: Buffer,
  numeroExp: string
): Promise<ExtractedDueDate> {
  try {
    console.log(`[Claude] Analizando PDF para expediente: ${numeroExp}`);
    const pdfText = await extractTextFromPDF(pdfBuffer);

    if (!pdfText || pdfText.length < 50) {
      console.warn('[Claude] ⚠️ Documento vacío o muy pequeño');
      return {
        dueDate: null,
        description: 'Documento insuficiente para análisis',
        priority: 'baja',
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

Eres un abogado litigante peruano especializado en expedientes judiciales.

TAREA:

Debes identificar EXCLUSIVAMENTE actuaciones judiciales FUTURAS o PROGRAMADAS.

SOLO son válidas:

Audiencias
Vista de causa
Informe oral
Diligencias programadas
Actuaciones judiciales expresamente señaladas para una fecha futura

NO son válidas:

Fecha de emisión de resoluciones
Fecha de decretos
Fecha de sentencias
Fecha de autos
Fecha de escritos
Fecha de demandas
Fecha de presentación de recursos
Fecha de notificaciones
Fechas históricas ya ocurridas

REGLA CRÍTICA:

Si la fecha corresponde únicamente a la emisión de una resolución, sentencia, decreto o auto, debes devolver dueDate = null.

Si la actuación ya ocurrió al momento del documento, debes devolver dueDate = null.

RESPONDE EXCLUSIVAMENTE CON JSON.

NO escribas explicaciones.
NO escribas texto antes del JSON.
NO escribas texto después del JSON.
NO uses markdown.
NO uses bloques de código JSON.
Formato válido:

{
"dueDate":"2026-07-15",
"description":"Vista de causa programada",
"priority":"alta",
"confidence":95
}

Si NO existe una actuación futura o programada:

{
"dueDate": null,
"description":"Sin actuación programada",
"priority":"baja",
"confidence":0
}

EJEMPLO 1:

"Resolución N° 5 de fecha 10 de marzo de 2026"

Respuesta:

{
"dueDate": null,
"description":"Sin actuación programada",
"priority":"baja",
"confidence":0
}

EJEMPLO 2:

"Se señala informe oral para el día 17 de marzo de 2026 a las 15:00 horas"

Respuesta:

{
"dueDate":"2026-03-17",
"description":"Informe oral programado",
"priority":"alta",
"confidence":100
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

        const parsed = JSON.parse(match[0]) as ExtractedDueDate;

        return parsed;
      } catch (parseErr) {
      console.error('[Claude] ❌ JSON inválido. Raw:', responseText);
      return {
        dueDate: null,
        description: 'Error al parsear respuesta',
        priority: 'baja',
        confidence: 0,
      };
    }
  } catch (err) {
    console.error('[Claude] ❌ Error fatal:', err instanceof Error ? err.message : String(err));
    return {
      dueDate: null,
      description: 'Error al analizar',
      priority: 'baja',
      confidence: 0,
    };
  }
}

/**
 * Procesar múltiples documentos y retornar el plazo más cercano
 */
export async function findNextDueDate(
  pdfBuffers: Array<{ buffer: Buffer; numeroExp: string }>
): Promise<ExtractedDueDate | null> {
  if (pdfBuffers.length === 0) {
    console.log('[PDF Extract] 🚫 No hay PDFs para procesar');
    return null;
  }

  console.log(`[PDF Extract] 🔍 Procesando ${pdfBuffers.length} PDF(s)...`);

  const results = await Promise.all(
    pdfBuffers.map(({ buffer, numeroExp }) =>
      extractDueDatesFromPDF(buffer, numeroExp).catch((err) => {
        console.error(`[PDF Extract] ❌ Error procesando ${numeroExp}:`, err);
        return {
          dueDate: null,
          description: 'Error',
          priority: 'baja',
          confidence: 0,
        } as ExtractedDueDate;
      })
    )
  );

  const validDates = results.filter((r) => r.dueDate && r.confidence > 30);
  
  console.log(`[PDF Extract] 📊 Resultados: ${results.length} total, ${validDates.length} con fecha válida`);
  console.table(
    validDates.map(v => ({
      dueDate: v.dueDate,
      confidence: v.confidence,
      description: v.description?.substring(0, 60)
    }))
  );
  
  if (validDates.length === 0) {
    console.warn('[PDF Extract] ⚠️ Ninguna fecha con confianza > 30%');
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const futureDates = validDates.filter(d => {
    const due = new Date(d.dueDate!);
    due.setHours(0, 0, 0, 0);
    return due >= today;
  });

  if (futureDates.length === 0) {
    console.warn('[PDF Extract] ⚠️ No hay fechas futuras');
    return null;
  }

  const closest = futureDates.sort(
    (a, b) =>
      new Date(a.dueDate!).getTime() -
      new Date(b.dueDate!).getTime()
  )[0];

  console.log(`[PDF Extract] ✅ Fecha más cercana: ${closest.dueDate}`);
  return closest; 
}