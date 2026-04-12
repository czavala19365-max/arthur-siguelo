/**
 * Test if parte needs to match the actual party or just be non-empty.
 */
import { config } from 'dotenv'
import { resolve } from 'path'
import fs from 'fs'
config({ path: resolve(process.cwd(), '.env.local') })

import { chromium } from 'playwright-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import { Solver } from '2captcha-ts'
chromium.use(StealthPlugin())

const OUT = resolve(process.cwd(), 'debug-screenshots')

async function testParte(page: import('playwright').Page, captcha: string, parte: string): Promise<string> {
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
      navegador: 'Chrome',
      divKcha: '0',
      sCUJ: '',
    })
    const r = await fetch('/cej/forms/ValidarFiltrosCodigo.htm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
      body: data.toString(),
      credentials: 'include',
    })
    return r.text()
  }, { captcha, parte })
  return result.substring(0, 500)
}

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

  // Test various parte values
  const partes = ['A', 'GARCIA', 'RODRIGUEZ', 'GONZALEZ', 'LOPEZ PEREZ']
  for (const parte of partes) {
    const resp = await testParte(page as unknown as import('playwright').Page, solved.data || '', parte)
    console.log(`parte="${parte}" → "${resp.substring(0, 100)}"`)

    // If we get a non-error response, show the full body
    if (resp.length > 10 && !['1','2','3','4','5','-C','-CM','-CV','PE','parte_req','index','DistJud_x','Error...'].some(e => resp.trim() === e)) {
      console.log('!!! NON-ERROR RESPONSE — likely success HTML:')
      console.log(resp.substring(0, 500))
      fs.writeFileSync(resolve(OUT, `parte-success-${parte}.html`), resp)
      break
    }
  }

  // Now try: what if parte is not validated against the DB,
  // and the success simply returns some HTML response > 10 chars?
  console.log('\n--- Testing with partie "MACHUCA" (common Peruvian surname) ---')
  const resp2 = await testParte(page as unknown as import('playwright').Page, solved.data || '', 'MACHUCA')
  console.log(`Response: "${resp2.substring(0, 200)}"`)

  await browser.close()
}

main().catch(console.error)
