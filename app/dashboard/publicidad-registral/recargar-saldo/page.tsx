'use client'

import { useState } from 'react'
import Link from 'next/link'
import VisaGatewayView, { type VisaGatewayFieldErrors } from '@/components/publicidad-registral/VisaGatewayView'

const PAGE_PADDING = '48px 64px'
const PAGE_PADDING_MOBILE = '32px 20px'

const styles = {
  page: {
    background: 'var(--paper)',
    minHeight: '100%',
    color: 'var(--ink)',
  },
  shell: {
    background: 'var(--paper)',
    border: '1px solid var(--line)',
    borderRadius: 12,
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.04)',
    padding: '24px 24px 28px',
  },
  topLabel: {
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.15em',
    color: 'var(--accent)',
    marginBottom: 12,
  },
  title: {
    margin: '0 0 18px',
    fontFamily: 'var(--font-display)',
    fontSize: 'clamp(24px, 3.4vw, 36px)',
    fontStyle: 'italic',
    lineHeight: 1.12,
    color: 'var(--ink)',
  },
  banner: {
    background: '#efefef',
    border: '1px solid #dddddd',
    borderRadius: 10,
    padding: '20px 18px 18px',
    marginTop: 20,
  },
  bannerTitle: {
    margin: '0 0 14px',
    fontFamily: 'var(--font-body)',
    fontSize: 28,
    fontWeight: 700,
    color: 'var(--ink)',
  },
  inputRow: {
    marginTop: 20,
    display: 'grid',
    gridTemplateColumns: '170px minmax(220px, 280px)',
    gap: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputLabel: {
    fontFamily: 'var(--font-body)',
    fontSize: 16,
    color: 'var(--ink)',
    textAlign: 'right' as const,
  },
  input: {
    width: '100%',
    height: 34,
    border: '1px solid #d9d9d9',
    background: '#fff',
    outline: 'none',
    padding: '0 12px',
    fontFamily: 'var(--font-body)',
    fontSize: 14,
    color: 'var(--ink)',
    boxSizing: 'border-box' as const,
  },
  buttonRow: {
    marginTop: 14,
    display: 'flex',
    justifyContent: 'center',
  },
  continueButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    minWidth: 122,
    height: 34,
    padding: '0 18px',
    border: 'none',
    borderRadius: 2,
    background: '#95c11f',
    color: '#fff',
    fontFamily: 'var(--font-body)',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    textDecoration: 'none',
  },
  footerNote: {
    marginTop: 18,
    background: '#f4f5f7',
    border: '1px solid #e2e5e9',
    borderRadius: 12,
    padding: '16px 18px',
    fontFamily: 'var(--font-body)',
    fontSize: 15,
    lineHeight: 1.7,
    color: 'var(--ink)',
  },
  backLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    fontFamily: 'var(--font-mono)',
    fontSize: 12,
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    textDecoration: 'none',
    color: 'var(--muted)',
  },
  errorBox: {
    marginTop: 16,
    background: 'rgba(192, 57, 43, 0.08)',
    border: '1px solid rgba(192, 57, 43, 0.35)',
    color: '#9d1f11',
    borderRadius: 10,
    padding: '14px 16px',
    fontFamily: 'var(--font-body)',
    fontSize: 14,
    lineHeight: 1.5,
  },
  loadingBox: {
    marginTop: 16,
    padding: '14px 16px',
    border: '1px solid var(--line)',
    background: 'var(--surface)',
    borderRadius: 10,
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    color: 'var(--muted)',
  },
} as const

type CheckMontoResponse = {
  ok?: boolean
  error?: string
  data?: {
    purchase?: string
    monto?: string
  }
  upstream?: {
    code?: string
    title?: string
    description?: string
  }
}

function normalizeMonto(value: string) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return ''
  if (Number.isInteger(parsed)) return String(parsed)
  return parsed.toFixed(2)
}

function loadVisaSDK() {
  return new Promise<void>((resolve, reject) => {
    if (typeof window !== 'undefined' && (window as Window & { VisanetCheckout?: unknown }).VisanetCheckout) {
      resolve()
      return
    }

    const script = document.createElement('script')
    script.src = 'https://static-content.vnforapps.com/v2/js/checkout.js'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('No se pudo cargar VisaNet SDK'))
    document.body.appendChild(script)
  })
}

