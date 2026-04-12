/**
 * Debug: dump the HTML of the results list page after Tab 2 navigates to busquedacodform.html
 */
import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })

import { chromium } from 'playwright-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import { Solver } from '2captcha-ts'
import * as fs from 'fs'
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
  await page.waitForTimeout(3000)

  const solver = new Solver(process.env.TWOCAPTCHA_API_KEY || '')
  const imgEl = await page.$('#captcha_image')
  if (!imgEl) { console.error('No captcha'); await browser.close(); return }
  await imgEl.scrollIntoViewIfNeeded()
  await page.waitForTimeout(300)
  const imgBuf = await imgEl.screenshot()
  const solved = await solver.imageCaptcha({ body: imgBuf.toString('base64'), numeric: 0, min_len: 4, max_len: 8 })
  console.log('Captcha solved:', solved.data)

  // Switch to Tab 2
  await page.click('a[href="#tabs-2"], a:has-text("Por Código")').catch(() => {})
  await page.waitForTimeout(800)

  // Fill Tab 2 fields for 01600-2022-0-0701-JR-CI-06
  await page.evaluate((args: Record<string, string>) => {
    for (const [id, val] of Object.entries(args)) {
      const el = document.getElementById(id) as HTMLInputElement | null
      if (el) { el.value = val; el.dispatchEvent(new Event('input', { bubbles: true })) }
    }
  }, {
    cod_expediente: '01600',
    cod_anio: '2022',
    cod_incidente: '0',
    cod_distprov: '0701',
    cod_organo: 'JR',
    cod_especialidad: 'CI',
    cod_instancia: '06',
  })

  // Set captcha and parte
  await page.evaluate((captcha: string) => {
    const el = document.getElementById('codigoCaptcha') as HTMLInputElement | null
    if (el) { el.value = captcha; el.dispatchEvent(new Event('input', { bubbles: true })) }
  }, solved.data || '')

  await page.fill('input[placeholder*="APELLIDO"], input[name="parte"], #parte', 'MARCOBRE').catch(() => {})
  await page.waitForTimeout(200)

  // Listen for navigation
  const navPromise = page.waitForNavigation({ waitUntil: 'load', timeout: 30000 }).catch(() => null)
  await page.click('#consultarExpedientes')
  await navPromise

  console.log('After navigation URL:', page.url())
  await page.waitForTimeout(5000)

  const html = await page.content()
  fs.writeFileSync('debug-screenshots/results-list.html', html)
  console.log('Saved results-list.html')
  console.log('Body text (first 500):', (await page.evaluate(() => document.body.innerText)).substring(0, 500))

  // Click detail button
  console.log('\nClicking detail button...')
  const navDetail = page.waitForNavigation({ waitUntil: 'load', timeout: 20000 }).catch(() => null)
  await page.click('button[title="Ver detalle de expediente"]').catch(() => console.log('No detail button found'))
  await navDetail
  await page.waitForTimeout(3000)
  console.log('Detail page URL:', page.url())

  const detailHtml = await page.content()
  fs.writeFileSync('debug-screenshots/detail-form.html', detailHtml)
  console.log('Saved detail-form.html')

  const detailText = (await page.evaluate(() => document.body.innerText)).substring(0, 2000)
  console.log('Detail page body text:', detailText)

  // Log all table structures
  const tables = await page.$$eval('table', tbls => tbls.map((t, i) => ({
    index: i,
    rows: (t as HTMLTableElement).rows.length,
    headers: Array.from((t as HTMLTableElement).rows[0]?.cells || []).map(c => c.textContent?.trim()),
    firstDataRow: Array.from((t as HTMLTableElement).rows[1]?.cells || []).map(c => c.textContent?.trim().substring(0, 50)),
  })))
  console.log('\nTables on detail page:', JSON.stringify(tables, null, 2))

  await browser.close()
}

main().catch(console.error)
