'use strict'

require('dotenv').config()

const SCRAPER_SERVICE_URL = process.env.SCRAPER_SERVICE_URL || 'https://arthur-30-production.up.railway.app'
const SPRL_USERNAME = process.env.SPRL_USERNAME || ''
const SPRL_PASSWORD = process.env.SPRL_PASSWORD || ''
const SPRL_ACCESS_TOKEN = process.env.SPRL_ACCESS_TOKEN || ''

const codArea = process.env.SPRL_COD_AREA || '22000'
const tipoCert = process.env.SPRL_TIPO_CERT || 'G'

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/plain, */*',
    },
    body: JSON.stringify(payload),
  })

  const text = await response.text()
  let json = null

  try {
    json = JSON.parse(text)
  } catch {
    json = null
  }

  return {
    status: response.status,
    ok: response.ok,
    text,
    json,
  }
}

async function testCatalog() {
  console.log('\n========================================')
  console.log('   SPRL CATALOG INTEGRATION TEST')
  console.log('========================================\n')

  console.log('[TEST] Config:')
  console.log({
    scraperServiceUrl: SCRAPER_SERVICE_URL,
    hasUsername: Boolean(SPRL_USERNAME),
    hasPassword: Boolean(SPRL_PASSWORD),
    hasAccessToken: Boolean(SPRL_ACCESS_TOKEN),
    codArea,
    tipoCert,
  })

  let accessToken = SPRL_ACCESS_TOKEN

  if (!accessToken) {
    if (!SPRL_USERNAME || !SPRL_PASSWORD) {
      throw new Error('Define SPRL_ACCESS_TOKEN o SPRL_USERNAME y SPRL_PASSWORD en el entorno.')
    }

    console.log('\n[TEST] Logging in through scraper-service...')
    const loginResult = await postJson(`${SCRAPER_SERVICE_URL}/sprl/login`, {
      username: SPRL_USERNAME,
      password: SPRL_PASSWORD,
    })

    console.log('[TEST] Login status:', loginResult.status)
    console.log('[TEST] Login body:', loginResult.text)

    if (!loginResult.ok || !loginResult.json?.ok || !loginResult.json?.accessToken) {
      throw new Error('Login no devolvió accessToken. Revisa las credenciales o el scraper-service.')
    }

    accessToken = loginResult.json.accessToken
  }

  console.log('\n[TEST] Calling scraper-service catalog route...')
  const catalogResult = await postJson(`${SCRAPER_SERVICE_URL}/sprl/catalogo`, {
    accessToken,
    codArea,
    tipoCert,
  })

  console.log('\n========================================')
  console.log('RESPONSE')
  console.log('========================================\n')
  console.log('STATUS:', catalogResult.status)
  console.log('OK:', catalogResult.ok)
  console.log('\nBODY:')
  console.log(catalogResult.text)

  console.log('\n========================================')
  console.log('END TEST')
  console.log('========================================\n')
}

testCatalog().catch(error => {
  console.error('\n[TEST] ERROR:')
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})

