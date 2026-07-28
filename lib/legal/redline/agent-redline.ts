import { toFile } from '@anthropic-ai/sdk'
import type { BetaContentBlock } from '@anthropic-ai/sdk/resources/beta/messages/messages'
import { getAnthropicClient } from '@/lib/legal/anthropic'

/**
 * Redline generator basado en el skill `docx-redline` de Anthropic. Encapsula
 * el uso de code execution + files API + skill hosteado `docx`, para que la
 * ruta API solo tenga que pasar los dos DOCX y devolver los outputs.
 *
 * Requiere que la organización tenga habilitados los betas de la API:
 *   - code-execution-2025-08-25
 *   - skills-2025-10-02
 *   - files-api-2025-04-14
 *
 * Costo por corrida: aproximadamente US$0.10-0.50 en tokens de Sonnet 5 según
 * tamaño de los documentos, más el tiempo de sandbox de code execution.
 */

const BETAS = [
  'code-execution-2025-08-25',
  'skills-2025-10-02',
  'files-api-2025-04-14',
] as const

const REDLINE_SYSTEM = `Eres un ingeniero legal experto en producir REDLINES sobre documentos DOCX de contratos peruanos.

Objetivo: dados dos archivos DOCX subidos al sandbox (uno "original" y uno "revisado"), produce DOS entregables:
1. redline.docx — DOCX basado en el original donde cada diferencia hacia el revisado está marcada como tracked-change REAL (<w:ins>/<w:del>) que Word puede aceptar/rechazar individualmente en el panel Revisar.
2. redline.pdf — el mismo redline convertido a PDF, con los cambios visualmente resaltados (Word/LibreOffice renderean los tracked changes en el PDF por defecto).

Procedimiento OBLIGATORIO (basado en el skill docx-redline de Anthropic — respétalo paso a paso):

1) DIFF A NIVEL CONTENIDO antes de tocar XML.
   Convierte ambos DOCX con \`pandoc -t markdown\` y ejecuta \`diff -u\` (ignorando whitespace) para tener la lista completa y exacta de cambios. Esta es tu checklist. No consideres la tarea terminada hasta verificar cada ítem en el DOCX final.

2) BASE LIMPIA. Antes de anclar edits, verifica si el ORIGINAL ya tiene tracked changes:
   \`unzip -o original.docx -d original_ext && grep -c 'w:ins \\|w:del ' original_ext/word/document.xml\`
   Si los tiene, acepta primero todos los cambios pendientes (\`python /mnt/skills/public/docx/scripts/accept_changes.py original.docx original_clean.docx\`) y construye el redline sobre el resultado limpio, nunca sobre un archivo con historia sin resolver.
   Si el script no existe en /mnt/skills/public/docx/scripts/ (verificarlo primero), implementa el equivalente en Python: para cada <w:ins> conservar su contenido sin las tags; para cada <w:del> eliminarlo por completo; guardar el DOCX resultante.

3) MERGE_RUNS sobre el original_clean para que los anclajes de texto sean estables (los sentence splits en múltiples runs por cambios de formato causan que raw text search falle):
   \`python /mnt/skills/public/docx/scripts/merge_runs.py original_clean.docx original_merged.docx\` — si no existe, escribe el equivalente con python-docx o lxml.

4) CLASIFICA cada ítem del diff como:
   - Sustitución de texto (frase que cambia dentro de contenido existente).
   - Inserción de bloque nuevo (párrafo o cláusula completa).

5) LOCALIZA EL ANCLA y respeta el formato:
   Para cada cambio, busca el texto exacto en \`word/document.xml\`. Copia el <w:rPr> del run original VERBATIM y reúsalo en tus runs insertados/eliminados. No inventes formato — mismatch en formato es la manera más fácil de romper visualmente el redline.

6) IDs sin colisiones: \`grep -o 'w:id="[0-9]*"' word/document.xml | sort -n | tail -1\` — arranca tus IDs propios en (max + 100).

7) ESTRUCTURAS XML de tracked changes:

   Sustitución (delete + insert consecutivos, mismo párrafo):
   <w:del w:id="{ID}" w:author="Arthur (Redline)" w:date="{ISO_DATE}">
     <w:r><w:rPr>{original rPr}</w:rPr><w:delText xml:space="preserve">{old text}</w:delText></w:r>
   </w:del>
   <w:ins w:id="{ID+1}" w:author="Arthur (Redline)" w:date="{ISO_DATE}">
     <w:r><w:rPr>{original rPr}</w:rPr><w:t xml:space="preserve">{new text}</w:t></w:r>
   </w:ins>

   Nuevo párrafo — el paragraph mark también debe marcarse insertado:
   <w:p>
     <w:pPr>
       <w:pStyle w:val="{style matching surrounding paragraphs}"/>
       <w:rPr><w:ins w:id="{ID}" w:author="Arthur (Redline)" w:date="{ISO_DATE}"/></w:rPr>
     </w:pPr>
     <w:ins w:id="{ID+1}" w:author="Arthur (Redline)" w:date="{ISO_DATE}">
       <w:r><w:rPr>...</w:rPr><w:t xml:space="preserve">{new paragraph text}</w:t></w:r>
     </w:ins>
   </w:p>

8) \`xml:space="preserve"\` es OBLIGATORIO en cualquier <w:t> o <w:delText> que empiece o termine con espacio. Verifica también los runs inmediatamente anterior y posterior a cada edit — un espacio residual en un run adyacente colapsa palabras al concatenar.

9) VALIDA:
   \`python /mnt/skills/public/docx/scripts/validate.py redline.docx --original original_clean.docx\`
   (Si no existe, valida al menos que python-docx pueda abrir el archivo sin errores y que \`unzip -l\` liste \`word/document.xml\`.)

10) VERIFICA con extracción de texto — no solo con vista rápida:
    \`soffice --headless --convert-to pdf redline.docx --outdir /tmp\`
    \`pdftotext -layout /tmp/redline.pdf /tmp/redline.txt\`
    Para cada ítem de la checklist, grep del texto VIEJO y del texto NUEVO en redline.txt — ambos deben aparecer. La ausencia de uno significa que el tracked change silenciosamente reemplazó (falla) o no se aplicó (falla).

ENTREGABLES OBLIGATORIOS:
- Guarda \`redline.docx\` y \`redline.pdf\` en \`/mnt/user-data/outputs/\`.
- Al terminar, en tu último mensaje DEBES incluir un bloque JSON con esta forma exacta (sin markdown fences, un solo bloque encerrado en \`\`\`json ... \`\`\` para que sea parseable):

\`\`\`json
{
  "docx_filename": "redline.docx",
  "pdf_filename": "redline.pdf",
  "changes_total": <número entero>,
  "substitutions": <número entero>,
  "new_blocks": <número entero>,
  "deleted_blocks": <número entero>,
  "summary": "<resumen en español de máximo 15 líneas>",
  "verified": true
}
\`\`\`

REGLAS FIRMES:
- Autor de los tracked changes: siempre "Arthur (Redline)".
- Fecha de los tracked changes: la fecha ISO actual en UTC.
- Si algo falla en cualquier paso, no devuelvas archivos parciales — reporta el error concreto en tu mensaje final y usa \`"verified": false\` en el JSON.
- Nunca omitas un cambio de la checklist. Si un cambio es demasiado complejo para expresarlo como tracked change (ej. reordenamiento profundo), inclúyelo como delete-del-original + insert-del-nuevo consecutivos.
- No devuelvas texto formateado con markdown en el summary — usa oraciones planas separadas por punto y aparte.`

