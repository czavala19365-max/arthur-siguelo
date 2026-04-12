import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })

import { chromium } from 'playwright-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
chromium.use(StealthPlugin())

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROME_EXECUTABLE_PATH || undefined,
    args: ['--no-sandbox'],
  }) as unknown as import('playwright').Browser

  const page = await (await browser.newContext()).newPage()
  await page.goto('https://cej.pj.gob.pe/cej/forms/busquedaform.html', { waitUntil: 'load', timeout: 30000 })
  await page.waitForTimeout(2000)

  // Find ALL img elements with "captcha" in src or id
  const allImgs = await page.$$eval('img', imgs =>
    imgs
      .filter(i => (i.id + (i.getAttribute('src') || '')).toLowerCase().includes('captcha'))
      .map(i => ({ id: i.id, src: i.getAttribute('src'), width: i.width, height: i.height }))
  )
  console.log('All captcha-like images:', JSON.stringify(allImgs, null, 2))

  // Try #captcha_image specifically
  const real = await page.$eval('#captcha_image', el => ({
    id: el.id,
    src: el.getAttribute('src'),
    width: (el as HTMLImageElement).width,
    height: (el as HTMLImageElement).height,
  })).catch(() => 'NOT FOUND')
  console.log('\n#captcha_image:', real)

  // Also check all form fields in both tabs
  const formInputs = await page.$$eval('input, select', els =>
    els.map(el => ({ id: el.id, name: el.getAttribute('name'), type: el.getAttribute('type') }))
       .filter(e => e.id || e.name)
  )
  console.log('\nAll form inputs:', JSON.stringify(formInputs, null, 2))

  await browser.close()
}

main().catch(console.error)
