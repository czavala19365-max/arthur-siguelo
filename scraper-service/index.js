'use strict'

require('dotenv').config({ path: '.env.local' })
require('dotenv').config()

const express = require('express')
const { randomUUID } = require('crypto')
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

const sprlSessionsByAccessToken = new Map()
const sprlSessionsByUsername = new Map()
const sprlSessionsById = new Map()
const SPRL_CATALOGO_URL = 'https://api06-catalogo-sunarp-sprl.apps.ocp-prod.sunarp.gob.pe/v1/sunarp-services/catalogo/listarPublicidadCertificados'

async function closeSprlSession(session) {
  if (!session) return
  try { if (session.page) await session.page.close().catch(() => { }) } catch { }
  try { if (session.context) await session.context.close().catch(() => { }) } catch { }
  try { if (session.browser) await session.browser.close().catch(() => { }) } catch { }
}

function storeSprlSession(session) {
  if (!session) return
  const normalizedToken = String(session.accessToken || '').trim()
  const normalizedUsername = String(session.username || '').trim().toLowerCase()
  const normalizedSessionId = String(session.sessionId || '').trim()

  if (normalizedToken) {
    const previousTokenSession = sprlSessionsByAccessToken.get(normalizedToken)
    if (previousTokenSession && previousTokenSession !== session) {
      closeSprlSession(previousTokenSession).catch(() => { })
    }
    sprlSessionsByAccessToken.set(normalizedToken, session)
  }

  if (normalizedUsername) {
    const previousUsernameSession = sprlSessionsByUsername.get(normalizedUsername)
    if (previousUsernameSession && previousUsernameSession !== session) {
      closeSprlSession(previousUsernameSession).catch(() => { })
    }
    sprlSessionsByUsername.set(normalizedUsername, session)
  }

  if (normalizedSessionId) {
    const previousSession = sprlSessionsById.get(normalizedSessionId)
    if (previousSession && previousSession !== session) {
      closeSprlSession(previousSession).catch(() => { })
    }
    sprlSessionsById.set(normalizedSessionId, session)
  }
}

function getSprlSession({ sessionId, username, accessToken }) {
  const normalizedSessionId = String(sessionId || '').trim()
  const normalizedUsername = String(username || '').trim().toLowerCase()
  const normalizedToken = String(accessToken || '').trim()

  if (normalizedSessionId && sprlSessionsById.has(normalizedSessionId)) {
    return sprlSessionsById.get(normalizedSessionId)
  }

  if (normalizedUsername && sprlSessionsByUsername.has(normalizedUsername)) {
    return sprlSessionsByUsername.get(normalizedUsername)
  }

  if (normalizedToken && sprlSessionsByAccessToken.has(normalizedToken)) {
    return sprlSessionsByAccessToken.get(normalizedToken)
  }

  return null
}

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

    const result = await loginSPRL(String(username).trim(), String(password).trim(), { keepSession: true })

    if (result.ok && result.session) {
      const sessionId = randomUUID()
      storeSprlSession({
        ...result.session,
        username: String(username).trim(),
        sessionId,
        lastUsedAt: Date.now(),
      })

      result.sessionId = sessionId
    }

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

    return res.json({
      ...result,
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
    const { accessToken, codArea, tipoCert } = req.body || {}

    if (!accessToken) {
      return res.status(400).json({
        success: false,
        data: null,
        response: {
          codigo: '400',
          titulo: 'ERROR',
          tipo: 'E',
          mensaje: 'accessToken es requerido.',
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

    const username = String(req.body?.username || '').trim()
    const sessionId = String(req.body?.sessionId || '').trim()
    const session = getSprlSession({ sessionId, username, accessToken })
    if (!session || !session.page || session.page.isClosed()) {
      return res.status(401).json({
        success: false,
        data: null,
        response: {
          codigo: '401',
          titulo: 'ERROR',
          tipo: 'E',
          mensaje: 'Sesión SPRL no encontrada o expirada.',
        },
      })
    }

    session.lastUsedAt = Date.now()

    const catalogResult = await session.page.evaluate(async ({ url, token, area, tipo }) => {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json, text/plain, */*',
            Authorization: `Bearer ${token}`,
            Origin: 'https://sprl.sunarp.gob.pe',
            Referer: 'https://sprl.sunarp.gob.pe/',
          },
          body: JSON.stringify({ codArea: area, tipoCert: tipo }),
          credentials: 'include',
        })

        const body = await response.text()
        return {
          status: response.status,
          ok: response.ok,
          body,
        }
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : String(error),
        }
      }
    }, {
      url: SPRL_CATALOGO_URL,
      token: String(accessToken).trim(),
      area: String(codArea).trim(),
      tipo: String(tipoCert).trim(),
    })

    if (catalogResult.error) {
      return res.status(500).json({
        success: false,
        data: null,
        response: {
          codigo: '500',
          titulo: 'ERROR',
          tipo: 'E',
          mensaje: catalogResult.error,
        },
      })
    }

    console.log('[SPRL catalog Railway] Catalog response:', {
      status: catalogResult.status,
      ok: catalogResult.ok,
      bodyPreview: String(catalogResult.body || '').slice(0, 250),
    })

    let parsed = null
    try {
      parsed = JSON.parse(catalogResult.body || 'null')
    } catch {
      parsed = null
    }

    return res.status(catalogResult.status).json(parsed ?? {
      success: false,
      data: null,
      response: {
        codigo: String(catalogResult.status),
        titulo: 'ERROR',
        tipo: 'E',
        mensaje: catalogResult.body || 'Respuesta inválida del catálogo SUNARP.',
      },
    })
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
