/**
 * Fetch filtro-2.3.21.min.js from within the browser context to examine the results rendering logic.
 */
import { config } from 'dotenv'
import { resolve } from 'path'
import fs from 'fs'
config({ path: resolve(process.cwd(), '.env.local') })

import { chromium } from 'playwright-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
chromium.use(StealthPlugin())

const OUT = resolve(process.cwd(), 'debug-screenshots')

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROME_EXECUTABLE_PATH || undefined,
    args: ['--no-sandbox'],
  }) as unknown as import('playwright').Browser

  const page = await (await browser.newContext()).newPage()
  await page.goto('https://cej.pj.gob.pe/cej/forms/busquedaform.html', { waitUntil: 'load', timeout: 30000 })
  await page.waitForTimeout(2000)

  // Fetch filtro.js from within the browser (has session cookies)
  const code = await page.evaluate(async () => {
    const r = await fetch('/cej/js/filtro-2.3.21.min.js', { credentials: 'include' })
    return r.text()
  })

  fs.writeFileSync(resolve(OUT, 'filtro.js'), code)
  console.log('filtro.js saved, length:', code.length)

  // Print the first 3000 chars to understand how it works
  console.log('\n--- First 3000 chars ---')
  console.log(code.substring(0, 3000))

  // Search for document.write, innerHTML, AJAX, $.ajax, fetch
  const idx1 = code.indexOf('document.write')
  const idx2 = code.indexOf('innerHTML')
  const idx3 = code.indexOf('$.ajax')
  const idx4 = code.indexOf('fetch(')
  const idx5 = code.indexOf('$.get(')
  const idx6 = code.indexOf('$.post(')
  const idx7 = code.indexOf('XMLHttpRequest')
  const idx8 = code.indexOf('busquedacodform')
  const idx9 = code.indexOf('document.body')
  const idx10 = code.indexOf('window.onload')

  console.log('\n--- Key positions ---')
  console.log('document.write:', idx1, idx1 > 0 ? code.substring(idx1, idx1 + 100) : '')
  console.log('innerHTML:', idx2, idx2 > 0 ? code.substring(idx2, idx2 + 100) : '')
  console.log('$.ajax:', idx3, idx3 > 0 ? code.substring(idx3, idx3 + 200) : '')
  console.log('fetch(:', idx4, idx4 > 0 ? code.substring(idx4, idx4 + 100) : '')
  console.log('$.get:', idx5, idx5 > 0 ? code.substring(idx5, idx5 + 100) : '')
  console.log('$.post:', idx6, idx6 > 0 ? code.substring(idx6, idx6 + 100) : '')
  console.log('XMLHttpRequest:', idx7, idx7 > 0 ? code.substring(idx7, idx7 + 100) : '')
  console.log('busquedacodform:', idx8, idx8 > 0 ? code.substring(idx8, idx8 + 100) : '')
  console.log('document.body:', idx9, idx9 > 0 ? code.substring(idx9, idx9 + 100) : '')
  console.log('window.onload:', idx10, idx10 > 0 ? code.substring(idx10, idx10 + 100) : '')

  await browser.close()
}

main().catch(console.error)
