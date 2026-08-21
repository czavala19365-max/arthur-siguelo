'use client'

import type { ReactNode } from 'react'
import styles from '../../app/dashboard/publicidad-registral/[codigo]/publicidad-registral.module.css'

export type VisaGatewayFieldErrors = {
  nombre: boolean
  apellido: boolean
  email: boolean
}

type Props = {
  purchaseCode: string
  monto: string
  titularNombre: string
  titularApellido: string
  titularEmail: string
  ipClient?: string
  sessionExtendId?: string
  continueLoading?: boolean
  payError?: string | null
  fieldErrors: VisaGatewayFieldErrors
  onNombreChange: (value: string) => void
  onApellidoChange: (value: string) => void
  onEmailChange: (value: string) => void
  onContinue: () => void | Promise<void>
  onBack: () => void
  backLabel?: string
  headerLabel?: string
  notes?: ReactNode
}

export default function VisaGatewayView({
  purchaseCode,
  monto,
  titularNombre,
  titularApellido,
  titularEmail,
  ipClient,
  sessionExtendId,
  continueLoading = false,
  payError,
  fieldErrors,
  onNombreChange,
  onApellidoChange,
  onEmailChange,
  onContinue,
  onBack,
  backLabel = 'Regresar',
  headerLabel = 'PASARELA ELECTRONICA DE PAGOS',
  notes,
}: Props) {
  return (
    <div className={styles.sprlFlowPage}>
      <div className={styles.sprlFlowShell}>
        <div className={styles.sprlGatewayHeaderText}>{headerLabel}</div>
        <div className={styles.sprlGatewayProgressBar}>
          <span className={styles.sprlGatewayProgressOne} />
          <span className={styles.sprlGatewayProgressTwo} />
          <span className={styles.sprlGatewayProgressThree} />
          <span className={styles.sprlGatewayProgressFour} />
        </div>

        <div className={styles.sprlGatewayPanel}>
          <h2 className={styles.sprlGatewayTitle}>Ingrese los datos del titular de la tarjeta:</h2>

          <div className={styles.sprlGatewayFormBox}>
            <div className={styles.sprlGatewayGrid}>
              <label className={styles.sprlGatewayRow}>
                <span className={styles.sprlFlowLabel}>Nombre * :</span>
                <div>
                  <input
                    className={styles.sprlFlowInput}
                    placeholder="Ingrese sus nombres"
                    value={titularNombre}
                    onChange={event => onNombreChange(event.target.value)}
                  />
                  {fieldErrors.nombre && <span className={styles.sprlFlowFieldError}>Este campo es obligatorio.</span>}
                </div>
              </label>

              <label className={styles.sprlGatewayRow}>
                <span className={styles.sprlFlowLabel}>Apellido * :</span>
                <div>
                  <input
                    className={styles.sprlFlowInput}
                    placeholder="Ingrese sus apellidos"
                    value={titularApellido}
                    onChange={event => onApellidoChange(event.target.value)}
                  />
                  {fieldErrors.apellido && <span className={styles.sprlFlowFieldError}>Este campo es obligatorio.</span>}
                </div>
              </label>

              <label className={styles.sprlGatewayRowWide}>
                <span className={styles.sprlFlowLabel}>Email * :</span>
                <div>
                  <input
                    className={styles.sprlFlowInput}
                    name='email'
                    placeholder="Ingrese su correo electrónico"
                    value={titularEmail}
                    onChange={event => onEmailChange(event.target.value)}
                  />
                  {fieldErrors.email && <span className={styles.sprlFlowFieldError}>Ingrese un correo válido.</span>}
                </div>
              </label>
            </div>

            <div className={styles.sprlGatewayActions}>
              <button
                type="button"
                className={styles.sprlFlowButtonPrimary}
                onClick={() => void onContinue()}
                disabled={continueLoading}
              >
                {continueLoading ? 'Procesando...' : '→ Continuar'}
              </button>
            </div>

            {ipClient ? (
              <div className={styles.sprlGatewayMeta}>IP cliente: <strong>{ipClient}</strong></div>
            ) : null}
          </div>

          <div className={styles.sprlGatewayWarningTitle}>Tener en cuenta lo siguiente antes de continuar:</div>
          <ul className={styles.sprlGatewayNotes}>
            {notes ?? (
              <>
                <li>Asegurarse que su tarjeta tenga la opción de compras por internet habilitada.</li>
                <li>Verificar su límite de compras por internet, por importe o número de transacciones diarias.</li>
                <li>Asimismo, pueden realizar las consultas ante su entidad financiera.</li>
              </>
            )}
          </ul>
        </div>

        <div className={styles.sprlFlowActions} style={{ marginTop: 20 }}>
          <button type="button" className={styles.sprlFlowButtonSecondary} onClick={onBack}>
            {backLabel}
          </button>
        </div>

        {payError && (
          <div className={styles.sprlSummarySuccess} style={{ marginTop: 12, background: 'rgba(192, 57, 43, 0.08)', borderColor: 'rgba(192, 57, 43, 0.35)', color: '#9d1f11' }}>
            {payError}
          </div>
        )}
      </div>
    </div>
  )
}