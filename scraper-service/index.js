'use strict'

const express = require('express')
const { scrapeCEJ } = require('./cej-scraper')
const { chromium } = require('playwright')

const app = express()
app.use(express.json({ limit: '1mb' }))

async function notifyNextPostprocess({ numero, parte, result }) {
  const callbackUrl = String(process.env.CEJ_POSTPROCESS_URL || '').trim()
  if (!callbackUrl) return
  if (!result || result.portalDown) return
  if (!Array.isArray(result.actuaciones) || result.actuaciones.length === 0) return

  const secret = String(process.env.CEJ_POSTPROCESS_SECRET || process.env.CRON_SECRET || '').trim()
  if (!secret) {
    console.warn('[scraper-service] CEJ_POSTPROCESS_SECRET/CRON_SECRET no configurado; no se enviará callback')
    return
  }

  const controller = AbortSignal.timeout(Number(process.env.CEJ_POSTPROCESS_TIMEOUT_MS) || 180_000)
  const response = await fetch(callbackUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-secret': secret,
    },
    body: JSON.stringify({
      numeroExpediente: numero,
      parte,
      scrapeResult: result,
      source: 'railway-scraper-service',
    }),
    signal: controller,
  })

  const text = await response.text().catch(() => '')
  if (!response.ok) {
    console.error('[scraper-service] callback postprocess failed:', response.status, text.slice(0, 300))
    return
  }

  console.log('[scraper-service] callback postprocess ok:', text.slice(0, 200))
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.post('/scrape', async (req, res) => {
  console.log("🚀 Llegó una petición desde Vercel");
  try {
    const { numero, parte } = req.body || {}
    const disableCallbackHeader = String(req.headers['x-cej-disable-callback'] || '').trim().toLowerCase()
    const disableCallback = disableCallbackHeader === '1' || disableCallbackHeader === 'true'
    if (numero == null || String(numero).trim() === '') {
      return res.status(400).json({ error: 'numero es requerido' })
    }
    if (parte == null || String(parte).trim() === '') {
      return res.status(400).json({ error: 'parte es requerida' })
    }
    const result = await scrapeCEJ(String(numero).trim(), String(parte).trim())
    if (!disableCallback) {
      notifyNextPostprocess({ numero: String(numero).trim(), parte: String(parte).trim(), result }).catch(err => {
        console.error('[scraper-service] callback postprocess error:', err instanceof Error ? err.message : String(err))
      })
    }
    res.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[scraper-service] POST /scrape', message)
    res.status(500).json({ error: 'Error al ejecutar scrape CEJ', details: message })
  }
})

app.get('/health/proxy', async (req, res) => {
  const { chromium } = require('playwright')
  function parseProxy(proxyUrl) {
    const url = new URL(proxyUrl)
    return {
      server: url.protocol + '//' + url.hostname + ':' + url.port,
      username: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
    }
  }
  let browser
  try {
    browser = await chromium.launch({
      headless: true,
      proxy: parseProxy(process.env.PROXY_URL),
      args: ['--no-sandbox', '--ignore-certificate-errors']
    });
    const page = await browser.newPage();
    await page.setExtraHTTPHeaders({});
    const response = await page.goto('http://checkip.amazonaws.com/', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    const ip = (await page.textContent('body')).trim();
    res.json({ ok: true, ip });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  } finally {
    if (browser) await browser.close()
  }
})

// ─── SPRL (Publicidad Registral) ────────────────────────────────
const { loginSPRL } = require('./sprl-scraper')

app.post('/sprl/login', async (req, res) => {
  try {
    const { username, password } = req.body || {}

    if (!username || !password) {
      return res.status(400).json({
        ok: false,
        error: 'username y password son requeridos',
      })
    }

    const result = await loginSPRL(
      String(username).trim(),
      String(password).trim()
    )

    console.log('[SPRL TEST] Login result:', {
      ok: result.ok,
      hasAccessToken: Boolean(result.accessToken),
      accessTokenLength: result.accessToken?.length ?? 0,
      hasSessionId: Boolean(result.sunarpSessionId),
      sessionIdLength: result.sunarpSessionId?.length ?? 0,
      hasCookieHeader: Boolean(result.sunarpCookieHeader),
      cookieHeaderLength: result.sunarpCookieHeader?.length ?? 0,
    })

    if (!result.ok) {
      return res.json(result)
    }

    return res.json(result)

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)

    console.error('[scraper-service] POST /sprl/login', message)

    res.status(500).json({
      ok: false,
      error: 'Error al ejecutar login SPRL',
      details: message,
    })
  }
})

