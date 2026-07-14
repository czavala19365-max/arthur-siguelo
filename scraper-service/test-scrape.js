'use strict'

const DEFAULT_URL = process.env.CEJ_SCRAPER_URL || 'http://localhost:3001'
const DEFAULT_NUMERO = process.env.CEJ_TEST_NUMERO || '00001-2005-0-1817-JR-CO-06'
const DEFAULT_PARTE = process.env.CEJ_TEST_PARTE || 'GARCIA LOPEZ'

function buildUrl(baseUrl) {
  const raw = String(baseUrl).trim().replace(/\/$/, '')
  const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
  return `${normalized}/scrape`
}

async function main() {
  const baseUrl = process.argv[2] || DEFAULT_URL
  const numero = process.argv[3] || DEFAULT_NUMERO
  const parte = process.argv[4] || DEFAULT_PARTE

  const url = buildUrl(baseUrl)
  const started = Date.now()

  console.log('[test-scrape] POST', url)
  console.log('[test-scrape] payload:', { numero, parte })

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ numero, parte }),
  })

  const elapsed = Date.now() - started
  const raw = await response.text()

  console.log('[test-scrape] status:', response.status)
  console.log('[test-scrape] elapsedMs:', elapsed)
  console.log('[test-scrape] body:')
  console.log(raw)

  try {
    const json = JSON.parse(raw)
    console.log('[test-scrape] parsed keys:', Object.keys(json))
  } catch {
    console.log('[test-scrape] response is not valid JSON')
  }

  if (!response.ok) {
    process.exitCode = 1
  }
}

main().catch(err => {
  console.error('[test-scrape] failed:', err instanceof Error ? err.message : String(err))
  process.exitCode = 1
})