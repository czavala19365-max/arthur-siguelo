'use strict'

const { chromium } = require('playwright-extra')
const StealthPlugin = require('puppeteer-extra-plugin-stealth')

let stealthApplied = false

function applyStealthOnce() {
  if (stealthApplied) return
  stealthApplied = true
  try {
    chromium.use(StealthPlugin())
  } catch { }
}

const SPRL_LOGIN_URL = 'https://sprl.sunarp.gob.pe/sprl/ingreso'
const SPRL_AUTH_URL = 'https://im01-autorizacion-sprl-production.apps.paas.sunarp.gob.pe/v1/sunarp-services/im/autorizacion/login'

function parseProxy(proxyUrl) {
  if (!proxyUrl) return null
  try {
    const match = proxyUrl.match(/^(https?):\/\/([^:]+):([^@]+)@([^:]+):(\d+)$/)
    if (!match) return null
    const [, protocol, rawUser, rawPass, host, port] = match
    return {
      server: `${protocol}://${host}:${port}`,
      username: decodeURIComponent(rawUser),
      password: decodeURIComponent(rawPass),
    }
  } catch (error) {
    console.error('[SPRL] parseProxy error:', error.message)
    return null
  }
}

function sprlLaunchOptions(proxy) {
  const opts = {
    headless: true,
    executablePath: process.env.CHROME_EXECUTABLE_PATH || undefined,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--ignore-certificate-errors',
    ],
  }

  if (proxy) {
    opts.proxy = {
      server: proxy.server,
      username: proxy.username,
      password: proxy.password,
    }
  }

  return opts
}

