import Link from 'next/link'

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
  selectorRow: {
    display: 'grid',
    gridTemplateColumns: '220px 1fr',
    gap: 18,
    alignItems: 'start',
  },
  methodCol: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 18,
  },
  methodOption: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    fontFamily: 'var(--font-body)',
    fontSize: 15,
    color: 'var(--ink)',
  },
  brand: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    fontFamily: 'var(--font-mono)',
    fontSize: 18,
    fontWeight: 700,
    color: 'var(--ink)',
    marginTop: 8,
  },
  cardBrand: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '4px 0',
    fontFamily: 'var(--font-mono)',
    fontSize: 14,
    color: 'var(--ink)',
  },
  inputRow: {
    marginTop: 28,
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
} as const

export default function RecargarSaldoPage() {
  return (
    <>
      <style>{`
        .sprl-recharge-page { padding: ${PAGE_PADDING}; }
        @media (max-width: 768px) {
          .sprl-recharge-page { padding: ${PAGE_PADDING_MOBILE}; }
          .sprl-recharge-selector { grid-template-columns: 1fr !important; }
          .sprl-recharge-input-row { grid-template-columns: 1fr !important; }
          .sprl-recharge-input-label { text-align: left !important; }
          .sprl-recharge-method-col { gap: 14px; }
        }
      `}</style>

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

            <div style={styles.selectorRow}>
              <div className="sprl-recharge-method-col" style={styles.methodCol}>
                <label style={styles.methodOption}>
                  <input type="radio" name="medioPago" defaultChecked />
                  <span>Tarjeta de Crédito o Débito</span>
                </label>
                <div style={{ paddingLeft: 28 }}>
                  <div style={styles.brand}>
                    <span style={{ color: '#1a4aa0' }}>VISA</span>
                    <span style={{ color: '#e53935' }}>MasterCard</span>
                  </div>
                </div>

                <label style={styles.methodOption}>
                  <input type="radio" name="medioPago" />
                  <span>Via pagalo pe</span>
                </label>
                <div style={{ paddingLeft: 28 }}>
                  <div style={styles.cardBrand}>pagalo.pe</div>
                </div>
              </div>

              <div>
                <div className="sprl-recharge-input-row" style={styles.inputRow}>
                  <div className="sprl-recharge-input-label" style={styles.inputLabel}>Monto *:</div>
                  <input className="sprl-recharge-input" style={styles.input} placeholder="Escriba aquí..." defaultValue="" />
                </div>
                <div style={styles.buttonRow}>
                  <button type="button" style={styles.continueButton}>
                    → Continuar
                  </button>
                </div>

                <div style={styles.footerNote}>
                  Para realizar correctamente el pago, por favor verificar el bloqueo de ventanas emergentes de su navegador.
                  <br />
                  Para mayor seguridad, adicione una contraseña personal al pago de nuestro servicio y evite el uso no autorizado de su tarjeta. Afilié su tarjeta a Verified by Visa.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
