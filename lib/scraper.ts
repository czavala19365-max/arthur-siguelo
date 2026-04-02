import chromium from '@sparticuz/chromium'
import puppeteer from 'puppeteer-core'
import { Solver } from '@2captcha/captcha-solver'
import CryptoJS from 'crypto-js'

const SIGUELO_URL  = 'https://siguelo.sunarp.gob.pe/siguelo/'
const CONSULTA_API = 'https://api-gateway.sunarp.gob.pe:9443/sunarp/siguelo/siguelo-tracking/tracking/api/consultaTitulo'

// Extraídos del bundle main-es2015.js de SIGUELO
const TURNSTILE_SITE_KEY = '0x4AAAAAABjHwQpFgHGVKCei'
const IBM_CLIENT_ID      = '30a3fd982c6f85a3a70b44fa1f302488'
const AES_KEY            = 'sV2zUWiuNo@3uv8nu9ir4'

// Helpers de encriptado (CryptoJS AES, idéntico al cyService de Angular)
const encrypt = (data: string): string => CryptoJS.AES.encrypt(data, AES_KEY).toString()
const decrypt = (data: string): string => {
  const bytes = CryptoJS.AES.decrypt(data, AES_KEY)
  return bytes.toString(CryptoJS.enc.Utf8)
}

/**
 * Tabla de oficinas registrales.
 * Fuente: https://utilitarios-sunarp-production.apps.paas.sunarp.gob.pe/componentes/api/cboOficinasSiguelo/1
 * Formato: nombreOficina → { zona, oficina } (2 dígitos cada uno)
 */
