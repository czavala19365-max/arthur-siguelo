/**
 * Quick test: try multiple parte values to see which ones the server accepts.
 */
import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })

import { chromium } from 'playwright-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import { Solver } from '2captcha-ts'
chromium.use(StealthPlugin())

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROME_EXECUTABLE_PATH || undefined,
    args: ['--no-sandbox'],
  }) as unknown as import('playwright').Browser

  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    locale: 'es-PE',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  })
  const page = await context.newPage()

  console.log('Loading CEJ...')
  await page.goto('https://cej.pj.gob.pe/cej/forms/busquedaform.html', { waitUntil: 'load', timeout: 30000 })
  await page.waitForTimeout(4000)

  const solver = new Solver(process.env.TWOCAPTCHA_API_KEY || '')
  const imgEl = await page.$('#captcha_image')
  if (!imgEl) { console.error('No captcha'); await browser.close(); return }
  await imgEl.scrollIntoViewIfNeeded()
  await page.waitForTimeout(300)
  const imgBuf = await imgEl.screenshot()
  const solved = await solver.imageCaptcha({ body: imgBuf.toString('base64'), numeric: 0, min_len: 4, max_len: 8 })
  console.log('Captcha solved:', solved.data, '(size:', imgBuf.length, 'bytes)')

  // Test multiple parte values using the exact same AJAX call format as filtro.js
  const partes = [
    'Banco Wiese Sudameris',
    'BANCO WIESE SUDAMERIS',
    'CHAVEZ TINOCO BRAULIO',
    'Chavez Tinoco Braulio',
    'FERNANDEZ DIAZ MARIA ERMINDA',
    'CHAVEZ',
    'WIESE',
    'BANCO',
  ]

  for (const parte of partes) {
    const result = await page.evaluate(async (args: { captcha: string; parte: string }) => {
      const data = new URLSearchParams({
        cod_expediente: '33088',
        cod_anio: '2001',
        cod_distprov: '1801',
        cod_organo: 'JR',
        cod_especialidad: 'CI',
        cod_instancia: '30',
        codigoCaptcha: args.captcha,
        cod_incidente: '0',
        parte: args.parte,
        navegador: navigator.userAgent.substring(0, 80),
        divKcha: '0',
        sCUJ: '',
      })
      const r = await fetch('/cej/forms/ValidarFiltrosCodigo.htm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: data.toString(),
        credentials: 'include',
      })
      const text = await r.text()
      return text.substring(0, 200)
    }, { captcha: solved.data || '', parte })

    console.log(`parte="${parte}" → "${result}"`)

    // If success (non-error), show more
    const errorCodes = ['1', '2', '3', '4', '5', '-C', '-CM', '-CV', 'PE', 'parte_req', 'index', 'DistJud_x', 'Error...']
    if (!errorCodes.includes(result.trim()) && !result.startsWith('Sin') && !result.startsWith('No existen')) {
      console.log('!!! SUCCESS:', result.substring(0, 500))
      break
    }
  }

  // Also try with a COMPLETELY DIFFERENT test case (2024)
  console.log('\n--- Testing different case: try 2024 Lima civil ---')
  const result2 = await page.evaluate(async (captcha: string) => {
    const data = new URLSearchParams({
      cod_expediente: '00001',
      cod_anio: '2024',
      cod_distprov: '1801',
      cod_organo: 'JR',
      cod_especialidad: 'CI',
      cod_instancia: '01',
      codigoCaptcha: captcha,
      cod_incidente: '0',
      parte: 'GARCIA',
      navegador: 'Chrome',
      divKcha: '0',
      sCUJ: '',
    })
    const r = await fetch('/cej/forms/ValidarFiltrosCodigo.htm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'X-Requested-With': 'XMLHttpRequest' },
      body: data.toString(),
      credentials: 'include',
    })
    return (await r.text()).substring(0, 300)
  }, solved.data || '')
  console.log('2024 case + parte=GARCIA → ', result2.substring(0, 200))

  await browser.close()
}

main().catch(console.error)
