import Link from 'next/link'

export default function PublicidadRegistralPage() {
  return (
    <div style={{
      padding: '48px 64px',
      background: 'var(--paper)',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        maxWidth: '560px',
        width: '100%',
        textAlign: 'center',
      }}>

        {/* Ícono */}
        <div style={{
          width: '80px',
          height: '80px',
          margin: '0 auto 32px',
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <path d="M14 2v6h6" />
            <circle cx="12" cy="14" r="3" />
            <path d="M12 11V9.5" />
          </svg>
        </div>

        {/* Etiqueta */}
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          textTransform: 'uppercase',
          letterSpacing: '0.15em',
          color: 'var(--accent)',
          marginBottom: '16px',
        }}>
          Módulo en desarrollo
        </div>

        {/* Título */}
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(26px, 4vw, 40px)',
          color: 'var(--ink)',
          fontWeight: 700,
          fontStyle: 'italic',
          lineHeight: 1.15,
          marginBottom: '20px',
        }}>
          Publicidad Registral
        </h1>

        {/* Separador */}
        <div style={{
          width: '48px',
          height: '2px',
          background: 'rgba(194,164,109,0.4)',
          margin: '0 auto 24px',
        }} />

        {/* Texto */}
        <p style={{
          fontFamily: 'var(--font-body)',
          fontSize: '15px',
          color: 'var(--muted)',
          lineHeight: 1.7,
          marginBottom: '32px',
        }}>
          Estamos trabajando para traerte acceso a la Publicidad Registral de SUNARP.
          Pronto podrás consultar vigencias de poder, copias literales y más.
        </p>

        {/* Badge construcción */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 18px',
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          marginBottom: '40px',
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: 'var(--muted)',
        }}>
          <span style={{ fontSize: '14px' }}>🚧</span>
          Arthur está trabajando en este módulo
        </div>

        {/* Botón */}
        <div>
          <Link
            href="/dashboard"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '11px 24px',
              background: 'var(--ink)',
              color: 'var(--paper)',
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              textDecoration: 'none',
              borderRadius: '3px',
              transition: 'opacity 0.15s',
            }}
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            Volver al Inicio
          </Link>
        </div>

      </div>
    </div>
  )
}
