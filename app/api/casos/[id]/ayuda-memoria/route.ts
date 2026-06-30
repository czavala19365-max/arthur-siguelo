import { NextRequest } from 'next/server'
import { Document, Packer, Paragraph, TextRun, AlignmentType } from 'docx'
import * as XLSX from 'xlsx'
import { denyUnlessCasoOwnerOrAdmin, requireAuthUser } from '@/lib/judicial-caso-access'
import { getCasoById, getMovimientosByCaso, getEscritosByCaso, getAudienciasByCaso } from '@/lib/judicial-db'
import { formatPartesDisplay } from '@/lib/format-partes-judicial'

export const runtime = 'nodejs'
export const maxDuration = 60

type ExportFormat = 'docx' | 'xlsx'
type DocxAlignment = (typeof AlignmentType)[keyof typeof AlignmentType]

function safeFilePart(s: string): string {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60) || 'archivo'
}

function todayYMD(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}${m}${dd}`
}

function parseDateLikeUI(s: string | null): number {
  if (!s) return 0
  const raw = String(s).trim()
  const m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (m) {
    const ms = new Date(parseInt(m[3], 10), parseInt(m[2], 10) - 1, parseInt(m[1], 10)).getTime()
    return Number.isNaN(ms) ? 0 : ms
  }
  const u = new Date(raw).getTime()
  return Number.isNaN(u) ? 0 : u
}

function guessIncidenciaTipo(acto: string | null): 'RESOLUCIÓN' | 'ESCRITO' | 'ACTUACIÓN' {
  const a = String(acto || '').toUpperCase()
  if (a.includes('RESOLUC')) return 'RESOLUCIÓN'
  if (a.includes('ESCRIT')) return 'ESCRITO'
  return 'ACTUACIÓN'
}

function extractPartes(partesRaw: string | null | undefined): {
  demandantes: string[]
  demandados: string[]
  otros: string[]
} {
  const demandantes: string[] = []
  const demandados: string[] = []
  const otros: string[] = []
  const raw = String(partesRaw ?? '').trim()
  if (!raw) return { demandantes, demandados, otros }
  if (raw.startsWith('[')) {
    try {
      const parsed = JSON.parse(raw) as unknown
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (!item || typeof item !== 'object') continue
          const o = item as { rol?: string; nombre?: string }
          const nombre = String(o.nombre ?? '').trim()
          if (!nombre) continue
          const rol = String(o.rol ?? '').trim().toLowerCase()
          if (rol.includes('demandante')) demandantes.push(nombre)
          else if (rol.includes('demandado')) demandados.push(nombre)
          else otros.push(rol ? `${rol}: ${nombre}` : nombre)
        }
      }
    } catch {
      // ignore
    }
    return { demandantes, demandados, otros }
  }
  // Texto libre: lo dejamos en "otros"
  otros.push(raw)
  return { demandantes, demandados, otros }
}

function tr(text: string, opts?: { bold?: boolean; size?: number }) {
  return new TextRun({
    text,
    bold: opts?.bold,
    font: 'Times New Roman',
    size: opts?.size ?? 24, // 12pt
  })
}

function pLine(text: string, opts?: { bold?: boolean; align?: DocxAlignment; size?: number }) {
  return new Paragraph({
    alignment: opts?.align ?? AlignmentType.JUSTIFIED,
    children: [tr(text, { bold: opts?.bold, size: opts?.size })],
  })
}

function pHeading(text: string) {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { before: 240, after: 120 },
    children: [tr(text, { bold: true })],
  })
}

async function buildDocx(params: {
  caso: Awaited<ReturnType<typeof getCasoById>>
  movimientos: Awaited<ReturnType<typeof getMovimientosByCaso>>
  escritos: Awaited<ReturnType<typeof getEscritosByCaso>>
  audiencias: Awaited<ReturnType<typeof getAudienciasByCaso>>
}) {
  const caso = params.caso
  if (!caso) throw new Error('Caso no encontrado')

  const movimientosAsc = [...(params.movimientos ?? [])].sort((a, b) => parseDateLikeUI(a.fecha) - parseDateLikeUI(b.fecha))
  const { demandantes, demandados, otros } = extractPartes(caso.partes)

  const paragraphs: Paragraph[] = []
  paragraphs.push(
    pLine('AYUDA MEMORIA', { bold: true, align: AlignmentType.CENTER, size: 32 }),
    pLine(`Expediente: ${caso.numero_expediente || `Caso ${caso.id}`}`, { align: AlignmentType.CENTER, bold: true }),
    pLine(`Juzgado: ${caso.organo_jurisdiccional || '—'} · Juez: ${caso.juez || '—'}`, { align: AlignmentType.CENTER }),
    pLine(`Distrito judicial: ${caso.distrito_judicial || '—'} · Etapa: ${caso.etapa_procesal || '—'}`, { align: AlignmentType.CENTER }),
    new Paragraph({ text: '' }),
  )

  paragraphs.push(pHeading('I. DATOS GENERALES'))
  paragraphs.push(
    pLine(`Cliente / Alias: ${caso.alias || caso.cliente || '—'}`),
    pLine(`Tipo de proceso: ${caso.tipo_proceso || '—'}`),
    pLine(`Partes: ${formatPartesDisplay(caso.partes) || '—'}`),
  )
  if (demandantes.length) paragraphs.push(pLine(`Demandante(s): ${demandantes.join(' · ')}`))
  if (demandados.length) paragraphs.push(pLine(`Demandado(s): ${demandados.join(' · ')}`))
  if (otros.length && (!demandantes.length || !demandados.length)) paragraphs.push(pLine(`Otros: ${otros.join(' · ')}`))
  paragraphs.push(new Paragraph({ text: '' }))

  paragraphs.push(pHeading('II. LÍNEA DE TIEMPO (INCIDENCIA POR INCIDENCIA)'))
  if (movimientosAsc.length === 0) {
    paragraphs.push(pLine('No se registran incidencias (movimientos) para este expediente.'))
  } else {
    let idx = 1
    for (const m of movimientosAsc) {
      const fecha = m.fecha || 'Sin fecha'
      const acto = m.acto || 'Actuación'
      const tipo = guessIncidenciaTipo(m.acto)
      const sumilla = String(m.sumilla || '').trim()
      const folio = String(m.folio || '').trim()
      const proved = tipo === 'ESCRITO' ? ' (proveído / cargo según CEJ)' : ''

      paragraphs.push(
        pLine(`${idx}. ${fecha} — ${tipo}: ${acto}${proved}`, { bold: true }),
      )
      if (sumilla) paragraphs.push(pLine(`   Descripción: ${sumilla}`))
      if (folio) paragraphs.push(pLine(`   Folio: ${folio}`))
      if (m.tiene_documento === true) {
        paragraphs.push(pLine(`   Documento adjunto: ${m.documento_url ? 'Sí' : 'No disponible'}`))
      }
      paragraphs.push(new Paragraph({ text: '' }))
      idx++
    }
  }

  if ((params.audiencias ?? []).length > 0) {
    paragraphs.push(pHeading('III. AGENDA / AUDIENCIAS'))
    for (const a of params.audiencias ?? []) {
      paragraphs.push(pLine(`- ${a.fecha}: ${a.descripcion}${a.tipo ? ` (${a.tipo})` : ''}`))
    }
    paragraphs.push(new Paragraph({ text: '' }))
  }

  if ((params.escritos ?? []).length > 0) {
    paragraphs.push(pHeading('IV. ESCRITOS GENERADOS EN PLATAFORMA'))
    for (const e of params.escritos ?? []) {
      paragraphs.push(pLine(`- ${new Date(e.created_at).toLocaleString('es-PE')}: ${e.tipo}`, { bold: true }))
    }
  }

  const docx = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { orientation: 'portrait' },
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        children: paragraphs.length ? paragraphs : [new Paragraph('')],
      },
    ],
  })

  return await Packer.toBuffer(docx)
}

function buildXlsx(params: {
  caso: Awaited<ReturnType<typeof getCasoById>>
  movimientos: Awaited<ReturnType<typeof getMovimientosByCaso>>
  escritos: Awaited<ReturnType<typeof getEscritosByCaso>>
  audiencias: Awaited<ReturnType<typeof getAudienciasByCaso>>
}) {
  const caso = params.caso
  if (!caso) throw new Error('Caso no encontrado')

  const wb = XLSX.utils.book_new()

  const movimientosAsc = [...(params.movimientos ?? [])].sort((a, b) => parseDateLikeUI(a.fecha) - parseDateLikeUI(b.fecha))
  const meta: Array<[string, string]> = [
    ['Título', 'AYUDA MEMORIA'],
    ['Expediente', caso.numero_expediente || `Caso ${caso.id}`],
    ['Cliente / Alias', caso.alias || caso.cliente || '—'],
    ['Juzgado', caso.organo_jurisdiccional || '—'],
    ['Juez', caso.juez || '—'],
    ['Distrito judicial', caso.distrito_judicial || '—'],
    ['Etapa procesal', caso.etapa_procesal || '—'],
    ['Tipo de proceso', caso.tipo_proceso || '—'],
    ['Partes', formatPartesDisplay(caso.partes) || '—'],
    ['Generado', new Date().toLocaleString('es-PE')],
  ]
  const wsMeta = XLSX.utils.aoa_to_sheet([['AYUDA MEMORIA'], [], ...meta.map(([k, v]) => [k, v])])
  XLSX.utils.book_append_sheet(wb, wsMeta, 'Resumen')

  const header = ['#', 'Fecha', 'Tipo', 'Acto', 'Descripción / Sumilla', 'Folio', 'Documento', 'Urgencia']
  const rows = movimientosAsc.map((m, i) => [
    i + 1,
    m.fecha || '',
    guessIncidenciaTipo(m.acto),
    m.acto || '',
    m.sumilla || '',
    m.folio || '',
    m.tiene_documento === true ? (m.documento_url ? 'Sí' : 'No disponible') : 'No',
    m.urgencia || '',
  ])
  const wsMovs = XLSX.utils.aoa_to_sheet([header, ...rows])
  XLSX.utils.book_append_sheet(wb, wsMovs, 'Incidencias')

  if ((params.audiencias ?? []).length > 0) {
    const wsA = XLSX.utils.aoa_to_sheet([
      ['Fecha', 'Descripción', 'Tipo'],
      ...(params.audiencias ?? []).map(a => [a.fecha || '', a.descripcion || '', a.tipo || '']),
    ])
    XLSX.utils.book_append_sheet(wb, wsA, 'Agenda')
  }

  if ((params.escritos ?? []).length > 0) {
    const wsE = XLSX.utils.aoa_to_sheet([
      ['Creado en plataforma', 'Tipo'],
      ...(params.escritos ?? []).map(e => [new Date(e.created_at).toLocaleString('es-PE'), e.tipo]),
    ])
    XLSX.utils.book_append_sheet(wb, wsE, 'Escritos')
  }

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAuthUser()
  if ('response' in auth) return auth.response

  const { id } = await ctx.params
  const casoId = Number.parseInt(String(id || ''), 10)
  if (!Number.isFinite(casoId) || casoId <= 0) {
    return Response.json({ error: 'casoId inválido' }, { status: 400 })
  }

  const body = await req.json().catch(() => null) as null | { format?: ExportFormat }
  const format = (body?.format || 'docx') as ExportFormat
  if (format !== 'docx' && format !== 'xlsx') {
    return Response.json({ error: 'format inválido' }, { status: 400 })
  }

  const [caso, movimientos, escritos, audiencias] = await Promise.all([
    getCasoById(casoId),
    getMovimientosByCaso(casoId),
    getEscritosByCaso(casoId),
    getAudienciasByCaso(casoId),
  ])
  if (!caso) return Response.json({ error: 'Caso no encontrado' }, { status: 404 })

  const denied = await denyUnlessCasoOwnerOrAdmin(caso, auth.user)
  if (denied) return denied

  const expediente = caso.numero_expediente || String(caso.id)
  const baseName = `Ayuda_Memoria_${safeFilePart(expediente)}_${todayYMD()}`

  if (format === 'xlsx') {
    const buffer = buildXlsx({ caso, movimientos, escritos, audiencias })
    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${baseName}.xlsx"`,
      },
    })
  }

  const buffer = await buildDocx({ caso, movimientos, escritos, audiencias })
  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${baseName}.docx"`,
    },
  })
}

