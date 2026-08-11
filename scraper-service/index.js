'use strict'

const express = require('express')
const { scrapeCEJ } = require('./cej-scraper')

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
      return res.status(400).json({ ok: false, error: 'username y password son requeridos' })
    }
    const result = await loginSPRL(String(username).trim(), String(password).trim())
    res.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[scraper-service] POST /sprl/login', message)
    res.status(500).json({ ok: false, error: 'Error al ejecutar login SPRL', details: message })
  }
})

app.get('/sprl/health', (_req, res) => {
  res.json({ status: 'ok', module: 'sprl' })
})

const PORT = Number(process.env.PORT) || 3001
app.listen(PORT, () => {
  console.log(`[cej-scraper-service] listening on :${PORT}`)
})
