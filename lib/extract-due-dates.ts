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
      model: 'claude-sonnet-5',
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: `

Eres un abogado peruano experto en expedientes judiciales.

Analiza el documento y extrae únicamente fechas explícitamente escritas.

REGLAS IMPORTANTES:

- NO inventes fechas.
- NO calcules fechas.
- NO infieras fechas.
- NO conviertas plazos en fechas.
- SOLO devuelve fechas que aparezcan literalmente en el documento.
- Si no existe una fecha explícita devuelve dueDate = null.

Busca especialmente:

- Audiencias
- Resoluciones
- Decretos
- Autos
- Sentencias
- Requerimientos
- Traslados
- Vencimientos
- Plazos

Devuelve SOLO JSON válido.

{
  "dueDate":"2026-07-15",
  "description":"Audiencia única",
  "priority":"alta",
  "confidence":95
}

Si no encuentras una fecha:

{
  "dueDate":null,
  "description":"Sin plazo identificable",
  "priority":"baja",
  "confidence":0
}

DOCUMENTO:

${textToAnalyze}`,
        },
      ],
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
    console.log(`[Claude] 📝 Respuesta: ${responseText.substring(0, 100)}...`);

    try {
      const parsed = JSON.parse(responseText) as ExtractedDueDate;
      console.log(`[Claude] ✅ Fecha extraída:`, parsed.dueDate, `| Confianza: ${parsed.confidence}%`);
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

  if (validDates.length === 0) {
    console.warn('[PDF Extract] ⚠️ Ninguna fecha con confianza > 30%');
    return null;
  }

  const closest = validDates.sort(
    (a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime()
  )[0];

  console.log(`[PDF Extract] ✅ Fecha más cercana: ${closest.dueDate}`);
  return closest;
}