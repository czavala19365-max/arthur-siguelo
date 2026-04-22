/**
 * Trace all XHR/fetch calls made AFTER form submit to find the results endpoint.
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
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT)

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

  // Track all requests and responses
  const allRequests: Array<{ url: string; method: string; post: string | null; phase: string }> = []
  const allResponses: Array<{ url: string; status: number; len: number; body: string }> = []
  let phase = 'initial'

  page.on('request', req => {
    allRequests.push({ url: req.url(), method: req.method(), post: req.postData(), phase })
  })

  page.on('response', async resp => {
    try {
      const body = await resp.body().catch(() => Buffer.alloc(0))
      const short = body.toString('utf-8').replace(/\s+/g, ' ').substring(0, 300)
      allResponses.push({ url: resp.url(), status: resp.status(), len: body.length, body: short })
    } catch { /* ignore */ }
  })

  console.log('Phase 1: loading search page...')
  await page.goto('https://cej.pj.gob.pe/cej/forms/busquedaform.html', { waitUntil: 'load', timeout: 30000 })
  await page.waitForTimeout(3000)

  // Solve captcha
  const solver = new Solver(process.env.TWOCAPTCHA_API_KEY || '')
  const imgEl = await page.$('#captcha_image')
  if (!imgEl) { console.error('No captcha'); await browser.close(); return }
  await imgEl.scrollIntoViewIfNeeded()
  await page.waitForTimeout(300)
  const imgBuf = await imgEl.screenshot()
  const solved = await solver.imageCaptcha({ body: imgBuf.toString('base64'), numeric: 0, min_len: 4, max_len: 8 })
  console.log('Captcha solved:', solved.data)

  // Fill Tab 2 and submit
  await page.click('a[href="#tabs-2"], a:has-text("Por Código")').catch(() => {})
  await page.waitForTimeout(500)

  await page.evaluate((args: Record<string, string>) => {
    for (const [id, val] of Object.entries(args)) {
      const el = document.getElementById(id) as HTMLInputElement | null
      if (el) { el.value = val; el.dispatchEvent(new Event('input', { bubbles: true })) }
    }
  }, { cod_expediente: '33088', cod_anio: '2001', cod_incidente: '0', cod_distprov: '1801', cod_organo: 'JR', cod_especialidad: 'CI', cod_instancia: '30' })

  phase = 'after-submit'
  console.log('\nPhase 2: submitting form...')
  const navPromise = page.waitForNavigation({ waitUntil: 'load', timeout: 35000 }).catch(() => null)
  await page.evaluate((code: string) => {
    const form = document.getElementById('busquedaPorCodigo') as HTMLFormElement | null
    if (!form) return
    const hidden = document.createElement('input')
    hidden.type = 'hidden'; hidden.name = 'codigoCaptcha'; hidden.value = code
    form.appendChild(hidden)
    form.submit()
  }, solved.data || '')
  await navPromise

  console.log('Navigated to:', page.url())

  // Wait and poll DOM state at intervals
  for (let i = 1; i <= 6; i++) {
    await page.waitForTimeout(5000)
    const bodyLen = await page.$eval('body', el => el.innerHTML.length).catch(() => -1)
    const bodyText = await page.$eval('body', el => el.textContent?.trim().substring(0, 200)).catch(() => '')
    const newRequests = allRequests.filter(r => r.phase === 'after-submit')
    console.log(`\n[t+${i*5}s] body.innerHTML.length:`, bodyLen)
    console.log(`[t+${i*5}s] body text:`, bodyText || '(empty)')
    console.log(`[t+${i*5}s] requests since submit: ${newRequests.length}`)
    if (bodyLen > 100) { console.log('Body has content — stopping early'); break }
  }

  // Show all requests after submit
  console.log('\n=== ALL REQUESTS AFTER SUBMIT ===')
  allRequests
    .filter(r => r.phase === 'after-submit')
    .forEach(r => console.log(`  ${r.method} ${r.url.substring(0, 120)} | post: ${r.post?.substring(0, 80) || '(none)'}`))

  console.log('\n=== ALL RESPONSES AFTER SUBMIT ===')
  allResponses
    .filter((_, i) => allRequests[i]?.phase === 'after-submit')
    .forEach(r => console.log(`  ${r.status} ${r.url.substring(0, 100)} | len:${r.len} | ${r.body.substring(0, 100)}`))

  // Also dump all responses by URL
  console.log('\n=== ALL RESPONSES (any phase, non-static) ===')
  allResponses
    .filter(r => !r.url.includes('.css') && !r.url.includes('.ico') && !r.url.includes('.png') && !r.url.includes('.gif'))
    .forEach(r => console.log(`  ${r.status} ${r.url.substring(0, 120)} | len:${r.len}`))

  const html = await page.content()
  fs.writeFileSync(resolve(OUT, 'trace-ajax.html'), html)
  console.log('\nFull page saved, length:', html.length)

  await browser.close()
}

main().catch(console.error)
