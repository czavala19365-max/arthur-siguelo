'use client'

import Link from 'next/link'
import styles from '../publicidad-registral.module.css'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { CertificateFlowConfig } from '../certificate-flows'
import VisaGatewayView from '@/components/publicidad-registral/VisaGatewayView'
import {
  buildVigenciaSummary,
  canSubmitVigenciaAssistantState,
  createEmptyVigenciaAssistantState,
  getNextVigenciaField,
  getVigenciaMissingFields,
  mergeAssistantFieldUpdates,
  type AssistantFlowResponse,
  type AssistantMessage,
  type VigenciaPoderAssistantState,
  type VigenciaPoderFieldKey,
  VIGENCIA_FIELD_LABELS,
} from '@/lib/sprl/publicidad-registral-assistant'

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

type PaymentMethod = 'saldo' | 'tarjeta' | 'pagalo'

const NAME_ALLOWED_PATTERN = /^[A-ZÁÉÍÓÚÜÑ\s]*$/

function normalizeForBackend(value: string) {
  return value.trim().replace(/\s+/g, ' ')
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
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [payLoading, setPayLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [payError, setPayError] = useState<string | null>(null)
  const [apellidoPaternoError, setApellidoPaternoError] = useState<string | null>(null)
  const [apellidoMaternoError, setApellidoMaternoError] = useState<string | null>(null)
  const [nombresError, setNombresError] = useState<string | null>(null)
  const [acceptDeclaration, setAcceptDeclaration] = useState(false)
  const [requiredErrors, setRequiredErrors] = useState({
    oficinaRegistral: false,
    numero: false,
    asiento: false,
    cargoApoderado: false,
    apellidoPaterno: false,
    nombres: false,
    declaration: false,
  })
  const [paymentApePaterno, setPaymentApePaterno] = useState('')
  const [paymentApeMaterno, setPaymentApeMaterno] = useState('')
  const [paymentNombres, setPaymentNombres] = useState('')
  const [paymentNumeroDocumento, setPaymentNumeroDocumento] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('saldo')
  const [paymentActionLoading, setPaymentActionLoading] = useState(false)
  const [showVisaGatewayView, setShowVisaGatewayView] = useState(false)
  const [visaPurchaseCode, setVisaPurchaseCode] = useState('')
  const [visaMonto, setVisaMonto] = useState('33')
  const [visaTitularNombre, setVisaTitularNombre] = useState('')
  const [visaTitularApellido, setVisaTitularApellido] = useState('')
  const [visaTitularEmail, setVisaTitularEmail] = useState('')
  const [visaIpClient, setVisaIpClient] = useState('')
  const [visaContinueLoading, setVisaContinueLoading] = useState(false)
  const [showVisaProviderModal, setShowVisaProviderModal] = useState(false)
  const [visaProviderOption, setVisaProviderOption] = useState<'card' | 'yape'>('card')
  const [visaSessionExtendId, setVisaSessionExtendId] = useState('')
  const [visaFieldErrors, setVisaFieldErrors] = useState({
    nombre: false,
    apellido: false,
    email: false,
  })
  const [submitSummary, setSubmitSummary] = useState<null | {
    partida: string
    razSocCert: string
    refNumPart: string
    asiento: string
    costoServicio?: string
    costoTotal?: string
    message: string
  }>(null)
  const [assistantState, setAssistantState] = useState<VigenciaPoderAssistantState>(createEmptyVigenciaAssistantState())
  const [assistantMessages, setAssistantMessages] = useState<AssistantMessage[]>([
    {
      role: 'assistant',
      content:
        'Puedo completar contigo la solicitud de vigencia de poder de personas jurídicas. Escribe lo que ya tengas o empieza con la oficina registral y yo voy guiando el resto del flujo.',
    },
  ])
  const [assistantInput, setAssistantInput] = useState('')
  const [assistantLoading, setAssistantLoading] = useState(false)
  const assistantBottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const script = document.createElement('script')

    script.src = 'https://static-content.vnforapps.com/v2/js/checkout.js'
    script.async = true

    script.onload = () => {
      console.log('VisaNet SDK cargado', window.VisanetCheckout)
    }

    script.onerror = () => {
      console.error('No se pudo cargar VisaNet SDK')
    }

    document.body.appendChild(script)

    return () => {
      document.body.removeChild(script)
    }
  }, [])

  useEffect(() => {
    assistantBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [assistantMessages, assistantLoading])

  useEffect(() => {
    setAssistantState(current => ({
      ...current,
      oficinaRegistral,
      numero,
      asiento,
      cargoApoderado,
      apellidoPaterno,
      apellidoMaterno,
      nombres,
      declarationAccepted: acceptDeclaration,
    }))
  }, [acceptDeclaration, apellidoMaterno, apellidoPaterno, asiento, cargoApoderado, nombres, numero, oficinaRegistral])

  function handleNameChange(
    value: string,
    setValue: (nextValue: string) => void,
    setError: (nextError: string | null) => void,
  ) {
    const upperValue = value.toUpperCase().replace(/^\s+/, '')
    const hasInvalidChars = !NAME_ALLOWED_PATTERN.test(upperValue)

    setError(hasInvalidChars ? 'Solo se permiten letras y espacios (sin signos de puntuación).' : null)
    setValue(upperValue)
  }

  function applyAssistantFieldUpdates(
    fieldUpdates: Partial<Record<VigenciaPoderFieldKey, string>>,
    declarationAccepted?: boolean,
  ) {
    const nextState = mergeAssistantFieldUpdates(assistantState, fieldUpdates)
    if (typeof declarationAccepted === 'boolean') {
      nextState.declarationAccepted = declarationAccepted
      setAcceptDeclaration(declarationAccepted)
      if (declarationAccepted) {
        setRequiredErrors(current => ({ ...current, declaration: false }))
      }
    }

    if (fieldUpdates.oficinaRegistral) {
      setOficinaRegistral(fieldUpdates.oficinaRegistral)
      setRequiredErrors(current => ({ ...current, oficinaRegistral: false }))
    }
    if (fieldUpdates.numero) {
      setNumero(fieldUpdates.numero)
      setRequiredErrors(current => ({ ...current, numero: false }))
    }
    if (fieldUpdates.asiento) {
      setAsiento(fieldUpdates.asiento)
      setRequiredErrors(current => ({ ...current, asiento: false }))
    }
    if (fieldUpdates.cargoApoderado) {
      setCargoApoderado(fieldUpdates.cargoApoderado)
      setRequiredErrors(current => ({ ...current, cargoApoderado: false }))
    }
    if (fieldUpdates.apellidoPaterno) {
      setApellidoPaterno(fieldUpdates.apellidoPaterno)
      setRequiredErrors(current => ({ ...current, apellidoPaterno: false }))
    }
    if (fieldUpdates.apellidoMaterno) {
      setApellidoMaterno(fieldUpdates.apellidoMaterno)
    }
    if (fieldUpdates.nombres) {
      setNombres(fieldUpdates.nombres)
      setRequiredErrors(current => ({ ...current, nombres: false }))
    }

    setAssistantState(nextState)
  }

  async function handleAssistantSend(text?: string) {
    const msg = (text || assistantInput).trim()
    if (!msg || assistantLoading) return

    const userMsg: AssistantMessage = { role: 'user', content: msg }
    const nextMessages = [...assistantMessages, userMsg]
    const currentAssistantState = assistantState

    setAssistantMessages(nextMessages)
    setAssistantInput('')
    setAssistantLoading(true)

    try {
      const response = await fetch('/api/sprl/publicidad-registral/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moduleKey: 'vigencia_poder_personas_juridicas',
          messages: nextMessages,
          state: currentAssistantState,
          certificateName: certificate?.nombreCertificado || 'Certificado de Vigencia de Poder de Personas Jurídicas',
        }),
      })

      const data = await response.json().catch(() => ({})) as Partial<AssistantFlowResponse> & { error?: string }
      if (!response.ok || data.error) {
        throw new Error(data.error || 'No se pudo procesar el asistente.')
      }

      const assistantReply: AssistantMessage = {
        role: 'assistant',
        content: data.message || 'Continuemos con la solicitud.',
      }

      const nextAssistantSnapshot = mergeAssistantFieldUpdates(currentAssistantState, data.fieldUpdates || {})
      if (typeof data.declarationAccepted === 'boolean') {
        nextAssistantSnapshot.declarationAccepted = data.declarationAccepted
      }

      setAssistantMessages([...nextMessages, assistantReply])
      applyAssistantFieldUpdates(data.fieldUpdates || {}, data.declarationAccepted)

      if (data.shouldSubmit && canSubmitVigenciaAssistantState(nextAssistantSnapshot)) {
        await handleSolicitar({
          oficinaRegistral: nextAssistantSnapshot.oficinaRegistral,
          numero: nextAssistantSnapshot.numero,
          asiento: nextAssistantSnapshot.asiento,
          cargoApoderado: nextAssistantSnapshot.cargoApoderado,
          apellidoPaterno: nextAssistantSnapshot.apellidoPaterno,
          apellidoMaterno: nextAssistantSnapshot.apellidoMaterno,
          nombres: nextAssistantSnapshot.nombres,
          acceptDeclaration: nextAssistantSnapshot.declarationAccepted,
          asientos,
        })
      }
    } catch (error) {
      setAssistantMessages([...nextMessages, {
        role: 'assistant',
        content: error instanceof Error ? error.message : 'No se pudo procesar el asistente.',
      }])
    } finally {
      setAssistantLoading(false)
    }
  }

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
    setRequiredErrors(current => ({ ...current, asiento: false }))
  }

  function handleEliminarAsiento(id: string) {
    setAsientos(current => current.filter(item => item.id !== id))
  }

  async function handleSolicitar(snapshot?: {
    oficinaRegistral?: string
    numero?: string
    asiento?: string
    cargoApoderado?: string
    apellidoPaterno?: string
    apellidoMaterno?: string
    nombres?: string
    acceptDeclaration?: boolean
    asientos?: AsientoItem[]
  }) {
    const currentOficinaRegistral = snapshot?.oficinaRegistral ?? oficinaRegistral
    const currentNumero = snapshot?.numero ?? numero
    const currentAsiento = snapshot?.asiento ?? asiento
    const currentCargoApoderado = snapshot?.cargoApoderado ?? cargoApoderado
    const currentApellidoPaterno = snapshot?.apellidoPaterno ?? apellidoPaterno
    const currentApellidoMaterno = snapshot?.apellidoMaterno ?? apellidoMaterno
    const currentNombres = snapshot?.nombres ?? nombres
    const currentAcceptDeclaration = snapshot?.acceptDeclaration ?? acceptDeclaration
    const currentAsientos = snapshot?.asientos ?? asientos

    const hasAsiento = Boolean(currentAsientos[0]?.asiento || currentAsiento.trim().toUpperCase())
    const nextRequiredErrors = {
      oficinaRegistral: !currentOficinaRegistral,
      numero: !currentNumero.trim(),
      asiento: !hasAsiento,
      cargoApoderado: !currentCargoApoderado.trim(),
      apellidoPaterno: !currentApellidoPaterno.trim(),
      nombres: !currentNombres.trim(),
      declaration: !currentAcceptDeclaration,
    }

    setRequiredErrors(nextRequiredErrors)

    if (Object.values(nextRequiredErrors).some(Boolean)) {
      setSubmitError(null)
      return
    }

    if (apellidoPaternoError || apellidoMaternoError || nombresError) {
      setSubmitError('Corrige los campos de nombres: solo se permiten letras y espacios.')
      return
    }

    if (!certificate) {
      setSubmitError('No se encontró la configuración del certificado.')
      return
    }

    const asientoSeleccionadoValue = currentAsientos[0]?.asiento || currentAsiento.trim().toUpperCase()
    if (!asientoSeleccionadoValue) {
      setSubmitError('Debes ingresar al menos un asiento.')
      return
    }

    setSubmitError(null)
    setPayError(null)
    setSubmitLoading(true)

    try {
      const response = await fetch('/api/sprl/publicidad-registral/solicitar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          certificate,
          oficinaRegistral: currentOficinaRegistral,
          partida: currentNumero.trim(),
          asiento: asientoSeleccionadoValue,
          cargoApoderado: currentCargoApoderado,
          apellidoPaterno: normalizeForBackend(currentApellidoPaterno),
          apellidoMaterno: normalizeForBackend(currentApellidoMaterno),
          nombres: normalizeForBackend(currentNombres),
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
        partida: data.summary.partida || currentNumero.trim(),
        razSocCert: data.summary.razSocCert || '',
        refNumPart: data.summary.refNumPart || '',
        asiento: data.summary.asiento || asientoSeleccionadoValue,
        costoServicio: data.summary.costoServicio,
        costoTotal: data.summary.costoTotal,
        message: data.nextStep === 'pagar'
          ? 'SUNARP dejó la solicitud lista para pago. Revisa el resumen y continúa con el botón Pagar en la web real.'
          : data.message || 'Solicitud registrada correctamente.',
      })
      setShowPaymentForm(false)
      setSubmitted(true)
      setShowResumen(true)
      setRequiredErrors({
        oficinaRegistral: false,
        numero: false,
        asiento: false,
        cargoApoderado: false,
        apellidoPaterno: false,
        nombres: false,
        declaration: false,
      })
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'No se pudo registrar la solicitud')
    } finally {
      setSubmitLoading(false)
    }
  }

  function handleCerrarResumen() {
    setShowResumen(false)
  }

  async function handleIrAPagar() {
    if (!certificate || !submitSummary) return

    setPayError(null)
    setPayLoading(true)

    try {
      const response = await fetch('/api/sprl/publicidad-registral/pagar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flowKey: 'certificado',
          redirectPath: '/sprl/main/sp-certificada',
          certificate,
          partida: submitSummary.partida || numero.trim(),
          asiento: submitSummary.asiento || asientoSeleccionado,
          cargoApoderado,
          apellidoPaterno: normalizeForBackend(apellidoPaterno),
          apellidoMaterno: normalizeForBackend(apellidoMaterno),
          nombres: normalizeForBackend(nombres),
          refNumPart: submitSummary.refNumPart,
          razSocCert: submitSummary.razSocCert,
          costoServicio: submitSummary.costoServicio,
          costoTotal: submitSummary.costoTotal,
        }),
      })

      const data = await response.json().catch(() => ({})) as {
        ok?: boolean
        error?: string
        redirectUrl?: string
        message?: string
        applicant?: {
          apellidoPaterno?: string
          apellidoMaterno?: string
          nombres?: string
          numeroDocumento?: string
        }
      }

      if (response.status === 401) {
        onTokenExpired()
        return
      }

      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'No se pudo preparar el pago en SUNARP')
      }

      setPaymentApePaterno((data.applicant?.apellidoPaterno || apellidoPaterno).trim().toUpperCase())
      setPaymentApeMaterno((data.applicant?.apellidoMaterno || apellidoMaterno).trim().toUpperCase())
      setPaymentNombres((data.applicant?.nombres || nombres).trim().toUpperCase())
      setPaymentNumeroDocumento((data.applicant?.numeroDocumento || '').trim())
      setShowResumen(false)
      setShowPaymentForm(true)
    } catch (error) {
      setPayError(error instanceof Error ? error.message : 'No se pudo preparar el pago en SUNARP')
    } finally {
      setPayLoading(false)
    }
  }

  function formatCurrency(value?: string) {
    const amount = Number(value || '0')
    if (!Number.isFinite(amount) || amount <= 0) return 'S/. 33.00'
    return `S/. ${amount.toFixed(2)}`
  }

  function resolveMontoForPayment() {
    const raw = submitSummary?.costoTotal || submitSummary?.costoServicio || '33'
    const amount = Number(raw)
    if (!Number.isFinite(amount) || amount <= 0) return '33'
    if (Number.isInteger(amount)) return String(amount)
    return amount.toFixed(2)
  }

  async function handleTarjetaPayment() {
    setPayError(null)
    setPaymentActionLoading(true)

    try {
      const monto = resolveMontoForPayment()
      const response = await fetch('/api/sprl/publicidad-registral/payment/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monto }),
      })

      const data = await response.json().catch(() => ({})) as {
        ok?: boolean
        error?: string
        data?: {
          purchase?: string
        }
      }

      if (!response.ok || !data.ok || !data.data?.purchase) {
        throw new Error(data.error || 'No se pudo inicializar el pago con Visa/Mastercard.')
      }

      setVisaPurchaseCode(data.data.purchase)
      setVisaMonto(monto)
      setVisaTitularNombre(paymentNombres || '')
      setVisaTitularApellido([paymentApePaterno, paymentApeMaterno].filter(Boolean).join(' '))
      setVisaTitularEmail('')
      setVisaFieldErrors({ nombre: false, apellido: false, email: false })

      const ipResponse = await fetch('https://api.ipify.org/?format=json', {
        method: 'GET',
        cache: 'no-store',
      })
      const ipData = await ipResponse.json().catch(() => ({})) as { ip?: string }
      setVisaIpClient(String(ipData.ip || '').trim())

      setShowVisaGatewayView(true)
    } catch (error) {
      setPayError(error instanceof Error ? error.message : 'No se pudo inicializar el pago con Visa/Mastercard.')
    } finally {
      setPaymentActionLoading(false)
    }
  }

  async function handlePaymentAction() {
    if (paymentMethod === 'tarjeta') {
      await handleTarjetaPayment()
      return
    }

    setPayError(
      paymentMethod === 'saldo'
        ? 'Pago con saldo disponible: pendiente de implementación.'
        : 'Pago con Pagalo.pe: pendiente de implementación.',
    )
  }

  async function handleVisaContinue() {
    const nextErrors = {
      nombre: !visaTitularNombre.trim(),
      apellido: !visaTitularApellido.trim(),
      email: !visaTitularEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(visaTitularEmail.trim()),
    }
    setVisaFieldErrors(nextErrors)

    if (Object.values(nextErrors).some(Boolean)) return

    setPayError(null)
    setVisaContinueLoading(true)

    try {
      const infoBotonResponse = await fetch('/api/sprl/publicidad-registral/payment/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'visa_mastercard',
          action: 'info-boton',
          nombre: visaTitularNombre,
          apellido: visaTitularApellido,
          email: visaTitularEmail,
          purchase: visaPurchaseCode,
          importe: visaMonto,
          ipClient: visaIpClient,
        }),
      })

      const infoBotonData = await infoBotonResponse.json().catch(() => ({})) as {
        ok?: boolean
        error?: string
        data?: {
          extendSessionId?: string
        }
      }

      if (!infoBotonResponse.ok || !infoBotonData.ok) {
        throw new Error(infoBotonData.error || 'No se pudo ejecutar info-boton.')
      }

      const extendSessionId = String(infoBotonData.data?.extendSessionId || '').trim()
      if (!extendSessionId) {
        throw new Error('No se obtuvo extendSessionId desde info-boton.')
      }

      const clientIpResponse = await fetch('/api/sprl/publicidad-registral/payment/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'visa_mastercard',
          action: 'vn-clientip',
        }),
      })
      const clientIpData = await clientIpResponse.json().catch(() => ({})) as { ok?: boolean; error?: string }
      if (!clientIpResponse.ok || !clientIpData.ok) {
        throw new Error(clientIpData.error || 'No se pudo ejecutar vn-clientip.')
      }

      const merchantConfigResponse = await fetch('/api/sprl/publicidad-registral/payment/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'visa_mastercard',
          action: 'vn-merchant-config',
        }),
      })
      const merchantConfigData = await merchantConfigResponse.json().catch(() => ({})) as { ok?: boolean; error?: string }
      if (!merchantConfigResponse.ok || !merchantConfigData.ok) {
        throw new Error(merchantConfigData.error || 'No se pudo ejecutar vn-merchant-config.')
      }

      const extendResponse = await fetch('/api/sprl/publicidad-registral/payment/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'visa_mastercard',
          action: 'vn-extend-session',
          extendSessionId,
        }),
      })
      const extendData = await extendResponse.json().catch(() => ({})) as { ok?: boolean; error?: string }
      if (!extendResponse.ok || !extendData.ok) {
        throw new Error(extendData.error || 'No se pudo ejecutar vn-extend-session.')
      }

      const documentTypesResponse = await fetch('/api/sprl/publicidad-registral/payment/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'visa_mastercard',
          action: 'vn-document-types',
        }),
      })
      const documentTypesData = await documentTypesResponse.json().catch(() => ({})) as { ok?: boolean; error?: string }
      if (!documentTypesResponse.ok || !documentTypesData.ok) {
        throw new Error(documentTypesData.error || 'No se pudo ejecutar vn-document-types.')
      }

      setVisaSessionExtendId(extendSessionId)
      //setShowVisaProviderModal(true)
    } catch (error) {
      setPayError(error instanceof Error ? error.message : 'No se pudo preparar la previsualización de pasarela Visa.')
    } finally {
      setVisaContinueLoading(false)
    }
  }

