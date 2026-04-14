/**
 * Intercepts the actual POST request sent when Tab 2 form is submitted,
 * to see exactly what fields the server receives.
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

  // Intercept all requests
  const requests: Array<{ url: string; method: string; postData: string | null }> = []
  page.on('request', req => {
    if (req.url().includes('cej.pj.gob.pe')) {
      requests.push({ url: req.url(), method: req.method(), postData: req.postData() })
    }
  })

  // Intercept all responses
  const responses: Array<{ url: string; status: number; bodyLen: number }> = []
  page.on('response', async resp => {
    if (resp.url().includes('cej.pj.gob.pe')) {
      const body = await resp.body().catch(() => Buffer.alloc(0))
      responses.push({ url: resp.url(), status: resp.status(), bodyLen: body.length })
    }
  })

  console.log('Loading CEJ...')
  await page.goto('https://cej.pj.gob.pe/cej/forms/busquedaform.html', { waitUntil: 'load', timeout: 30000 })
  await page.waitForTimeout(3000)

  // Get form details
  const formInfo = await page.evaluate(() => {
    const form = document.getElementById('busquedaPorCodigo') as HTMLFormElement | null
    if (!form) return null
    const inputs = Array.from(form.elements).map(el => ({
      id: (el as HTMLInputElement).id,
      name: (el as HTMLInputElement).name,
      type: (el as HTMLInputElement).type,
      value: (el as HTMLInputElement).value,
    }))
    return { action: form.action, method: form.method, inputs }
  })
  console.log('\nbusquedaPorCodigo form:')
  console.log(JSON.stringify(formInfo, null, 2))

  // Solve captcha
  const solver = new Solver(process.env.TWOCAPTCHA_API_KEY || '')
  const imgEl = await page.$('#captcha_image')
  if (!imgEl) { console.error('No captcha image'); await browser.close(); return }

  await imgEl.scrollIntoViewIfNeeded()
  await page.waitForTimeout(500)
  const imgBuf = await imgEl.screenshot()
  fs.writeFileSync(resolve(OUT, 'captcha-real.png'), imgBuf)
  console.log('\nCaptcha saved, size:', imgBuf.length, 'bytes')

  const solved = await solver.imageCaptcha({ body: imgBuf.toString('base64'), numeric: 0, min_len: 4, max_len: 8 })
  console.log('Captcha solved:', solved.data)

  // Fill Tab 2 fields
  await page.click('a[href="#tabs-2"], a:has-text("Por Código")').catch(() => {})
  await page.waitForTimeout(500)

  await page.evaluate((args: Record<string, string>) => {
    for (const [id, val] of Object.entries(args)) {
      const el = document.getElementById(id) as HTMLInputElement | null
      if (el) { el.value = val; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })) }
    }
  }, { cod_expediente: '33088', cod_anio: '2001', cod_incidente: '0', cod_distprov: '1801', cod_organo: 'JR', cod_especialidad: 'CI', cod_instancia: '30' })

  // Check if codigoCaptcha field is in the form
  const captchaInForm = await page.evaluate(() => {
    const form = document.getElementById('busquedaPorCodigo') as HTMLFormElement | null
    if (!form) return false
    return !!form.querySelector('#codigoCaptcha')
  })
  console.log('\n#codigoCaptcha inside busquedaPorCodigo form:', captchaInForm)

  // Check where codigoCaptcha actually is in the DOM
  const captchaLocation = await page.evaluate(() => {
    const el = document.getElementById('codigoCaptcha')
    if (!el) return 'NOT FOUND'
    const parent = el.closest('form')
    return parent ? `inside form#${parent.id}` : 'outside any form'
  })
  console.log('#codigoCaptcha location:', captchaLocation)

  // Submit: first try the native button click (not form.submit())
  console.log('\nSubmitting via form.submit() with hidden codigoCaptcha...')
  const navPromise = page.waitForNavigation({ waitUntil: 'load', timeout: 30000 }).catch(() => null)
  await page.evaluate((code: string) => {
    const form = document.getElementById('busquedaPorCodigo') as HTMLFormElement | null
    if (!form) return
    // Set codigoCaptcha if it's outside the form
    const captcha = document.getElementById('codigoCaptcha') as HTMLInputElement | null
    if (captcha && !form.contains(captcha)) {
      const hidden = document.createElement('input')
      hidden.type = 'hidden'; hidden.name = 'codigoCaptcha'; hidden.value = code
      form.appendChild(hidden)
    } else if (captcha) {
      captcha.name = 'codigoCaptcha'
      captcha.value = code
    }
    console.log('[browser] Form fields before submit:')
    Array.from(form.elements).forEach((el: Element) => {
      const inp = el as HTMLInputElement
      if (inp.name) console.log('[browser]  ', inp.name, '=', inp.value?.substring(0, 30))
    })
    form.submit()
  }, solved.data || '')
  await navPromise

  console.log('\nAfter submit:')
  console.log('  URL:', page.url())
  const bodyLen = await page.$eval('body', el => el.innerHTML.length).catch(() => -1)
  console.log('  body.innerHTML.length:', bodyLen)
  if (bodyLen > 0) {
    const bodyText = await page.$eval('body', el => el.textContent?.trim().substring(0, 300)).catch(() => '')
    console.log('  body text:', bodyText)
  }
  const html = await page.content()
  fs.writeFileSync(resolve(OUT, 'post-submit.html'), html)
  console.log('  Full HTML saved')

  // Show network activity
  console.log('\nRequests sent to CEJ:')
  requests.forEach(r => console.log(`  ${r.method} ${r.url.substring(0, 100)} | postData: ${r.postData?.substring(0, 200) || '(none)'}`))
  console.log('\nResponses from CEJ:')
  responses.forEach(r => console.log(`  ${r.status} ${r.url.substring(0, 100)} | bodyLen: ${r.bodyLen}`))

  await browser.close()
}

main().catch(console.error)
