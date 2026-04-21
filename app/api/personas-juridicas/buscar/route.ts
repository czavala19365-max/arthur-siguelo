import { NextRequest, NextResponse } from 'next/server'

const SUNARP_URL = 'https://www.sunarp.gob.pe/mconsultas/RelacionS01r.asp'
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

export type PersonaJuridica = {
  numero:     number
  partida:    string
  razon:      string
  siglas:     string
  oficina:    string
}

export type BusquedaResult = {
  resultados:   PersonaJuridica[]
  pagina:       number
  totalPaginas: number
  totalResultados: number
}

/**
 * GET /api/personas-juridicas/buscar?razon=INMOBILIARIA&siglas=&pagina=1
 *
 * Raspa la búsqueda de Personas Jurídicas de SUNARP (RelacionS01r.asp).
 * No hay API REST — la respuesta es HTML que se parsea con regex.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const razon  = (searchParams.get('razon')  ?? '').trim().toUpperCase()
  const siglas = (searchParams.get('siglas') ?? '').trim().toUpperCase()
  const pagina = Math.max(1, parseInt(searchParams.get('pagina') ?? '1', 10))

  // Validaciones mínimas (mismas reglas que el JS del formulario SUNARP)
  if (razon.length === 0 && siglas.length === 0) {
    return NextResponse.json({ error: 'Ingrese razón social o siglas para buscar.' }, { status: 400 })
  }
  if (razon.length > 0 && razon.length < 3) {
    return NextResponse.json({ error: 'La razón social debe tener al menos 3 caracteres.' }, { status: 400 })
  }
  if (siglas.length > 0 && siglas.length < 3) {
    return NextResponse.json({ error: 'Las siglas deben tener al menos 3 caracteres.' }, { status: 400 })
  }

  const body = new URLSearchParams({
    tRazon:  razon,
    tSiglas: siglas,
    pagina:  String(pagina),
  })

  let html: string
  try {
    const res = await fetch(SUNARP_URL, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent':   UA,
        'Referer':      'https://www.sunarp.gob.pe/mconsultas/RelacionS01.asp',
        'Origin':       'https://www.sunarp.gob.pe',
      },
      body: body.toString(),
    })
    if (!res.ok) throw new Error(`SUNARP respondió HTTP ${res.status}`)
    html = await res.text()
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al conectar con SUNARP.'
    return NextResponse.json({ error: msg }, { status: 502 })
  }

  // Extraer totalPaginas del input hidden
  const totalPaginasMatch = html.match(/name="totalPaginas"[^>]*value="(\d+)"/)
  const totalPaginas = totalPaginasMatch ? parseInt(totalPaginasMatch[1], 10) : 1

  // Parsear filas de la tabla de resultados
  // Cada fila de dato tiene 5 <td>: N°, Partida, Razón, Siglas, Oficina
  // Las filas de cabecera tienen bgcolor="#AEDFFF" — las ignoramos
  const rowRegex = /<tr>\s*([\s\S]*?)\s*<\/tr>/gi
  const cellRegex = /<td[^>]*>\s*([\s\S]*?)\s*<\/td>/gi

  const resultados: PersonaJuridica[] = []
  let rowMatch: RegExpExecArray | null

  while ((rowMatch = rowRegex.exec(html)) !== null) {
    const rowHtml = rowMatch[1]

    // Saltar filas con bgcolor (cabeceras)
    if (rowHtml.includes('bgcolor=')) continue

    const cells: string[] = []
    let cellMatch: RegExpExecArray | null
    cellRegex.lastIndex = 0

    while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
      // Strip HTML tags and decode &nbsp;
      const text = cellMatch[1]
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .trim()
      cells.push(text)
    }

    // Filas de datos válidas tienen exactamente 5 celdas y la 1ª es numérica
    if (cells.length === 5 && /^\d+$/.test(cells[0])) {
      resultados.push({
        numero:  parseInt(cells[0], 10),
        partida: cells[1].replace(/\s+/g, ''),
        razon:   cells[2].replace(/\s+/g, ' ').trim(),
        siglas:  cells[3].replace(/\s+/g, ' ').trim(),
        oficina: cells[4].replace(/\s+/g, ' ').trim(),
      })
    }
  }

  // Calcular total estimado de resultados (20 por página)
  const totalResultados = totalPaginas > 0 ? (totalPaginas - 1) * 20 + resultados.length : resultados.length

  console.log(`[personas-juridicas] razon="${razon}" siglas="${siglas}" pagina=${pagina} → ${resultados.length} resultados, ${totalPaginas} páginas`)

  return NextResponse.json({
    resultados,
    pagina,
    totalPaginas,
    totalResultados,
  } satisfies BusquedaResult)
}
