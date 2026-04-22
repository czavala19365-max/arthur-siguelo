/**
 * Test: after AJAX validation (even with "parte_req"), does the form submit return results?
 * Also test: submit form with empty parte to bypass parte validation.
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

  // Track all responses
  const responses: Array<{ url: string; status: number; len: number }> = []
  page.on('response', async resp => {
    try {
      const body = await resp.body().catch(() => Buffer.alloc(0))
      responses.push({ url: resp.url(), status: resp.status(), len: body.length })
    } catch { /* */ }
  })

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

  // Step 1: AJAX validation with empty parte (→ parte_req, but captcha is validated)
  console.log('\nStep 1: AJAX to ValidarFiltrosCodigo.htm with empty parte...')
  const ajaxResult = await page.evaluate(async (captcha: string) => {
    const data = new URLSearchParams({
      cod_expediente: '33088', cod_anio: '2001', cod_distprov: '1801',
      cod_organo: 'JR', cod_especialidad: 'CI', cod_instancia: '30',
      codigoCaptcha: captcha, cod_incidente: '0', parte: '',
      navegador: 'Chrome', divKcha: '0', sCUJ: '',
    })
    const r = await fetch('/cej/forms/ValidarFiltrosCodigo.htm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'X-Requested-With': 'XMLHttpRequest' },
      body: data.toString(),
      credentials: 'include',
    })
    return { status: r.status, body: (await r.text()).substring(0, 100) }
  }, solved.data || '')
  console.log('AJAX result:', ajaxResult)

  // Step 2: Now submit the form directly (bypassing parte validation)
  console.log('\nStep 2: Submitting form directly after AJAX validation...')

  await page.click('a[href="#tabs-2"], a:has-text("Por Código")').catch(() => {})
  await page.waitForTimeout(500)

  // Fill the form
  await page.evaluate((args: Record<string, string>) => {
    for (const [id, val] of Object.entries(args)) {
      const el = document.getElementById(id) as HTMLInputElement | null
      if (el) { el.value = val; el.dispatchEvent(new Event('input', { bubbles: true })) }
    }
  }, { cod_expediente: '33088', cod_anio: '2001', cod_incidente: '0', cod_distprov: '1801', cod_organo: 'JR', cod_especialidad: 'CI', cod_instancia: '30' })

  const navPromise = page.waitForNavigation({ waitUntil: 'load', timeout: 30000 }).catch(() => null)
  await page.evaluate((code: string) => {
    const form = document.getElementById('busquedaPorCodigo') as HTMLFormElement | null
    if (!form) return
    const hidden = document.createElement('input')
    hidden.type = 'hidden'; hidden.name = 'codigoCaptcha'; hidden.value = code
    form.appendChild(hidden)
    // Don't add parte — test if empty parte works after AJAX
    form.submit()
  }, solved.data || '')

  await navPromise
  console.log('\nURL after navigation:', page.url())
  await page.waitForTimeout(8000)

  const bodyLen = await page.$eval('body', el => el.innerHTML.length).catch(() => -1)
  const bodyText = await page.$eval('body', el => el.textContent?.trim().substring(0, 500)).catch(() => '')
  console.log('body.innerHTML.length:', bodyLen)
  console.log('body text:', bodyText || '(empty)')

  const html = await page.content()
  fs.writeFileSync(resolve(OUT, 'session-test.html'), html)
  console.log('Full page saved, length:', html.length)

  // New responses after submit
  console.log('\nKey responses after submit:')
  responses
    .filter(r => !r.url.includes('.css') && !r.url.includes('.js') && !r.url.includes('.jpg') && !r.url.includes('.gif') && !r.url.includes('.png') && !r.url.includes('google') && !r.url.includes('radware') && !r.url.includes('c99a4269'))
    .forEach(r => console.log(`  ${r.status} ${r.url.substring(40)} | len:${r.len}`))

  await browser.close()
}

main().catch(console.error)
