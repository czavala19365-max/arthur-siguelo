import { createClient } from '@supabase/supabase-js'
import getDb from '@/lib/db'

export interface PanelAccessLogEntry {
  id: number
  email: string
  ip: string | null
  user_agent: string | null
  created_at: string
}

export function getAccessCode(): string {
  return (process.env.ACCESS_CODE || 'arthur2026').trim()
}

export function isValidAccessCode(code: string): boolean {
  const expected = getAccessCode().toLowerCase()
  return String(code || '').trim().toLowerCase() === expected
}

function getServiceSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key =
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY_JUDICIAL ||
    process.env.SUPABASE_SERVICE_ROLE_KEY_JUDICIAL
  if (!url?.trim() || !key?.trim()) return null
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

/** Registra un acceso exitoso al panel (jurados / evaluadores). */
export async function logPanelAccess(params: {
  email: string
  ip?: string | null
  userAgent?: string | null
}): Promise<void> {
  const email = params.email.trim().toLowerCase()
  if (!email) return

  const supabase = getServiceSupabase()
  if (supabase) {
    const { error } = await supabase.from('panel_access_logs').insert({
      email,
      ip: params.ip ?? null,
      user_agent: params.userAgent ?? null,
    })
    if (!error) return
    console.error('[panel-access-log] Supabase insert failed, fallback SQLite:', error.message)
  }

  try {
    const db = getDb()
    db.prepare(
      `INSERT INTO panel_access_logs (email, ip, user_agent) VALUES (?, ?, ?)`,
    ).run(email, params.ip ?? null, params.userAgent ?? null)
  } catch (err) {
    console.error('[panel-access-log] SQLite insert failed:', err)
  }
}

/** Lista accesos recientes (solo uso interno con código de creador). */
export async function listPanelAccessLogs(limit = 300): Promise<PanelAccessLogEntry[]> {
  const cap = Math.min(Math.max(limit, 1), 1000)

  const supabase = getServiceSupabase()
  if (supabase) {
    const { data, error } = await supabase
      .from('panel_access_logs')
      .select('id, email, ip, user_agent, created_at')
      .order('created_at', { ascending: false })
      .limit(cap)
    if (!error && data) {
      return data.map(row => ({
        id: Number((row as { id: number }).id),
        email: String((row as { email: string }).email),
        ip: (row as { ip: string | null }).ip,
        user_agent: (row as { user_agent: string | null }).user_agent,
        created_at: String((row as { created_at: string }).created_at),
      }))
    }
    if (error) {
      console.error('[panel-access-log] Supabase list failed, fallback SQLite:', error.message)
    }
  }

  const db = getDb()
  const rows = db
    .prepare(
      `SELECT id, email, ip, user_agent, created_at
       FROM panel_access_logs
       ORDER BY datetime(created_at) DESC
       LIMIT ?`,
    )
    .all(cap) as PanelAccessLogEntry[]
  return rows
}
