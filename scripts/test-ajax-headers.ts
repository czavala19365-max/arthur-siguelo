/**
 * Test ValidarFiltrosCodigo.htm with proper jQuery $.ajax headers (X-Requested-With etc.)
 * Also test waiting longer for stormcaster.js to init.
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

  // Track Radware requests
  let radwareReqs = 0
  page.on('response', async resp => {
    if (resp.url().includes('stormcaster') || resp.url().includes('c99a4269')) radwareReqs++
  })

  console.log('Loading CEJ...')
  await page.goto('https://cej.pj.gob.pe/cej/forms/busquedaform.html', { waitUntil: 'networkidle', timeout: 30000 })
  console.log('networkidle reached. Radware reqs so far:', radwareReqs)
  await page.waitForTimeout(2000)
  console.log('After +2s. Radware reqs:', radwareReqs)

  // Solve captcha
  const solver = new Solver(process.env.TWOCAPTCHA_API_KEY || '')
  const imgEl = await page.$('#captcha_image')
  if (!imgEl) { console.error('No captcha'); await browser.close(); return }
  await imgEl.scrollIntoViewIfNeeded()
  await page.waitForTimeout(300)
  const imgBuf = await imgEl.screenshot()
  const solved = await solver.imageCaptcha({ body: imgBuf.toString('base64'), numeric: 0, min_len: 4, max_len: 8 })
  console.log('Captcha solved:', solved.data, '(size:', imgBuf.length, 'bytes)')

  // Test with X-Requested-With header (like jQuery $.ajax does)
  console.log('\n--- Test with X-Requested-With: XMLHttpRequest header, parte=GARCIA ---')
  const r1 = await page.evaluate(async (captcha: string) => {
    const data = new URLSearchParams({
      cod_expediente: '33088', cod_anio: '2001', cod_distprov: '1801',
      cod_organo: 'JR', cod_especialidad: 'CI', cod_instancia: '30',
      codigoCaptcha: captcha, cod_incidente: '0', parte: 'GARCIA',
      navegador: navigator.userAgent.substring(0, 100), divKcha: '0', sCUJ: '',
    })
    const r = await fetch('/cej/forms/ValidarFiltrosCodigo.htm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': '*/*',
      },
      body: data.toString(),
      credentials: 'include',
    })
    return { status: r.status, body: (await r.text()).substring(0, 500) }
  }, solved.data || '')
  console.log('Response:', r1)

  // Test with empty parte (should still return parte_req if captcha correct)
  console.log('\n--- Test with empty parte (captcha verification) ---')
  const r2 = await page.evaluate(async (captcha: string) => {
    const data = new URLSearchParams({
      cod_expediente: '33088', cod_anio: '2001', cod_distprov: '1801',
      cod_organo: 'JR', cod_especialidad: 'CI', cod_instancia: '30',
      codigoCaptcha: captcha, cod_incidente: '0', parte: '',
      navegador: navigator.userAgent.substring(0, 100), divKcha: '0', sCUJ: '',
    })
    const r = await fetch('/cej/forms/ValidarFiltrosCodigo.htm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': '*/*',
      },
      body: data.toString(),
      credentials: 'include',
    })
    return { status: r.status, body: (await r.text()).substring(0, 500) }
  }, solved.data || '')
  console.log('Response (empty parte, should be parte_req or form submit):', r2)

  // Now try using $.ajax directly via jQuery in the page (exactly as filtro.js does)
  console.log('\n--- Using jQuery $.ajax directly (same as filtro.js), parte=GARCIA ---')

  // First refresh the captcha since the previous calls might have consumed it
  await page.evaluate(() => {
    const img = document.getElementById('captcha_image') as HTMLImageElement | null
    if (img) img.src = '/cej/Captcha.jpg#' + new Date().getTime()
  })
  await page.waitForTimeout(2000)

  // Solve new captcha
  const imgEl2 = await page.$('#captcha_image')
  if (imgEl2) {
    await imgEl2.scrollIntoViewIfNeeded()
    await page.waitForTimeout(300)
    const imgBuf2 = await imgEl2.screenshot()
    const solved2 = await solver.imageCaptcha({ body: imgBuf2.toString('base64'), numeric: 0, min_len: 4, max_len: 8 })
    console.log('New captcha solved:', solved2.data, '(size:', imgBuf2.length, 'bytes)')

    const r3 = await page.evaluate(async (args: { captcha: string; parte: string }) => {
      return new Promise<{ status: number; body: string }>((resolve) => {
        if (typeof (window as unknown as Record<string, unknown>)['$'] !== 'function') {
          resolve({ status: 0, body: 'jQuery not loaded' })
          return
        }
        const $ = (window as unknown as Record<string, unknown>)['$'] as unknown as (s: unknown) => unknown
        const ajax = ($ as unknown as Record<string, unknown>)['ajax'] as (opts: unknown) => void
        ajax({
          type: 'POST',
          url: 'ValidarFiltrosCodigo.htm',
          data: `cod_expediente=33088&cod_anio=2001&cod_distprov=1801&cod_organo=JR&cod_especialidad=CI&cod_instancia=30&codigoCaptcha=${args.captcha}&cod_incidente=0&parte=${args.parte}&navegador=Chrome&divKcha=0&sCUJ=`,
          success: function(e: unknown) {
            resolve({ status: 200, body: String(e).substring(0, 500) })
          },
          error: function(e: unknown) {
            resolve({ status: -1, body: 'error: ' + JSON.stringify(e).substring(0, 200) })
          },
        })
      })
    }, { captcha: solved2.data || '', parte: 'GARCIA' })
    console.log('jQuery $.ajax response:', r3)
  }

  await browser.close()
}

main().catch(console.error)
