import { NextResponse } from 'next/server'
import { chromium } from 'playwright-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import { getAuthServerClient } from '@/lib/supabase-auth-server'
import { getDecryptedCredentials, getCredentialByUserId, updateCredentialStatus } from '@/lib/sprl/db'

export const runtime = 'nodejs'

let stealthApplied = false

function applyStealthOnce() {
  if (stealthApplied) return
  stealthApplied = true
  try {
    chromium.use(StealthPlugin())
  } catch {
    // If stealth cannot be attached, continue with plain Chromium.
  }
}

function getProxyConfig() {
  const proxyUrl = process.env.PROXY_URL
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
  } catch {
    return null
  }
}

function getChromeExecutablePath() {
  const chromePath = process.env.CHROME_EXECUTABLE_PATH?.trim()
  return chromePath ? chromePath : undefined
}

async function loginSprlLocal(username: string, password: string) {
  applyStealthOnce()

  const proxy = getProxyConfig()
  const browser = await chromium.launch({
    headless: true,
    executablePath: getChromeExecutablePath(),
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--ignore-certificate-errors',
    ],
    ...(proxy ? { proxy } : {}),
  })

  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
    locale: 'es-PE',
    ignoreHTTPSErrors: true,
  })

  const page = await context.newPage()
  const loginUrl = 'https://sprl.sunarp.gob.pe/sprl/ingreso'
  const authLoginUrl = 'https://im01-autorizacion-sprl-production.apps.paas.sunarp.gob.pe/v1/sunarp-services/im/autorizacion/login'
  let accessToken: string | null = null
  let refreshToken: string | null = null

  const captureTokenPayload = (raw: string) => {
    if (!raw) return
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>
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
    } catch {
      // Ignore capture errors.
    }
  })

  try {
    let navSuccess = false
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        await page.goto(loginUrl, { waitUntil: 'domcontentloaded', timeout: 45000 })
        navSuccess = true
        break
      } catch (error) {
        if (attempt === 3) throw error
        await page.waitForTimeout(3000)
      }
    }

    if (!navSuccess) throw new Error('No se pudo cargar la página de SPRL')

    await page.waitForTimeout(2000)

    let usernameField = await page.$('input[name="username"], input[placeholder="Username"], input[aria-label="Username"], input[name*="user" i], input[id*="user" i], input[type="text"]:not([name*="captcha" i])').catch(() => null)

    if (!usernameField) {
      const ingresarButton = page.locator('button:has-text("INGRESAR")').first()
      await Promise.all([
        page.waitForURL(new RegExp(authLoginUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), { timeout: 15000 }).catch(() => null),
        ingresarButton.click({ timeout: 5000 }).catch(() => null),
      ])

      await page.waitForLoadState('domcontentloaded').catch(() => null)
      await page.waitForSelector('input[name="username"], input[placeholder="Username"], input[type="text"]', { timeout: 15000 }).catch(() => null)
      usernameField = await page.$('input[name="username"], input[placeholder="Username"], input[aria-label="Username"], input[name*="user" i], input[id*="user" i], input[type="text"]:not([name*="captcha" i])').catch(() => null)
    }

    if (!usernameField) {
      throw new Error('No se encontró el formulario de login en SPRL.')
    }

    await usernameField.click()
    await usernameField.fill(username)

    const passwordField = await page.$('input[name="password"], input[placeholder="Password"], input[aria-label="Password"], input[type="password"]').catch(() => null)
    if (!passwordField) {
      throw new Error('No se encontró el campo de contraseña en SPRL.')
    }

    await passwordField.click()
    await passwordField.fill(password)

    const captchaImg = await page.$('img[id*="captcha" i], img[src*="captcha" i], img[alt*="captcha" i], #imgCaptcha, .captcha-image').catch(() => null)
    if (captchaImg && process.env.TWOCAPTCHA_API_KEY) {
      const captchaBase64 = await captchaImg.evaluate(img => {
        const image = img as HTMLImageElement
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
        } catch {
          // If captcha solving fails, continue and let SPRL respond.
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

    if (!accessToken) {
      const storageTokens = await page.evaluate(() => {
        const result = { accessToken: null as string | null, refreshToken: null as string | null }
        const scan = (storage: Storage) => {
          for (let index = 0; index < storage.length; index += 1) {
            const key = storage.key(index) || ''
            const value = storage.getItem(key) || ''
            const lowered = key.toLowerCase()
            if (lowered.includes('access_token') || lowered === 'token' || lowered.includes('auth')) {
              try {
                const parsed = JSON.parse(value) as Record<string, unknown>
                const candidate = parsed.access_token || parsed.accessToken || parsed.token
                const refresh = parsed.refresh_token || parsed.refreshToken
                if (typeof candidate === 'string' && candidate) {
                  result.accessToken = candidate
                  if (typeof refresh === 'string' && refresh) result.refreshToken = refresh
                }
              } catch {
                if (value && value.length > 20) result.accessToken = value
              }
            }
          }
        }

        scan(window.localStorage)
        if (!result.accessToken) scan(window.sessionStorage)
        return result
      }).catch(() => ({ accessToken: null, refreshToken: null }))

      if (storageTokens.accessToken) {
        accessToken = storageTokens.accessToken
        refreshToken = storageTokens.refreshToken || refreshToken
      }
    }

    if (!accessToken) {
      const cookieToken = await context
        .cookies()
        .then(cookies => cookies.find(cookie => /token|auth/i.test(cookie.name) && cookie.value)?.value || null)
        .catch(() => null)

      if (cookieToken) accessToken = cookieToken
    }

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
      throw new Error('Credenciales SPRL incorrectas o cuenta inactiva.')
    }

    if (!isLoggedIn) {
      throw new Error('No se pudo confirmar el login en SPRL. Intente nuevamente.')
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
  } finally {
    await browser.close().catch(() => { })
  }
}

export async function POST() {
  try {
    const supabase = await getAuthServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const creds = await getDecryptedCredentials(user.id)
    if (!creds) {
      return NextResponse.json(
        { error: 'No hay credenciales SPRL guardadas. Conecta tu cuenta primero.' },
        { status: 404 },
      )
    }

    const credRecord = await getCredentialByUserId(user.id)
    if (!credRecord) {
      return NextResponse.json({ error: 'Registro de credenciales no encontrado' }, { status: 404 })
    }

    let result: {
      ok: boolean
      saldo?: number | null
      displayName?: string | null
      displayUsername?: string | null
      accessToken?: string | null
      refreshToken?: string | null
      error?: string
    }

    try {
      console.log('[SPRL verify] Running local Playwright login for user:', user.id)
      result = await loginSprlLocal(creds.username, creds.password)
    } catch (localError) {
      const localMessage = localError instanceof Error ? localError.message : String(localError)
      console.error('[SPRL verify] Local login failed:', localMessage)

      const scraperUrl = process.env.SCRAPER_SERVICE_URL
      if (!scraperUrl || /localhost:3001/.test(scraperUrl)) {
        return NextResponse.json({ error: `Error al intentar login en SPRL: ${localMessage}` }, { status: 500 })
      }

      console.log('[SPRL verify] Falling back to scraper service:', scraperUrl)
      const response = await fetch(`${scraperUrl}/sprl/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: creds.username,
          password: creds.password,
        }),
      })

      result = await response.json()
    }

    const loginResponse = NextResponse.json(
      result.ok
        ? {
          ok: true,
          saldo: result.saldo,
          displayName: result.displayName,
          displayUsername: result.displayUsername,
          message: 'Login SPRL verificado correctamente.',
        }
        : {
          ok: false,
          error: result.error || 'No se pudo verificar el login en SPRL.',
        },
    )

    const secureCookie = process.env.NODE_ENV === 'production'

    if (result.ok) {
      if (result.accessToken) {
        loginResponse.cookies.set('sprl_access_token', result.accessToken, {
          httpOnly: true,
          sameSite: 'lax',
          secure: secureCookie,
          path: '/',
          maxAge: 60 * 60 * 8,
        })
      }

      if (result.refreshToken) {
        loginResponse.cookies.set('sprl_refresh_token', result.refreshToken, {
          httpOnly: true,
          sameSite: 'lax',
          secure: secureCookie,
          path: '/',
          maxAge: 60 * 60 * 24 * 7,
        })
      }

      await updateCredentialStatus(credRecord.id, 'activo', {
        saldo_disponible: result.saldo ?? undefined,
        error_mensaje: null,
        ultimo_login: new Date().toISOString(),
      })

      return loginResponse
    }

    await updateCredentialStatus(credRecord.id, 'error', {
      error_mensaje: result.error || 'Error desconocido al verificar login',
    })

    loginResponse.cookies.delete('sprl_access_token')
    loginResponse.cookies.delete('sprl_refresh_token')

    return loginResponse
  } catch (err) {
    console.error('[SPRL verify]', err)
    return NextResponse.json(
      { error: 'Error al verificar credenciales SPRL' },
      { status: 500 },
    )
  }
}
