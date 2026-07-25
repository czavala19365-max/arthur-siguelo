'use strict'

const DEFAULT_NUMERO = process.env.CEJ_TEST_NUMERO || '01600-2022-0-0701-JR-CI-06'
const DEFAULT_PARTE = process.env.CEJ_TEST_PARTE || 'Marcobre S.A.C'

async function main() {
  const numero = process.argv[2] || DEFAULT_NUMERO
  const parte = process.argv[3] || DEFAULT_PARTE

  // Force the local Playwright path for this smoke test.
  delete process.env.BROWSERLESS_TOKEN
  process.env.CEJ_FORCE_LOCAL = '1'

  console.log('[test-local-cej] numero:', numero)
  console.log('[test-local-cej] parte:', parte)
  console.log('[test-local-cej] forcing local browser execution')

  const started = Date.now()
  const { scrapeCEJ } = require('./cej-scraper')
  const result = await scrapeCEJ(String(numero).trim(), String(parte).trim())
  const elapsed = Date.now() - started

  console.log('[test-local-cej] elapsedMs:', elapsed)
  console.log('[test-local-cej] portalDown:', result.portalDown)
  console.log('[test-local-cej] captchaDetected:', result.captchaDetected)
  console.log('[test-local-cej] captchaSolved:', result.captchaSolved)
  console.log('[test-local-cej] actuaciones:', Array.isArray(result.actuaciones) ? result.actuaciones.length : 0)
  console.log('[test-local-cej] error:', result.error || '(none)')
  console.log('[test-local-cej] raw result:')
  console.log(JSON.stringify(result, null, 2))

  if (result.portalDown || result.error) {
    process.exitCode = 1
  }
}

main().catch(err => {
  console.error('[test-local-cej] failed:', err instanceof Error ? err.message : String(err))
  process.exitCode = 1
})