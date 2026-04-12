/**
 * Test full flow: click #consultarExpedientes (triggers AJAX validation then form.submit)
 * Intercept ValidarFiltrosCodigo.htm response and final busquedacodform.html body.
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

  // Intercept all requests
  const reqs: Array<{ url: string; method: string; post: string | null }> = []
  const resps: Array<{ url: string; status: number; body: string }> = []
  page.on('request', req => reqs.push({ url: req.url(), method: req.method(), post: req.postData() }))
  page.on('response', async resp => {
    try {
      const body = await resp.body().catch(() => Buffer.alloc(0))
      resps.push({ url: resp.url(), status: resp.status(), body: body.toString('utf-8').substring(0, 500) })
    } catch { /* */ }
  })

  console.log('Loading CEJ...')
  await page.goto('https://cej.pj.gob.pe/cej/forms/busquedaform.html', { waitUntil: 'load', timeout: 30000 })
  await page.waitForTimeout(3000)

  // Solve captcha before switching tabs
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
  await page.waitForTimeout(500)

  // Fill form fields
  await page.evaluate((args: Record<string, string>) => {
    for (const [id, val] of Object.entries(args)) {
      const el = document.getElementById(id) as HTMLInputElement | null
      if (el) { el.value = val; el.dispatchEvent(new Event('input', { bubbles: true })) }
    }
  }, { cod_expediente: '33088', cod_anio: '2001', cod_incidente: '0', cod_distprov: '1801', cod_organo: 'JR', cod_especialidad: 'CI', cod_instancia: '30' })

  // Set codigoCaptcha
  await page.evaluate((code: string) => {
    const el = document.getElementById('codigoCaptcha') as HTMLInputElement | null
    if (el) { el.value = code; el.name = 'codigoCaptcha' }
  }, solved.data || '')

  // Set parte (required)
  await page.evaluate(() => {
    const el = document.getElementById('parte') as HTMLInputElement | null
    if (el) { el.value = 'TEST'; el.name = 'parte' }
  })

  console.log('\nClicking #consultarExpedientes button...')

  // Listen for ValidarFiltrosCodigo response
  const ajaxResponsePromise = page.waitForResponse(
    resp => resp.url().includes('ValidarFiltrosCodigo'),
    { timeout: 30000 }
  ).catch(() => null)

  // Listen for the form navigation (to busquedacodform.html)
  const navPromise = page.waitForNavigation({ waitUntil: 'load', timeout: 40000 }).catch(() => null)

  // Click the button
  await page.click('#consultarExpedientes').catch(async () => {
    // Try calling the JS function directly
    console.log('Button click failed, calling consultarExpedientes() directly...')
    await page.evaluate(() => {
      const fn = (window as unknown as Record<string, unknown>)['consultarExpedientes']
      if (typeof fn === 'function') (fn as () => void)()
    })
  })

  // Wait for AJAX response first
  const ajaxResp = await ajaxResponsePromise
  if (ajaxResp) {
    const ajaxBody = await ajaxResp.body().catch(() => Buffer.alloc(0))
    console.log('\nValidarFiltrosCodigo.htm response:')
    console.log('  Status:', ajaxResp.status())
    console.log('  Body:', ajaxBody.toString('utf-8').substring(0, 500))
    fs.writeFileSync(resolve(OUT, 'ValidarFiltrosCodigo-response.html'), ajaxBody)
  } else {
    console.log('\nValidarFiltrosCodigo.htm NOT called (timeout)')
  }

  // Wait for navigation
  await navPromise
  console.log('\nURL after navigation:', page.url())

  // Poll DOM for 30s
  for (let i = 1; i <= 6; i++) {
    await page.waitForTimeout(5000)
    const bodyLen = await page.$eval('body', el => el.innerHTML.length).catch(() => -1)
    const bodyText = await page.$eval('body', el => el.textContent?.trim().substring(0, 300)).catch(() => '')
    console.log(`\n[t+${i*5}s] URL: ${page.url().substring(0, 80)}`)
    console.log(`[t+${i*5}s] body.innerHTML.length: ${bodyLen}`)
    if (bodyText) console.log(`[t+${i*5}s] body text: ${bodyText}`)
    if (bodyLen > 100) { console.log('Body has content!'); break }
  }

  const html = await page.content()
  fs.writeFileSync(resolve(OUT, 'click-button-result.html'), html)
  console.log('\nFull page saved, length:', html.length)

  // Show key requests
  console.log('\n=== Key requests ===')
  reqs
    .filter(r => r.url.includes('cej.pj.gob.pe') && !r.url.includes('.css') && !r.url.includes('.js') && !r.url.includes('.jpg') && !r.url.includes('.gif'))
    .forEach(r => console.log(`  ${r.method} ${r.url.substring(40)} | post: ${r.post?.substring(0, 100) || '(none)'}`))

  await browser.close()
}

main().catch(console.error)
