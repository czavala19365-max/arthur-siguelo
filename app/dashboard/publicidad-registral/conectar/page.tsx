'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5">
      <rect x="3" y="11" width="18" height="11" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.5">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </svg>
    )
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.5">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function Spinner() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83">
        <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite" />
      </path>
    </svg>
  )
}

export default function ConectarSprlPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; password?: string }>({})

  useEffect(() => {
    if (!success) return
    const t = setTimeout(() => router.push('/dashboard/publicidad-registral'), 2000)
    return () => clearTimeout(t)
  }, [success, router])

  function validate(): boolean {
    const errs: { username?: string; password?: string } = {}
    if (!username.trim()) {
      errs.username = 'El usuario es requerido'
    } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      errs.username = 'Solo letras, números y guiones bajos'
    }
    if (!password) {
      errs.password = 'La contraseña es requerida'
    } else if (password.length < 4) {
      errs.password = 'Mínimo 4 caracteres'
    }
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!validate()) return

    setLoading(true)
    try {
      const saveRes = await fetch('/api/sprl/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      })
      const saveData = await saveRes.json()
      if (!saveRes.ok) throw new Error(saveData.error ?? 'Error al conectar')

      const verifyRes = await fetch('/api/sprl/credentials/verify', { method: 'POST' })
      const verifyData = await verifyRes.json()
      if (!verifyRes.ok || !verifyData.ok) throw new Error(verifyData.error ?? 'No se pudo iniciar sesión en SPRL')

      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al conectar')
    } finally {
      setLoading(false)
    }
  }

  const labelStyle: React.CSSProperties = {
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    color: 'var(--muted)',
    display: 'block',
    marginBottom: 8,
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--surface)',
    border: '1px solid var(--line)',
    padding: '12px 16px',
    fontFamily: 'var(--font-body)',
    fontSize: 14,
    color: 'var(--ink)',
    outline: 'none',
    boxSizing: 'border-box',
  }

  return (
    <>
      <style>{`
        .sprl-conectar-page { padding: 48px 64px; }
        @media (max-width: 768px) {
          .sprl-conectar-page { padding: 32px 20px; }
        }
        .sprl-input:focus { border-color: var(--accent) !important; }
      `}</style>

      <div
        className="sprl-conectar-page"
        style={{ background: 'var(--paper)', minHeight: '100%', color: 'var(--ink)' }}
      >
        <Link
          href="/dashboard/publicidad-registral"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--muted)',
            textDecoration: 'none',
            marginBottom: 32,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Volver
        </Link>

        <div style={{ maxWidth: 480 }}>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
              color: 'var(--accent)',
              marginBottom: 16,
            }}
          >
            Conectar cuenta
          </div>

          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(24px, 3.5vw, 34px)',
              fontWeight: 700,
              fontStyle: 'italic',
              lineHeight: 1.2,
              margin: '0 0 16px',
            }}
          >
            Ingresa tus credenciales de SUNARP SPRL
          </h1>

          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              color: 'var(--muted)',
              lineHeight: 1.65,
              margin: '0 0 32px',
            }}
          >
            Tus credenciales se almacenan cifradas en nuestros servidores. Arthur las usa únicamente
            para ejecutar trámites en tu nombre en el portal SPRL de SUNARP.
          </p>

          {success ? (
            <div
              style={{
                padding: '20px 24px',
                background: 'rgba(39, 174, 96, 0.08)',
                border: '1px solid rgba(39, 174, 96, 0.3)',
                borderLeft: '3px solid #27ae60',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 15,
                  color: 'var(--ink)',
                  marginBottom: 6,
                }}
              >
                Cuenta conectada correctamente
              </div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--muted)' }}>
                Redirigiendo al panel de Publicidad Registral...
              </div>
            </div>
          ) : (
            <form onSubmit={e => void handleSubmit(e)}>
              {error && (
                <div
                  style={{
                    padding: '14px 16px',
                    marginBottom: 24,
                    borderLeft: '3px solid #c0392b',
                    background: 'rgba(192, 57, 43, 0.06)',
                    fontFamily: 'var(--font-body)',
                    fontSize: 14,
                    color: '#c0392b',
                  }}
                >
                  {error}
                </div>
              )}

              <div style={{ marginBottom: 24 }}>
                <label style={labelStyle} htmlFor="sprl-username">
                  Usuario SPRL
                </label>
                <input
                  id="sprl-username"
                  type="text"
                  className="sprl-input"
                  style={inputStyle}
                  placeholder="Tu usuario de SUNARP SPRL"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  autoComplete="username"
                />
                {fieldErrors.username && (
                  <p style={{ margin: '6px 0 0', fontSize: 12, color: '#c0392b' }}>{fieldErrors.username}</p>
                )}
              </div>

              <div style={{ marginBottom: 32 }}>
                <label style={labelStyle} htmlFor="sprl-password">
                  Contraseña
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="sprl-password"
                    type={showPassword ? 'text' : 'password'}
                    className="sprl-input"
                    style={{ ...inputStyle, paddingRight: 48 }}
                    placeholder="Tu contraseña de SUNARP SPRL"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 4,
                      display: 'flex',
                    }}
                  >
                    <EyeIcon open={showPassword} />
                  </button>
                </div>
                {fieldErrors.password && (
                  <p style={{ margin: '6px 0 0', fontSize: 12, color: '#c0392b' }}>{fieldErrors.password}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '14px 28px',
                  background: 'var(--ink)',
                  color: 'var(--paper)',
                  border: 'none',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading && <Spinner />}
                {loading ? 'Conectando...' : 'Conectar cuenta'}
              </button>
            </form>
          )}

          <div
            style={{
              display: 'flex',
              gap: 10,
              alignItems: 'flex-start',
              marginTop: 32,
              padding: '16px 0',
              borderTop: '1px solid var(--line)',
            }}
          >
            <LockIcon />
            <p
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: 'var(--muted)',
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              Tus credenciales se almacenan cifradas con AES-256-GCM. Arthur nunca almacena tu
              contraseña en texto plano.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
