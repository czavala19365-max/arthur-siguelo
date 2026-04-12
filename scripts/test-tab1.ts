/**
 * Test Tab 1 (ValidarFiltros.htm) to see if it works when Tab 2 has DB issues.
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

  // Test Tab 1 endpoint (ValidarFiltros.htm) using district/organ/specialty dropdowns
  const partes = ['CHAVEZ TINOCO BRAULIO', 'BANCO WIESE SUDAMERIS', 'FERNANDEZ DIAZ MARIA ERMINDA', '']

  for (const parte of partes) {
    const result = await page.evaluate(async (args: { captcha: string; parte: string }) => {
      // Tab 1 needs the organoJurisdiccional code which comes from a dropdown
      // We need to get valid dropdown values first or use raw codes
      const data = new URLSearchParams({
        distritoJudicial: '1801',   // Lima
        organoJurisdiccional: '',   // empty - try without it
        especialidad: 'CI',         // Civil
        anio: '2001',
        numeroExpediente: '33088-2001-0-1801-JR-CI-030',
        codigoCaptcha: args.captcha,
        parte: args.parte,
        navegador: navigator.userAgent.substring(0, 80),
        divKcha: '0',
      })
      const r = await fetch('/cej/forms/ValidarFiltros.htm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'X-Requested-With': 'XMLHttpRequest' },
        body: data.toString(),
        credentials: 'include',
      })
      return (await r.text()).substring(0, 500)
    }, { captcha: solved.data || '', parte })
    console.log(`Tab1 parte="${parte}" → "${result.substring(0, 200)}"`)
  }

  // Also check if the dropdowns work — get the distrito/organo options
  console.log('\n--- Checking dropdown values ---')
  const distOpts = await page.$$eval('#distritoJudicial option', opts => opts.map(o => ({ value: (o as HTMLOptionElement).value, text: o.textContent?.trim() })).filter(o => o.value))
  console.log('Districts:', distOpts.slice(0, 5))

  await browser.close()
}

main().catch(console.error)
