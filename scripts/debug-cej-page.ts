/**
 * Visual debug script — takes screenshots at each step to see
 * exactly what CEJ renders after form submission.
 */
import { config } from 'dotenv'
import { resolve } from 'path'
import fs from 'fs'
config({ path: resolve(process.cwd(), '.env.local') })

import { chromium } from 'playwright-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import { Solver } from '2captcha-ts'
import type { Browser } from 'playwright'

chromium.use(StealthPlugin())

const CEJ_URL = 'https://cej.pj.gob.pe/cej/forms/busquedaform.html'
const OUT_DIR = resolve(process.cwd(), 'debug-screenshots')
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR)

function shot(page: import('playwright').Page, name: string) {
  return page.screenshot({ path: resolve(OUT_DIR, `${name}.png`), fullPage: true }).catch(() => {})
}

async function main() {
  const expediente = process.argv[2] || '2001-33088-0-1801-JR-CI-030'
  const parts = expediente.split('-')
  const firstNum = parseInt(parts[0] || '0', 10)
  const isOld = firstNum >= 1990 && firstNum <= 2030
  const anio = isOld ? parts[0] : parts[1]
  const nroExp = isOld ? parts[1] : parts[0]
  const inc = parts[2] || '0'
  const dist = parts[3] || ''
  const organo = parts[4] || ''
  const esp = parts[5] || ''
  const inst = (parts[6] || '').replace(/^0+/, '') || parts[6] || ''

  console.log('Parsed: exp=%s anio=%s dist=%s organo=%s esp=%s inst=%s', nroExp, anio, dist, organo, esp, inst)

  const solver = new Solver(process.env.TWOCAPTCHA_API_KEY || '')

  let browser: Browser | null = null
  try {
    browser = await chromium.launch({
      headless: false,  // VISIBLE browser for debugging
      executablePath: process.env.CHROME_EXECUTABLE_PATH || undefined,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    }) as unknown as Browser

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 900 },
      locale: 'es-PE',
    })
    const page = await context.newPage()

    // ── Step 1: Load CEJ ─────────────────────────────────────────────────────
    console.log('1. Loading CEJ...')
    await page.goto(CEJ_URL, { waitUntil: 'load', timeout: 30000 })
    await page.waitForTimeout(2000)
    await shot(page, '01-cej-loaded')
    console.log('   URL:', page.url())
    console.log('   Title:', await page.title())

    // ── Step 2: Check captcha on search page ─────────────────────────────────
    const captchaImg = await page.$('img[src*="Captcha"], img[src*="captcha"]')
    console.log('2. Captcha image present:', !!captchaImg)
    if (captchaImg) {
      const src = await captchaImg.getAttribute('src')
      console.log('   Captcha src:', src)
    }

    // ── Step 3: Switch to Tab 2 ──────────────────────────────────────────────
    console.log('3. Clicking Tab 2 (Por Código)...')
    await page.click('a[href="#tabs-2"], a:has-text("Por Código")').catch(() => console.log('   Tab 2 click failed'))
    await page.waitForTimeout(1000)
    await shot(page, '02-tab2-visible')

    // ── Step 4: Fill Tab 2 fields ─────────────────────────────────────────────
    console.log('4. Filling Tab 2 fields...')
    await page.evaluate((args: Record<string, string>) => {
      for (const [id, val] of Object.entries(args)) {
        const el = document.getElementById(id) as HTMLInputElement | null
        if (el) {
          el.value = val
          el.dispatchEvent(new Event('input', { bubbles: true }))
          el.dispatchEvent(new Event('change', { bubbles: true }))
        }
      }
    }, { cod_expediente: nroExp || '', cod_anio: anio || '', cod_incidente: inc, cod_distprov: dist, cod_organo: organo, cod_especialidad: esp, cod_instancia: inst })
    await page.waitForTimeout(500)
    await shot(page, '03-tab2-filled')

    // ── Step 5: Get captcha image ─────────────────────────────────────────────
    console.log('5. Solving captcha...')
    const imgEl2 = await page.$('img[src*="Captcha"], img[src*="captcha"]')
    let captchaCode = ''
    if (imgEl2) {
      const imgSrc = await imgEl2.getAttribute('src') || ''
      const absoluteSrc = await page.evaluate((s: string) => {
        if (s.startsWith('http')) return s
        const a = document.createElement('a'); a.href = s; return a.href
      }, imgSrc)
      console.log('   Captcha URL:', absoluteSrc)

      // Save the captcha image
      const b64 = await page.evaluate(async (src: string) => {
        const r = await fetch(src, { credentials: 'include', cache: 'no-store' })
        if (!r.ok) return ''
        const blob = await r.blob()
        return new Promise<string>(res => {
          const reader = new FileReader()
          reader.onload = () => res((reader.result as string).split(',')[1])
          reader.readAsDataURL(blob)
        })
      }, absoluteSrc)
      if (b64) {
        fs.writeFileSync(resolve(OUT_DIR, 'captcha.gif'), Buffer.from(b64, 'base64'))
        console.log('   Captcha saved to debug-screenshots/captcha.gif')
        const solved = await solver.imageCaptcha({ body: b64, numeric: 0, min_len: 4, max_len: 8 })
        captchaCode = solved.data || ''
        console.log('   Solved captcha:', captchaCode)
      }
    } else {
      console.log('   No captcha found on Tab 2')
    }

    // ── Step 6: Submit form ──────────────────────────────────────────────────
    console.log('6. Submitting form...')
    const navPromise = page.waitForNavigation({ waitUntil: 'load', timeout: 35000 }).catch(() => { console.log('   navPromise timed out'); return null })
    await page.evaluate((code: string) => {
      const form = document.getElementById('busquedaPorCodigo') as HTMLFormElement | null
      console.log('[browser] form found:', !!form)
      if (!form) return
      if (code) {
        const hidden = document.createElement('input')
        hidden.type = 'hidden'; hidden.name = 'codigoCaptcha'; hidden.value = code
        form.appendChild(hidden)
        console.log('[browser] captcha injected:', code)
      }
      console.log('[browser] form action:', form.action)
      console.log('[browser] form method:', form.method)
      form.submit()
    }, captchaCode)
    await navPromise
    await page.waitForTimeout(5000)
    await shot(page, '04-after-submit')

    // ── Step 7: Inspect result page ──────────────────────────────────────────
    console.log('7. After submit:')
    console.log('   URL:', page.url())
    console.log('   Title:', await page.title())
    const bodyLen = await page.$eval('body', el => el.innerHTML.length).catch(() => -1)
    console.log('   body.innerHTML.length:', bodyLen)
    const bodyText = await page.$eval('body', el => el.textContent?.trim().substring(0, 500)).catch(() => '(error)')
    console.log('   body.textContent:', bodyText)
    const bodyHtml = await page.$eval('body', el => el.innerHTML.substring(0, 2000)).catch(() => '(error)')
    console.log('   body.innerHTML[:2000]:', bodyHtml)

    // Save full page source
    const html = await page.content()
    fs.writeFileSync(resolve(OUT_DIR, 'page-after-submit.html'), html)
    console.log('   Full HTML saved to debug-screenshots/page-after-submit.html')

    // ── Step 8: Wait longer and check again ──────────────────────────────────
    console.log('8. Waiting 10 more seconds...')
    await page.waitForTimeout(10000)
    await shot(page, '05-after-10s')
    const bodyLen2 = await page.$eval('body', el => el.innerHTML.length).catch(() => -1)
    console.log('   body.innerHTML.length after 10s:', bodyLen2)
    const bodyText2 = await page.$eval('body', el => el.textContent?.trim().substring(0, 500)).catch(() => '(error)')
    console.log('   body.textContent after 10s:', bodyText2)
    const html2 = await page.content()
    fs.writeFileSync(resolve(OUT_DIR, 'page-after-10s.html'), html2)

    console.log('\nDone! Check debug-screenshots/ for screenshots and HTML.')
    await page.waitForTimeout(3000)

  } catch (e: unknown) {
    console.error('Error:', (e as Error).message)
    console.error((e as Error).stack)
  } finally {
    if (browser) await browser.close().catch(() => {})
  }
}

main()
