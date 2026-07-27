'use client'

import Link from 'next/link'
import styles from '../publicidad-registral.module.css'
import { useState, type ReactNode } from 'react'
import type { CertificateFlowConfig } from '../certificate-flows'

const registryOptions = [
  { value: '', label: 'Seleccionar' },
  { label: 'ABANCAY' },
  { label: 'ANDAHUAYLAS' },
  { label: 'AREQUIPA' },
  { label: 'AYACUCHO' },
  { label: 'BAGUA' },
  { label: 'BARRANCA' },
  { label: 'CAJAMARCA' },
  { label: 'CALLAO' },
  { label: 'CAMANA' },
  { label: 'CASMA' },
  { label: 'CASTILLA _ APLAO' },
  { label: 'CAÑETE' },
  { label: 'CHACHAPOYAS' },
  { label: 'CHEPEN' },
  { label: 'CHICLAYO' },
  { label: 'CHIMBOTE' },
  { label: 'CHINCHA' },
  { label: 'CHOTA' },
  { label: 'CUSCO' },
  { label: 'ESPINAR' },
  { label: 'HUACHO' },
  { label: 'HUAMACHUCO' },
  { label: 'HUANCAVELICA' },
  { label: 'HUANTA' },
  { label: 'HUANUCO' },
  { label: 'HUARAL' },
  { label: 'HUARAZ' },
  { label: 'ICA' },
  { label: 'ILO' },
  { label: 'ISLAY _ MOLLENDO' },
  { label: 'JAEN' },
  { label: 'JUANJUI' },
  { label: 'JULIACA' },
  { label: 'LA MERCED (SELVA CENTRAL)' },
  { label: 'LIMA' },
  { label: 'MADRE DE DIOS' },
  { label: 'MAYNAS' },
  { label: 'MOQUEGUA' },
  { label: 'MOYOBAMBA' },
  { label: 'NAZCA' },
  { label: 'OTUZCO' },
  { label: 'PASCO' },
  { label: 'PISCO' },
  { label: 'PIURA' },
  { label: 'PUCALLPA' },
  { label: 'PUNO' },
  { label: 'QUILLABAMBA' },
  { label: 'SAN PEDRO' },
  { label: 'SATIPO' },
  { label: 'SICUANI' },
  { label: 'SULLANA' },
  { label: 'TACNA' },
  { label: 'TARAPOTO' },
  { label: 'TARMA' },
  { label: 'TINGO MARIA' },
  { label: 'TRUJILLO' },
  { label: 'TUMBES' },
  { label: 'YURIMAGUAS' },
]

type Props = {
  onBack: () => void
  certificate: CertificateFlowConfig | null
  onTokenExpired: () => void
}

type AsientoItem = {
  id: string
  asiento: string
}

function SectionHeader({ children }: { children: ReactNode }) {
  return <div className={styles.sprlFlowSectionHeader}>{children}</div>
}

function TextField({ label, placeholder }: { label: string; placeholder: string }) {
  return (
    <label className={styles.sprlFlowRow}>
      <span className={styles.sprlFlowLabel}>{label}</span>
      <input className={styles.sprlFlowInput} placeholder={placeholder} />
    </label>
  )
}

function SelectRow({
  label,
  placeholder,
  options,
  value,
  onChange,
}: {
  label: string
  placeholder: string
  options: Array<{ value?: string; label: string }>
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className={styles.sprlFlowRow}>
      <span className={styles.sprlFlowLabel}>{label}</span>
      <div className={styles.sprlFlowSelectWrap}>
        <select className={styles.sprlFlowSelect} value={value} onChange={event => onChange(event.target.value)}>
          <option value="">{placeholder}</option>
          {options.slice(1).map(option => (
            <option key={option.label} value={option.label}>
              {option.label}
            </option>
          ))}
        </select>
        <svg
          className={styles.sprlFlowArrow}
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#b8b8b8"
          strokeWidth="2"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>
    </label>
  )
}

