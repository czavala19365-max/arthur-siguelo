import mammoth from 'mammoth'
import PizZip from 'pizzip'
import { getAnthropicClient } from '@/lib/legal/anthropic'
import { buildSummaryDocx } from './summary-docx'

/**
 * Redline "text-first" con tracked changes granulares — no usa sandbox.
 *
 *   1. Extrae texto plano de ambos DOCX con mammoth.
 *   2. Pide a Sonnet 5 un PLAN DE EDICIONES estructurado (JSON) con
 *      ubicacion estructural ("Clausula Tercera", "Seccion 2.1"...) por
 *      cada cambio, ancladas a fragmentos exactos del texto original.
 *   3. Aplica cada edicion sobre el XML del DOCX preservando el formato:
 *      los <w:ins>/<w:del> envuelven solo el fragmento cambiado, no el
 *      parrafo completo. Los runs anteriores y posteriores se preservan
 *      intactos con su formato original.
 *
 * Devuelve dos DOCX: el redline con tracked changes reales y un resumen
 * separado en formato Arthur (Arial 11, A4) para descargar por separado.
 */

export interface EditItem {
  location: string  // p.ej. "CLAUSULA TERCERA - PRECIO", "COMPARECENCIA", "SECCION 2.1"
  kind: 'substitution' | 'insertion' | 'deletion'
  old_text?: string
  new_text?: string
  after_text?: string
  context_before?: string
  description?: string  // resumen humano corto del cambio
}

export interface ChangeGroup {
  location: string
  changes: EditItem[]
}

export interface RedlineArtifacts {
  docx: Buffer
  summaryDocx: Buffer
  summary: string
  changes: ChangeGroup[]
  stats: {
    substitutions: number
    insertions: number
    deletions: number
    total: number
    unmatched: number
  }
}

export interface RedlineInput {
  oldBuffer: Buffer
  oldName: string
  newBuffer: Buffer
  newName: string
}

export type ProgressPhase = 'extracting' | 'diffing' | 'applying' | 'building_summary' | 'done'

export interface ProgressEvent {
  phase: ProgressPhase
  progress: number
  message: string
}

export type ProgressCallback = (event: ProgressEvent) => void

interface EditPlan {
  edits: EditItem[]
  summary: string
}

const AUTHOR = 'Arthur (Redline)'

const DIFF_SYSTEM = `Eres un experto en comparacion de documentos legales bajo ley peruana. Recibes el TEXTO PLANO de un contrato original (A) y uno revisado (B). Tu tarea es producir un PLAN DE EDICIONES estructurado que, aplicado a A, resulte exactamente en B.

Devuelve SOLO un JSON valido (sin fences de markdown, sin comentarios), con esta forma exacta:
{
  "edits": [
    {
      "location": "ubicacion estructural en el documento",
      "kind": "substitution" | "insertion" | "deletion",
      "old_text": "...",         // requerido en substitution y deletion
      "new_text": "...",         // requerido en substitution y insertion
      "after_text": "...",       // requerido en insertion — fragmento del original despues del cual insertar
      "context_before": "...",   // opcional — 30-60 caracteres previos si el old_text/after_text es ambiguo
      "description": "explicacion corta y humana del cambio"
    }
  ],
  "summary": "resumen ejecutivo en espanol, maximo 15 lineas, describiendo los cambios globales"
}

Reglas ESTRICTAS:
- Cada "old_text", "after_text" y "text_to_delete" debe aparecer EXACTAMENTE en el ORIGINAL (caracter por caracter, incluyendo puntuacion y espacios). Copia y pega desde el ORIGINAL.
- Cada edicion debe ser lo mas GRANULAR posible: si solo cambia una palabra, "old_text" es esa palabra (no toda la oracion). Si cambia una fecha, es la fecha exacta. Si cambia un monto, es el monto exacto. Esto es CRITICO para que el redline no marque parrafos enteros como cambiados.
- Si el mismo fragmento aparece MAS de una vez en el ORIGINAL, agrega "context_before" con los 30-60 caracteres inmediatamente anteriores para desambiguar.
- "location" debe ser la ubicacion estructural donde ocurre el cambio, tal como aparece en el documento: "COMPARECENCIA", "CLAUSULA PRIMERA - ANTECEDENTES", "CLAUSULA TERCERA - PRECIO", "SECCION 4.2 - GARANTIAS", "SUSCRIPCION", "ANEXO I", etc. Se usa para agrupar los cambios en el resumen.
- "description" es una frase corta (max 100 caracteres) que explica el cambio para un abogado revisor. Ejemplos: "Actualiza la fecha de vencimiento", "Modifica la tasa de interes de 8% a 10%", "Agrega parrafo sobre confidencialidad".
- Nunca inventes cambios que no esten en B. Si el original y el revisado son identicos, devuelve edits vacio y summary "No se detectaron cambios sustanciales.".
- El "summary" debe estar en espanol, en oraciones planas, sin markdown, describiendo los cambios globales del contrato (que se agrego, que se modifico, que se elimino). Es lo que un abogado leeria primero para tener el panorama.`

