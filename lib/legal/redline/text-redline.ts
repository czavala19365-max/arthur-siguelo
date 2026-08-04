import mammoth from 'mammoth'
import PizZip from 'pizzip'
import { getAnthropicClient } from '@/lib/legal/anthropic'

/**
 * Redline "text-first" — no usa el sandbox de code execution. El flujo es:
 *
 *   1. Extraer texto plano de ambos DOCX con mammoth.
 *   2. Pedir a Sonnet 5 un PLAN DE EDICIONES estructurado en JSON: sustituciones,
 *      inserciones y eliminaciones ancladas a fragmentos exactos del texto
 *      original.
 *   3. Aplicar cada edicion como tracked-change (<w:del> / <w:ins>) sobre el
 *      XML de word/document.xml del DOCX original, empaquetado con PizZip.
 *
 * Es rapido (10-30 s), barato (~US$0.03-0.10 por corrida) y controlable — la
 * IA solo decide QUE cambia; nosotros aplicamos COMO en un buffer Node local,
 * sin depender de un sandbox remoto.
 *
 * Simplificacion consciente: cuando un fragmento cambia dentro de un parrafo,
 * marcamos el parrafo COMPLETO como <w:del> y agregamos uno nuevo como <w:ins>
 * con el fragmento reemplazado. Es mas ruidoso visualmente en Word pero es
 * infalible frente a runs fragmentados por formato (que rompen el search por
 * string). Sigue siendo un tracked change real: se acepta o rechaza en el
 * panel Revisar.
 */

export interface RedlineArtifacts {
  docx: Buffer
  summary: string
  stats: {
    substitutions: number
    insertions: number
    deletions: number
    total: number
    unmatched: number // ediciones que el modelo pidio pero no encontramos anclaje
  }
}

export interface RedlineInput {
  oldBuffer: Buffer
  oldName: string
  newBuffer: Buffer
  newName: string
}

export type ProgressPhase = 'extracting' | 'diffing' | 'applying' | 'done'

export interface ProgressEvent {
  phase: ProgressPhase
  progress: number // 0..100
  message: string
}

export type ProgressCallback = (event: ProgressEvent) => void

interface Substitution {
  old_text: string
  new_text: string
  context_before?: string
}

interface Insertion {
  after_text: string
  new_paragraph: string
}

interface Deletion {
  text_to_delete: string
}

interface EditPlan {
  substitutions: Substitution[]
  insertions: Insertion[]
  deletions: Deletion[]
  summary: string
}

const AUTHOR = 'Arthur (Redline)'

