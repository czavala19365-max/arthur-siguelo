'use client'

import { useState } from 'react'

interface LogRow {
  id: number
  email: string
  ip: string | null
  user_agent: string | null
  created_at: string
}

const accent = '#c2a46d'
const ink = '#141414'
const muted = '#525252'

export default function RegistroAccesosPage() {
  const [code, setCode] = useState('')
  const [unlocked, setUnlocked] = useState(false)
  const [logs, setLogs] = useState<LogRow[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function load() {
    setError('')
    setLoading(true)
    try {
      const res = await fetch(
        `/api/internal/access-logs?code=${encodeURIComponent(code.trim())}`,
      )
      const data = (await res.json()) as { logs?: LogRow[]; error?: string }
      if (!res.ok) {
        setError(data.error || 'Código incorrecto')
        setUnlocked(false)
        return
      }
      setLogs(data.logs || [])
      setUnlocked(true)
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0b0b0b',
        color: '#f5f5f5',
        padding: '48px 24px',
        fontFamily: 'var(--font-body), system-ui, sans-serif',
      }}
    >
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
            color: accent,
            marginBottom: 8,
          }}
        >
          Uso interno · no compartir con jurados
        </div>
        <h1
          style={{
            fontFamily: 'var(--font-display), Georgia, serif',
            fontSize: 32,
            fontWeight: 400,
            marginBottom: 8,
          }}
        >
          Registro de accesos
        </h1>
        <p style={{ color: muted, fontSize: 14, marginBottom: 28, maxWidth: 560 }}>
          Quién entró al panel del concurso (correo, fecha e IP). Introduce el código de creador.
        </p>

        {!unlocked ? (
          <div
            style={{
              background: '#141414',
              border: '1px solid rgba(194,164,109,0.35)',
              padding: 24,
              maxWidth: 400,
            }}
          >
            <label
              style={{
                display: 'block',
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                textTransform: 'uppercase',
                color: muted,
                marginBottom: 8,
              }}
            >
              Código de creador
            </label>
            <input
              type="password"
              value={code}
              onChange={e => setCode(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') void load()
              }}
              style={{
                width: '100%',
                padding: '12px 14px',
                background: '#1a1a1a',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#fff',
                marginBottom: 12,
                boxSizing: 'border-box',
              }}
            />
            {error && (
              <p style={{ color: '#f87171', fontSize: 13, marginBottom: 12 }}>{error}</p>
            )}
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading || !code.trim()}
              style={{
                width: '100%',
                padding: 14,
                background: accent,
                border: 'none',
                color: ink,
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                textTransform: 'uppercase',
                fontWeight: 600,
                cursor: loading ? 'wait' : 'pointer',
              }}
            >
              {loading ? 'Cargando...' : 'Ver registro'}
            </button>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 20, display: 'flex', gap: 12, alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: muted }}>
                {logs.length} accesos registrados
              </span>
              <button
                type="button"
                onClick={() => void load()}
                style={{
                  padding: '8px 14px',
                  background: 'transparent',
                  border: `1px solid ${accent}`,
                  color: accent,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                }}
              >
                Actualizar
              </button>
            </div>

            <div style={{ overflowX: 'auto', border: '1px solid rgba(255,255,255,0.1)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#1a1a1a', textAlign: 'left' }}>
                    <th style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)', fontSize: 10 }}>Fecha</th>
                    <th style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)', fontSize: 10 }}>Correo</th>
                    <th style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)', fontSize: 10 }}>IP</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={3} style={{ padding: 24, color: muted }}>
                        Aún no hay accesos registrados.
                      </td>
                    </tr>
                  ) : (
                    logs.map(row => (
                      <tr key={row.id} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                          {new Date(row.created_at).toLocaleString('es-PE')}
                        </td>
                        <td style={{ padding: '12px 14px' }}>{row.email}</td>
                        <td style={{ padding: '12px 14px', color: muted }}>{row.ip || '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
