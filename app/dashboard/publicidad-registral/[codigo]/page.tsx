'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

type ServiceCode = 'vigencia_poder' | 'copia_literal'

type Option = {
  value: string
  label: string
}

type ServicePageConfig = {
  eyebrow: string
  title: string
  intro?: string
  primaryLabel: string
  primaryPlaceholder: string
  primaryOptions: Option[]
  secondaryLabel: string
  secondaryPlaceholder: string
  secondaryOptions: Option[]
  checkboxLabel?: string
  noteTitle?: string
  noteBullets: string[]
  secondaryNoteBullets?: string[]
  callout?: string
}

const commonRegistryOptions: Option[] = [
  { value: '', label: 'Seleccione tipo de Registro Jurídico' },
  { value: 'personas-juridicas', label: 'Registro de Personas Jurídicas' },
  { value: 'mandatos-poderes', label: 'Registro de Mandatos y Poderes' },
  { value: 'predios', label: 'Registro de Predios' },
  { value: 'bienes-muebles', label: 'Registro de Bienes Muebles' },
]

const serviceOptionsByCode: Record<ServiceCode, ServicePageConfig> = {
  vigencia_poder: {
    eyebrow: 'Publicidad Registral',
    title: 'Solicitar publicidad certificada (vigencias, CRI, etc)',
    intro:
      'Selecciona el registro jurídico y el tipo de servicio para continuar con la solicitud de vigencia o certificación registral.',
    primaryLabel: 'Registro Jurídico *:',
    primaryPlaceholder: 'Seleccione tipo de Registro Jurídico',
    primaryOptions: commonRegistryOptions,
    secondaryLabel: 'Tipo de Servicio:',
    secondaryPlaceholder: 'Seleccione una opción',
    secondaryOptions: [
      { value: '', label: 'Seleccione una opción' },
      { value: 'vigencia-poder', label: 'Vigencia de Poder' },
      { value: 'cri', label: 'CRI' },
      { value: 'certificado-busqueda', label: 'Búsqueda de Índice' },
    ],
    noteTitle: undefined,
    noteBullets: [
      'El certificado literal de la partida con firma electrónica se emite en un plazo máximo de tres (03) días hábiles, el cual es enviado a su cuenta del Servicio de Publicidad Registral en Línea (SPRL), y al correo electrónico consignado al momento de la suscripción de dicho servicio.',
      'El certificado con firma electrónica tiene el mismo valor y eficacia jurídica que el certificado con firma manuscrita, su contenido podrá ser verificado y visualizado a través de nuestro portal institucional.',
      'El certificado con firma electrónica a través del SPRL es válido para su uso dentro del territorio nacional. Si desea un certificado para uso en el extranjero, adicionalmente deberá de solicitar la autenticación de firma ante el funcionario autorizado por Sunarp para tal efecto conforme al procedimiento establecido por el Ministerio de Relaciones Exteriores.',
      'Estimado Usuario/a: si el certificado registral vehicular lo necesita para ser presentado en el extranjero que, entre otros, requiera previamente de la autenticación de firma, agradecemos pueda solicitarlo a través de nuestro App-Sunarp o de forma presencial en cualquiera de nuestras Oficinas Registrales.',
    ],
    callout:
      'Este flujo queda listo para conectar la lógica de solicitud de vigencia y certificados afines.',
  },
  copia_literal: {
    eyebrow: 'Elija un servicio',
    title: 'Copia literal de partida',
    intro: undefined,
    primaryLabel: 'Registro Jurídico *:',
    primaryPlaceholder: 'Seleccione tipo de Registro Jurídico',
    primaryOptions: commonRegistryOptions,
    secondaryLabel: 'Tipo de Servicio:',
    secondaryPlaceholder: 'Seleccione Tipo de Certificado',
    secondaryOptions: [
      { value: '', label: 'Seleccione Tipo de Certificado' },
      { value: 'copia-literal-partida', label: 'Copia Literal de Partida' },
      { value: 'copia-informativa', label: 'Copia Informativa de Partida' },
      { value: 'certificado-busqueda', label: 'Búsqueda de Índice' },
    ],
    checkboxLabel: 'El Documento será presentado en el extranjero o se autenticará la firma',
    noteTitle: 'Nota:',
    noteBullets: [
      'El certificado literal de la partida con firma electrónica se emite en un plazo máximo de tres (03) días hábiles, el cual es enviado a su cuenta del Servicio de Publicidad Registral en Línea (SPRL), y al correo electrónico consignado al momento de la suscripción de dicho servicio.',
      'El certificado con firma electrónica tiene el mismo valor y eficacia jurídica que el certificado con firma manuscrita, su contenido podrá ser verificado y visualizado a través de nuestro portal institucional.',
      'El certificado con firma electrónica a través del SPRL es válido para su uso dentro del territorio nacional. Si desea un certificado para uso en el extranjero, adicionalmente deberá de solicitar la autenticación de firma ante el funcionario autorizado por Sunarp para tal efecto conforme al procedimiento establecido por el Ministerio de Relaciones Exteriores.',
    ],
    secondaryNoteBullets: [
      'Si su Nro. de partida empieza con la letra P: debe seleccionar el servicio Certificado Literal Automatizado de Partida (PI-SARP) en el Registro de Propiedad Inmueble.',
    ],
    callout:
      'Aquí se conectará el formulario de copia literal y el mapeo exacto de cada tipo de certificado.',
  },
}

