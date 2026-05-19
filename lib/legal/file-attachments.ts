import type { DocumentBlock, TextBlock } from './anthropic'

export const MAX_FILE_BYTES = 10 * 1024 * 1024
export const ALLOWED_EXTENSIONS = ['pdf', 'docx', 'txt'] as const

export interface ParsedAttachment {
  name: string
  blocks: Array<TextBlock | DocumentBlock>
}

export interface AttachmentInput {
  name: string
  mimeType: string
  base64: string
}

function ext(name: string): string {
  const i = name.lastIndexOf('.')
  return i >= 0 ? name.slice(i + 1).toLowerCase() : ''
}

export function validateAttachmentMeta(name: string, sizeBytes: number): string | null {
  const e = ext(name)
  if (e === 'doc') return 'El formato .doc antiguo no está soportado. Usa DOCX o TXT.'
  if (!ALLOWED_EXTENSIONS.includes(e as (typeof ALLOWED_EXTENSIONS)[number])) {
    return 'Solo se permiten archivos PDF, DOCX o TXT.'
  }
  if (sizeBytes > MAX_FILE_BYTES) return 'Cada archivo debe pesar como máximo 10 MB.'
  return null
}

/** Parsea adjuntos en el servidor (base64 desde el cliente). */
export async function parseAttachmentsServer(
  files: AttachmentInput[],
): Promise<ParsedAttachment[]> {
  const mammoth = await import('mammoth')
  const out: ParsedAttachment[] = []

  for (const file of files) {
    const e = ext(file.name)
    const err = validateAttachmentMeta(file.name, Buffer.from(file.base64, 'base64').length)
    if (err) throw new Error(`${file.name}: ${err}`)

    const blocks: Array<TextBlock | DocumentBlock> = []

    if (e === 'pdf') {
      blocks.push({
        type: 'document',
        source: {
          type: 'base64',
          media_type: 'application/pdf',
          data: file.base64,
        },
      })
    } else if (e === 'txt') {
      const text = Buffer.from(file.base64, 'base64').toString('utf-8')
      blocks.push({
        type: 'text',
        text: `--- Archivo de referencia: ${file.name} ---\n${text}`,
      })
    } else if (e === 'docx') {
      const buffer = Buffer.from(file.base64, 'base64')
      const result = await mammoth.extractRawText({ buffer })
      blocks.push({
        type: 'text',
        text: `--- Archivo de referencia: ${file.name} ---\n${result.value}`,
      })
    }

    out.push({ name: file.name, blocks })
  }

  return out
}

export function flattenAttachmentBlocks(attachments: ParsedAttachment[]): Array<TextBlock | DocumentBlock> {
  return attachments.flatMap(a => a.blocks)
}

/** Cliente: lee File a base64 */
export function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const base64 = result.includes(',') ? result.split(',')[1] : result
      resolve(base64)
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}
