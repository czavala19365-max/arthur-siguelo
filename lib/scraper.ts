import puppeteer from 'puppeteer'
import { Solver } from '@2captcha/captcha-solver'

const SIGUELO_URL = 'https://siguelo.sunarp.gob.pe/siguelo/'
const CONSULTA_API =
  'https://api-gateway.sunarp.gob.pe:9443/sunarp/siguelo/siguelo-tracking/tracking/api/consultaTitulo'
const RECAPTCHA_SITE_KEY = '6LR9dOnQElDl8d4PzT1Jvg'

/** Mapeo de nombre de oficina registral → código numérico que espera la API */
const OFICINA_CODIGOS: Record<string, string> = {
  'Zona Registral I - Sede Piura': '0101',
  'Zona Registral II - Sede Lima': '0201',
  'Zona Registral III - Sede Moyobamba': '0301',
  'Zona Registral IV - Sede Iquitos': '0401',
  'Zona Registral V - Sede Trujillo': '0501',
  'Zona Registral VI - Sede Pucallpa': '0601',
  'Zona Registral VII - Sede Huancayo': '0701',
  'Zona Registral VIII - Sede Huancavelica': '0801',
  'Zona Registral IX - Sede Arequipa': '0901',
  'Zona Registral X - Sede Cusco': '1001',
  'Zona Registral XI - Sede Ica': '1101',
  'Zona Registral XII - Sede Ayacucho': '1201',
  'Zona Registral XIII - Sede Tacna': '1301',
  'Zona Registral XIV - Sede Callao': '1401',
}

export type ScraperParams = {
  oficina_registral: string
  anio_titulo: number
  numero_titulo: string
}

export type ScraperResult = {
  estado: string
  detalle: string | null
  consultadoEn: string
  rawResponse: unknown
}

/**
 * Consulta el estado de un título registral en SIGUELO/SUNARP.
 *
 * Flujo:
 * 1. Lanza Chromium headless y navega a SIGUELO para obtener cookies de sesión.
 * 2. Resuelve el reCAPTCHA v2 usando 2captcha.
 * 3. Llama directamente a la API REST de SIGUELO con el token del captcha.
 * 4. Retorna el estado del título.
 */
export async function consultarTitulo(params: ScraperParams): Promise<ScraperResult> {
  const apiKey = process.env.TWOCAPTCHA_API_KEY
  if (!apiKey) throw new Error('TWOCAPTCHA_API_KEY no está configurada.')

  const codigoOficina = OFICINA_CODIGOS[params.oficina_registral]
  if (!codigoOficina) {
    throw new Error(`Oficina registral no reconocida: "${params.oficina_registral}"`)
  }

  const solver = new Solver(apiKey)

  // ── 1. Navegar a SIGUELO para obtener cookies ─────────────────────────────
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  let cookies: string
  try {
    const page = await browser.newPage()
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    )
    await page.goto(SIGUELO_URL, { waitUntil: 'networkidle2', timeout: 30_000 })

    // Serializar cookies para pasarlas al fetch
    const cookieList = await page.cookies()
    cookies = cookieList.map((c) => `${c.name}=${c.value}`).join('; ')
  } finally {
    await browser.close()
  }

  // ── 2. Resolver reCAPTCHA v2 con 2captcha ────────────────────────────────
  const captchaResult = await solver.recaptcha({
    googlekey: RECAPTCHA_SITE_KEY,
    pageurl: SIGUELO_URL,
  })
  const captchaToken = captchaResult.data

  // ── 3. Llamar a la API REST de SIGUELO ───────────────────────────────────
  const body = {
    codigoOficina,
    anioTitulo: String(params.anio_titulo),
    numeroTitulo: params.numero_titulo,
    captcha: captchaToken,
    tipoDocumento: '',
    numeroDocumento: '',
    token: '',
  }

  const response = await fetch(CONSULTA_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-IBM-Client-Id': '',
      Cookie: cookies,
      Origin: 'https://siguelo.sunarp.gob.pe',
      Referer: SIGUELO_URL,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new Error(`API respondió con HTTP ${response.status}: ${await response.text()}`)
  }

  const data = (await response.json()) as Record<string, unknown>

  // ── 4. Extraer estado del título ─────────────────────────────────────────
  // La API puede devolver el estado en distintos campos según la versión
  const estado =
    (data.estado as string) ??
    (data.estadoTitulo as string) ??
    (data.status as string) ??
    'Sin estado'

  const detalle =
    (data.detalle as string) ??
    (data.descripcion as string) ??
    (data.description as string) ??
    null

  return {
    estado,
    detalle,
    consultadoEn: new Date().toISOString(),
    rawResponse: data,
  }
}
