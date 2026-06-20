import { NextRequest, NextResponse } from 'next/server'
import { getAuthServerClient } from '@/lib/supabase-auth-server'
import { saveCredentials, getConnectionStatus, disconnectCredential } from '@/lib/sprl/db'

export const runtime = 'nodejs'

/** GET — obtener estado de conexión SPRL del usuario autenticado */
export async function GET() {
  try {
    const supabase = await getAuthServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const status = await getConnectionStatus(user.id)
    return NextResponse.json(status)
  } catch (err) {
    console.error('[SPRL credentials GET]', err)
    return NextResponse.json({ error: 'Error al obtener estado de conexión' }, { status: 500 })
  }
}

/** POST — guardar credenciales SUNARP cifradas */
export async function POST(req: NextRequest) {
  try {
    const supabase = await getAuthServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const body = await req.json()
    const { username, password } = body as { username?: string; password?: string }

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Se requiere usuario y contraseña de SUNARP SPRL' },
        { status: 400 },
      )
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return NextResponse.json(
        { error: 'El usuario SPRL solo puede contener letras, números y guiones bajos' },
        { status: 400 },
      )
    }

    const credId = await saveCredentials(user.id, username, password)

    return NextResponse.json({
      ok: true,
      credential_id: credId,
      message:
        'Credenciales guardadas. La verificación de login se realizará cuando se active el módulo de scraping.',
    })
  } catch (err) {
    console.error('[SPRL credentials POST]', err)
    return NextResponse.json({ error: 'Error al guardar credenciales' }, { status: 500 })
  }
}

/** DELETE — desconectar cuenta SUNARP */
export async function DELETE() {
  try {
    const supabase = await getAuthServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    await disconnectCredential(user.id)

    return NextResponse.json({ ok: true, message: 'Cuenta SUNARP desconectada' })
  } catch (err) {
    console.error('[SPRL credentials DELETE]', err)
    return NextResponse.json({ error: 'Error al desconectar cuenta' }, { status: 500 })
  }
}