export function VigenciaPoderPersonasJuridicasFlow({ onBack, certificate, onTokenExpired }: Props) {
  const [oficinaRegistral, setOficinaRegistral] = useState('')
  const [numero, setNumero] = useState('')
  const [asiento, setAsiento] = useState('')
  const [cargoApoderado, setCargoApoderado] = useState('')
  const [apellidoPaterno, setApellidoPaterno] = useState('')
  const [apellidoMaterno, setApellidoMaterno] = useState('')
  const [nombres, setNombres] = useState('')
  const [asientos, setAsientos] = useState<AsientoItem[]>([])
  const [showResumen, setShowResumen] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSummary, setSubmitSummary] = useState<null | {
    partida: string
    razSocCert: string
    refNumPart: string
    asiento: string
    message: string
  }>(null)

  function handleAgregarAsiento() {
    const cleanAsiento = asiento.trim().toUpperCase()
    if (!cleanAsiento) return

    setAsientos(current => [
      ...current,
      {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        asiento: cleanAsiento,
      },
    ])
    setAsiento('')
  }

  function handleEliminarAsiento(id: string) {
    setAsientos(current => current.filter(item => item.id !== id))
  }

  async function handleSolicitar() {
    if (!oficinaRegistral || !numero.trim() || !cargoApoderado.trim() || !apellidoPaterno.trim() || !nombres.trim()) {
      return
    }

    if (!certificate) {
      setSubmitError('No se encontró la configuración del certificado.')
      return
    }

    const asientoSeleccionadoValue = asientos[0]?.asiento || asiento.trim().toUpperCase()
    if (!asientoSeleccionadoValue) {
      setSubmitError('Debes ingresar al menos un asiento.')
      return
    }

    setSubmitError(null)
    setSubmitLoading(true)

    try {
      const response = await fetch('/api/sprl/publicidad-registral/solicitar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          certificate,
          oficinaRegistral,
          partida: numero.trim(),
          asiento: asientoSeleccionadoValue,
          cargoApoderado,
          apellidoPaterno,
          apellidoMaterno,
          nombres,
        }),
      })

      const data = await response.json().catch(() => ({})) as {
        ok?: boolean
        error?: string
        message?: string
        nextStep?: string
        summary?: {
          partida?: string
          razSocCert?: string
          refNumPart?: string
          asiento?: string
          costoServicio?: string
          costoTotal?: string
        }
      }

      if (response.status === 401) {
        onTokenExpired()
        return
      }

      if (!response.ok || !data.ok || !data.summary) {
        throw new Error(data.error || data.message || 'No se pudo registrar la solicitud')
      }

      setSubmitSummary({
        partida: data.summary.partida || numero.trim(),
        razSocCert: data.summary.razSocCert || '',
        refNumPart: data.summary.refNumPart || '',
        asiento: data.summary.asiento || asientoSeleccionadoValue,
        message: data.nextStep === 'pagar'
          ? 'SUNARP dejó la solicitud lista para pago. Revisa el resumen y continúa con el botón Pagar en la web real.'
          : data.message || 'Solicitud registrada correctamente.',
      })
      setSubmitted(true)
      setShowResumen(true)
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'No se pudo registrar la solicitud')
    } finally {
      setSubmitLoading(false)
    }
  }

  function handleCerrarResumen() {
    setShowResumen(false)
  }

  const apoderadoCompleto = [apellidoPaterno, apellidoMaterno, nombres]
    .map(value => value.trim().toUpperCase())
    .filter(Boolean)
    .join(' ')

  const asientoSeleccionado = asientos[0]?.asiento || asiento.trim().toUpperCase()

  return (
    <div className={styles.sprlFlowPage}>
      <div className={styles.sprlFlowShell}>
        <div className={styles.sprlFlowHeaderTop}>
          <Link href="#" onClick={event => { event.preventDefault(); onBack() }} className={styles.sprlFlowBack}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Regresar
          </Link>
          <div className={styles.sprlFlowMuted}>Vista interna sin cambio de URL</div>
        </div>
        <h1 className={styles.sprlFlowTitle}>Solicitar publicidad certificada (vigencias, CRI, etc)</h1>

        <p className={styles.sprlFlowIntroRed}>
          Certificado de Vigencia de Poder de Personas Jurídicas:
          <br />
          Este certificado acredita las facultades vigentes de un representante o apoderado, inscritas en la partida
          registral de la persona jurídica perteneciente al Registro de Personas Jurídicas.
          <br />
          Por ejemplo: cuando se requiere saber o acreditar las facultades del gerente general de una empresa.
        </p>

        <SectionHeader>DATOS REGISTRALES</SectionHeader>

        <div className={styles.sprlFlowSection}>
          <div className={styles.sprlFlowGrid}>
            <SelectRow
              label="OFICINA REGISTRAL*:"
              placeholder="Seleccionar"
              options={registryOptions}
              value={oficinaRegistral}
              onChange={setOficinaRegistral}
            />

            <div className={styles.sprlFlowRow}>
              <span className={styles.sprlFlowLabel}>SOLICITAR POR:</span>
              <div className={styles.sprlFlowRadioGroup}>
                <label className={styles.sprlFlowRadio}>
                  <input type="radio" name="solicitarPor" defaultChecked />
                  <span>Partida</span>
                </label>
                <label className={styles.sprlFlowRadio}>
                  <input type="radio" name="solicitarPor" />
                  <span>Ficha</span>
                </label>
                <label className={styles.sprlFlowRadio}>
                  <input type="radio" name="solicitarPor" />
                  <span>Tomo/Folio</span>
                </label>
              </div>
            </div>

            <label className={styles.sprlFlowRow}>
              <span className={styles.sprlFlowLabel}>NÚMERO *:</span>
              <input className={styles.sprlFlowInput} placeholder="Escriba aquí..." value={numero} onChange={event => setNumero(event.target.value)} />
            </label>

            <label className={styles.sprlFlowRow}>
              <span className={styles.sprlFlowLabel}>N° Asiento:</span>
              <input
                className={styles.sprlFlowInput}
                placeholder="Escriba aquí..."
                value={asiento}
                onChange={event => setAsiento(event.target.value.toUpperCase())}
              />
            </label>

            <div className={styles.sprlFlowRow}>
              <span className={styles.sprlFlowLabel} />
              <button type="button" className={styles.sprlFlowButtonPrimary} onClick={handleAgregarAsiento}>
                Agregar
              </button>
            </div>
          </div>

          <div className={styles.sprlFlowAsientoWrap}>
            <span className={styles.sprlFlowLabel} />
            <div className={styles.sprlFlowAsientoTableWrap}>
              <div className={styles.sprlFlowAsientoTitle}>Asiento</div>

              {asientos.length > 0 && (
                <table className={styles.sprlFlowAsientoTable}>
                  <thead>
                    <tr>
                      <th>Asiento</th>
                      <th>Eliminar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {asientos.map(item => (
                      <tr key={item.id}>
                        <td>{item.asiento}</td>
                        <td>
                          <button type="button" className={styles.sprlFlowDeleteLink} onClick={() => handleEliminarAsiento(item.id)}>
                            Eliminar Asiento
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        <SectionHeader>DATOS DEL CARGO O APODERADO</SectionHeader>

        <div className={styles.sprlFlowSection}>
          <div className={styles.sprlFlowGrid}>
            <label className={styles.sprlFlowRow}>
              <span className={styles.sprlFlowLabel}>Cargo o Apoderado *:</span>
              <input
                className={styles.sprlFlowInput}
                placeholder="Escriba aquí..."
                value={cargoApoderado}
                onChange={event => setCargoApoderado(event.target.value.toUpperCase())}
              />
            </label>

            <div className={styles.sprlFlowRow}>
              <span className={styles.sprlFlowLabel}>Representante:</span>
              <div className={styles.sprlFlowRadioGroup}>
                <label className={styles.sprlFlowRadio}>
                  <input type="radio" name="representante" defaultChecked />
                  <span>Natural</span>
                </label>
                <label className={styles.sprlFlowRadio}>
                  <input type="radio" name="representante" />
                  <span>Jurídico</span>
                </label>
              </div>
            </div>

            <div className={styles.sprlFlowRow}>
              <span className={styles.sprlFlowLabel}>Apellido Paterno *:</span>
              <input
                className={styles.sprlFlowInput}
                placeholder="Escriba aquí..."
                value={apellidoPaterno}
                onChange={event => setApellidoPaterno(event.target.value.toUpperCase())}
              />
            </div>

            <div className={styles.sprlFlowRow}>
              <span className={styles.sprlFlowLabel}>Apellido Materno:</span>
              <input
                className={styles.sprlFlowInput}
                placeholder="Escriba aquí..."
                value={apellidoMaterno}
                onChange={event => setApellidoMaterno(event.target.value.toUpperCase())}
              />
            </div>

            <div className={styles.sprlFlowRow}>
              <span className={styles.sprlFlowLabel}>Nombres *:</span>
              <input
                className={styles.sprlFlowInput}
                placeholder="Escriba aquí..."
                value={nombres}
                onChange={event => setNombres(event.target.value.toUpperCase())}
              />
            </div>
          </div>
        </div>

        <div style={{ marginTop: 8 }}>
          <Link href="#" onClick={event => { event.preventDefault(); }} className={styles.sprlFlowPdfLink}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6" />
            </svg>
            MODELO DE CERTIFICADO
          </Link>
        </div>

        <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '220px 1fr', gap: 12, alignItems: 'start' }}>
          <div className={styles.sprlFlowLabel} style={{ alignSelf: 'start', paddingTop: 6 }}>
            DATOS ADICIONALES
            <div style={{ marginTop: 10, fontSize: 14, lineHeight: 1.6 }}>
              - Cargo del representante(Gerente, Gerente General, Gerente Comercial, etc)
              <br />
              - Documento Oficial de identidad
            </div>
          </div>
          <textarea className={styles.sprlFlowTextarea} maxLength={200} />
        </div>

        <div className={styles.sprlFlowMuted} style={{ marginTop: 6, marginLeft: 232, color: '#ff4b3a' }}>
          Max 200 caracteres
        </div>

        <label className={styles.sprlFlowRadio} style={{ marginTop: 18, alignItems: 'flex-start' }}>
          <input type="checkbox" style={{ marginTop: 4 }} />
          <span style={{ color: '#4b6b00', lineHeight: 1.6 }}>
            Declaro conocer las implicancias del servicio de publicidad registral solicitado: "Certificado de Vigencia
            de Poder del Registro de Personas Jurídicas" acredita las facultades vigentes de un representante o
            apoderado.
          </span>
        </label>

        <div className={styles.sprlFlowActions} style={{ marginTop: 24 }}>
          <button type="button" className={styles.sprlFlowButtonSecondary} onClick={onBack}>
            ← Regresar
          </button>
          <button type="button" className={styles.sprlFlowButtonPrimary} onClick={() => void handleSolicitar()} disabled={submitLoading}>
            {submitLoading ? 'Enviando...' : 'Solicitar'}
          </button>
        </div>

        {submitError && (
          <div className={styles.sprlSummarySuccess} style={{ marginTop: 14, background: 'rgba(192, 57, 43, 0.08)', borderColor: 'rgba(192, 57, 43, 0.35)', color: '#9d1f11' }}>
            {submitError}
          </div>
        )}

        <div className={styles.sprlFlowMuted} style={{ marginTop: 18, color: '#95c11f' }}>
          (*) Campos obligatorio
        </div>

        <div className={styles.sprlFlowFooterNote}>
          Según el Artículo 107 del Reglamento del Servicio de Publicidad Registral, aprobado mediante Resolución N°
          281-2015-SUNARP/SN, en el certificado de vigencia de poder en el registro de personas jurídicas, cuando se
          advierte en la partida registral que el apoderado ostenta más de un régimen de poderes, independientes de uno
          del otro e inscritos en asientos distintos, no es necesario que el solicitante precise el asiento, salvo que
          se solicite la vigencia de poder de determinadas facultades.
          <br />
          Para el caso de vigencia de gerente o representante legal de la persona jurídica se aplicará lo dispuesto en
          el párrafo anterior.
        </div>

        {showResumen && (
          <div className={styles.sprlSummaryOverlay} role="presentation" onClick={event => { if (event.target === event.currentTarget) setShowResumen(false) }}>
            <div className={styles.sprlSummaryModal} role="dialog" aria-modal="true" aria-labelledby="sprl-summary-title">
              <div className={styles.sprlSummaryHeader}>
                <h2 id="sprl-summary-title" className={styles.sprlSummaryTitle}>Resumen de publicidad solicitada</h2>
                <button type="button" className={styles.sprlSummaryClose} onClick={() => setShowResumen(false)} aria-label="Cerrar">
                  ×
                </button>
              </div>

              <div className={styles.sprlSummaryBody}>
                <p className={styles.sprlSummaryText}>
                  Usted va a solicitar un: <strong>"CERTIFICADO DE VIGENCIA DE PODER DE PERSONAS JURÍDICAS"</strong>
                  {' '}de la Partida: <strong>{submitSummary?.partida || numero.trim() || '—'}</strong>{' '}
                  de la oficina registral de: <strong>{oficinaRegistral || '—'}</strong>, Razon Social:{' '}
                  <strong>{submitSummary?.razSocCert || '—'}</strong>{' '}
                  para el apoderado: <strong>{apoderadoCompleto || '—'}</strong>{' '}
                  <span style={{ whiteSpace: 'nowrap' }}>(persona natural)</span>
                </p>

                {submitSummary?.refNumPart ? (
                  <p className={styles.sprlSummarySmall}>
                    Referencia de partida: <strong>{submitSummary.refNumPart}</strong>
                  </p>
                ) : asientoSeleccionado ? (
                  <p className={styles.sprlSummarySmall}>
                    Asiento seleccionado: <strong>{asientoSeleccionado}</strong>
                  </p>
                ) : null}
                {submitSummary?.message && (
                  <p className={styles.sprlSummarySmall} style={{ color: '#4b6b00' }}>
                    {submitSummary.message}
                  </p>
                )}
              </div>

              <div className={styles.sprlSummaryFooter}>
                <button type="button" className={styles.sprlSummarySecondary} onClick={() => setShowResumen(false)}>
                  Cancelar
                </button>
                <button type="button" className={styles.sprlSummaryPrimary} onClick={handleCerrarResumen}>
                  Cerrar
                </button>
              </div>

              {submitted && (
                <div className={styles.sprlSummarySuccess}>
                  Solicitud preparada correctamente. SUNARP ya la dejó lista para pago.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