export default function RecargarSaldoPage() {
  const [monto, setMonto] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [purchaseCode, setPurchaseCode] = useState('')
  const [gatewayFieldErrors, setGatewayFieldErrors] = useState<VisaGatewayFieldErrors>({
    nombre: false,
    apellido: false,
    email: false,
  })
  const [titularNombre, setTitularNombre] = useState('')
  const [titularApellido, setTitularApellido] = useState('')
  const [titularEmail, setTitularEmail] = useState('')
  const [gatewayLoading, setGatewayLoading] = useState(false)
  const [gatewayError, setGatewayError] = useState('')
  const [showGateway, setShowGateway] = useState(false)
  const [ipClient, setIpClient] = useState('')
  const [sessionExtendId, setSessionExtendId] = useState('')

  async function handleCheckMonto() {
    const normalizedMonto = normalizeMonto(monto)
    if (!normalizedMonto) {
      setError('Ingresa un monto válido mayor a cero.')
      return
    }

    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/sprl/publicidad-registral/payment/check-monto-recarga', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monto: normalizedMonto }),
      })

      const data = await response.json().catch(() => ({})) as CheckMontoResponse

      if (!response.ok || !data.ok || !data.data?.purchase) {
        throw new Error(data.error || data.upstream?.description || data.upstream?.title || 'No se pudo validar el monto.')
      }

      setPurchaseCode(data.data.purchase)
      setTitularNombre('')
      setTitularApellido('')
      setTitularEmail('')
      setGatewayFieldErrors({ nombre: false, apellido: false, email: false })
      setGatewayError('')
      setShowGateway(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo validar el monto.')
    } finally {
      setLoading(false)
    }
  }

  async function handleGatewayContinue() {
    const nextErrors: VisaGatewayFieldErrors = {
      nombre: !titularNombre.trim(),
      apellido: !titularApellido.trim(),
      email: !titularEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(titularEmail.trim()),
    }
    setGatewayFieldErrors(nextErrors)

    if (Object.values(nextErrors).some(Boolean)) return

    setGatewayError('')
    setGatewayLoading(true)

    try {
      const ipResponse = await fetch('https://api.ipify.org/?format=json', {
        method: 'GET',
        cache: 'no-store',
      })
      const ipData = await ipResponse.json().catch(() => ({})) as { ip?: string }
      setIpClient(String(ipData.ip || '').trim())

      const response = await fetch('/api/sprl/publicidad-registral/payment/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'visa_mastercard',
          action: 'continue-preview',
          nombre: titularNombre,
          apellido: titularApellido,
          email: titularEmail,
          purchase: purchaseCode,
          importe: normalizeMonto(monto),
          ipClient: String(ipData.ip || '').trim(),
        }),
      })

      const data = await response.json().catch(() => ({})) as {
        ok?: boolean
        error?: string
        data?: {
          extendSessionId?: string
          configuration?: unknown
        }
      }

      if (!response.ok || !data.ok || !data.data?.configuration) {
        throw new Error(data.error || 'No se pudo preparar la pasarela.')
      }

      setSessionExtendId(String(data.data.extendSessionId || '').trim())

      await loadVisaSDK()

      const sdk = window as Window & {
        VisanetCheckout?: {
          configure: (configuration: unknown) => void
          open: () => void
        }
      }

      if (!sdk.VisanetCheckout) {
        throw new Error('No se pudo cargar VisaNet SDK')
      }

      sdk.VisanetCheckout.configure(data.data.configuration)
      sdk.VisanetCheckout.open()
    } catch (err) {
      setGatewayError(err instanceof Error ? err.message : 'No se pudo preparar la pasarela.')
    } finally {
      setGatewayLoading(false)
    }
  }

  if (showGateway) {
    return (
      <VisaGatewayView
        purchaseCode={purchaseCode}
        monto={normalizeMonto(monto) || monto}
        titularNombre={titularNombre}
        titularApellido={titularApellido}
        titularEmail={titularEmail}
        ipClient={ipClient}
        sessionExtendId={sessionExtendId}
        continueLoading={gatewayLoading}
        payError={gatewayError}
        fieldErrors={gatewayFieldErrors}
        onNombreChange={value => {
          setTitularNombre(value)
          if (value.trim()) setGatewayFieldErrors(current => ({ ...current, nombre: false }))
        }}
        onApellidoChange={value => {
          setTitularApellido(value)
          if (value.trim()) setGatewayFieldErrors(current => ({ ...current, apellido: false }))
        }}
        onEmailChange={value => {
          setTitularEmail(value)
          if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) setGatewayFieldErrors(current => ({ ...current, email: false }))
        }}
        onContinue={() => void handleGatewayContinue()}
        onBack={() => setShowGateway(false)}
        backLabel="Volver al monto"
        headerLabel="PASARELA ELECTRONICA DE PAGOS"
      />
    )
  }

  return (
    <>
      <style>{`\n        .sprl-recharge-page { padding: ${PAGE_PADDING}; }\n        @media (max-width: 768px) {\n          .sprl-recharge-page { padding: ${PAGE_PADDING_MOBILE}; }\n          .sprl-recharge-selector { grid-template-columns: 1fr !important; }\n          .sprl-recharge-input-row { grid-template-columns: 1fr !important; }\n          .sprl-recharge-input-label { text-align: left !important; }\n          .sprl-recharge-method-col { gap: 14px; }\n        }\n      `}</style>

      <div className="sprl-recharge-page" style={styles.page}>
        <div style={styles.shell}>
          <Link href="/dashboard/publicidad-registral" style={styles.backLink}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Volver
          </Link>

          <div style={styles.topLabel}>Publicidad Registral</div>
          <h1 style={styles.title}>Prepagar / Recargar saldo</h1>

          <div className="sprl-recharge-selector" style={styles.banner}>
            <h2 style={styles.bannerTitle}>Recargar saldo</h2>

            <div className="sprl-recharge-input-row" style={styles.inputRow}>
              <div className="sprl-recharge-input-label" style={styles.inputLabel}>Monto *:</div>
              <input
                className="sprl-recharge-input"
                style={styles.input}
                placeholder="Escriba aquí..."
                inputMode="decimal"
                value={monto}
                onChange={event => {
                  setMonto(event.target.value)
                  if (error) setError('')
                }}
              />
            </div>

            <div style={styles.buttonRow}>
              <button type="button" style={styles.continueButton} onClick={() => void handleCheckMonto()} disabled={loading}>
                {loading ? 'Validando...' : '→ Continuar'}
              </button>
            </div>

            {error ? <div style={styles.errorBox}>{error}</div> : null}
            {loading ? <div style={styles.loadingBox}>Validando monto con SUNARP...</div> : null}

            <div style={styles.footerNote}>
              Para realizar correctamente el pago, por favor verificar el bloqueo de ventanas emergentes de su navegador.
              <br />
              Para mayor seguridad, adicione una contraseña personal al pago de nuestro servicio y evite el uso no autorizado de su tarjeta. Afilié su tarjeta a Verified by Visa.
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
