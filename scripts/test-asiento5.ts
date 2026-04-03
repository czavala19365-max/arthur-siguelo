import CryptoJS from 'crypto-js'
import chromium from '@sparticuz/chromium-min'
import puppeteer from 'puppeteer-core'
import { Solver } from '@2captcha/captcha-solver'

const ASIENTO_API   = 'https://api-gateway.sunarp.gob.pe:9443/sunarp/siguelo/asientoinscripcion/listarAsientos'
const IBM_CLIENT_ID = '30a3fd982c6f85a3a70b44fa1f302488'
const AES_KEY       = 'sV2zUWiuNo@3uv8nu9ir4'
const SIGUELO_URL   = 'https://siguelo.sunarp.gob.pe/siguelo/'
const TURNSTILE_SITE_KEY = '0x4AAAAAABjHwQpFgHGVKCei'

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

async function main() {
  const solver = new Solver(process.env.TWOCAPTCHA_API_KEY!)

  // Paso 1: cookies + IP
  console.log('Lanzando Chromium...')
  const executablePath = process.env.CHROME_EXECUTABLE_PATH ?? (await chromium.executablePath('https://github.com/Sparticuz/chromium/releases/download/v123.0.1/chromium-v123.0.1-pack.tar'))
  const browser = await puppeteer.launch({ args: chromium.args, executablePath, headless: true, defaultViewport: { width: 1280, height: 720 } })
  let cookies = '', ip = '0.0.0.0'
  try {
    const page = await browser.newPage()
    await page.goto(SIGUELO_URL, { waitUntil: 'networkidle2', timeout: 30000 })
    await page.waitForSelector('.btn-sunarp-cyan', { timeout: 8000 }).then(() => page.click('.btn-sunarp-cyan')).catch(() => {})
    await new Promise(r => setTimeout(r, 1500))
    try { const ipRes = await page.evaluate(() => fetch('https://api.ipify.org/?format=json').then(r => r.json())) as {ip:string}; ip = ipRes.ip } catch {}
    cookies = (await page.cookies()).map(c => `${c.name}=${c.value}`).join('; ')
  } finally { await browser.close() }
  console.log('IP:', ip, '| Cookies (primeros 60):', cookies.slice(0, 60))

  // Paso 2: resolver captcha
  console.log('Resolviendo captcha...')
  const captcha = await solver.cloudflareTurnstile({ sitekey: TURNSTILE_SITE_KEY, pageurl: SIGUELO_URL })
  const token = captcha.data
  console.log('Token (primeros 40):', token.slice(0, 40))

  // Paso 3: llamar con todo — igual que el scraper principal
  const payload = {
    codigoZona: '01', codigoOficina: '01',
    anioTitulo: '2025', numeroTitulo: '02416207',
    idAreaRegistro: '22000',
    ip, status: 'A', idioma: 'es',
    userApp: 'sigue+', userCrea: 'sigue+',
    dG9rZW4: token,
  }

  const r = await call(payload, cookies)
  console.log('\n[con captcha+cookies] valid=' + r.valid)
  console.log('raw (400):', r.raw.slice(0, 400))
  try {
    const d = JSON.parse(r.raw) as Record<string, unknown>
    console.log('Keys:', Object.keys(d))
    if (d.lstAsientos) {
      const lst = d.lstAsientos as Array<Record<string,string>>
      console.log('lstAsientos.length:', lst.length)
      if (lst[0]) {
        const item = { ...lst[0] }
        if (item.asiento) item.asiento = `<base64 ${Math.round(item.asiento.length*3/4/1024)}KB>`
        console.log('[0] campos:', Object.keys(item))
        console.log('[0]:', JSON.stringify(item, null, 2))
      }
    }
  } catch { /* */ }
}
main()
