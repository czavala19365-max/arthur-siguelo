'use strict'

const express = require('express')
const { scrapeCEJ } = require('./cej-scraper')
const { ProxyAgent } = require('undici')

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

const CATALOGO_URL =
  'https://api06-catalogo-sunarp-sprl.apps.ocp-prod.sunarp.gob.pe/v1/sunarp-services/catalogo/listarPublicidadCertificados'

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

    console.log('[SPRL TEST] Calling catalog from Railway...')

    const catalogResponse = await fetch(CATALOGO_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/plain, */*',
        Authorization: `Bearer ${result.accessToken}`,
        Origin: 'https://sprl.sunarp.gob.pe',
        Referer: 'https://sprl.sunarp.gob.pe/',
        ...(result.sunarpCookieHeader
          ? { Cookie: result.sunarpCookieHeader }
          : {}),
      },
      body: JSON.stringify({
        codArea: '22000',
        tipoCert: 'G',
      }),
    })

    const catalogText = await catalogResponse.text()

    console.log('[SPRL TEST] Catalog response:', {
      status: catalogResponse.status,
      ok: catalogResponse.ok,
      body: catalogText.slice(0, 1000),
    })

    return res.json({
      ...result,
      catalogTest: {
        status: catalogResponse.status,
        ok: catalogResponse.ok,
        body: catalogText,
      },
    })
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


app.post('/sprl/catalogo', async (req, res) => {
  try {
    const {
      accessToken,
      cookieHeader,
      codArea,
      tipoCert,
    } = req.body || {}

    console.log('[SPRL catalog Railway] incoming request:', {
      hasAccessToken: Boolean(accessToken),
      accessTokenLength: accessToken?.length || 0,
      hasCookieHeader: Boolean(cookieHeader),
      cookieHeaderLength: cookieHeader?.length || 0,
      codArea,
      tipoCert,
    })

    if (!accessToken) {
      return res.status(401).json({
        success: false,
        data: null,
        response: {
          codigo: '401',
          titulo: 'ERROR',
          tipo: 'E',
          mensaje: 'No se recibió accessToken.',
        },
      })
    }

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

    /*
     * IMPORTANTE:
     * Usamos exactamente el mismo proxy que utiliza
     * el login de SPRL.
     *
     * Cambia los nombres de estas dos variables SOLO si
     * en sprl-scraper.js tienes otros nombres.
     */
    const proxyUsername = process.env.SPRL_PROXY_USERNAME
    const proxyPassword = process.env.SPRL_PROXY_PASSWORD

    if (!proxyUsername || !proxyPassword) {
      console.error('[SPRL catalog Railway] Faltan credenciales SmartProxy')

      return res.status(500).json({
        success: false,
        data: null,
        response: {
          codigo: '500',
          titulo: 'ERROR',
          tipo: 'E',
          mensaje: 'No están configuradas las credenciales SmartProxy.',
        },
      })
    }

    const proxyUrl =
      `http://${encodeURIComponent(proxyUsername)}:${encodeURIComponent(proxyPassword)}@us.smartproxy.net:3120`

    const proxyAgent = new ProxyAgent(proxyUrl)

    const CATALOGO_URL =
      'https://api06-catalogo-sunarp-sprl.apps.ocp-prod.sunarp.gob.pe/v1/sunarp-services/catalogo/listarPublicidadCertificados'

    console.log('[SPRL catalog Railway] Calling SUNARP through SmartProxy...')

    const response = await fetch(CATALOGO_URL, {
      method: 'POST',

      dispatcher: proxyAgent,

      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/plain, */*',
        Authorization: `Bearer ${accessToken}`,

        ...(cookieHeader
          ? { Cookie: cookieHeader }
          : {}),

        Origin: 'https://sprl.sunarp.gob.pe',
        Referer: 'https://sprl.sunarp.gob.pe/',
      },

      body: JSON.stringify({
        codArea,
        tipoCert,
      }),
    })

    const text = await response.text()

    console.log('[SPRL catalog Railway] SUNARP response:', {
      status: response.status,
      ok: response.ok,
      bodyPreview: text.slice(0, 300),
    })

    let json

    try {
      json = JSON.parse(text)
    } catch {
      json = null
    }

    return res
      .status(response.status)
      .json(
        json || {
          success: false,
          data: null,
          response: {
            codigo: String(response.status),
            titulo: 'ERROR',
            tipo: 'E',
            mensaje: text || 'Respuesta inválida de SUNARP.',
          },
        }
      )
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)

    console.error('[SPRL catalog Railway] ERROR:', message)

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
