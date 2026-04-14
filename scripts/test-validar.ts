/**
 * Call ValidarFiltrosCodigo.htm directly from within the browser context
 * to see the raw response and debug why we get error "2".
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

  console.log('Loading CEJ...')
  await page.goto('https://cej.pj.gob.pe/cej/forms/busquedaform.html', { waitUntil: 'load', timeout: 30000 })
  await page.waitForTimeout(4000)  // let stormcaster.js initialize

  // Solve captcha
  const solver = new Solver(process.env.TWOCAPTCHA_API_KEY || '')
  const imgEl = await page.$('#captcha_image')
  if (!imgEl) { console.error('No captcha'); await browser.close(); return }
  await imgEl.scrollIntoViewIfNeeded()
  await page.waitForTimeout(500)
  const imgBuf = await imgEl.screenshot()
  fs.writeFileSync(resolve(OUT, 'captcha-test-validar.png'), imgBuf)
  const solved = await solver.imageCaptcha({ body: imgBuf.toString('base64'), numeric: 0, min_len: 4, max_len: 8 })
  console.log('Captcha solved:', solved.data, '(size:', imgBuf.length, 'bytes)')

  // Test 1: Call ValidarFiltrosCodigo.htm directly from the page (with session cookies)
  console.log('\n--- Test 1: Direct AJAX call with solved captcha, empty parte ---')
  const result1 = await page.evaluate(async (captcha: string) => {
    const data = new URLSearchParams({
      cod_expediente: '33088',
      cod_anio: '2001',
      cod_distprov: '1801',
      cod_organo: 'JR',
      cod_especialidad: 'CI',
      cod_instancia: '30',
      codigoCaptcha: captcha,
      cod_incidente: '0',
      parte: '',
      navegador: navigator.userAgent.substring(0, 50),
      divKcha: '0',
      sCUJ: '',
    })
    const r = await fetch('/cej/forms/ValidarFiltrosCodigo.htm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
      body: data.toString(),
      credentials: 'include',
    })
    const text = await r.text()
    return { status: r.status, body: text.substring(0, 1000) }
  }, solved.data || '')
  console.log('Response:', result1)

  if (result1.body.length > 100) {
    fs.writeFileSync(resolve(OUT, 'ValidarFiltrosCodigo-direct.html'), result1.body)
    console.log('Body saved.')
  }

  // Test 2: Try with wrong captcha "XXXX" to see if error is different
  console.log('\n--- Test 2: Wrong captcha "XXXX" ---')
  const result2 = await page.evaluate(async () => {
    const data = new URLSearchParams({
      cod_expediente: '33088', cod_anio: '2001', cod_distprov: '1801',
      cod_organo: 'JR', cod_especialidad: 'CI', cod_instancia: '30',
      codigoCaptcha: 'XXXX', cod_incidente: '0', parte: '', navegador: 'Chrome', divKcha: '0', sCUJ: '',
    })
    const r = await fetch('/cej/forms/ValidarFiltrosCodigo.htm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
      body: data.toString(),
      credentials: 'include',
    })
    return { status: r.status, body: (await r.text()).substring(0, 200) }
  })
  console.log('Response (wrong captcha):', result2)

  // Test 3: Try with empty captcha
  console.log('\n--- Test 3: Empty captcha ---')
  const result3 = await page.evaluate(async () => {
    const data = new URLSearchParams({
      cod_expediente: '33088', cod_anio: '2001', cod_distprov: '1801',
      cod_organo: 'JR', cod_especialidad: 'CI', cod_instancia: '30',
      codigoCaptcha: '', cod_incidente: '0', parte: '', navegador: 'Chrome', divKcha: '0', sCUJ: '',
    })
    const r = await fetch('/cej/forms/ValidarFiltrosCodigo.htm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
      body: data.toString(),
      credentials: 'include',
    })
    return { status: r.status, body: (await r.text()).substring(0, 200) }
  })
  console.log('Response (empty captcha):', result3)

  await browser.close()
}

main().catch(console.error)