export async function generateRedline(
  input: RedlineInput,
  onProgress?: ProgressCallback,
): Promise<RedlineArtifacts> {
  const emit = (event: ProgressEvent) => onProgress?.(event)

  emit({ phase: 'extracting', progress: 15, message: 'Extrayendo texto de ambos DOCX...' })
  const [originalText, revisedText] = await Promise.all([
    extractText(input.oldBuffer),
    extractText(input.newBuffer),
  ])

  emit({ phase: 'diffing', progress: 40, message: 'Comparando versiones con IA...' })
  const plan = await computeEditPlan(originalText, revisedText)

  emit({
    phase: 'applying',
    progress: 70,
    message: `Aplicando ${plan.edits.length} cambio(s) al DOCX...`,
  })
  const { buffer, stats } = applyEditsToDocx(input.oldBuffer, plan)

  emit({ phase: 'building_summary', progress: 90, message: 'Generando resumen en Word...' })
  const grouped = groupChangesByLocation(plan.edits)
  const summaryDocx = await buildSummaryDocx({
    oldName: input.oldName,
    newName: input.newName,
    summary: plan.summary,
    groups: grouped,
    stats,
  })

  emit({ phase: 'done', progress: 100, message: 'Redline listo.' })

  return {
    docx: buffer,
    summaryDocx,
    summary: plan.summary,
    changes: grouped,
    stats: {
      substitutions: stats.substitutions,
      insertions: stats.insertions,
      deletions: stats.deletions,
      total: stats.substitutions + stats.insertions + stats.deletions,
      unmatched: stats.unmatched,
    },
  }
}

async function extractText(buffer: Buffer): Promise<string> {
  const res = await mammoth.extractRawText({ buffer })
  return res.value
}

async function computeEditPlan(originalText: string, revisedText: string): Promise<EditPlan> {
  const client = getAnthropicClient()
  const response = await client.messages.create({
    model: 'claude-sonnet-5',
    max_tokens: 16000,
    thinking: { type: 'disabled' },
    system: DIFF_SYSTEM,
    messages: [
      {
        role: 'user',
        content: `ORIGINAL:\n${originalText}\n\n---\n\nREVISADO:\n${revisedText}\n\nProduce el plan de ediciones en el JSON requerido.`,
      },
    ],
  })

  const text = response.content
    .filter((b): b is Extract<(typeof response.content)[number], { type: 'text' }> => b.type === 'text')
    .map(b => b.text)
    .join('\n')

  const parsed = parsePlanJSON(text)
  if (!parsed) {
    throw new Error(`El modelo no devolvio un JSON de plan de ediciones valido. Texto:\n${text.slice(-500)}`)
  }
  return parsed
}