function buildUserPrompt(oldName: string, newName: string): string {
  return `Genera el redline entre:
- ORIGINAL: ${oldName}
- REVISADO: ${newName}

Ambos DOCX ya están montados en el sandbox (los verás como uploads en /mnt/user-data/uploads/ o equivalente). Empieza por listar los archivos disponibles y ejecutar el procedimiento del system prompt paso a paso. Termina con el bloque JSON requerido y los dos archivos guardados en /mnt/user-data/outputs/.`
}

export interface RedlineArtifacts {
  docx: Buffer
  pdf: Buffer
  summary: string
  changesTotal: number
  substitutions: number
  newBlocks: number
  deletedBlocks: number
  verified: boolean
  rawText: string
}

/**
 * Extrae el bloque JSON final del texto de respuesta del modelo. El agente
 * está instruido a devolver un fenced \`\`\`json { ... } \`\`\` en su mensaje
 * final; si por alguna razón no lo hace, intentamos parsear el último objeto
 * JSON balanceado del texto.
 */
function parseAgentJSON(text: string): Record<string, unknown> | null {
  const fenced = text.match(/```json\s*([\s\S]+?)```/i)
  if (fenced) {
    try {
      return JSON.parse(fenced[1].trim())
    } catch {
      // fallthrough
    }
  }
  const lastOpen = text.lastIndexOf('{')
  const lastClose = text.lastIndexOf('}')
  if (lastOpen === -1 || lastClose <= lastOpen) return null
  try {
    return JSON.parse(text.slice(lastOpen, lastClose + 1))
  } catch {
    return null
  }
}

