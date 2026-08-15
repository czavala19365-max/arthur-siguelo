'use client'


import Link from 'next/link'
import { FormEvent, ReactNode, useState } from 'react'
import VigenciaPoderChat from '@/components/VigenciaPoderChat'
import styles from './publicidad-registral.module.css'

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





function SectionHeader({ children }: { children: ReactNode }) {
  return <div className={styles.sprlFlowSectionHeader}>{children}</div>
}

function SelectRow({
  label,
  placeholder,
  options,
  value,
  onChange,
  error,
}: {
  label: string
  placeholder: string
  options: Array<{ value?: string; label: string }>
  value: string
  onChange: (value: string) => void
  error?: string | null
}) {
  return (
    <label className={styles.sprlFlowRow}>
      <span className={styles.sprlFlowLabel}>{label}</span>
      <div>
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
        {error && <span className={styles.sprlFlowFieldError}>{error}</span>}
      </div>
    </label>
  )
}

export default function VigenciaPoderPersonaJuridica() {
  const [representante, setRepresentante] = useState<'natural' | 'juridico' | ''>('')
  const [form, setForm] = useState({ oficinaRegistral: '', solicitarPor: 'partida', numeroPartida: '', numero: '', numeroAsiento: '', cargoApoderado: '', apellidoPaterno: '', apellidoMaterno: '', nombres: '', razonSocial: '', datosAdicionales: '' })
  const [submitStatus, setSubmitStatus] = useState<{ type: 'idle' | 'success' | 'error'; message: string }>({ type: 'idle', message: '' })
  const [submitting, setSubmitting] = useState(false)
  const uppercaseFields = new Set(['oficinaRegistral', 'numeroPartida', 'numero', 'numeroAsiento', 'cargoApoderado', 'apellidoPaterno', 'apellidoMaterno', 'nombres', 'razonSocial', 'datosAdicionales'])

  function updateForm(field: keyof typeof form, value: string) {
    setForm(previous => ({ ...previous, [field]: uppercaseFields.has(field) ? value.toUpperCase() : value }))
  }

  function applyChatData(data: Record<string, string>) {
    const normalizedData = Object.fromEntries(
      Object.entries(data).map(([key, value]) => [key, uppercaseFields.has(key) ? value.toUpperCase() : value]),
    )
    setForm(previous => ({
      ...previous,
      ...normalizedData,
      oficinaRegistral: normalizedData.oficinaRegistral || previous.oficinaRegistral,
      numeroPartida: normalizedData.numeroPartida || normalizedData.numero || previous.numeroPartida,
      numero: normalizedData.numeroPartida || normalizedData.numero || previous.numero,
      razonSocial: normalizedData.razonSocial || previous.razonSocial,
    }))
    if (data.representante === 'natural' || data.representante === 'juridico') {
      setRepresentante(data.representante)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting || !representante) return

    setSubmitting(true)
    setSubmitStatus({ type: 'idle', message: '' })
    const payload = {
      ...form,
      numeroPartida: form.numeroPartida || form.numero,
      representante,
      ...(representante === 'juridico'
        ? { apellidoPaterno: '', apellidoMaterno: '', nombres: '' }
        : { razonSocial: '' }),
    }
    try {
      const response = await fetch('/api/dashboard/publicidad-registral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await response.json() as { solicitud?: { id?: string }; error?: string }
      if (!response.ok) throw new Error(result.error ?? 'No se pudo guardar la solicitud.')
      setSubmitStatus({ type: 'success', message: `Solicitud guardada correctamente${result.solicitud?.id ? ` · ${result.solicitud.id}` : ''}.` })
    } catch (error) {
      setSubmitStatus({ type: 'error', message: error instanceof Error ? error.message : 'No se pudo guardar la solicitud.' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={styles.sprlFlowPage}>
      <VigenciaPoderChat
        formData={{ ...form, representante }}
        onFormData={applyChatData}
      />
      <div className={styles.sprlFlowShell}>
        <div className={styles.sprlFlowHeaderTop}>
          <Link href="#" onClick={event => { event.preventDefault() }} className={styles.sprlFlowBack}>
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

        <form onSubmit={handleSubmit}>
          <div className={styles.sprlFlowSection}>
            <div className={styles.sprlFlowGrid}>
              <SelectRow
                label="OFICINA REGISTRAL*:"
                placeholder="Seleccionar"
                options={registryOptions}
                value={form.oficinaRegistral}
                onChange={value => updateForm('oficinaRegistral', value)}
              />

              <div className={styles.sprlFlowRow}>
                <span className={styles.sprlFlowLabel}>SOLICITAR POR:</span>
                <div className={styles.sprlFlowRadioGroup}>
                  <label className={styles.sprlFlowRadio}>
                    <input type="radio" name="solicitarPor" value="partida" checked={form.solicitarPor === 'partida'} onChange={event => updateForm('solicitarPor', event.target.value)} />
                    <span>Partida</span>
                  </label>
                  <label className={styles.sprlFlowRadio}>
                    <input type="radio" name="solicitarPor" value="ficha" checked={form.solicitarPor === 'ficha'} onChange={event => updateForm('solicitarPor', event.target.value)} />
                    <span>Ficha</span>
                  </label>
                  <label className={styles.sprlFlowRadio}>
                    <input type="radio" name="solicitarPor" value="tomo_folio" checked={form.solicitarPor === 'tomo_folio'} onChange={event => updateForm('solicitarPor', event.target.value)} />
                    <span>Tomo/Folio</span>
                  </label>
                </div>
              </div>

              <label className={styles.sprlFlowRow}>
                <span className={styles.sprlFlowLabel}>NÚMERO *:</span>
                <div>
                  <input
                    className={styles.sprlFlowInput}
                    placeholder="Escriba aquí..."
                    name="numeroPartida" value={form.numeroPartida} onChange={event => updateForm('numeroPartida', event.target.value)}
                  />
                </div>
              </label>

              <label className={styles.sprlFlowRow}>
                <span className={styles.sprlFlowLabel}>N° Asiento:</span>
                <div>
                  <input
                    className={styles.sprlFlowInput}
                    placeholder="Escriba aquí..."
                    name="numeroAsiento" value={form.numeroAsiento} onChange={event => updateForm('numeroAsiento', event.target.value)}

                  />
                </div>
              </label>
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
                  name="cargoapoderado" value={form.cargoApoderado} onChange={event => updateForm('cargoApoderado', event.target.value)}
                />
              </label>

              <div className={styles.sprlFlowRow}>
                <span className={styles.sprlFlowLabel}>Representante:</span>
                <div className={styles.sprlFlowRadioGroup}>
                  <label className={styles.sprlFlowRadio}>
                    <input type="radio" name="representante" checked={representante === 'natural'} onChange={() => setRepresentante('natural')} />
                    <span>Natural</span>
                  </label>
                  <label className={styles.sprlFlowRadio}>
                    <input type="radio" name="representante" checked={representante === 'juridico'} onChange={() => setRepresentante('juridico')} />
                    <span>Jurídico</span>
                  </label>
                </div>
              </div>

              {representante === 'juridico' ? <label className={styles.sprlFlowRow}>
                <span className={styles.sprlFlowLabel}>Razón social *:</span>
                <input className={styles.sprlFlowInput} placeholder="Escriba la razón social..." name="razonSocial" value={form.razonSocial} onChange={event => updateForm('razonSocial', event.target.value)} />
              </label> : <>
                <div className={styles.sprlFlowRow}>
                  <span className={styles.sprlFlowLabel}>Apellido Paterno *:</span>
                  <div>
                    <div className={styles.sprlFlowInputStatusWrap}>
                      <input
                        className={styles.sprlFlowInput}
                        placeholder="Escriba aquí..."
                        name="apellidoPaterno" value={form.apellidoPaterno} onChange={event => updateForm('apellidoPaterno', event.target.value)}
                      />

                    </div>
                  </div>
                </div>

                <div className={styles.sprlFlowRow}>
                  <span className={styles.sprlFlowLabel}>Apellido Materno:</span>
                  <div>
                    <div className={styles.sprlFlowInputStatusWrap}>
                      <input
                        className={styles.sprlFlowInput}
                        placeholder="Escriba aquí..."
                        name="apellidoMaterno" value={form.apellidoMaterno} onChange={event => updateForm('apellidoMaterno', event.target.value)}
                      />
                      <span
                        className={styles.sprlFlowRealtimeCheck}
                        aria-hidden="true"
                      >
                      </span>
                    </div>
                  </div>
                </div>

                <div className={styles.sprlFlowRow}>
                  <span className={styles.sprlFlowLabel}>Nombres *:</span>
                  <div>
                    <div className={styles.sprlFlowInputStatusWrap}>
                      <input
                        className={styles.sprlFlowInput}
                        placeholder="Escriba aquí..."
                        name="nombres" value={form.nombres} onChange={event => updateForm('nombres', event.target.value)}

                      />

                    </div>
                  </div>
                </div>
              </>}
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
            <textarea className={styles.sprlFlowTextarea} maxLength={200} value={form.datosAdicionales} onChange={event => updateForm('datosAdicionales', event.target.value)} />
          </div>

          <div className={styles.sprlFlowMuted} style={{ marginTop: 6, marginLeft: 232, color: '#ff4b3a' }}>
            Max 200 caracteres
          </div>

          <div className={styles.sprlFlowActions} style={{ marginTop: 24 }}>
            <button type="button" className={styles.sprlFlowButtonSecondary} >
              ← Regresar
            </button>
            <button type="submit" className={styles.sprlFlowButtonPrimary} disabled={submitting || !representante}>
              {submitting ? 'Guardando...' : 'Solicitar Publicidad Registral'}
            </button>
          </div>
          {submitStatus.type !== 'idle' && (
            <div className={styles.sprlFlowMuted} style={{ marginTop: 12, color: submitStatus.type === 'success' ? '#587400' : '#c62828', textAlign: 'center' }}>
              {submitStatus.message}
            </div>
          )}
        </form>

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

      </div>
    </div>
  )
}