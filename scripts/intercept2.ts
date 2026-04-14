/**
 * Intercept and save the RAW server response body for busquedacodform.html
 * Also find the Tab 2 submit button and try clicking it natively.
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

  // Save RAW response body for busquedacodform.html
  page.on('response', async resp => {
    if (resp.url().includes('busquedacodform') && resp.request().method() === 'POST') {
      const body = await resp.body().catch(() => Buffer.alloc(0))
      fs.writeFileSync(resolve(OUT, 'raw-response.html'), body)
      console.log('RAW response saved:', body.length, 'bytes')
      console.log('RAW response first 2000 chars:', body.toString('utf-8').substring(0, 2000))
    }
  })

  console.log('Loading CEJ...')
  await page.goto('https://cej.pj.gob.pe/cej/forms/busquedaform.html', { waitUntil: 'load', timeout: 30000 })
  await page.waitForTimeout(3000)

  // Find Tab 2 submit button
  const submitButtons = await page.$$eval(
    '#busquedaPorCodigo button, #busquedaPorCodigo input[type="submit"], #busquedaPorCodigo input[type="button"]',
    els => els.map(el => ({
      id: el.id,
      type: (el as HTMLInputElement).type,
      value: (el as HTMLInputElement).value,
      text: el.textContent?.trim(),
      name: (el as HTMLInputElement).name,
    }))
  )
  console.log('\nTab 2 submit buttons:', JSON.stringify(submitButtons, null, 2))

  // Also check ALL buttons inside forms
  const allFormButtons = await page.$$eval('form button, form input[type="submit"]', els =>
    els.map(el => ({
      formId: el.closest('form')?.id,
      id: el.id,
      text: el.textContent?.trim().substring(0, 50),
      type: (el as HTMLInputElement).type,
    }))
  )
  console.log('\nAll form buttons:', JSON.stringify(allFormButtons, null, 2))

  // Solve captcha
  const solver = new Solver(process.env.TWOCAPTCHA_API_KEY || '')
  const imgEl = await page.$('#captcha_image')
  if (!imgEl) { console.error('No captcha'); await browser.close(); return }
  await imgEl.scrollIntoViewIfNeeded()
  await page.waitForTimeout(500)
  const imgBuf = await imgEl.screenshot()
  const solved = await solver.imageCaptcha({ body: imgBuf.toString('base64'), numeric: 0, min_len: 4, max_len: 8 })
  console.log('\nCaptcha solved:', solved.data)

  // Fill Tab 2
  await page.click('a[href="#tabs-2"], a:has-text("Por Código")').catch(() => {})
  await page.waitForTimeout(500)
  await page.evaluate((args: Record<string, string>) => {
    for (const [id, val] of Object.entries(args)) {
      const el = document.getElementById(id) as HTMLInputElement | null
      if (el) { el.value = val; el.dispatchEvent(new Event('input', { bubbles: true })) }
    }
  }, { cod_expediente: '33088', cod_anio: '2001', cod_incidente: '0', cod_distprov: '1801', cod_organo: 'JR', cod_especialidad: 'CI', cod_instancia: '30' })

  // Set captcha in codigoCaptcha field
  await page.evaluate((code: string) => {
    const el = document.getElementById('codigoCaptcha') as HTMLInputElement | null
    if (el) { el.value = code }
  }, solved.data || '')

  // Try clicking the actual submit button (not form.submit())
  console.log('\nTrying to click Tab 2 submit button...')
  const navPromise = page.waitForNavigation({ waitUntil: 'load', timeout: 30000 }).catch(() => null)

  // Try multiple possible submit button selectors
  const clicked = await page.evaluate((code: string) => {
    // First set captcha
    const captcha = document.getElementById('codigoCaptcha') as HTMLInputElement | null
    if (captcha) captcha.value = code

    // Find submit button in Tab 2 form
    const form = document.getElementById('busquedaPorCodigo') as HTMLFormElement | null
    if (!form) { console.log('NO FORM'); return false }

    // Find button in form
    const btn = form.querySelector('button[type="submit"], button:not([type="button"]), input[type="submit"]') as HTMLElement | null
    if (btn) { btn.click(); return 'clicked button: ' + btn.tagName + ' ' + btn.id }

    // No button found, use form.submit()
    form.submit()
    return 'form.submit()'
  }, solved.data || '')
  console.log('Submit result:', clicked)

  await navPromise
  await page.waitForTimeout(5000)

  console.log('\nURL after submit:', page.url())
  const bodyLen = await page.$eval('body', el => el.innerHTML.length).catch(() => -1)
  console.log('body.innerHTML.length:', bodyLen)
  const bodyText = await page.$eval('body', el => el.textContent?.trim().substring(0, 500)).catch(() => '')
  console.log('body.textContent:', bodyText)

  const content = await page.content()
  fs.writeFileSync(resolve(OUT, 'post-submit2.html'), content)
  console.log('Page content saved, length:', content.length)

  await browser.close()
}

main().catch(console.error)