function getServiceCode(value: string | undefined): ServiceCode | null {
  if (value === 'vigencia_poder' || value === 'copia_literal') return value
  return null
}

function SelectField({ label, placeholder, options }: { label: string; placeholder: string; options: Option[] }) {
  return (
    <label style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', alignItems: 'center', gap: 12 }}>
      <span
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 14,
          color: 'var(--ink)',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
      <div style={{ position: 'relative' }}>
        <select
          defaultValue=""
          style={{
            width: '100%',
            appearance: 'none',
            background: '#fff',
            border: '1px solid #d9d9d9',
            padding: '12px 44px 12px 14px',
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            color: 'var(--ink)',
            outline: 'none',
          }}
        >
          {options.map(option => (
            <option key={option.value || placeholder} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#b8b8b8"
          strokeWidth="2"
          style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>
    </label>
  )
}

function WarningBox({ title, bullets, compact = false }: { title?: string; bullets: string[]; compact?: boolean }) {
  return (
    <div
      style={{
        background: '#fff8df',
        border: '1px solid #f0d27a',
        padding: compact ? '18px 20px' : '20px 22px',
        display: 'flex',
        gap: 16,
      }}
    >
      <div
        style={{
          width: 24,
          height: 24,
          borderRadius: '50%',
          border: '2px solid #f5b32b',
          color: '#f5b32b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-mono)',
          fontSize: 14,
          flexShrink: 0,
          marginTop: 2,
        }}
      >
        !
      </div>
      <div style={{ flex: 1 }}>
        {title && (
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 700, marginBottom: 10 }}>{title}</div>
        )}
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {bullets.map(bullet => (
            <li key={bullet} style={{ fontFamily: 'var(--font-body)', fontSize: 15, lineHeight: 1.6, marginBottom: 8 }}>
              {bullet}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

type CatalogCertificado = {
  certificadoID: number
  codGrupoLibroArea: number
  nombreCertificado: string
  desGrupoLibroArea: string
  tpoCertificado: string
}

type CatalogResponse = {
  success: boolean
  data: CatalogCertificado[] | null
  response?: {
    codigo: string
    titulo: string
    tipo: string
    mensaje: string
  }
}

const registryOptions = [
  { value: '', label: 'Seleccione tipo de Registro Jurídico' },
  { value: '21000', label: 'REGISTRO DE PROPIEDAD INMUEBLE' },
  { value: '22000', label: 'REGISTRO DE PERSONAS JURIDICAS' },
  { value: '23000', label: 'REGISTRO DE PERSONAS NATURALES' },
  { value: '24000', label: 'REGISTRO DE BIENES MUEBLES' },
]

function FieldRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label style={{ display: 'grid', gridTemplateColumns: '160px 1fr', alignItems: 'center', gap: 12 }}>
      <span style={{ fontFamily: 'var(--font-body)', fontSize: 15, color: 'var(--ink)' }}>{label}</span>
      {children}
    </label>
  )
}

function VigenciaPoderPage() {
  const [codArea, setCodArea] = useState('')
  const [items, setItems] = useState<CatalogCertificado[]>([])
  const [selectedCertificadoId, setSelectedCertificadoId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!codArea) {
      setItems([])
      setSelectedCertificadoId('')
      setError(null)
      return
    }

    const controller = new AbortController()

    async function loadCatalog() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/sprl/catalogo/publicidad-certificados', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ codArea, tipoCert: 'C' }),
          signal: controller.signal,
        })

        const data = (await res.json()) as CatalogResponse

        if (!res.ok || !data.success) {
          throw new Error(data.response?.mensaje ?? 'No se pudo cargar el catálogo de certificados')
        }

        setItems(data.data ?? [])
        setSelectedCertificadoId('')
      } catch (err) {
        if (controller.signal.aborted) return
        setItems([])
        setSelectedCertificadoId('')
        setError(err instanceof Error ? err.message : 'Error al cargar el catálogo')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    void loadCatalog()

    return () => controller.abort()
  }, [codArea])

  const selectedCatalog = items.find(item => String(item.certificadoID) === selectedCertificadoId) ?? null

  return (
    <>
      <style>{`
        .sprl-vigencia-page {
          padding: 22px;
          background: #efefef;
          min-height: 100%;
          color: var(--ink);
        }
        @media (max-width: 768px) {
          .sprl-vigencia-page { padding: 14px; }
          .sprl-vigencia-shell { padding: 18px 14px 20px !important; }
          .sprl-vigencia-form { grid-template-columns: 1fr !important; }
          .sprl-vigencia-row { grid-template-columns: 1fr !important; }
        }
        .sprl-vigencia-shell { background: #fff; border: 1px solid #d9d9d9; padding: 28px 22px 30px; }
        .sprl-vigencia-title { font-family: var(--font-body); font-size: 21px; font-weight: 700; margin: 0 0 20px; }
        .sprl-vigencia-form { display: grid; grid-template-columns: 1fr auto; column-gap: 22px; row-gap: 16px; align-items: start; }
        .sprl-vigencia-select {
          width: 100%;
          appearance: none;
          background: #fff;
          border: 1px solid #d9d9d9;
          padding: 12px 44px 12px 14px;
          font-family: var(--font-body);
          font-size: 14px;
          color: var(--ink);
          outline: none;
        }
        .sprl-vigencia-btn { background: #95c11f; color: #fff; border: none; padding: 12px 24px; min-width: 250px; font-family: var(--font-body); font-size: 14px; cursor: pointer; }
        .sprl-vigencia-btn:disabled { opacity: 0.65; cursor: not-allowed; }
        .sprl-vigencia-note { background: #fff8df; border: 1px solid #f0d27a; padding: 20px 22px; display: flex; gap: 16px; }
        .sprl-vigencia-note-icon {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 2px solid #f5b32b;
          color: #f5b32b;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-mono);
          font-size: 14px;
          flex-shrink: 0;
          margin-top: 2px;
        }
      `}</style>

      <div className="sprl-vigencia-page">
        <div className="sprl-vigencia-shell">
          <Link
            href="/dashboard/publicidad-registral"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              fontFamily: 'var(--font-body)',
              fontSize: 12,
              color: 'var(--muted)',
              textDecoration: 'none',
              marginBottom: 18,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Volver
          </Link>

          <h1 className="sprl-vigencia-title">Solicitar publicidad certificada (vigencias, CRI, etc)</h1>

          <div className="sprl-vigencia-form">
            <div style={{ display: 'grid', gap: 14 }}>
              <FieldRow label="Registro Jurídico *:">
                <div style={{ position: 'relative' }}>
                  <select
                    value={codArea}
                    onChange={e => setCodArea(e.target.value)}
                    className="sprl-vigencia-select"
                  >
                    {registryOptions.map(option => (
                      <option key={option.value || 'placeholder'} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#b8b8b8"
                    strokeWidth="2"
                    style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </div>
              </FieldRow>

              <FieldRow label="Tipo de Servicio:">
                <div style={{ position: 'relative' }}>
                  <select
                    value={selectedCertificadoId}
                    onChange={e => setSelectedCertificadoId(e.target.value)}
                    disabled={!codArea || loading || items.length === 0}
                    className="sprl-vigencia-select"
                  >
                    <option value="">
                      {loading
                        ? 'Cargando opciones...'
                        : codArea
                          ? 'Seleccione una opción'
                          : 'Seleccione tipo de Registro Jurídico'}
                    </option>
                    {items.map(item => (
                      <option key={item.certificadoID} value={String(item.certificadoID)}>
                        {item.nombreCertificado}
                      </option>
                    ))}
                  </select>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#b8b8b8"
                    strokeWidth="2"
                    style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </div>
              </FieldRow>
            </div>

            <button type="button" className="sprl-vigencia-btn" disabled={!selectedCatalog}>
              Solicitar
            </button>
          </div>

          {selectedCatalog && (
            <div style={{ marginTop: 10, fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--muted)' }}>
              Seleccionado: {selectedCatalog.nombreCertificado} · Grupo: {selectedCatalog.desGrupoLibroArea}
            </div>
          )}

          {error && (
            <div style={{ marginTop: 18 }}>
              <WarningBox title="No se pudo cargar el catálogo" bullets={[error]} compact />
            </div>
          )}

          <div style={{ marginTop: 22 }}>
            <WarningBox
              bullets={[
                'El certificado literal de la partida con firma electrónica se emite en un plazo máximo de tres (03) días hábiles, el cual es enviado a su cuenta del Servicio de Publicidad Registral en Línea (SPRL), y al correo electrónico consignado al momento de la suscripción de dicho servicio.',
                'El certificado con firma electrónica tiene el mismo valor y eficacia jurídica que el certificado con firma manuscrita, su contenido podrá ser verificado y visualizado a través de nuestro portal institucional.',
                'El certificado con firma electrónica a través del SPRL es válido para su uso dentro del territorio nacional. Si desea un certificado para uso en el extranjero, adicionalmente deberá de solicitar la autenticación de firma ante el funcionario autorizado por Sunarp para tal efecto conforme al procedimiento establecido por el Ministerio de Relaciones Exteriores.',
                'Estimado Usuario/a: si el certificado registral vehicular lo necesita para ser presentado en el extranjero que, entre otros, requiera previamente de la autenticación de firma, agradecemos pueda solicitarlo a través de nuestro App-Sunarp o de forma presencial en cualquiera de nuestras Oficinas Registrales.',
              ]}
            />
          </div>
        </div>
      </div>
    </>
  )
}

export default function PublicidadRegistralServicioPage() {
  const params = useParams<{ codigo?: string }>()
  const codigo = getServiceCode(typeof params?.codigo === 'string' ? params.codigo : undefined)
  if (codigo === 'vigencia_poder') return <VigenciaPoderPage />
  const config = codigo ? serviceOptionsByCode[codigo] : null

  return (
    <>
      <style>{`
        .sprl-service-page {
          padding: 22px;
          background: #efefef;
          min-height: 100%;
          color: var(--ink);
        }
        @media (max-width: 768px) {
          .sprl-service-page { padding: 14px; }
          .sprl-service-shell { padding: 18px 14px 20px !important; }
          .sprl-service-form { grid-template-columns: 1fr !important; }
          .sprl-service-row { grid-template-columns: 1fr !important; }
        }
        .sprl-service-shell { background: #fff; border: 1px solid #d9d9d9; padding: 28px 22px 30px; }
        .sprl-service-title { font-family: var(--font-body); font-size: 21px; font-weight: 700; margin: 0 0 20px; }
        .sprl-service-form { display: grid; grid-template-columns: 1fr auto; column-gap: 22px; row-gap: 16px; align-items: start; }
        .sprl-service-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; align-items: center; }
        .sprl-service-btn { background: #95c11f; color: #fff; border: none; padding: 12px 24px; min-width: 250px; font-family: var(--font-body); font-size: 14px; cursor: pointer; }
        .sprl-service-btn:hover { filter: brightness(0.98); }
        .sprl-service-hr { border: none; border-top: 1px solid #e7e7e7; margin: 28px 0; }
      `}</style>

      <div className="sprl-service-page">
        <div className="sprl-service-shell">
          <Link
            href="/dashboard/publicidad-registral"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              fontFamily: 'var(--font-body)',
              fontSize: 12,
              color: 'var(--muted)',
              textDecoration: 'none',
              marginBottom: 18,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Volver
          </Link>

          {config ? (
            <>
              <h1 className="sprl-service-title">{config.title}</h1>

              {config.intro && (
                <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--muted)', lineHeight: 1.6, margin: '0 0 22px' }}>
                  {config.intro}
                </p>
              )}

              <div className="sprl-service-form">
                <div style={{ display: 'grid', gap: 12 }}>
                  <SelectField
                    label={config.primaryLabel}
                    placeholder={config.primaryPlaceholder}
                    options={config.primaryOptions}
                  />

                  {config.checkboxLabel && (
                    <label
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 10,
                        marginLeft: 132,
                        fontFamily: 'var(--font-body)',
                        fontSize: 14,
                        color: 'var(--ink)',
                      }}
                    >
                      <input type="checkbox" style={{ width: 16, height: 16, accentColor: '#95c11f' }} />
                      <span>{config.checkboxLabel}</span>
                    </label>
                  )}

                  <SelectField
                    label={config.secondaryLabel}
                    placeholder={config.secondaryPlaceholder}
                    options={config.secondaryOptions}
                  />
                </div>

                <button type="button" className="sprl-service-btn">
                  Solicitar
                </button>
              </div>

              {config.callout && (
                <p
                  style={{
                    marginTop: 18,
                    marginLeft: config.checkboxLabel ? 132 : 0,
                    maxWidth: 760,
                    fontFamily: 'var(--font-body)',
                    fontSize: 13,
                    color: 'var(--muted)',
                    lineHeight: 1.6,
                  }}
                >
                  {config.callout}
                </p>
              )}

              {config.secondaryNoteBullets ? (
                <>
                  <div
                    style={{
                      marginTop: 18,
                      marginLeft: config.checkboxLabel ? 132 : 0,
                      background: '#fff9e8',
                      border: '1px solid #f2c569',
                      padding: '10px 14px',
                      fontFamily: 'var(--font-body)',
                      fontSize: 14,
                      color: 'var(--ink)',
                    }}
                  >
                    <span style={{ color: '#f5b32b', fontWeight: 700, marginRight: 10 }}>i</span>
                    {config.secondaryNoteBullets[0]}
                  </div>

                  <div className="sprl-service-hr" />

                  {config.noteTitle && (
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
                      {config.noteTitle}
                    </div>
                  )}

                  <ul style={{ margin: 0, paddingLeft: 28, maxWidth: 1180 }}>
                    {config.noteBullets.map(bullet => (
                      <li key={bullet} style={{ fontFamily: 'var(--font-body)', fontSize: 15, lineHeight: 1.65, marginBottom: 16 }}>
                        {bullet}
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <WarningBox bullets={config.noteBullets} />
              )}
            </>
          ) : (
            <div style={{ maxWidth: 680 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--accent)', marginBottom: 12 }}>
                Publicidad Registral
              </div>
              <h1 className="sprl-service-title">Servicio no configurado</h1>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--muted)', lineHeight: 1.7, margin: 0 }}>
                Este código todavía no tiene una pantalla asociada. Por ahora solo están mapeados `vigencia_poder` y `copia_literal`.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}