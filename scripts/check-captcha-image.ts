import { config } from 'dotenv'
import { resolve } from 'path'
import fs from 'fs'
config({ path: resolve(process.cwd(), '.env.local') })

import { chromium } from 'playwright-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
chromium.use(StealthPlugin())

const OUT = resolve(process.cwd(), 'debug-screenshots')
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT)

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROME_EXECUTABLE_PATH || undefined,
    args: ['--no-sandbox'],
  }) as unknown as import('playwright').Browser

  const page = await (await browser.newContext({
    viewport: { width: 1280, height: 900 },
    locale: 'es-PE',
  })).newPage()

  console.log('Loading CEJ...')
  await page.goto('https://cej.pj.gob.pe/cej/forms/busquedaform.html', { waitUntil: 'load', timeout: 30000 })
  await page.waitForTimeout(3000)

  // Check captcha image state
  const info = await page.evaluate(() => {
    const img = document.getElementById('captcha_image') as HTMLImageElement | null
    if (!img) return null
    const rect = img.getBoundingClientRect()
    const style = window.getComputedStyle(img)
    return {
      src: img.getAttribute('src'),
      complete: img.complete,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      renderedWidth: rect.width,
      renderedHeight: rect.height,
      display: style.display,
      visibility: style.visibility,
      opacity: style.opacity,
      offsetTop: rect.top,
      offsetLeft: rect.left,
    }
  })
  console.log('captcha_image info:', JSON.stringify(info, null, 2))

  // Wait for it to fully load
  await page.waitForFunction(() => {
    const img = document.getElementById('captcha_image') as HTMLImageElement | null
    return !!(img?.complete && (img?.naturalWidth ?? 0) > 10)
  }, { timeout: 15000 }).catch(() => console.log('load wait timed out'))

  const info2 = await page.evaluate(() => {
    const img = document.getElementById('captcha_image') as HTMLImageElement | null
    if (!img) return null
    return { complete: img.complete, naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight }
  })
  console.log('After wait:', info2)

  // Take full page screenshot
  await page.screenshot({ path: resolve(OUT, 'full-page.png'), fullPage: true })
  console.log('Full page screenshot saved')

  // Take element screenshot
  const imgEl = await page.$('#captcha_image')
  if (imgEl) {
    const buf = await imgEl.screenshot()
    fs.writeFileSync(resolve(OUT, 'captcha-element.png'), buf)
    console.log('Element screenshot saved, size:', buf.length, 'bytes')
  }

  // Also try fetching the image via CDP/Playwright
  const imgSrc = await page.$eval('#captcha_image', el => el.getAttribute('src')).catch(() => '')
  console.log('Image src:', imgSrc)

  // Download the image via fetch inside the browser context
  if (imgSrc) {
    const b64 = await page.evaluate(async (src: string) => {
      const fullSrc = src.startsWith('http') ? src : window.location.origin + src
      const r = await fetch(fullSrc, { credentials: 'include', cache: 'no-cache' })
      if (!r.ok) return ''
      const blob = await r.blob()
      return new Promise<string>(res => {
        const reader = new FileReader()
        reader.onload = () => res((reader.result as string).split(',')[1])
        reader.readAsDataURL(blob)
      })
    }, imgSrc)
    if (b64) {
      fs.writeFileSync(resolve(OUT, 'captcha-fetched.jpg'), Buffer.from(b64, 'base64'))
      console.log('Fetched captcha saved, size:', b64.length, 'chars')
    }
  }

  await browser.close()
  console.log('\nCheck debug-screenshots/ for the images')
}

main().catch(console.error)
