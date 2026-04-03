import CryptoJS from 'crypto-js'
import chromium from '@sparticuz/chromium-min'
import puppeteer from 'puppeteer-core'

const ASIENTO_API   = 'https://api-gateway.sunarp.gob.pe:9443/sunarp/siguelo/asientoinscripcion/listarAsientos'
const IBM_CLIENT_ID = '30a3fd982c6f85a3a70b44fa1f302488'
const AES_KEY       = 'sV2zUWiuNo@3uv8nu9ir4'
const SIGUELO_URL   = 'https://siguelo.sunarp.gob.pe/siguelo/'

const encrypt = (d: string) => CryptoJS.AES.encrypt(d, AES_KEY).toString()
const decrypt = (d: string) => CryptoJS.AES.decrypt(d, AES_KEY).toString(CryptoJS.enc.Utf8)

async function call(payload: object, cookies = '') {
  const res = await fetch(ASIENTO_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json', 'X-IBM-Client-Id': IBM_CLIENT_ID,
      Origin: 'https://siguelo.sunarp.gob.pe', Referer: SIGUELO_URL,
      ...(cookies ? { Cookie: cookies } : {}),
    },
    body: JSON.stringify({ dmFsdWU: encrypt(JSON.stringify(payload)) }),
  })
  const json = await res.json() as Record<string, string>
  const valid = decrypt(json.dglwbw ?? '')
  const raw   = decrypt(json.cmVzcG9uc2U ?? '')
  return { valid, raw }
}

async function getCookies() {
  const executablePath = process.env.CHROME_EXECUTABLE_PATH ?? (await chromium.executablePath('https://github.com/Sparticuz/chromium/releases/download/v123.0.1/chromium-v123.0.1-pack.tar'))
  const browser = await puppeteer.launch({ args: chromium.args, executablePath, headless: true, defaultViewport: { width: 1280, height: 720 } })
  const page = await browser.newPage()
  await page.goto(SIGUELO_URL, { waitUntil: 'networkidle2', timeout: 30000 })
  await page.waitForSelector('.btn-sunarp-cyan', { timeout: 8000 }).then(() => page.click('.btn-sunarp-cyan')).catch(() => {})
  await new Promise(r => setTimeout(r, 1500))
  const cookieList = await page.cookies()
  await browser.close()
  return cookieList.map(c => `${c.name}=${c.value}`).join('; ')
}

async function main() {
  const base2025 = {
    codigoZona: '01', codigoOficina: '01',
    anioTitulo: '2025', numeroTitulo: '02416207',
    idAreaRegistro: '22000', ip: '0.0.0.0',
    status: 'A', idioma: 'es', userApp: 'sigue+', userCrea: 'sigue+',
  }

  // Test 1: sin cookies, año 2025
  let r = await call(base2025)
  console.log('[2025 sin cookies] valid=' + r.valid, r.raw.slice(0, 150))

  // Test 2: con cookies de sesión
  console.log('\nObteniendo cookies de SIGUELO...')
  const cookies = await getCookies()
  console.log('Cookies obtenidas:', cookies.slice(0, 80) + '...')

  r = await call(base2025, cookies)
  console.log('[2025 + cookies] valid=' + r.valid, r.raw.slice(0, 300))

  // Si hay respuesta útil, mostrar completa
  try {
    const d = JSON.parse(r.raw) as Record<string, unknown>
    console.log('Keys:', Object.keys(d))
    if (d.lstAsientos) {
      const lst = d.lstAsientos as Array<Record<string,string>>
      console.log('lstAsientos.length:', lst.length)
      if (lst[0]) {
        const item = { ...lst[0] }
        if (item.asiento) item.asiento = `<base64 ${Math.round(item.asiento.length * 3/4/1024)}KB>`
        console.log('[0] campos:', Object.keys(item))
        console.log('[0]:', JSON.stringify(item, null, 2))
      }
    }
  } catch { /* */ }

  // Test 3: con cookies + sin idAreaRegistro
  r = await call({ ...base2025, idAreaRegistro: undefined }, cookies)
  console.log('[2025 + cookies, sin idArea] valid=' + r.valid, r.raw.slice(0, 150))
}
main()
