'use client'

interface Props {
  value: string
  onChange: (v: string) => void
}

export default function BuscadorTitulos({ value, onChange }: Props) {
  return (
    <div style={{ position: 'relative' }}>
      {/* Ícono lupa */}
      <div style={{
        position: 'absolute',
        left: '16px',
        top: '50%',
        transform: 'translateY(-50%)',
        pointerEvents: 'none',
        color: 'var(--accent)',
        display: 'flex',
        alignItems: 'center',
      }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="6.5" cy="6.5" r="4.5" />
          <path d="M10 10l4 4" />
        </svg>
      </div>

      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Buscar por número de título, año, cliente, asunto o estado..."
        style={{
          width: '100%',
          boxSizing: 'border-box',
          paddingLeft: '44px',
          paddingRight: value ? '40px' : '16px',
          paddingTop: '13px',
          paddingBottom: '13px',
          fontFamily: 'var(--font-body)',
          fontSize: '14px',
          color: 'var(--ink)',
          background: 'var(--surface)',
          border: '1px solid var(--line-mid)',
          borderRadius: '4px',
          outline: 'none',
          transition: 'border-color 0.15s',
        }}
        onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
        onBlur={e => (e.currentTarget.style.borderColor = 'var(--line-mid)')}
      />

      {/* Botón limpiar */}
      {value && (
        <button
          onClick={() => onChange('')}
          style={{
            position: 'absolute',
            right: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--muted)',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
          }}
          aria-label="Limpiar búsqueda"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}
