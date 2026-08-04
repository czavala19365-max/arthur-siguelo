import { NextRequest, NextResponse } from 'next/server'
import { requireAuthUser } from '@/lib/judicial-caso-access'
import { generateRedline, type ProgressEvent } from '@/lib/legal/redline/text-redline'

export const runtime = 'nodejs'
// El helper text-redline es mucho mas rapido que el de code execution
// (~10-30s), pero mantenemos el techo alto por si el modelo tarda en la fase
// de diffing con documentos largos.
export const maxDuration = 120

const MAX_FILE_BYTES = 5 * 1024 * 1024 // 5 MB por archivo
const ACCEPTED_MIME = new Set([
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/octet-stream',
])

/**
 * SSE endpoint. Emite eventos { phase, progress, message } durante la
 * generacion y termina con un evento { done, docx_base64, summary, stats } o
 * un { error, message }. El frontend consume con EventSource o con fetch +
 * streaming reader.
 */
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
    return NextResponse.json(
      { error: `No se pudo leer el formulario: ${errorMessage(err)}` },
      { status: 400 },
    )
  }

  const oldFile = form.get('old_file')
  const newFile = form.get('new_file')

  if (!(oldFile instanceof File) || !(newFile instanceof File)) {
    return NextResponse.json(
      { error: 'Debes adjuntar ambos DOCX (campos old_file y new_file).' },
      { status: 400 },
    )
  }

  const validationError = validateDocx(oldFile, 'original') ?? validateDocx(newFile, 'revisado')
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 })

  const oldBuffer = Buffer.from(await oldFile.arrayBuffer())
  const newBuffer = Buffer.from(await newFile.arrayBuffer())
  const oldName = oldFile.name
  const newName = newFile.name

  const encoder = new TextEncoder()

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
      }

      // Fase inicial de subida — no es una "subida" real (el buffer ya esta en
      // memoria), pero es el momento antes de arrancar la IA. Lo emitimos
      // igual para que el usuario vea que el flujo arranco.
      send('progress', { phase: 'extracting', progress: 5, message: 'Preparando archivos...' })

      const onProgress = (ev: ProgressEvent) => {
        send('progress', ev)
      }

      try {
        const result = await generateRedline({ oldBuffer, oldName, newBuffer, newName }, onProgress)
        send('done', {
          docx_base64: result.docx.toString('base64'),
          summary: result.summary,
          stats: result.stats,
        })
      } catch (err) {
        console.error('[redline/generate] fallo:', err)
        send('error', { error: errorMessage(err) })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
      // Deshabilita el buffering de Nginx/proxies intermedios.
      'x-accel-buffering': 'no',
    },
  })
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

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  return String(err)
}
