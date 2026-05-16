import { NextRequest, NextResponse } from 'next/server'
import { isValidAccessCode, listPanelAccessLogs } from '@/lib/panel-access-log'

export const runtime = 'nodejs'

/**
 * GET /api/internal/access-logs?code=arthur2026
 * Solo para creadores: lista quién entró al panel (no visible para jurados).
 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code') || ''
  if (!isValidAccessCode(code)) {
    return NextResponse.json({ error: 'Código de creador incorrecto' }, { status: 401 })
  }

  const logs = await listPanelAccessLogs(500)
  return NextResponse.json({
    total: logs.length,
    logs,
  })
}