/**
 * Recorre los content blocks buscando file_ids emitidos por el sandbox. El
 * sandbox devuelve los archivos generados como bloques `container_upload` en
 * `response.content`.
 */
function extractContainerUploadIds(content: BetaContentBlock[]): string[] {
  const ids: string[] = []
  for (const block of content) {
    if (block.type === 'container_upload' && block.file_id) {
      ids.push(block.file_id)
    }
  }
  return ids
}

function extractAgentText(content: BetaContentBlock[]): string {
  return content
    .filter((b): b is Extract<BetaContentBlock, { type: 'text' }> => b.type === 'text')
    .map(b => b.text)
    .join('\n')
}

export interface RedlineInput {
  oldBuffer: Buffer
  oldName: string
  newBuffer: Buffer
  newName: string
}

export async function generateRedline(input: RedlineInput): Promise<RedlineArtifacts> {
  const client = getAnthropicClient()

  const [oldFile, newFile] = await Promise.all([
    client.beta.files.upload({
      file: await toFile(input.oldBuffer, input.oldName, {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }),
      betas: ['files-api-2025-04-14'],
    }),
    client.beta.files.upload({
      file: await toFile(input.newBuffer, input.newName, {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }),
      betas: ['files-api-2025-04-14'],
    }),
  ])

  try {
    const response = await client.beta.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 16000,
      thinking: { type: 'disabled' },
      betas: [...BETAS],
      container: {
        skills: [{ type: 'anthropic', skill_id: 'docx', version: 'latest' }],
      },
      tools: [{ type: 'code_execution_20260120', name: 'code_execution' }],
      system: REDLINE_SYSTEM,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: buildUserPrompt(input.oldName, input.newName) },
            { type: 'container_upload', file_id: oldFile.id },
            { type: 'container_upload', file_id: newFile.id },
          ],
        },
      ],
    })

    const text = extractAgentText(response.content)
    const meta = parseAgentJSON(text)
    if (!meta) {
      throw new Error(
        `El agente termino sin devolver el bloque JSON esperado. Texto final:\n${text.slice(-500)}`,
      )
    }

    const uploadedIds = extractContainerUploadIds(response.content)
    if (uploadedIds.length < 2) {
      throw new Error(
        `El agente no emitio los dos archivos esperados (encontrados: ${uploadedIds.length}). ${text.slice(-500)}`,
      )
    }

    // El sandbox suele emitir los container_upload en el orden en que el modelo
    // los reporta. Como el system prompt exige nombres fijos (redline.docx y
    // redline.pdf), asumimos que el primero es el DOCX y el segundo el PDF —
    // pero para robustez descargamos ambos y validamos por firma de bytes.
    const [firstBuf, secondBuf] = await Promise.all(
      uploadedIds.slice(0, 2).map(async id => {
        const dl = await client.beta.files.download(id, { betas: ['files-api-2025-04-14'] })
        const ab = await dl.arrayBuffer()
        return Buffer.from(ab)
      }),
    )

    const { docx, pdf } = classifyBuffers(firstBuf, secondBuf)

    return {
      docx,
      pdf,
      summary: typeof meta.summary === 'string' ? meta.summary : '',
      changesTotal: numberOr(meta.changes_total, 0),
      substitutions: numberOr(meta.substitutions, 0),
      newBlocks: numberOr(meta.new_blocks, 0),
      deletedBlocks: numberOr(meta.deleted_blocks, 0),
      verified: meta.verified === true,
      rawText: text,
    }
  } finally {
    // Best-effort cleanup — no bloqueamos la respuesta si la cancelacion falla.
    void Promise.allSettled([
      client.beta.files.delete(oldFile.id, { betas: ['files-api-2025-04-14'] }),
      client.beta.files.delete(newFile.id, { betas: ['files-api-2025-04-14'] }),
    ])
  }
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

/**
 * Distingue el DOCX del PDF entre dos buffers descargados por firma de bytes.
 * DOCX es un ZIP (empieza con "PK\x03\x04"), PDF empieza con "%PDF".
 */
function classifyBuffers(a: Buffer, b: Buffer): { docx: Buffer; pdf: Buffer } {
  const isDocx = (buf: Buffer) => buf.length >= 4 && buf[0] === 0x50 && buf[1] === 0x4b
  const isPdf = (buf: Buffer) => buf.length >= 4 && buf.subarray(0, 4).toString('ascii') === '%PDF'

  if (isDocx(a) && isPdf(b)) return { docx: a, pdf: b }
  if (isDocx(b) && isPdf(a)) return { docx: b, pdf: a }
  throw new Error(
    'Los archivos generados por el agente no son un par DOCX+PDF valido. Revisa los logs del agente.',
  )
}