const handleVisaCheckout = async () => {

  try {

    setVisaContinueLoading(true)


    const response = await fetch('/api/sprl/publicidad-registral/payment/checkout', {
      method:'POST',
      headers:{
        'Content-Type':'application/json',
      },
      body:JSON.stringify({
        provider:'visa_mastercard',
        action:'continue-preview',
        nombre:visaTitularNombre,
        apellido:visaTitularApellido,
        email:visaTitularEmail,
        purchase:visaPurchaseCode,
        importe:visaMonto,
      }),
    })


    const json = await response.json()


    if(!json.ok){
      throw new Error(json.error)
    }


    const cfg = json.data.configuration


    await loadVisaSDK()


    console.log(
      'SDK:',
      window.VisanetCheckout
    )

    console.log(
      'CONFIG:',
      cfg
    )


    window.VisanetCheckout.configure(cfg)

    window.VisanetCheckout.open()


  } catch(error){

    console.error(error)

    setPayError(
      error instanceof Error
      ? error.message
      : 'Error iniciando pago'
    )

  } finally {

    setVisaContinueLoading(false)

  }

}

const loadVisaSDK = () => {
  return new Promise<void>((resolve, reject) => {

    if (window.VisanetCheckout) {
      resolve()
      return
    }

    const script = document.createElement('script')

    script.src =
      'https://static-content.vnforapps.com/v2/js/checkout.js'

    script.onload = () => resolve()

    script.onerror = () =>
      reject(new Error('No se pudo cargar VisaNet SDK'))

    document.body.appendChild(script)
  })
}

  const apoderadoCompleto = [apellidoPaterno, apellidoMaterno, nombres]
    .map(value => normalizeForBackend(value).toUpperCase())
    .filter(Boolean)
    .join(' ')

  const asientoSeleccionado = asientos[0]?.asiento || asiento.trim().toUpperCase()
  const apellidoPaternoTieneValor = apellidoPaterno.trim().length > 0
  const apellidoMaternoTieneValor = apellidoMaterno.trim().length > 0
  const nombresTieneValor = nombres.trim().length > 0
  const apellidoPaternoValido = apellidoPaternoTieneValor && !apellidoPaternoError
  const apellidoMaternoValido = apellidoMaternoTieneValor && !apellidoMaternoError
  const nombresValido = nombresTieneValor && !nombresError

  if (showVisaGatewayView) {
    return (
      <VisaGatewayView
        purchaseCode={visaPurchaseCode}
        monto={visaMonto}
        titularNombre={visaTitularNombre}
        titularApellido={visaTitularApellido}
        titularEmail={visaTitularEmail}
        ipClient={visaIpClient}
        sessionExtendId={visaSessionExtendId}
        continueLoading={visaContinueLoading}
        payError={payError}
        fieldErrors={visaFieldErrors}
        onNombreChange={value => {
          setVisaTitularNombre(value)
          if (value.trim()) {
            setVisaFieldErrors(current => ({ ...current, nombre: false }))
          }
        }}
        onApellidoChange={value => {
          setVisaTitularApellido(value)
          if (value.trim()) {
            setVisaFieldErrors(current => ({ ...current, apellido: false }))
          }
        }}
        onEmailChange={value => {
          setVisaTitularEmail(value)
          if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
            setVisaFieldErrors(current => ({ ...current, email: false }))
          }
        }}
        onContinue={() => void handleVisaCheckout()}
        onBack={() => setShowVisaGatewayView(false)}
      />
    )
  }

  if (showPaymentForm) {
    return (
      <div className={styles.sprlFlowPage}>
        <div className={styles.sprlFlowShell}>
          <h1 className={styles.sprlFlowTitle}>Solicitar publicidad certificada (vigencias, CRI, etc)</h1>

          <div className={styles.sprlFlowSection}>
            <p className={styles.sprlSummaryText} style={{ marginBottom: 16 }}>
              Usted ha solicitado un: <strong>"CERTIFICADO DE VIGENCIA DE PODER DE PERSONAS JURÍDICAS"</strong> de la Partida:
              {' '}<strong>{submitSummary?.partida || numero.trim() || '—'}</strong>, Razon Social:
              {' '}<strong>{submitSummary?.razSocCert || '—'}</strong>. Por favor, complete los datos de envío y la forma de pago.
            </p>
          </div>

          <SectionHeader>DATOS DEL SOLICITANTE</SectionHeader>
          <div className={styles.sprlFlowSection}>
            <div className={styles.sprlFlowGrid}>
              <div className={styles.sprlFlowRow}>
                <span className={styles.sprlFlowLabel}>TIPO PERSONA:</span>
                <div className={styles.sprlFlowRadioGroup}>
                  <label className={styles.sprlFlowRadio}>
                    <input type="radio" checked readOnly />
                    <span>Persona Natural</span>
                  </label>
                  <label className={styles.sprlFlowRadio}>
                    <input type="radio" disabled />
                    <span>Persona Jurídica</span>
                  </label>
                </div>
              </div>

              <div className={styles.sprlFlowRow}>
                <span className={styles.sprlFlowLabel}>Apellido Paterno *:</span>
                <input className={styles.sprlFlowInput} value={paymentApePaterno} readOnly />
              </div>

              <div className={styles.sprlFlowRow}>
                <span className={styles.sprlFlowLabel}>Apellido Materno:</span>
                <input className={styles.sprlFlowInput} value={paymentApeMaterno} readOnly />
              </div>

              <div className={styles.sprlFlowRow}>
                <span className={styles.sprlFlowLabel}>Nombres *:</span>
                <input className={styles.sprlFlowInput} value={paymentNombres} readOnly />
              </div>

              <div className={styles.sprlFlowRow}>
                <span className={styles.sprlFlowLabel}>Tipo Documento *:</span>
                <input className={styles.sprlFlowInput} value="DNI-DOCUMENTO NACIONAL DE IDENTIDAD" readOnly />
              </div>

              <div className={styles.sprlFlowRow}>
                <span className={styles.sprlFlowLabel}>Número documento *:</span>
                <input className={styles.sprlFlowInput} value={paymentNumeroDocumento} readOnly />
              </div>
            </div>
          </div>

          <SectionHeader>DATOS DEL PAGO</SectionHeader>
          <div className={styles.sprlFlowSection}>
            <div className={styles.sprlFlowGrid}>
              <div className={styles.sprlFlowRow}>
                <span className={styles.sprlFlowLabel}>COSTO SERVICIO:</span>
                <div className={styles.sprlFlowInput} style={{ display: 'flex', alignItems: 'center' }}>{formatCurrency(submitSummary?.costoServicio)}</div>
              </div>

              <div className={styles.sprlFlowRow}>
                <span className={styles.sprlFlowLabel}>No CERTIFICADOS:</span>
                <input className={styles.sprlFlowInput} value="1" readOnly />
              </div>

              <div className={styles.sprlFlowRow}>
                <span className={styles.sprlFlowLabel}>TOTAL:</span>
                <div className={styles.sprlFlowInput} style={{ display: 'flex', alignItems: 'center', fontWeight: 700 }}>{formatCurrency(submitSummary?.costoTotal || submitSummary?.costoServicio)}</div>
              </div>

              <div className={styles.sprlFlowRow}>
                <span className={styles.sprlFlowLabel}>FORMA DE PAGO:</span>
                <div className={styles.sprlFlowRadioGroup}>
                  <label className={styles.sprlFlowRadio}>
                    <input type="radio" checked={paymentMethod === 'saldo'} onChange={() => setPaymentMethod('saldo')} />
                    <span>EN LÍNEA CON MI SALDO DISPONIBLE</span>
                  </label>
                  <label className={styles.sprlFlowRadio}>
                    <input type="radio" checked={paymentMethod === 'tarjeta'} onChange={() => setPaymentMethod('tarjeta')} />
                    <span>EN LÍNEA CON TARJETA VISA/MASTERCARD</span>
                  </label>
                  <label className={styles.sprlFlowRadio}>
                    <input type="radio" checked={paymentMethod === 'pagalo'} onChange={() => setPaymentMethod('pagalo')} />
                    <span>PAGALO.PE</span>
                  </label>
                </div>
              </div>
            </div>

            <div className={styles.sprlFlowActions} style={{ marginTop: 20 }}>
              <button type="button" className={styles.sprlFlowButtonSecondary} onClick={() => setShowPaymentForm(false)}>
                Regresar
              </button>
              <button type="button" className={styles.sprlFlowButtonPrimary} onClick={() => void handlePaymentAction()} disabled={paymentActionLoading}>
                {paymentActionLoading ? 'Procesando...' : 'Pagar'}
              </button>
            </div>

            {payError && (
              <div className={styles.sprlSummarySuccess} style={{ marginTop: 12, background: 'rgba(192, 57, 43, 0.08)', borderColor: 'rgba(192, 57, 43, 0.35)', color: '#9d1f11' }}>
                {payError}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

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

        <div
          className={styles.sprlFlowSection}
          style={{
            marginBottom: 18,
            background: 'linear-gradient(180deg, rgba(20, 32, 62, 0.04), rgba(255,255,255,0.92))',
            border: '1px solid rgba(20, 32, 62, 0.08)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <div className={styles.sprlFlowLabel} style={{ marginBottom: 6 }}>ASISTENTE IA DE VIGENCIA</div>
              <div style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.6 }}>
                Te guía paso a paso, captura los datos del trámite y puede disparar la solicitud cuando confirmes el resumen.
              </div>
            </div>
            <div style={{ textAlign: 'right', fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
              <div>{canSubmitVigenciaAssistantState(assistantState) ? 'Datos completos' : 'Capturando datos'}</div>
              <div>{getVigenciaMissingFields(assistantState).length > 0 ? `Faltan: ${getVigenciaMissingFields(assistantState).map(field => VIGENCIA_FIELD_LABELS[field]).join(', ')}` : 'Listo para confirmar'}</div>
            </div>
          </div>

          <div
            style={{
              maxHeight: 280,
              overflowY: 'auto',
              padding: '14px 14px 10px',
              border: '1px solid rgba(20, 32, 62, 0.08)',
              borderRadius: 12,
              background: 'rgba(255,255,255,0.88)',
            }}
          >
            {assistantMessages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                style={{
                  display: 'flex',
                  justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    maxWidth: '88%',
                    padding: '10px 12px',
                    borderRadius: 12,
                    background: message.role === 'user' ? 'rgba(20, 32, 62, 0.95)' : 'rgba(95, 126, 48, 0.10)',
                    color: message.role === 'user' ? '#fff' : '#203018',
                    fontSize: 13,
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {message.content}
                </div>
              </div>
            ))}
            {assistantLoading && (
              <div style={{ fontSize: 12, color: 'var(--muted)', padding: '4px 2px' }}>Analizando datos...</div>
            )}
            <div ref={assistantBottomRef} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, marginTop: 12, alignItems: 'end' }}>
            <textarea
              value={assistantInput}
              onChange={event => setAssistantInput(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  void handleAssistantSend()
                }
              }}
              placeholder="Escribe aquí el dato que tengas o responde confirmando la solicitud..."
              rows={2}
              style={{
                resize: 'vertical',
                minHeight: 56,
                padding: '12px 14px',
                borderRadius: 12,
                border: '1px solid rgba(20, 32, 62, 0.16)',
                fontFamily: 'var(--font-body)',
                fontSize: 14,
                lineHeight: 1.5,
                color: 'var(--ink)',
                background: '#fff',
              }}
            />
            <button
              type="button"
              className={styles.sprlFlowButtonPrimary}
              onClick={() => void handleAssistantSend()}
              disabled={assistantLoading || !assistantInput.trim()}
              style={{ minWidth: 150 }}
            >
              {assistantLoading ? 'Procesando...' : 'Enviar al asistente'}
            </button>
          </div>

          <div style={{ marginTop: 10, fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
            Puedes escribir datos sueltos como "LIMA", "Partida 12345", "Asiento B7" o incluso "sí, enviar" cuando ya esté todo completo.
          </div>
        </div>

        <SectionHeader>DATOS REGISTRALES</SectionHeader>

        <div className={styles.sprlFlowSection}>
          <div className={styles.sprlFlowGrid}>
            <SelectRow
              label="OFICINA REGISTRAL*:"
              placeholder="Seleccionar"
              options={registryOptions}
              value={oficinaRegistral}
              onChange={value => {
                setOficinaRegistral(value)
                if (value) {
                  setRequiredErrors(current => ({ ...current, oficinaRegistral: false }))
                }
              }}
              error={requiredErrors.oficinaRegistral ? 'Este campo es obligatorio.' : null}
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
              <div>
                <input
                  className={styles.sprlFlowInput}
                  placeholder="Escriba aquí..."
                  name='numeroPartida'
                  value={numero}
                  onChange={event => {
                    setNumero(event.target.value)
                    if (event.target.value.trim()) {
                      setRequiredErrors(current => ({ ...current, numero: false }))
                    }
                  }}
                />
                {requiredErrors.numero && <span className={styles.sprlFlowFieldError}>Este campo es obligatorio.</span>}
              </div>
            </label>

            <label className={styles.sprlFlowRow}>
              <span className={styles.sprlFlowLabel}>N° Asiento:</span>
              <div>
                <input
                  className={styles.sprlFlowInput}
                  placeholder="Escriba aquí..."
                  name='numeroAsiento'
                  value={asiento}
                  onChange={event => {
                    setAsiento(event.target.value.toUpperCase())
                    if (event.target.value.trim()) {
                      setRequiredErrors(current => ({ ...current, asiento: false }))
                    }
                  }}
                />
                {requiredErrors.asiento && <span className={styles.sprlFlowFieldError}>Debes ingresar al menos un asiento.</span>}
              </div>
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
                name='cargoApoderado'
                value={cargoApoderado}
                onChange={event => {
                  setCargoApoderado(event.target.value.toUpperCase())
                  if (event.target.value.trim()) {
                    setRequiredErrors(current => ({ ...current, cargoApoderado: false }))
                  }
                }}
              />
              {requiredErrors.cargoApoderado && <span className={styles.sprlFlowFieldError}>Este campo es obligatorio.</span>}
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
              <div>
                <div className={styles.sprlFlowInputStatusWrap}>
                  <input
                    className={styles.sprlFlowInput}
                    placeholder="Escriba aquí..."
                    name='apellidoPaterno'
                    value={apellidoPaterno}
                    onChange={event => {
                      handleNameChange(event.target.value, setApellidoPaterno, setApellidoPaternoError)
                      if (event.target.value.trim()) {
                        setRequiredErrors(current => ({ ...current, apellidoPaterno: false }))
                      }
                    }}
                  />
                  <span
                    className={`${styles.sprlFlowRealtimeCheck} ${apellidoPaternoTieneValor ? styles.sprlFlowRealtimeCheckVisible : ''} ${!apellidoPaternoValido && apellidoPaternoTieneValor ? styles.sprlFlowRealtimeCheckInvalid : ''}`}
                    aria-hidden="true"
                  >
                    {apellidoPaternoValido ? '✓' : '✕'}
                  </span>
                </div>
                {requiredErrors.apellidoPaterno && <span className={styles.sprlFlowFieldError}>Este campo es obligatorio.</span>}
                {!requiredErrors.apellidoPaterno && apellidoPaternoError && <span className={styles.sprlFlowFieldError}>{apellidoPaternoError}</span>}
              </div>
            </div>

            <div className={styles.sprlFlowRow}>
              <span className={styles.sprlFlowLabel}>Apellido Materno:</span>
              <div>
                <div className={styles.sprlFlowInputStatusWrap}>
                  <input
                    className={styles.sprlFlowInput}
                    placeholder="Escriba aquí..."
                    name='apellidoMaterno'
                    value={apellidoMaterno}
                    onChange={event => handleNameChange(event.target.value, setApellidoMaterno, setApellidoMaternoError)}
                  />
                  <span
                    className={`${styles.sprlFlowRealtimeCheck} ${apellidoMaternoTieneValor ? styles.sprlFlowRealtimeCheckVisible : ''} ${!apellidoMaternoValido && apellidoMaternoTieneValor ? styles.sprlFlowRealtimeCheckInvalid : ''}`}
                    aria-hidden="true"
                  >
                    {apellidoMaternoValido ? '✓' : '✕'}
                  </span>
                </div>
                {apellidoMaternoError && <span className={styles.sprlFlowFieldError}>{apellidoMaternoError}</span>}
              </div>
            </div>

            <div className={styles.sprlFlowRow}>
              <span className={styles.sprlFlowLabel}>Nombres *:</span>
              <div>
                <div className={styles.sprlFlowInputStatusWrap}>
                  <input
                    className={styles.sprlFlowInput}
                    placeholder="Escriba aquí..."
                    name='nombres'
                    value={nombres}
                    onChange={event => {
                      handleNameChange(event.target.value, setNombres, setNombresError)
                      if (event.target.value.trim()) {
                        setRequiredErrors(current => ({ ...current, nombres: false }))
                      }
                    }}
                  />
                  <span
                    className={`${styles.sprlFlowRealtimeCheck} ${nombresTieneValor ? styles.sprlFlowRealtimeCheckVisible : ''} ${!nombresValido && nombresTieneValor ? styles.sprlFlowRealtimeCheckInvalid : ''}`}
                    aria-hidden="true"
                  >
                    {nombresValido ? '✓' : '✕'}
                  </span>
                </div>
                {requiredErrors.nombres && <span className={styles.sprlFlowFieldError}>Este campo es obligatorio.</span>}
                {!requiredErrors.nombres && nombresError && <span className={styles.sprlFlowFieldError}>{nombresError}</span>}
              </div>
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
          <input
            type="checkbox"
            style={{ marginTop: 4 }}
            checked={acceptDeclaration}
            onChange={event => {
              setAcceptDeclaration(event.target.checked)
              if (event.target.checked) {
                setRequiredErrors(current => ({ ...current, declaration: false }))
              }
            }}
          />
          <span style={{ color: '#4b6b00', lineHeight: 1.6 }}>
            Declaro conocer las implicancias del servicio de publicidad registral solicitado: "Certificado de Vigencia
            de Poder del Registro de Personas Jurídicas" acredita las facultades vigentes de un representante o
            apoderado.
          </span>
        </label>

        <div className={styles.sprlFlowDeclarationStatus} aria-live="polite">
          {acceptDeclaration ? '✓ Declaración aceptada' : 'Debes marcar la declaración para continuar'}
        </div>
        {requiredErrors.declaration && <div className={styles.sprlFlowFieldError}>Este campo es obligatorio.</div>}

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
                <p className={styles.sprlSummarySmall}>
                  Al hacer click en <strong>Ir a pagar</strong>, SUNARP abre la misma URL y cambia la vista internamente al formulario de pago.
                </p>
              </div>

              <div className={styles.sprlSummaryFooter}>
                <button type="button" className={styles.sprlSummarySecondary} onClick={() => setShowResumen(false)}>
                  Cancelar
                </button>
                <button type="button" className={styles.sprlSummaryPrimary} onClick={() => void handleIrAPagar()} disabled={payLoading}>
                  {payLoading ? 'Preparando...' : 'Ir a pagar'}
                </button>
              </div>

              {payError && (
                <div className={styles.sprlSummarySuccess} style={{ background: 'rgba(192, 57, 43, 0.08)', borderColor: 'rgba(192, 57, 43, 0.35)', color: '#9d1f11' }}>
                  {payError}
                </div>
              )}

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
