/**
 * Inspecciona el formulario CEJ y extrae opciones de distrito judicial.
 * Uso: npx tsx scripts/inspect-cej-distritos.ts
 */
import { chromium } from 'playwright-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import fs from 'fs'
import path from 'path'

chromium.use(StealthPlugin())

const CEJ_SEARCH_URL = 'https://cej.pj.gob.pe/cej/forms/busquedaform.html'

async function extractWithPlaywright() {
  console.log('\n--- Playwright+stealth: cargando página con JS ---')
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROME_EXECUTABLE_PATH || undefined,
  })
  const page = await browser.newPage({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
    locale: 'es-PE',
  })
  await page.goto(CEJ_SEARCH_URL, { waitUntil: 'load', timeout: 60000 })
  await page.waitForTimeout(5000)

  const outPath = path.join(process.cwd(), 'scripts', 'cej-playwright-snapshot.html')
  const bodyHtml = await page.content()
  fs.writeFileSync(outPath, bodyHtml)
  console.log('Saved Playwright snapshot:', outPath, 'bytes:', bodyHtml.length)
  console.log('Page title:', await page.title())
  console.log('URL:', page.url())
  console.log('Has #consultarExpedientes:', !!(await page.$('#consultarExpedientes')))
  console.log('Has #distritoJudicial:', !!(await page.$('#distritoJudicial')))
  console.log('Has hCaptcha:', !!(await page.$('iframe[src*="hcaptcha"]')))
  console.log('Body text sample:', (await page.textContent('body'))?.slice(0, 400))

  const distritoOptions = await page.evaluate(() => {
    const sel = document.querySelector('#distritoJudicial') as HTMLSelectElement | null
    if (!sel) return { found: false, options: [] as { value: string; text: string }[] }
    return {
      found: true,
      options: Array.from(sel.options).map(o => ({ value: o.value, text: o.text.trim() })),
    }
  })

  console.log('#distritoJudicial found:', distritoOptions.found)
  if (distritoOptions.found) {
    console.log('Total options:', distritoOptions.options.length)
    for (const o of distritoOptions.options) {
      const mark =
        /ventanilla|comercial|18|a5|lima sur|lima norte|callao/i.test(o.text) ||
        /18|a5/i.test(o.value)
          ? ' **'
          : ''
      console.log(`  value="${o.value}" text="${o.text}"${mark}`)
    }

    const matches18A5 = distritoOptions.options.filter(
      o =>
        o.value.toUpperCase() === '18A5' ||
        o.text.toUpperCase().includes('18A5') ||
        /ventanilla|comercial/i.test(o.text),
    )
    console.log('\nCandidatos para 18A5:')
    for (const o of matches18A5) {
      console.log(`  => value="${o.value}" text="${o.text}"`)
    }
  }

  // Tab 2 cod_distprov — list inputs
  const tab2Fields = await page.evaluate(() => {
    const ids = ['cod_distprov', 'cod_expediente', 'cod_anio', 'cod_incidente', 'cod_organo', 'cod_especialidad', 'cod_instancia']
    return ids.map(id => {
      const el = document.getElementById(id) as HTMLInputElement | HTMLSelectElement | null
      if (!el) return { id, type: 'missing' as const }
      if (el.tagName === 'SELECT') {
        return {
          id,
          type: 'select' as const,
          options: Array.from((el as HTMLSelectElement).options).map(o => ({ value: o.value, text: o.text.trim() })),
        }
      }
      return { id, type: 'input' as const, value: (el as HTMLInputElement).value, maxLength: (el as HTMLInputElement).maxLength }
    })
  })
  console.log('\nTab 2 fields:')
  console.log(JSON.stringify(tab2Fields, null, 2))

  await browser.close()
  return distritoOptions
}

async function main() {
  await extractWithPlaywright()

  const res = await fetch(CEJ_SEARCH_URL, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml',
    },
  })

  if (!res.ok) {
    console.error('HTTP', res.status, res.statusText)
    process.exit(1)
  }

  const html = await res.text()
  console.log('HTML length:', html.length)

  // All <select> blocks
  const selectRe = /<select\b[^>]*>[\s\S]*?<\/select>/gi
  const selects = html.match(selectRe) || []
  console.log('Total <select> elements:', selects.length)

  for (const sel of selects) {
    const idMatch = sel.match(/\bid=["']([^"']+)["']/i)
    const nameMatch = sel.match(/\bname=["']([^"']+)["']/i)
    const id = idMatch?.[1] || nameMatch?.[1] || '(no id)'
    if (!/distrito|distprov|judicial/i.test(id) && !/distrito|distprov|judicial/i.test(sel)) continue

    console.log('\n=== SELECT:', id, '===')
    const optionRe = /<option\b([^>]*)>([\s\S]*?)<\/option>/gi
    let m: RegExpExecArray | null
    const options: { value: string; text: string }[] = []
    while ((m = optionRe.exec(sel)) !== null) {
      const attrs = m[1]
      const text = m[2].replace(/<[^>]+>/g, '').trim()
      const valMatch = attrs.match(/\bvalue=["']([^"']*)["']/i)
      const value = valMatch ? valMatch[1] : ''
      options.push({ value, text })
    }
    for (const o of options) {
      console.log(`  value="${o.value}" text="${o.text}"`)
    }
  }

  // Tab 2 cod_distprov — inputs or selects
  const codDistprovIdx = html.indexOf('cod_distprov')
  if (codDistprovIdx >= 0) {
    console.log('\n=== Context around cod_distprov ===')
    console.log(html.slice(Math.max(0, codDistprovIdx - 200), codDistprovIdx + 800))
  }

  // Search for 18A5, 18a5, A5, VENTANILLA, COMERCIAL in HTML
  const needles = ['18A5', '18a5', '18A', 'VENTANILLA', 'COMERCIAL', '1805', 'distritoJudicial']
  console.log('\n=== Keyword hits ===')
  for (const n of needles) {
    const idx = html.toUpperCase().indexOf(n.toUpperCase())
    if (idx >= 0) {
      console.log(`"${n}" at ${idx}:`, html.slice(idx, idx + 120).replace(/\s+/g, ' '))
    } else {
      console.log(`"${n}": not found`)
    }
  }

  // distritoJudicial select specifically
  const distSelMatch = html.match(/<select[^>]*id=["']distritoJudicial["'][^>]*>[\s\S]*?<\/select>/i)
  if (distSelMatch) {
    console.log('\n=== #distritoJudicial (full) ===')
    const optionRe = /<option\b([^>]*)>([\s\S]*?)<\/option>/gi
    let m: RegExpExecArray | null
    while ((m = optionRe.exec(distSelMatch[0])) !== null) {
      const attrs = m[1]
      const text = m[2].replace(/<[^>]+>/g, '').trim()
      const valMatch = attrs.match(/\bvalue=["']([^"']*)["']/i)
      const value = valMatch ? valMatch[1] : ''
      if (/ventanilla|comercial|18|lima|a5/i.test(text) || /18|a5/i.test(value)) {
        console.log(`  ** value="${value}" text="${text}"`)
      }
    }
    console.log('(all options with ventanilla/comercial/18/a5 highlighted above)')
  } else {
    console.log('\n#distritoJudicial select NOT in static HTML — may be loaded via JS/AJAX')
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