function parsePlanJSON(text: string): EditPlan | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]+?)```/i)
  const candidate = fenced ? fenced[1] : text
  const first = candidate.indexOf('{')
  const last = candidate.lastIndexOf('}')
  if (first === -1 || last <= first) return null
  try {
    const parsed = JSON.parse(candidate.slice(first, last + 1))
    return {
      edits: Array.isArray(parsed.edits) ? parsed.edits.filter(isValidEdit) : [],
      summary: typeof parsed.summary === 'string' ? parsed.summary : '',
    }
  } catch {
    return null
  }
}

function isValidEdit(e: unknown): e is EditItem {
  if (!e || typeof e !== 'object') return false
  const obj = e as Record<string, unknown>
  if (typeof obj.location !== 'string') return false
  return obj.kind === 'substitution' || obj.kind === 'insertion' || obj.kind === 'deletion'
}

function groupChangesByLocation(edits: EditItem[]): ChangeGroup[] {
  const map = new Map<string, EditItem[]>()
  for (const edit of edits) {
    const loc = edit.location || 'SIN UBICACION'
    if (!map.has(loc)) map.set(loc, [])
    map.get(loc)!.push(edit)
  }
  return Array.from(map.entries()).map(([location, changes]) => ({ location, changes }))
}

// ---------------------------------------------------------------------------
// Aplicacion XML de tracked changes granulares
// ---------------------------------------------------------------------------

interface ApplyStats {
  substitutions: number
  insertions: number
  deletions: number
  unmatched: number
}

interface RunSegment {
  text: string    // texto visible del <w:t> (unescape aplicado)
  rPr: string     // "<w:rPr>...</w:rPr>" del run, o cadena vacia
}

interface ParagraphMeta {
  index: number
  raw: string
  text: string       // concatenacion de w:t (unescaped)
  segments: RunSegment[]
  pPr: string
}

function applyEditsToDocx(
  originalBuffer: Buffer,
  plan: EditPlan,
): { buffer: Buffer; stats: ApplyStats } {
  const zip = new PizZip(originalBuffer)
  const docFile = zip.file('word/document.xml')
  if (!docFile) throw new Error('DOCX invalido: no contiene word/document.xml')
  const originalXml = docFile.asText()

  const { pre, body, post } = splitDocumentBody(originalXml)
  const paragraphs = parseParagraphs(body)

  const stats: ApplyStats = { substitutions: 0, insertions: 0, deletions: 0, unmatched: 0 }
  let idCounter = highestExistingId(originalXml) + 100
  const nextId = () => idCounter++

  const now = new Date().toISOString()
  const fragments: string[] = paragraphs.map(p => p.raw)

  for (const edit of plan.edits) {
    if (edit.kind === 'substitution' && edit.old_text && edit.new_text !== undefined) {
      const applied = applyGranularSubstitution(
        paragraphs,
        fragments,
        edit.old_text,
        edit.new_text,
        edit.context_before,
        nextId,
        now,
      )
      applied ? stats.substitutions++ : stats.unmatched++
    } else if (edit.kind === 'insertion' && edit.after_text && edit.new_text !== undefined) {
      const applied = applyParagraphInsertion(
        paragraphs,
        fragments,
        edit.after_text,
        edit.new_text,
        edit.context_before,
        nextId,
        now,
      )
      applied ? stats.insertions++ : stats.unmatched++
    } else if (edit.kind === 'deletion' && edit.old_text) {
      const applied = applyGranularDeletion(
        paragraphs,
        fragments,
        edit.old_text,
        edit.context_before,
        nextId,
        now,
      )
      applied ? stats.deletions++ : stats.unmatched++
    } else {
      stats.unmatched++
    }
  }

  const newBody = fragments.join('')
  const newXml = pre + newBody + post
  zip.file('word/document.xml', newXml)
  return { buffer: zip.generate({ type: 'nodebuffer' }) as Buffer, stats }
}

/**
 * Sustituye granularmente: envuelve SOLO el fragmento cambiado con <w:del> +
 * <w:ins>, preservando el resto del parrafo intacto con su formato original.
 */
function applyGranularSubstitution(
  paragraphs: ParagraphMeta[],
  fragments: string[],
  oldText: string,
  newText: string,
  contextBefore: string | undefined,
  nextId: () => number,
  isoDate: string,
): boolean {
  const target = findParagraph(paragraphs, oldText, contextBefore)
  if (target === null) return false
  const { index, matchStart } = target
  const paragraph = paragraphs[index]

  const prefix = paragraph.text.slice(0, matchStart)
  const suffix = paragraph.text.slice(matchStart + oldText.length)

  const rPrForEdit = findRPrAtOffset(paragraph.segments, matchStart)

  const prefixXml = renderRunsForRange(paragraph.segments, 0, matchStart)
  const suffixXml = renderRunsForRange(paragraph.segments, matchStart + oldText.length, paragraph.text.length)

  const delXml =
    `<w:del w:id="${nextId()}" w:author="${AUTHOR}" w:date="${isoDate}">` +
    `<w:r>${rPrForEdit}<w:delText xml:space="preserve">${escapeXml(oldText)}</w:delText></w:r>` +
    `</w:del>`

  const insXml = newText
    ? `<w:ins w:id="${nextId()}" w:author="${AUTHOR}" w:date="${isoDate}">` +
      `<w:r>${rPrForEdit}<w:t xml:space="preserve">${escapeXml(newText)}</w:t></w:r>` +
      `</w:ins>`
    : ''

  const newPXml = `<w:p>${paragraph.pPr}${prefixXml}${delXml}${insXml}${suffixXml}</w:p>`
  fragments[index] = newPXml
  // Actualizar el paragraph object para que ediciones posteriores no cazen el fragmento viejo
  paragraphs[index] = {
    ...paragraph,
    raw: newPXml,
    text: prefix + newText + suffix,
    segments: [{ text: prefix + newText + suffix, rPr: paragraph.segments[0]?.rPr ?? '' }],
  }
  return true
}

function applyGranularDeletion(
  paragraphs: ParagraphMeta[],
  fragments: string[],
  oldText: string,
  contextBefore: string | undefined,
  nextId: () => number,
  isoDate: string,
): boolean {
  return applyGranularSubstitution(paragraphs, fragments, oldText, '', contextBefore, nextId, isoDate)
}

/**
 * Inserta un parrafo nuevo despues del parrafo que contiene `after_text`.
 * El parrafo insertado hereda el pPr y el rPr del parrafo ancla.
 */
function applyParagraphInsertion(
  paragraphs: ParagraphMeta[],
  fragments: string[],
  afterText: string,
  newParagraph: string,
  contextBefore: string | undefined,
  nextId: () => number,
  isoDate: string,
): boolean {
  const target = findParagraph(paragraphs, afterText, contextBefore)
  if (target === null) return false
  const { index } = target
  const anchor = paragraphs[index]

  const pPrWithIns = injectInsertedMarkIntoPPr(anchor.pPr, nextId(), isoDate)
  const rPr = anchor.segments[0]?.rPr ?? ''
  const insXml =
    `<w:ins w:id="${nextId()}" w:author="${AUTHOR}" w:date="${isoDate}">` +
    `<w:r>${rPr}<w:t xml:space="preserve">${escapeXml(newParagraph)}</w:t></w:r>` +
    `</w:ins>`
  const newPXml = `<w:p>${pPrWithIns}${insXml}</w:p>`
  fragments[index] = fragments[index] + newPXml
  return true
}

// ---------------------------------------------------------------------------
// Parseo de parrafos y runs
// ---------------------------------------------------------------------------

function splitDocumentBody(xml: string): { pre: string; body: string; post: string } {
  const bodyOpen = xml.indexOf('<w:body>')
  const bodyClose = xml.indexOf('</w:body>')
  if (bodyOpen === -1 || bodyClose === -1) {
    throw new Error('DOCX invalido: no se encontro <w:body>')
  }
  return {
    pre: xml.slice(0, bodyOpen + '<w:body>'.length),
    body: xml.slice(bodyOpen + '<w:body>'.length, bodyClose),
    post: xml.slice(bodyClose),
  }
}

function parseParagraphs(body: string): ParagraphMeta[] {
  const paragraphs: ParagraphMeta[] = []
  const pRegex = /<w:p(?:\s[^>]*)?(?:\/>|>[\s\S]*?<\/w:p>)/g
  let m: RegExpExecArray | null
  let index = 0
  while ((m = pRegex.exec(body)) !== null) {
    const raw = m[0]
    const segments = parseSegments(raw)
    paragraphs.push({
      index: index++,
      raw,
      text: segments.map(s => s.text).join(''),
      segments,
      pPr: extractPPr(raw),
    })
  }
  return paragraphs
}

/**
 * Extrae la secuencia de RunSegments visibles (texto + rPr) del parrafo.
 * Ignora bloques ya marcados como <w:del> — su contenido no es texto visible.
 * Los <w:ins> preexistentes se tratan como texto normal (accept-in-place).
 */
function parseSegments(pXml: string): RunSegment[] {
  // Quitamos <w:del>...</w:del> completos para no incluirlos en el flat text
  const cleaned = pXml.replace(/<w:del(?:\s[^>]*)?>[\s\S]*?<\/w:del>/g, '')
  const segments: RunSegment[] = []
  const runRegex = /<w:r(?:\s[^>]*)?>([\s\S]*?)<\/w:r>/g
  let m: RegExpExecArray | null
  while ((m = runRegex.exec(cleaned)) !== null) {
    const runInner = m[1]
    const rPrMatch = runInner.match(/<w:rPr>[\s\S]*?<\/w:rPr>/)
    const rPr = rPrMatch ? rPrMatch[0] : ''
    // Extraer todos los <w:t> del run (puede haber varios)
    const tRegex = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g
    let tMatch: RegExpExecArray | null
    while ((tMatch = tRegex.exec(runInner)) !== null) {
      segments.push({ text: unescapeXml(tMatch[1]), rPr })
    }
    // Tabs — los tratamos como texto tab
    const tabCount = (runInner.match(/<w:tab\/>/g) ?? []).length
    for (let i = 0; i < tabCount; i++) {
      segments.push({ text: '\t', rPr })
    }
    // Line breaks — los tratamos como \n
    const brCount = (runInner.match(/<w:br(?:\/|\s[^>]*\/)?>/g) ?? []).length
    for (let i = 0; i < brCount; i++) {
      segments.push({ text: '\n', rPr })
    }
  }
  return segments
}

function extractPPr(pXml: string): string {
  const m = pXml.match(/<w:pPr>[\s\S]*?<\/w:pPr>/)
  return m ? m[0] : ''
}

/**
 * Encuentra el parrafo con el fragmento y devuelve indice + offset del match
 * dentro del texto plano del parrafo. Considera context_before para desambiguar.
 */
function findParagraph(
  paragraphs: ParagraphMeta[],
  needle: string,
  contextBefore?: string,
): { index: number; matchStart: number } | null {
  if (!needle) return null
  const candidates: Array<{ index: number; matchStart: number }> = []
  for (const p of paragraphs) {
    if (!p.text) continue
    const searchAnchor = contextBefore ? contextBefore + needle : needle
    let idx = p.text.indexOf(searchAnchor)
    if (idx !== -1) {
      // matchStart apunta al inicio del needle, no del contexto
      const matchStart = idx + (contextBefore?.length ?? 0)
      candidates.push({ index: p.index, matchStart })
    }
  }
  if (candidates.length === 0 && contextBefore) {
    // Fallback: buscar solo el needle sin contexto
    for (const p of paragraphs) {
      if (!p.text) continue
      const idx = p.text.indexOf(needle)
      if (idx !== -1) candidates.push({ index: p.index, matchStart: idx })
    }
  } else if (candidates.length === 0) {
    for (const p of paragraphs) {
      if (!p.text) continue
      const idx = p.text.indexOf(needle)
      if (idx !== -1) candidates.push({ index: p.index, matchStart: idx })
    }
  }
  return candidates[0] ?? null
}

/**
 * Devuelve el rPr del segmento que cubre `offset` en el texto plano del parrafo.
 */
function findRPrAtOffset(segments: RunSegment[], offset: number): string {
  let cursor = 0
  for (const seg of segments) {
    if (offset < cursor + seg.text.length) return seg.rPr
    cursor += seg.text.length
  }
  return segments[segments.length - 1]?.rPr ?? ''
}

/**
 * Renderea el XML de <w:r> para el rango [start, end) del texto plano del
 * parrafo, respetando el rPr de cada segmento original. Si el rango cruza
 * segmentos con distinto rPr, emite multiples <w:r> preservando cada formato.
 */
function renderRunsForRange(segments: RunSegment[], start: number, end: number): string {
  if (start >= end) return ''
  const parts: string[] = []
  let cursor = 0
  for (const seg of segments) {
    const segStart = cursor
    const segEnd = cursor + seg.text.length
    cursor = segEnd
    if (segEnd <= start) continue
    if (segStart >= end) break
    const from = Math.max(0, start - segStart)
    const to = Math.min(seg.text.length, end - segStart)
    const slice = seg.text.slice(from, to)
    if (!slice) continue
    parts.push(`<w:r>${seg.rPr}<w:t xml:space="preserve">${escapeXml(slice)}</w:t></w:r>`)
  }
  return parts.join('')
}

function highestExistingId(xml: string): number {
  const idRegex = /w:id="(\d+)"/g
  let max = 0
  let m: RegExpExecArray | null
  while ((m = idRegex.exec(xml)) !== null) {
    const n = parseInt(m[1], 10)
    if (!Number.isNaN(n) && n > max) max = n
  }
  return max
}

function injectInsertedMarkIntoPPr(pPr: string, id: number, isoDate: string): string {
  const insMark = `<w:rPr><w:ins w:id="${id}" w:author="${AUTHOR}" w:date="${isoDate}"/></w:rPr>`
  if (!pPr) return `<w:pPr>${insMark}</w:pPr>`
  if (pPr.includes('<w:rPr>')) {
    return pPr.replace(
      /<w:rPr>/,
      `<w:rPr><w:ins w:id="${id}" w:author="${AUTHOR}" w:date="${isoDate}"/>`,
    )
  }
  return pPr.replace(
    '</w:pPr>',
    `${insMark.replace('<w:pPr>', '').replace('</w:pPr>', '')}</w:pPr>`,
  )
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function unescapeXml(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
}