async function loginSPRL(username, password) {
  let browser = null

  try {
    applyStealthOnce()

    const proxy = parseProxy(process.env.PROXY_URL)
    console.log('[SPRL] Proxy:', proxy ? proxy.server : 'none (direct)')

    browser = await chromium.launch(sprlLaunchOptions(proxy))

    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 },
      locale: 'es-PE',
      ignoreHTTPSErrors: true,
    })

    const page = await context.newPage()
    let accessToken = null
    let refreshToken = null

    const captureTokenPayload = raw => {
      if (!raw) return
      try {
        const parsed = JSON.parse(raw)
        const candidateAccess = parsed.access_token || parsed.accessToken || parsed.token || parsed.id_token
        const candidateRefresh = parsed.refresh_token || parsed.refreshToken || null
        if (typeof candidateAccess === 'string' && candidateAccess) {
          accessToken = candidateAccess
          refreshToken = typeof candidateRefresh === 'string' ? candidateRefresh : refreshToken
        }
      } catch {
        const accessMatch = raw.match(/"access_token"\s*:\s*"([^"]+)"/i)
        if (accessMatch?.[1]) {
          accessToken = accessMatch[1]
          const refreshMatch = raw.match(/"refresh_token"\s*:\s*"([^"]+)"/i)
          refreshToken = refreshMatch?.[1] ?? refreshToken
        }
      }
    }

    page.on('response', async response => {
      try {
        const url = response.url().toLowerCase()
        const contentType = (response.headers()['content-type'] || '').toLowerCase()
        const looksLikeTokenExchange =
          url.includes('/token') ||
          url.includes('/oauth') ||
          url.includes('/administracion/token') ||
          url.includes('access_token')

        if (!looksLikeTokenExchange) return
        if (!contentType.includes('json') && !contentType.includes('text')) return

        const text = await response.text().catch(() => '')
        if (text) captureTokenPayload(text)
      } catch { }
    })

    const loadPage = async url => {
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        try {
          await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 })
          return
        } catch (error) {
          if (attempt === 3) throw error
          await page.waitForTimeout(3000)
        }
      }
    }

    console.log('[SPRL] Starting login attempt for user:', username)
    await loadPage(SPRL_LOGIN_URL)
    await page.waitForTimeout(2000)

    let usernameField = await page.$('input[name="username"], input[placeholder="Username"], input[aria-label="Username"], input[type="text"]:not([name*="captcha" i])').catch(() => null)

    if (!usernameField) {
      console.log('[SPRL] Login fields not visible — looking for INGRESAR button...')
      await Promise.all([
        page.waitForURL(new RegExp(SPRL_AUTH_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), { timeout: 15000 }).catch(() => null),
        page.locator('button:has-text("INGRESAR")').first().click({ timeout: 5000 }).catch(() => null),
      ])

      await page.waitForLoadState('domcontentloaded').catch(() => null)
      await page.waitForSelector('input[name="username"], input[placeholder="Username"], input[type="text"]', { timeout: 15000 }).catch(() => null)
      usernameField = await page.$('input[name="username"], input[placeholder="Username"], input[aria-label="Username"], input[type="text"]:not([name*="captcha" i])').catch(() => null)
    }

    if (!usernameField) {
      const bodyText = await page.evaluate(() => document.body?.textContent?.substring(0, 500) || '').catch(() => '')
      console.log('[SPRL] Could not find username field. Page text:', bodyText.replace(/\s+/g, ' ').trim().substring(0, 300))
      await page.screenshot({ path: '/tmp/sprl-login-debug.png', fullPage: true }).catch(() => { })
      return { ok: false, error: 'No se encontró el formulario de login en SPRL.' }
    }

    await usernameField.click()
    await usernameField.fill(username)

    const passwordField = await page.$('input[name="password"], input[placeholder="Password"], input[aria-label="Password"], input[type="password"]').catch(() => null)
    if (!passwordField) {
      return { ok: false, error: 'No se encontró el campo de contraseña en SPRL.' }
    }

    await passwordField.click()
    await passwordField.fill(password)

    const captchaImg = await page.$('img[id*="captcha" i], img[src*="captcha" i], img[alt*="captcha" i], #imgCaptcha, .captcha-image').catch(() => null)
    if (captchaImg && process.env.TWOCAPTCHA_API_KEY) {
      const captchaBase64 = await captchaImg.evaluate(img => {
        const image = img
        const canvas = document.createElement('canvas')
        canvas.width = image.naturalWidth || image.width
        canvas.height = image.naturalHeight || image.height
        const ctx = canvas.getContext('2d')
        if (!ctx) return ''
        ctx.drawImage(image, 0, 0)
        return canvas.toDataURL('image/png').split(',')[1]
      }).catch(() => '')

      if (captchaBase64) {
        try {
          const { Solver } = require('2captcha-ts')
          const solver = new Solver(process.env.TWOCAPTCHA_API_KEY)
          const result = await solver.imageCaptcha({ body: captchaBase64, numeric: 0, minLen: 4, maxLen: 6 })
          const captchaCode = result?.data || ''
          if (captchaCode) {
            const captchaInput = await page.$('input[name*="captcha" i], input[id*="captcha" i]:not(img)').catch(() => null)
            if (captchaInput) {
              await captchaInput.fill(captchaCode)
            }
          }
        } catch (error) {
          console.error('[SPRL] Captcha solve error:', error instanceof Error ? error.message : String(error))
        }
      }
    }

    const navPromise = page.waitForNavigation({ waitUntil: 'load', timeout: 30000 }).catch(() => null)
    const submitClicked = await page
      .click('button[type="submit"], input[type="submit"], button:has-text("Ingresar"), button:has-text("INGRESAR"), input[value*="Ingresar" i], .btn-login, #btnLogin, #btnIngresar')
      .then(() => true)
      .catch(() => false)

    if (!submitClicked) {
      await page.evaluate(() => {
        const form = document.querySelector('form')
        if (form) form.submit()
      }).catch(() => { })
    }

    await navPromise
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => { })
    await page.waitForTimeout(3000)

    const body = await page.evaluate(() => document.body?.textContent || '').catch(() => '')
    const hasHola = body.includes('HOLA!') || body.includes('HOLA ')
    const hasSaldo = body.includes('SALDO DISPONIBLE') || body.includes('Saldo')
    const hasUsuario = body.includes('USUARIO:') || body.includes('Usuario:')
    const hasError =
      body.includes('incorrecto') ||
      body.includes('inválido') ||
      body.includes('invalido') ||
      body.includes('error') ||
      body.includes('no válido') ||
      body.includes('contraseña incorrecta') ||
      body.includes('usuario no existe') ||
      body.includes('credenciales')

    let saldo = null
    const saldoMatch = body.match(/SALDO\s*DISPONIBLE[:\s]*S\/?\s*([\d.,]+)/i) || body.match(/S\/\s*([\d.,]+)\s*Soles/i)
    if (saldoMatch) saldo = parseFloat(saldoMatch[1].replace(',', '.'))

    let displayName = null
    const holaMatch = body.match(/HOLA!?\s*([A-ZÁÉÍÓÚÑ\s]+?)(?:\n|USUARIO|SALDO)/i)
    if (holaMatch) displayName = holaMatch[1].trim()

    let displayUsername = null
    const userMatch = body.match(/USUARIO:\s*(\S+)/i)
    if (userMatch) displayUsername = userMatch[1].trim()

    const isLoggedIn = hasHola || hasSaldo || hasUsuario
    if (hasError && !isLoggedIn) {
      return { ok: false, error: 'Credenciales SPRL incorrectas o cuenta inactiva.' }
    }

    if (!isLoggedIn) {
      return { ok: false, error: 'No se pudo confirmar el login en SPRL. Intente nuevamente.' }
    }

    return {
      ok: true,
      saldo,
      displayName: displayName || null,
      displayUsername: displayUsername || null,
      accessToken,
      refreshToken,
      tokenSource: accessToken ? 'local-playwright' : null,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[SPRL] Login error:', message)
    return { ok: false, error: 'Error al intentar login en SPRL: ' + message }
  } finally {
    if (browser) await browser.close().catch(() => { })
  }
}

module.exports = { loginSPRL }
