import { NextRequest, NextResponse } from 'next/server'
import { requireAuthUser } from '@/lib/judicial-caso-access'
import { generateRedline } from '@/lib/legal/redline/agent-redline'

export const runtime = 'nodejs'
// El agente ejecuta pandoc + diff + edicion XML + conversion a PDF con LibreOffice.
// En Vercel Pro el limite es 300s; en Hobby es 60s y esta ruta va a truncar en
// documentos medianos o grandes.
export const maxDuration = 300

const MAX_FILE_BYTES = 5 * 1024 * 1024 // 5 MB por archivo
const ACCEPTED_MIME = new Set([
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/octet-stream', // fallback frecuente cuando el browser no reconoce el .docx
])

export async function POST(req: NextRequest) {
  const auth = await requireAuthUser()
  if ('response' in auth) return auth.response

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY no configurada' }, { status: 500 })
  }

  let form: FormData
  try {
    form = await req.formData()
  } catch (err) {
    return NextResponse.json({ error: `No se pudo leer el formulario: ${errorMessage(err)}` }, { status: 400 })
  }

  const oldFile = form.get('old_file')
  const newFile = form.get('new_file')

  if (!(oldFile instanceof File) || !(newFile instanceof File)) {
    return NextResponse.json({ error: 'Debes adjuntar ambos DOCX (campos old_file y new_file).' }, { status: 400 })
  }

  const validationError = validateDocx(oldFile, 'original') ?? validateDocx(newFile, 'revisado')
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 })

  try {
    const [oldBuffer, newBuffer] = await Promise.all([fileToBuffer(oldFile), fileToBuffer(newFile)])

    const result = await generateRedline({
      oldBuffer,
      oldName: oldFile.name,
      newBuffer,
      newName: newFile.name,
    })

    return NextResponse.json({
      docx_base64: result.docx.toString('base64'),
      pdf_base64: result.pdf.toString('base64'),
      summary: result.summary,
      stats: {
        changes_total: result.changesTotal,
        substitutions: result.substitutions,
        new_blocks: result.newBlocks,
        deleted_blocks: result.deletedBlocks,
        verified: result.verified,
      },
    })
  } catch (err) {
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 })
  }
}

function validateDocx(file: File, label: string): string | null {
  const lowerName = file.name.toLowerCase()
  if (!lowerName.endsWith('.docx')) {
    return `El archivo ${label} debe ser .docx (recibido: ${file.name})`
  }
  if (file.type && !ACCEPTED_MIME.has(file.type)) {
    return `El archivo ${label} tiene un tipo MIME inesperado (${file.type}). Debe ser DOCX de Word.`
  }
  if (file.size > MAX_FILE_BYTES) {
    return `El archivo ${label} excede 5 MB (tiene ${(file.size / 1024 / 1024).toFixed(1)} MB).`
  }
  if (file.size === 0) {
    return `El archivo ${label} esta vacio.`
  }
  return null
}

async function fileToBuffer(file: File): Promise<Buffer> {
  return Buffer.from(await file.arrayBuffer())
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  return String(err)
}
