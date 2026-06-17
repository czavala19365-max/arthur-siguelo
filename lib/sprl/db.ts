import { getSprlSupabase } from './supabase-sprl'
import { encrypt, decrypt } from './encryption'
import type {
  SprlCredential,
  SprlServicio,
  SprlConnectionStatus,
  EncryptedField,
} from './types'

// ─── CREDENTIALS ────────────────────────────────────────

export async function getCredentialByUserId(userId: string): Promise<SprlCredential | null> {
  const sb = getSprlSupabase()
  const { data, error } = await sb
    .from('sprl_credentials')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error && error.code !== 'PGRST116') throw new Error(error.message)
  return data as SprlCredential | null
}

export async function getConnectionStatus(userId: string): Promise<SprlConnectionStatus> {
  const cred = await getCredentialByUserId(userId)
  if (!cred || cred.estado === 'desconectado') return { connected: false }

  return {
    connected: true,
    credential: {
      id: cred.id,
      display_username: cred.display_username,
      saldo_disponible: cred.saldo_disponible,
      estado: cred.estado,
      ultimo_login: cred.ultimo_login,
      error_mensaje: cred.error_mensaje,
    },
  }
}

export async function saveCredentials(
  userId: string,
  username: string,
  password: string,
): Promise<string> {
  const sb = getSprlSupabase()

  const usernameEnc = encrypt(username)
  const passwordEnc = encrypt(password)

  const displayUsername =
    username.length > 4 ? '****' + username.slice(-4).toUpperCase() : username.toUpperCase()

  const { data, error } = await sb
    .from('sprl_credentials')
    .upsert(
      {
        user_id: userId,
        username_enc: usernameEnc,
        password_enc: passwordEnc,
        display_username: displayUsername,
        estado: 'pendiente',
        error_mensaje: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  return data.id as string
}

export async function getDecryptedCredentials(
  userId: string,
): Promise<{ username: string; password: string } | null> {
  const cred = await getCredentialByUserId(userId)
  if (!cred) return null

  return {
    username: decrypt(cred.username_enc as EncryptedField),
    password: decrypt(cred.password_enc as EncryptedField),
  }
}

export async function updateCredentialStatus(
  credentialId: string,
  estado: SprlCredential['estado'],
  extra?: { saldo_disponible?: number; error_mensaje?: string | null; ultimo_login?: string },
): Promise<void> {
  const sb = getSprlSupabase()
  const updates: Record<string, unknown> = {
    estado,
    updated_at: new Date().toISOString(),
  }
  if (extra?.saldo_disponible !== undefined) updates.saldo_disponible = extra.saldo_disponible
  if (extra?.error_mensaje !== undefined) updates.error_mensaje = extra.error_mensaje
  if (extra?.ultimo_login !== undefined) updates.ultimo_login = extra.ultimo_login

  const { error } = await sb.from('sprl_credentials').update(updates).eq('id', credentialId)
  if (error) throw new Error(error.message)
}

export async function disconnectCredential(userId: string): Promise<void> {
  const sb = getSprlSupabase()
  const { error } = await sb
    .from('sprl_credentials')
    .update({ estado: 'desconectado', updated_at: new Date().toISOString() })
    .eq('user_id', userId)
  if (error) throw new Error(error.message)
}

// ─── SERVICIOS ──────────────────────────────────────────

export async function getServiciosActivos(): Promise<SprlServicio[]> {
  const sb = getSprlSupabase()
  const { data, error } = await sb
    .from('sprl_servicios')
    .select('*')
    .eq('activo', true)
    .order('orden', { ascending: true })

  if (error) throw new Error(error.message)
  return (data as SprlServicio[]) ?? []
}

export async function getAllServicios(): Promise<SprlServicio[]> {
  const sb = getSprlSupabase()
  const { data, error } = await sb
    .from('sprl_servicios')
    .select('*')
    .order('orden', { ascending: true })

  if (error) throw new Error(error.message)
  return (data as SprlServicio[]) ?? []
}