const OFICINAS: Record<string, { zona: string; oficina: string }> = {
  'ABANCAY':                     { zona: '06', oficina: '02' },
  'ANDAHUAYLAS':                 { zona: '06', oficina: '07' },
  'AREQUIPA':                    { zona: '03', oficina: '01' },
  'AYACUCHO':                    { zona: '14', oficina: '01' },
  'BAGUA':                       { zona: '11', oficina: '04' },
  'BARRANCA':                    { zona: '01', oficina: '06' },
  'CAJAMARCA':                   { zona: '11', oficina: '02' },
  'CALLAO':                      { zona: '01', oficina: '02' },
  'CAMANA':                      { zona: '03', oficina: '02' },
  'CASMA':                       { zona: '04', oficina: '02' },
  'CASTILLA _ APLAO':            { zona: '03', oficina: '03' },
  'CAÑETE':                      { zona: '01', oficina: '05' },
  'CHACHAPOYAS':                 { zona: '11', oficina: '05' },
  'CHEPEN':                      { zona: '08', oficina: '02' },
  'CHICLAYO':                    { zona: '11', oficina: '01' },
  'CHIMBOTE':                    { zona: '04', oficina: '03' },
  'CHINCHA':                     { zona: '10', oficina: '02' },
  'CHOTA':                       { zona: '11', oficina: '06' },
  'CUSCO':                       { zona: '06', oficina: '01' },
  'ESPINAR':                     { zona: '06', oficina: '06' },
  'HUACHO':                      { zona: '01', oficina: '04' },
  'HUAMACHUCO':                  { zona: '08', oficina: '03' },
  'HUANCAVELICA':                { zona: '02', oficina: '09' },
  'HUANCAYO':                    { zona: '02', oficina: '01' },
  'HUANTA':                      { zona: '14', oficina: '02' },
  'HUANUCO':                     { zona: '02', oficina: '02' },
  'HUARAL':                      { zona: '01', oficina: '03' },
  'HUARAZ':                      { zona: '04', oficina: '01' },
  'ICA':                         { zona: '10', oficina: '01' },
  'ILO':                         { zona: '07', oficina: '02' },
  'ISLAY _ MOLLENDO':            { zona: '03', oficina: '04' },
  'JAEN':                        { zona: '11', oficina: '03' },
  'JUANJUI':                     { zona: '12', oficina: '03' },
  'JULIACA':                     { zona: '07', oficina: '03' },
  'LA MERCED (SELVA CENTRAL)':   { zona: '02', oficina: '06' },
  'LIMA':                        { zona: '01', oficina: '01' },
  'MADRE DE DIOS':               { zona: '06', oficina: '03' },
  'MAYNAS':                      { zona: '09', oficina: '01' },
  'MOQUEGUA':                    { zona: '07', oficina: '04' },
  'MOYOBAMBA':                   { zona: '12', oficina: '01' },
  'NAZCA':                       { zona: '10', oficina: '04' },
  'OTUZCO':                      { zona: '08', oficina: '04' },
  'PASCO':                       { zona: '02', oficina: '04' },
  'PISCO':                       { zona: '10', oficina: '03' },
  'PIURA':                       { zona: '05', oficina: '01' },
  'PUCALLPA':                    { zona: '13', oficina: '01' },
  'PUNO':                        { zona: '07', oficina: '05' },
  'QUILLABAMBA':                 { zona: '06', oficina: '04' },
  'SAN PEDRO':                   { zona: '08', oficina: '05' },
  'SATIPO':                      { zona: '02', oficina: '05' },
  'SICUANI':                     { zona: '06', oficina: '05' },
  'SULLANA':                     { zona: '05', oficina: '02' },
  'TACNA':                       { zona: '07', oficina: '01' },
  'TARAPOTO':                    { zona: '12', oficina: '02' },
  'TARMA':                       { zona: '02', oficina: '07' },
  'TINGO MARIA':                 { zona: '02', oficina: '08' },
  'TRUJILLO':                    { zona: '08', oficina: '01' },
  'TUMBES':                      { zona: '05', oficina: '03' },
  'YURIMAGUAS':                  { zona: '12', oficina: '04' },
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
 * 1. Puppeteer navega a SIGUELO, acepta términos y recoge cookies + IP pública.
 * 2. 2captcha resuelve el Cloudflare Turnstile.
 * 3. El payload se encripta con AES (mismo algoritmo que usa Angular) y se envía a la API.
 * 4. La respuesta se desencripta y se extrae el estado del título.
 */
export async function consultarTitulo(params: ScraperParams): Promise<ScraperResult> {
  const apiKey = process.env.TWOCAPTCHA_API_KEY
  if (!apiKey) throw new Error('TWOCAPTCHA_API_KEY no está configurada.')

  const key = params.oficina_registral.toUpperCase().trim()
  const oficina = OFICINAS[key]
  if (!oficina) {
    throw new Error(`Oficina registral no reconocida: "${params.oficina_registral}"`)
  }

  const solver = new Solver(apiKey)

  // ── 1. Puppeteer: cookies + IP pública ────────────────────────────────────
  // En producción (Vercel/Lambda) @sparticuz/chromium extrae su binario a /tmp.
  // En local se puede apuntar a Chrome instalado con CHROME_EXECUTABLE_PATH.
  const executablePath =
    process.env.CHROME_EXECUTABLE_PATH ?? (await chromium.executablePath())

  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath,
    headless: true,
    defaultViewport: { width: 1280, height: 720 },
  })

  let cookies: string
  let ipPc = '0.0.0.0'
  try {
    const page = await browser.newPage()
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    )
    await page.goto(SIGUELO_URL, { waitUntil: 'networkidle2', timeout: 30_000 })

    // Aceptar modal de términos y condiciones
    await page.waitForSelector('.btn-sunarp-cyan', { timeout: 8_000 })
      .then(() => page.click('.btn-sunarp-cyan'))
      .catch(() => { /* Modal no presente */ })

    await new Promise(r => setTimeout(r, 1_500))

    // Obtener IP pública (igual que hace la app: api.ipify.org)
    try {
      const ipRes = await page.evaluate(() =>
        fetch('https://api.ipify.org/?format=json').then(r => r.json())
      ) as { ip: string }
      ipPc = ipRes.ip
    } catch { /* IP no crítica */ }

    const cookieList = await page.cookies()
    cookies = cookieList.map(c => `${c.name}=${c.value}`).join('; ')
  } finally {
    await browser.close()
  }

  // ── 2. Resolver Cloudflare Turnstile con 2captcha ─────────────────────────
  const captchaResult = await solver.cloudflareTurnstile({
    sitekey: TURNSTILE_SITE_KEY,
    pageurl: SIGUELO_URL,
  })
  const turnstileToken = captchaResult.data

  // ── 3. Construir y encriptar el payload ───────────────────────────────────
  // SUNARP almacena números con 8 dígitos rellenos con ceros (ej. "431663" → "00431663")
  const numeroTitulo = params.numero_titulo.padStart(8, '0')

  const innerPayload = {
    codigoZona:    oficina.zona,
    codigoOficina: oficina.oficina,
    anioTitulo:    String(params.anio_titulo),
    numeroTitulo,
    ip:            ipPc,
    userApp:       'sigue+',
    userCrea:      'sigue+',
    status:        'A',
    idioma:        'es',
    tipoConsulta:  'N',
    dG9rZW4:       turnstileToken,   // base64("token") — campo del captcha
  }

  const encryptedBody = { dmFsdWU: encrypt(JSON.stringify(innerPayload)) }  // dmFsdWU = base64("value")

  // ── 4. Llamar a la API REST de SIGUELO ────────────────────────────────────
  const response = await fetch(CONSULTA_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-IBM-Client-Id': IBM_CLIENT_ID,
      Cookie:   cookies,
      Origin:   'https://siguelo.sunarp.gob.pe',
      Referer:  SIGUELO_URL,
    },
    body: JSON.stringify(encryptedBody),
  })

  if (!response.ok) {
    throw new Error(`API respondió con HTTP ${response.status}: ${await response.text()}`)
  }

  const encryptedResponse = (await response.json()) as Record<string, string>

  // ── 5. Desencriptar respuesta ─────────────────────────────────────────────
  // dglwbw = base64("valid"), cmVzcG9uc2U = base64("response")
  const validFlag = decrypt(encryptedResponse.dglwbw ?? '')
  if (validFlag !== '2') {
    // Intentar desencriptar igualmente para ver el mensaje de error
    let errorData: Record<string, unknown> = {}
    try { errorData = JSON.parse(decrypt(encryptedResponse.cmVzcG9uc2U ?? '')) } catch { /* ignorar */ }
    throw new Error(
      `SIGUELO rechazó la consulta: ${errorData.descripcionRespuesta ?? validFlag ?? 'respuesta inválida'}`
    )
  }

  const data = JSON.parse(decrypt(encryptedResponse.cmVzcG9uc2U)) as Record<string, unknown>

  if (data.codigoRespuesta !== '0000') {
    throw new Error(`Error SIGUELO ${data.codigoRespuesta}: ${data.descripcionRespuesta}`)
  }

  // ── 6. Extraer estado del título ──────────────────────────────────────────
  // La API devuelve los datos dentro de lstTitulo[0]
  type TituloEntry = Record<string, string>
  const lstTitulo = data.lstTitulo as TituloEntry[] | undefined
  const tituloEntry = lstTitulo?.[0]

  const estado =
    tituloEntry?.estadoActual ??
    (data.estado as string) ??
    (data.estadoTitulo as string) ??
    'Sin estado'

  const detalle =
    tituloEntry?.actoRegistral ??
    (data.detalle as string) ??
    null

  return {
    estado,
    detalle,
    consultadoEn: new Date().toISOString(),
    rawResponse: data,
  }
}

/** Lista de oficinas disponibles para el formulario */
export const OFICINAS_DISPONIBLES = Object.keys(OFICINAS).sort()
