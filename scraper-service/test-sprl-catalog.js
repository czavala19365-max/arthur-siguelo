'use strict'

const CATALOGO_URL =
  'https://api06-catalogo-sunarp-sprl.apps.ocp-prod.sunarp.gob.pe/v1/sunarp-services/catalogo/listarPublicidadCertificados'

// ============================================================
// DATOS DEL LOGIN DE RAILWAY
// ============================================================

const accessToken =
  'a5af205a-aa9d-49fd-8225-40125e1d5845-3988c09b-5ac8-40f3-8668-51f2be0a3412'

const refreshToken =
  'f3d3a5fb-8d47-49fb-8b19-a3ac1c040408-94af1e06-741c-4be1-b220-b0344599dd13-89ab678d-7285-434e-8279-4743f538235c'

const sunarpSessionId =
  '55AABABF3675400F3060FB78AE62F69E'

const sunarpCookieHeader =
  'JSESSIONID%3D55AABABF3675400F3060FB78AE62F69E%3B%20_ga%3DGA1.1.993234876.1786168714%3B%2089c834e13f8e0f3275d54b8fd39e7d35%3D0a655a9fd01cb2ddeabfedbf4377cd65%3B%20_ga_C4XX4CF718%3DGS2.1.s1786168714%24o1%24g1%24t1786168716%24j58%24l0%24h0'

// ============================================================
// DATOS DE LA CONSULTA
// ============================================================

const codArea = '22000'
const tipoCert = 'G'

// ============================================================
// PRUEBA
// ============================================================

async function testCatalog() {
  console.log('\n========================================')
  console.log('       SPRL CATALOG DIRECT TEST')
  console.log('========================================\n')

  console.log('[TEST] Datos utilizados:')

  console.log({
    accessTokenLength: accessToken.length,
    accessTokenStart: accessToken.slice(0, 10),
    accessTokenEnd: accessToken.slice(-10),

    refreshTokenLength: refreshToken.length,

    sunarpSessionIdLength: sunarpSessionId.length,
    sunarpSessionId,

    cookieLength: sunarpCookieHeader.length,
    cookiePreview: sunarpCookieHeader.slice(0, 150),

    codArea,
    tipoCert,
  })

  const body = {
    codArea,
    tipoCert,
  }

  console.log('\n========================================')
  console.log('REQUEST')
  console.log('========================================\n')

  console.log('URL:', CATALOGO_URL)
  console.log('METHOD: POST')

  console.log('\nHEADERS:')

  console.log({
    'Content-Type': 'application/json',
    Accept: 'application/json, text/plain, */*',
    Authorization: `Bearer ${accessToken}`,
    Cookie: sunarpCookieHeader,
    Origin: 'https://sprl.sunarp.gob.pe',
    Referer: 'https://sprl.sunarp.gob.pe/',
  })

  console.log('\nBODY:')
  console.log(JSON.stringify(body))

  console.log('\n========================================')
  console.log('FETCH')
  console.log('========================================\n')

  try {
    const response = await fetch(CATALOGO_URL, {
      method: 'POST',

      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/plain, */*',

        Authorization: `Bearer ${accessToken}`,

        ...(sunarpCookieHeader
          ? {
              Cookie: sunarpCookieHeader,
            }
          : {}),

        Origin: 'https://sprl.sunarp.gob.pe',
        Referer: 'https://sprl.sunarp.gob.pe/',
      },

      body: JSON.stringify(body),
    })

    const text = await response.text()

    console.log('\n========================================')
    console.log('RESPONSE')
    console.log('========================================\n')

    console.log('STATUS:', response.status)
    console.log('OK:', response.ok)

    console.log('\nRESPONSE HEADERS:')

    console.log(
      Object.fromEntries(response.headers.entries())
    )

    console.log('\nRESPONSE BODY:')
    console.log(text)

    console.log('\n========================================')
    console.log('END TEST')
    console.log('========================================\n')
  } catch (error) {
    console.error('\n[TEST] FETCH ERROR:')

    console.error(
      error instanceof Error
        ? error.stack || error.message
        : String(error)
    )
  }
}

testCatalog()

