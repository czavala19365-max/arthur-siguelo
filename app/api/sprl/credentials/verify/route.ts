import { NextResponse } from 'next/server'
import { getAuthServerClient } from '@/lib/supabase-auth-server'
import { getDecryptedCredentials, getCredentialByUserId, updateCredentialStatus } from '@/lib/sprl/db'

export const runtime = 'nodejs'

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

    const scraperUrl = process.env.SCRAPER_SERVICE_URL
    if (!scraperUrl) {
      return NextResponse.json(
        { error: 'SCRAPER_SERVICE_URL no configurado' },
        { status: 500 },
      )
    }

    console.log('[SPRL verify] Calling scraper login for user:', user.id)

    const response = await fetch(`${scraperUrl}/sprl/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: creds.username,
        password: creds.password,
      }),
    })

    const result = await response.json()

    if (result.ok) {
      await updateCredentialStatus(credRecord.id, 'activo', {
        saldo_disponible: result.saldo ?? undefined,
        error_mensaje: null,
        ultimo_login: new Date().toISOString(),
      })

      return NextResponse.json({
        ok: true,
        saldo: result.saldo,
        displayName: result.displayName,
        displayUsername: result.displayUsername,
        message: 'Login SPRL verificado correctamente.',
      })
    }

    await updateCredentialStatus(credRecord.id, 'error', {
      error_mensaje: result.error || 'Error desconocido al verificar login',
    })

    return NextResponse.json({
      ok: false,
      error: result.error || 'No se pudo verificar el login en SPRL.',
    })
  } catch (err) {
    console.error('[SPRL verify]', err)
    return NextResponse.json(
      { error: 'Error al verificar credenciales SPRL' },
      { status: 500 },
    )
  }
}
