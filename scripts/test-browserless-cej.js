'use strict'

const { chromium } = require('playwright-extra')

async function main() {
  console.log('[test] conectando a Browserless...')

  const browser = await chromium.connect(
    `wss://production-sfo.browserless.io/chromium/playwright?token=${process.env.BROWSERLESS_TOKEN}`
  )

  console.log('[test] navegador conectado')

  const context = await browser.newContext({
    viewport: {
      width: 1280,
      height: 720,
    },
    locale: 'es-PE',
    timezoneId: 'America/Lima',
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128 Safari/537.36',
  })

  const page = await context.newPage()

  console.log('[test] entrando a CEJ...')

  await page.goto(
    'https://cej.pj.gob.pe/cej/forms/busquedaform.html',
    {
      waitUntil: 'networkidle',
      timeout: 60000,
    }
  )

  await page.waitForTimeout(5000)

  console.log('URL:', page.url())
  console.log('TITLE:', await page.title())

  const text = await page.locator('body').innerText()

  console.log('BODY:', text.substring(0, 500))

  await page.screenshot({
    path: 'cej-browserless-test.png',
    fullPage: true,
  })

  await browser.close()
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})