const DIFF_SYSTEM = `Eres un experto en comparacion de documentos legales bajo ley peruana. Recibes el TEXTO PLANO de un contrato original (A) y uno revisado (B). Tu tarea es producir un PLAN DE EDICIONES estructurado que, aplicado a A, resulte exactamente en B.

Devuelve SOLO un JSON valido (sin fences de markdown, sin comentarios), con esta forma exacta:
{
  "substitutions": [
    { "old_text": "...", "new_text": "...", "context_before": "..." }
  ],
  "insertions": [
    { "after_text": "...", "new_paragraph": "..." }
  ],
  "deletions": [
    { "text_to_delete": "..." }
  ],
  "summary": "resumen en espanol, maximo 15 lineas, describiendo los cambios detectados"
}

Reglas ESTRICTAS:
- Cada "old_text", "after_text" y "text_to_delete" debe aparecer EXACTAMENTE en el ORIGINAL (caracter por caracter, incluyendo puntuacion y espacios). Copia y pega desde el ORIGINAL.
- Prefiere fragmentos completos como anclas: una oracion entera o un parrafo, en vez de palabras sueltas. Esto reduce ambiguedad.
- Si un fragmento aparece MAS de una vez en el ORIGINAL, agrega "context_before" con los 30-60 caracteres inmediatamente anteriores para desambiguar.
- Nunca inventes cambios que no esten en B: si el original y el revisado son identicos, devuelve arrays vacios y summary "No se detectaron cambios sustanciales entre las dos versiones.".
- No incluyas el "context_before" si el fragmento es unico.
- El "summary" debe estar en espanol y describir en oraciones planas los cambios detectados (que se agrego, que se elimino, que se modifico), sin markdown, sin listas con guiones. Un abogado revisor debe poder leerlo de un vistazo.`

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
    progress: 75,
    message: `Aplicando ${plan.substitutions.length + plan.insertions.length + plan.deletions.length} cambio(s) al DOCX...`,
  })
  const { buffer, stats } = applyEditsToDocx(input.oldBuffer, plan)

  emit({ phase: 'done', progress: 100, message: 'Redline listo.' })

  return {
    docx: buffer,
    summary: plan.summary,
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
  // Tolerar fences y ruido alrededor del JSON
  const fenced = text.match(/```(?:json)?\s*([\s\S]+?)```/i)
  const candidate = fenced ? fenced[1] : text
  const first = candidate.indexOf('{')
  const last = candidate.lastIndexOf('}')
  if (first === -1 || last <= first) return null
  try {
    const parsed = JSON.parse(candidate.slice(first, last + 1))
    return {
      substitutions: Array.isArray(parsed.substitutions) ? parsed.substitutions : [],
      insertions: Array.isArray(parsed.insertions) ? parsed.insertions : [],
      deletions: Array.isArray(parsed.deletions) ? parsed.deletions : [],
      summary: typeof parsed.summary === 'string' ? parsed.summary : '',
    }
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Aplicacion XML de tracked changes
// ---------------------------------------------------------------------------

interface ApplyStats {
  substitutions: number
  insertions: number
  deletions: number
  unmatched: number
}

interface ParagraphMeta {
  index: number // posicion del <w:p> en el arreglo de parrafos
  raw: string   // XML crudo del elemento <w:p>...</w:p>
  text: string  // concatenacion de <w:t> (texto visible)
  pPr: string   // <w:pPr>...</w:pPr> o cadena vacia
  firstRPr: string // <w:rPr>...</w:rPr> del primer run del parrafo, o cadena vacia
}

/**
 * Aplica el plan de ediciones al DOCX. Reescribe word/document.xml y devuelve
 * el nuevo Buffer. Estrategia por-parrafo (documentada en el header del archivo).
 */
function applyEditsToDocx(originalBuffer: Buffer, plan: EditPlan): { buffer: Buffer; stats: ApplyStats } {
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

  // Trabajamos con la lista mutable de fragmentos XML. Cada entrada es un
  // <w:p>...</w:p> completo (posiblemente modificado). Vamos aplicando cambios
  // in-place o insertando/eliminando entradas.
  const fragments: string[] = paragraphs.map(p => p.raw)

  // --- Sustituciones ---
  for (const sub of plan.substitutions) {
    const idx = findParagraphIndex(paragraphs, sub.old_text, sub.context_before)
    if (idx === -1) {
      stats.unmatched++
      continue
    }
    const original = paragraphs[idx]
    const newText = original.text.split(sub.old_text).join(sub.new_text)

    // Estrategia par-a-par: dos parrafos consecutivos, uno con delete y otro con insert.
    // Word los renderea como cambio en el panel Revisar y se pueden aceptar/rechazar juntos.
    const delPara = buildDeletedParagraph(original, nextId, now)
    const insPara = buildInsertedParagraph(original, newText, nextId, now)
    fragments[idx] = delPara + insPara
    // Actualizo el texto para no reusar este parrafo en ediciones posteriores
    paragraphs[idx] = { ...original, raw: fragments[idx], text: '' }
    stats.substitutions++
  }

  // --- Inserciones (parrafo nuevo despues de un anclaje) ---
  for (const ins of plan.insertions) {
    const idx = findParagraphIndex(paragraphs, ins.after_text)
    if (idx === -1) {
      stats.unmatched++
      continue
    }
    const anchor = paragraphs[idx]
    const insPara = buildInsertedParagraph(anchor, ins.new_paragraph, nextId, now)
    fragments[idx] = fragments[idx] + insPara
    stats.insertions++
  }

  // --- Eliminaciones ---
  for (const del of plan.deletions) {
    const idx = findParagraphIndex(paragraphs, del.text_to_delete)
    if (idx === -1) {
      stats.unmatched++
      continue
    }
    const original = paragraphs[idx]
    fragments[idx] = buildDeletedParagraph(original, nextId, now)
    paragraphs[idx] = { ...original, raw: fragments[idx], text: '' }
    stats.deletions++
  }

  const newBody = fragments.join('')
  const newXml = pre + newBody + post
  zip.file('word/document.xml', newXml)
  return { buffer: zip.generate({ type: 'nodebuffer' }) as Buffer, stats }
}

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
  const paragraphRegex = /<w:p(?:\s[^>]*)?(?:\/>|>[\s\S]*?<\/w:p>)/g
  let m: RegExpExecArray | null
  let index = 0
  while ((m = paragraphRegex.exec(body)) !== null) {
    const raw = m[0]
    paragraphs.push({
      index: index++,
      raw,
      text: extractParagraphText(raw),
      pPr: extractPPr(raw),
      firstRPr: extractFirstRPr(raw),
    })
  }
  return paragraphs
}

function extractParagraphText(pXml: string): string {
  const chunks: string[] = []
  const tRegex = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g
  let match: RegExpExecArray | null
  while ((match = tRegex.exec(pXml)) !== null) {
    chunks.push(unescapeXml(match[1]))
  }
  return chunks.join('')
}

function extractPPr(pXml: string): string {
  const m = pXml.match(/<w:pPr>[\s\S]*?<\/w:pPr>/)
  return m ? m[0] : ''
}

function extractFirstRPr(pXml: string): string {
  const m = pXml.match(/<w:r(?:\s[^>]*)?>[\s\S]*?(<w:rPr>[\s\S]*?<\/w:rPr>)/)
  return m ? m[1] : ''
}

/**
 * Busca el parrafo que contiene `needle`. Si `context` esta presente, prefiere
 * el que ademas termine con (o incluya al final) ese contexto — para
 * desambiguar cuando el mismo fragmento aparece varias veces.
 */
function findParagraphIndex(paragraphs: ParagraphMeta[], needle: string, context?: string): number {
  if (!needle) return -1
  const candidates: number[] = []
  for (const p of paragraphs) {
    if (p.text && p.text.includes(needle)) candidates.push(p.index)
  }
  if (candidates.length === 0) return -1
  if (candidates.length === 1) return candidates[0]
  if (context) {
    const withCtx = candidates.find(i => paragraphs[i].text.includes(context + needle) || paragraphs[i].text.includes(context))
    if (withCtx !== undefined) return withCtx
  }
  return candidates[0]
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

function buildDeletedParagraph(original: ParagraphMeta, nextId: () => number, isoDate: string): string {
  const { pPr, firstRPr, text } = original
  const inner =
    `<w:del w:id="${nextId()}" w:author="${AUTHOR}" w:date="${isoDate}">` +
    `<w:r>${firstRPr}<w:delText xml:space="preserve">${escapeXml(text)}</w:delText></w:r>` +
    `</w:del>`
  return `<w:p>${pPr}${inner}</w:p>`
}

function buildInsertedParagraph(anchor: ParagraphMeta, text: string, nextId: () => number, isoDate: string): string {
  const { pPr, firstRPr } = anchor
  // Marcar el paragraph mark como insertado para que Word lo trate como un salto de parrafo nuevo.
  const pPrWithIns = injectInsertedMarkIntoPPr(pPr, nextId(), isoDate)
  const inner =
    `<w:ins w:id="${nextId()}" w:author="${AUTHOR}" w:date="${isoDate}">` +
    `<w:r>${firstRPr}<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>` +
    `</w:ins>`
  return `<w:p>${pPrWithIns}${inner}</w:p>`
}

/**
 * Inserta <w:rPr><w:ins .../></w:rPr> dentro del <w:pPr> del anclaje para
 * marcar el paragraph mark como insertado. Si el anclaje no tiene <w:pPr>,
 * construimos uno minimo con solo la marca.
 */
function injectInsertedMarkIntoPPr(pPr: string, id: number, isoDate: string): string {
  const insMark = `<w:rPr><w:ins w:id="${id}" w:author="${AUTHOR}" w:date="${isoDate}"/></w:rPr>`
  if (!pPr) return `<w:pPr>${insMark}</w:pPr>`
  // Si ya tiene <w:rPr>, inyectamos <w:ins/> dentro. Si no, agregamos <w:rPr> al final.
  if (pPr.includes('<w:rPr>')) {
    return pPr.replace(
      /<w:rPr>/,
      `<w:rPr><w:ins w:id="${id}" w:author="${AUTHOR}" w:date="${isoDate}"/>`,
    )
  }
  return pPr.replace('</w:pPr>', `${insMark.replace('<w:pPr>', '').replace('</w:pPr>', '')}</w:pPr>`)
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