app.post('/sprl/catalog', async (req, res) => {
  try {
    const { codArea, tipoCert, accessToken, sunarpCookieHeader } = req.body || {}

    console.log('[SPRL catalog] Incoming request:', {
      codArea,
      tipoCert,
      hasAccessToken: Boolean(accessToken),
      accessTokenLength: accessToken?.length ?? 0,
      hasCookie: Boolean(sunarpCookieHeader),
      cookieLength: sunarpCookieHeader?.length ?? 0,
    })

    // ============================================================
    // 1. VALIDACIONES
    // ============================================================

    if (!codArea || !tipoCert) {
      return res.status(400).json({
        success: false,
        data: null,
        response: {
          codigo: '400',
          titulo: 'ERROR',
          tipo: 'E',
          mensaje: 'codArea y tipoCert son requeridos.',
        },
      })
    }

    if (!accessToken) {
      console.log('[SPRL catalog] No hay accessToken')

      return res.status(401).json({
        success: false,
        data: null,
        response: {
          codigo: '401',
          titulo: 'ERROR',
          tipo: 'E',
          mensaje: 'Token SPRL no disponible.',
        },
      })
    }

    if (!sunarpCookieHeader) {
      console.log('[SPRL catalog] No hay cookie SPRL')

      return res.status(401).json({
        success: false,
        data: null,
        response: {
          codigo: '401',
          titulo: 'ERROR',
          tipo: 'E',
          mensaje: 'Cookie SPRL no disponible.',
        },
      })
    }

    // ============================================================
    // 2. DECODIFICAR COOKIE
    // ============================================================

    let cookieHeader

    try {
      cookieHeader = decodeURIComponent(String(sunarpCookieHeader))

      console.log('[SPRL catalog] Cookie decodificada:', {
        length: cookieHeader.length,
        hasJSessionId: cookieHeader.includes('JSESSIONID'),
        preview: cookieHeader.slice(0, 60),
      })
    } catch (error) {
      console.error(
        '[SPRL catalog] Error decodificando cookie:',
        error instanceof Error ? error.message : String(error)
      )

      return res.status(400).json({
        success: false,
        data: null,
        response: {
          codigo: '400',
          titulo: 'ERROR',
          tipo: 'E',
          mensaje: 'La cookie SPRL no tiene un formato válido.',
        },
      })
    }

    // ============================================================
    // 3. PROXY
    // ============================================================

    const proxyHost =
      process.env.SPRL_PROXY_SERVER || 'us.smartproxy.net'

    const proxyPort =
      process.env.SPRL_PROXY_PORT || '3120'

    const proxyUser =
      process.env.SPRL_PROXY_USERNAME

    const proxyPass =
      process.env.SPRL_PROXY_PASSWORD

    if (!proxyUser || !proxyPass) {
      throw new Error(
        'Faltan SPRL_PROXY_USERNAME o SPRL_PROXY_PASSWORD en Railway.'
      )
    }

    const proxyUrl = `http://${proxyHost}:${proxyPort}`

    const proxyAuth = Buffer.from(
      `${proxyUser}:${proxyPass}`
    ).toString('base64')

    const { HttpsProxyAgent } = await import('https-proxy-agent')

    const proxyAgent = new HttpsProxyAgent(proxyUrl, {
      keepAlive: true,
      rejectUnauthorized: false,
      headers: {
        'Proxy-Authorization': `Basic ${proxyAuth}`,
      },
    })

    console.log('[SPRL catalog] Proxy configurado:', {
      host: proxyHost,
      port: proxyPort,
      hasUser: Boolean(proxyUser),
      hasPassword: Boolean(proxyPass),
    })

    // ============================================================
    // 4. HEADERS
    // ============================================================

    const requestHeaders = {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/plain, */*',
      Authorization: `Bearer ${accessToken}`,
      Cookie: cookieHeader,
      Origin: 'https://sprl.sunarp.gob.pe',
      Referer: 'https://sprl.sunarp.gob.pe/',
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    }

    console.log('[SPRL catalog] Calling SUNARP catalog...')

    // ============================================================
    // 5. FETCH
    // ============================================================

    const response = await fetch(
      'https://api06-catalogo-sunarp-sprl.apps.ocp-prod.sunarp.gob.pe/v1/sunarp-services/catalogo/listarPublicidadCertificados',
      {
        method: 'POST',
        agent: proxyAgent,
        headers: requestHeaders,
        body: JSON.stringify({
          codArea: String(codArea).trim(),
          tipoCert: String(tipoCert).trim(),
        }),
        timeout: 30000,
      }
    )

    // ============================================================
    // 6. RESPUESTA
    // ============================================================

    const text = await response.text()

    console.log('[SPRL catalog] SUNARP response:', {
      status: response.status,
      ok: response.ok,
      bodyLength: text.length,
      bodyPreview: text.slice(0, 300),
    })

    let json = null

    try {
      json = JSON.parse(text)
    } catch {
      json = null
    }

    // ============================================================
    // 7. DEVOLVER RESPUESTA
    // ============================================================

    if (json !== null) {
      return res.status(response.status).json(json)
    }

    return res.status(response.status).json({
      success: false,
      data: null,
      response: {
        codigo: String(response.status),
        titulo: 'ERROR',
        tipo: 'E',
        mensaje:
          text || 'SUNARP devolvió una respuesta vacía.',
      },
    })

  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error)

    console.error('[SPRL catalog] ERROR:', message)

    return res.status(500).json({
      success: false,
      data: null,
      response: {
        codigo: '500',
        titulo: 'ERROR',
        tipo: 'E',
        mensaje: message,
      },
    })

  }
})


app.get('/sprl/health', (_req, res) => {
  res.json({
    status: 'ok',
    module: 'sprl',
  })
})

const PORT = Number(process.env.PORT) || 3001

app.listen(PORT, () => {
  console.log(`[cej-scraper-service] listening on :${PORT}`)
})
