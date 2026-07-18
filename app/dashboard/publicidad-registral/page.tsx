'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { SprlConnectionStatus, SprlServicio } from '@/lib/sprl/types'

const PAGE_PADDING = '48px 64px'
const PAGE_PADDING_MOBILE = '32px 20px'

function GoldBullet() {
  return (
    <svg width="8" height="8" viewBox="0 0 8 8" fill="var(--accent)" style={{ flexShrink: 0, marginTop: 6 }}>
      <rect width="8" height="8" />
    </svg>
  )
}

function ServiceIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="1.5">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M16 13H8M16 17H8M10 9H8" />
    </svg>
  )
}

function VerifySpinner() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      style={{ animation: 'sprl-spin 0.8s linear infinite' }}
    >
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  )
}

function cardBorderColor(estado: 'pendiente' | 'activo' | 'error' | 'desconectado') {
  if (estado === 'activo') return '#27ae60'
  if (estado === 'error') return '#c0392b'
  return 'var(--accent)'
}

function estadoBadge(estado: 'pendiente' | 'activo' | 'error' | 'desconectado') {
  const styles: Record<string, { bg: string; color: string; label: string }> = {
    pendiente: { bg: 'rgba(201, 168, 76, 0.12)', color: '#9a7b2e', label: 'Pendiente de verificación' },
    activo: { bg: 'rgba(39, 174, 96, 0.12)', color: '#27ae60', label: 'ACTIVO' },
    error: { bg: 'rgba(192, 57, 43, 0.12)', color: '#c0392b', label: 'ERROR' },
    desconectado: { bg: 'var(--surface)', color: 'var(--muted)', label: 'Desconectado' },
  }
  const s = styles[estado] ?? styles.pendiente
  return (
    <span
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        padding: '4px 10px',
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.color}33`,
      }}
    >
      {s.label}
    </span>
  )
}

export default function PublicidadRegistralPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<SprlConnectionStatus>({ connected: false })
  const [servicios, setServicios] = useState<SprlServicio[]>([])
  const [disconnecting, setDisconnecting] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [credRes, servRes] = await Promise.all([
        fetch('/api/sprl/credentials'),
        fetch('/api/sprl/servicios'),
      ])
      if (credRes.ok) {
        setStatus((await credRes.json()) as SprlConnectionStatus)
      }
      if (servRes.ok) {
        const data = await servRes.json()
        setServicios(data.servicios ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  async function handleDisconnect() {
    setDisconnecting(true)
    try {
      const res = await fetch('/api/sprl/credentials', { method: 'DELETE' })
      if (res.ok) {
        setStatus({ connected: false })
        setDisplayName(null)
      }
    } finally {
      setDisconnecting(false)
    }
  }

  async function handleVerify() {
    setVerifying(true)
    try {
      const res = await fetch('/api/sprl/credentials/verify', { method: 'POST' })
      const data = await res.json()

      if (res.ok && data.ok) {
        if (data.displayName) setDisplayName(data.displayName)
        await loadData()
        setToast('Cuenta SPRL verificada correctamente')
      } else {
        await loadData()
      }
    } finally {
      setVerifying(false)
    }
  }

  function handleServiceClick(servicio: SprlServicio) {
    if (!servicio.activo) return
    router.push(`/dashboard/publicidad-registral/${servicio.codigo}`)
  }

  const benefits = [
    'Consulta vigencias de poder y copias literales desde SUNARP SPRL',
    'Programa solicitudes recurrentes sin volver a ingresar credenciales',
    'Historial centralizado de trámites registrales de tu estudio',
  ]

  return (
    <>
      <style>{`
        .sprl-page { padding: ${PAGE_PADDING}; }
        @media (max-width: 768px) {
          .sprl-page { padding: ${PAGE_PADDING_MOBILE}; }
        }
        .sprl-service-card:hover { border-color: var(--accent) !important; }
        @keyframes sprl-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div
        className="sprl-page"
        style={{
          background: 'var(--paper)',
          minHeight: '100%',
          color: 'var(--ink)',
        }}
      >
        {toast && (
          <div
            style={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              zIndex: 100,
              padding: '12px 20px',
              background: 'var(--paper)',
              border: '1px solid var(--accent)',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--accent)',
            }}
          >
            {toast}
          </div>
        )}

        {loading ? (
          <p style={{ fontFamily: 'var(--font-body)', color: 'var(--muted)', fontSize: 14 }}>Cargando...</p>
        ) : !status.connected ? (
          <div style={{ maxWidth: 640 }}>
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
              Publicidad Registral
            </div>
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(28px, 4vw, 42px)',
                fontWeight: 700,
                fontStyle: 'italic',
                lineHeight: 1.15,
                margin: '0 0 20px',
                color: 'var(--ink)',
              }}
            >
              Conecta tu cuenta SUNARP
            </h1>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 15,
                color: 'var(--muted)',
                lineHeight: 1.7,
                margin: '0 0 24px',
              }}
            >
              Vincula tus credenciales de SPRL para consultar servicios registrales, vigencias de poder,
              copias literales y más — todo desde Arthur, con credenciales cifradas y seguras.
            </p>
            <div
              style={{
                width: 48,
                height: 2,
                background: 'var(--accent)',
                marginBottom: 32,
                opacity: 0.6,
              }}
            />
            <Link
              href="/dashboard/publicidad-registral/conectar"
              style={{
                display: 'inline-block',
                padding: '14px 28px',
                background: 'var(--ink)',
                color: 'var(--paper)',
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                textDecoration: 'none',
                marginBottom: 40,
              }}
            >
              Conectar cuenta SUNARP
            </Link>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {benefits.map(b => (
                <li key={b} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <GoldBullet />
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--muted)', lineHeight: 1.6 }}>
                    {b}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                color: 'var(--accent)',
                marginBottom: 24,
              }}
            >
              Publicidad Registral
            </div>

            <div
              style={{
                background: 'var(--paper)',
                border: '1px solid var(--line)',
                borderLeft: `3px solid ${cardBorderColor(status.credential.estado)}`,
                padding: '24px 28px',
                marginBottom: 40,
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: 20,
              }}
            >
              <div>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: 12,
                    marginBottom: 10,
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 14,
                      letterSpacing: '0.08em',
                      color: 'var(--ink)',
                    }}
                  >
                    {status.credential.display_username ?? '****SPRL'}
                  </span>
                  {(status.credential.estado === 'pendiente' || status.credential.estado === 'error') && (
                    <button
                      type="button"
                      disabled={verifying}
                      onClick={() => void handleVerify()}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 14px',
                        background: 'var(--ink)',
                        color: 'var(--paper)',
                        border: 'none',
                        fontFamily: 'var(--font-mono)',
                        fontSize: 11,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        cursor: verifying ? 'not-allowed' : 'pointer',
                        opacity: verifying ? 0.75 : 1,
                      }}
                    >
                      {verifying ? (
                        <>
                          <VerifySpinner />
                          VERIFICANDO...
                        </>
                      ) : (
                        'VERIFICAR CUENTA'
                      )}
                    </button>
                  )}
                </div>
                {verifying && (
                  <p
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: 13,
                      color: 'var(--muted)',
                      margin: '0 0 12px',
                    }}
                  >
                    Verificando conexión con SUNARP...
                  </p>
                )}
                <div style={{ marginBottom: 12 }}>{estadoBadge(status.credential.estado)}</div>
                {displayName && (
                  <div
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 18,
                      fontWeight: 600,
                      color: 'var(--ink)',
                      marginBottom: 8,
                    }}
                  >
                    {displayName}
                  </div>
                )}
                {status.credential.saldo_disponible != null && (
                  <div
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: status.credential.estado === 'activo' ? 28 : 16,
                      fontWeight: status.credential.estado === 'activo' ? 700 : 400,
                      color: 'var(--ink)',
                      marginBottom: 6,
                    }}
                  >
                    S/ {status.credential.saldo_disponible.toFixed(2)}
                  </div>
                )}
                {status.credential.ultimo_login && (
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--muted)' }}>
                    Último login:{' '}
                    {new Date(status.credential.ultimo_login).toLocaleString('es-PE')}
                  </div>
                )}
                {status.credential.error_mensaje && (
                  <div
                    style={{
                      marginTop: 10,
                      fontFamily: 'var(--font-body)',
                      fontSize: 13,
                      color: 'var(--muted)',
                      borderLeft: '2px solid #c0392b',
                      paddingLeft: 12,
                    }}
                  >
                    {status.credential.error_mensaje}
                  </div>
                )}
              </div>
              <button
                type="button"
                disabled={disconnecting}
                onClick={() => void handleDisconnect()}
                style={{
                  padding: '10px 18px',
                  background: 'transparent',
                  border: '1px solid var(--line)',
                  color: 'var(--muted)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  cursor: disconnecting ? 'not-allowed' : 'pointer',
                }}
                onMouseOver={e => {
                  e.currentTarget.style.borderColor = '#c0392b88'
                  e.currentTarget.style.color = '#c0392b'
                }}
                onMouseOut={e => {
                  e.currentTarget.style.borderColor = 'var(--line)'
                  e.currentTarget.style.color = 'var(--muted)'
                }}
              >
                {disconnecting ? 'Desconectando...' : 'Desconectar'}
              </button>
            </div>

            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 22,
                fontWeight: 600,
                margin: '0 0 24px',
                color: 'var(--ink)',
              }}
            >
              Servicios disponibles
            </h2>

            {servicios.length === 0 ? (
              <p style={{ color: 'var(--muted)', fontSize: 14 }}>No hay servicios en el catálogo.</p>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: 20,
                }}
              >
                {servicios.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    className={s.activo ? 'sprl-service-card' : undefined}
                    onClick={() => handleServiceClick(s)}
                    style={{
                      textAlign: 'left',
                      background: 'var(--paper)',
                      border: '1px solid var(--line)',
                      padding: '24px',
                      cursor: 'pointer',
                      opacity: s.activo ? 1 : 0.6,
                      transition: 'border-color 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                      <ServiceIcon />
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: 10,
                          textTransform: 'uppercase',
                          letterSpacing: '0.1em',
                          color: s.activo ? 'var(--accent)' : 'var(--muted)',
                        }}
                      >
                        {s.activo ? 'Disponible' : 'Próximamente'}
                      </span>
                    </div>
                    <div
                      style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: 16,
                        fontWeight: 600,
                        color: 'var(--ink)',
                        marginBottom: 8,
                      }}
                    >
                      {s.nombre}
                    </div>
                    {s.descripcion && (
                      <p
                        style={{
                          fontFamily: 'var(--font-body)',
                          fontSize: 13,
                          color: 'var(--muted)',
                          lineHeight: 1.55,
                          margin: '0 0 12px',
                        }}
                      >
                        {s.descripcion}
                      </p>
                    )}
                    {s.costo_aproximado != null && (
                      <div
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: 11,
                          color: 'var(--ink)',
                          letterSpacing: '0.04em',
                        }}
                      >
                        ~ S/ {s.costo_aproximado.toFixed(2)}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
