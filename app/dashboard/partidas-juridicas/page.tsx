'use client'

import { useState, useCallback } from 'react'
import type { PersonaJuridica, BusquedaResult } from '@/app/api/personas-juridicas/buscar/route'

// ── Skeleton row ─────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <tr>
      {[5, 12, 45, 22, 16].map((w, i) => (
        <td key={i} style={{ padding: '12px 16px' }}>
          <div style={{
            width: `${w}%`,
            minWidth: '32px',
            height: '14px',
            background: 'var(--line)',
            borderRadius: '3px',
            animation: 'pulse 1.4s ease-in-out infinite',
          }} />
        </td>
      ))}
    </tr>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PartidasJuridicasPage() {
  const [razon,  setRazon]  = useState('')
  const [siglas, setSiglas] = useState('')
  const [pagina, setPagina] = useState(1)

  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [resultado, setResultado] = useState<BusquedaResult | null>(null)

  // Búsqueda: página puede sobreescribirse (paginación)
  const buscar = useCallback(async (paginaTarget = 1) => {
    const r = razon.trim()
    const s = siglas.trim()

    if (r.length === 0 && s.length === 0) return
    if (r.length > 0 && r.length < 3) { setError('La razón social debe tener al menos 3 caracteres.'); return }
    if (s.length > 0 && s.length < 3) { setError('Las siglas deben tener al menos 3 caracteres.'); return }

    setLoading(true)
    setError(null)
    setPagina(paginaTarget)

    try {
      const params = new URLSearchParams({
        razon:  r.toUpperCase(),
        siglas: s.toUpperCase(),
        pagina: String(paginaTarget),
      })
      const res  = await fetch(`/api/personas-juridicas/buscar?${params}`)
      const data = await res.json() as BusquedaResult & { error?: string }
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`)
      setResultado(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al conectar con SUNARP.')
      setResultado(null)
    } finally {
      setLoading(false)
    }
  }, [razon, siglas])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') buscar(1)
  }

  const handlePrev = () => { if (pagina > 1) buscar(pagina - 1) }
  const handleNext = () => { if (resultado && pagina < resultado.totalPaginas) buscar(pagina + 1) }

  const hasResults = resultado && resultado.resultados.length > 0
  const empty      = resultado && resultado.resultados.length === 0 && !loading

  return (
    <>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: .4; }
        }
        .pj-input {
          width: 100%;
          box-sizing: border-box;
          padding: 12px 16px;
          font-family: var(--font-body);
          font-size: 14px;
          color: var(--ink);
          background: var(--surface);
          border: 1px solid var(--line-mid);
          border-radius: 4px;
          outline: none;
          transition: border-color .15s;
        }
        .pj-input:focus { border-color: var(--accent); }
        .pj-input::placeholder { color: var(--muted); }
        .pj-btn-primary {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 12px 28px;
          background: var(--accent);
          color: #fff;
          font-family: var(--font-mono);
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: .1em;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          transition: opacity .15s;
          white-space: nowrap;
        }
        .pj-btn-primary:hover:not(:disabled) { opacity: .85; }
        .pj-btn-primary:disabled { opacity: .4; cursor: not-allowed; }
        .pj-btn-page {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 8px 18px;
          background: var(--surface);
          color: var(--ink);
          font-family: var(--font-mono);
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: .08em;
          border: 1px solid var(--line-mid);
          border-radius: 4px;
          cursor: pointer;
          transition: border-color .15s, background .15s;
        }
        .pj-btn-page:hover:not(:disabled) { border-color: var(--accent); background: var(--paper); }
        .pj-btn-page:disabled { opacity: .35; cursor: not-allowed; }
        .pj-row { transition: background .12s; }
        .pj-row:hover { background: color-mix(in srgb, var(--accent) 5%, var(--surface)); }
      `}</style>

      <div style={{ padding: '48px 64px', background: 'var(--paper)', minHeight: '100vh' }}>

        {/* ── Header ── */}
        <div style={{
          borderLeft: '4px solid var(--accent)',
          paddingLeft: '24px',
          marginBottom: '40px',
        }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '.15em',
            color: 'var(--accent)',
            marginBottom: '8px',
          }}>
            SUNARP · Registro de Personas Jurídicas
          </div>
          <h1 style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'clamp(24px, 3.5vw, 40px)',
            color: 'var(--ink)',
            fontWeight: 600,
            lineHeight: 1.1,
            margin: 0,
          }}>
            Búsqueda de Partidas — Personas Jurídicas
          </h1>
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: '14px',
            color: 'var(--muted)',
            marginTop: '10px',
            marginBottom: 0,
          }}>
            Consulta el Directorio Nacional de Personas Jurídicas Inscritas en SUNARP
          </p>
        </div>

        {/* ── Formulario ── */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: '6px',
          padding: '28px 32px',
          marginBottom: '32px',
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr auto',
            gap: '16px',
            alignItems: 'flex-end',
          }}>

            {/* Razón Social */}
            <div>
              <label style={{
                display: 'block',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '.1em',
                color: 'var(--muted)',
                marginBottom: '8px',
              }}>
                Razón Social o Denominación
              </label>
              <input
                className="pj-input"
                type="text"
                value={razon}
                onChange={e => setRazon(e.target.value.toUpperCase())}
                onKeyDown={handleKeyDown}
                placeholder="Ej: BEAR CREEK, INMOBILIARIA..."
                maxLength={200}
                autoFocus
              />
            </div>

            {/* Siglas */}
            <div>
              <label style={{
                display: 'block',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '.1em',
                color: 'var(--muted)',
                marginBottom: '8px',
              }}>
                Siglas <span style={{ color: 'var(--line-mid)', fontStyle: 'italic', textTransform: 'none', letterSpacing: 0 }}>(opcional)</span>
              </label>
              <input
                className="pj-input"
                type="text"
                value={siglas}
                onChange={e => setSiglas(e.target.value.toUpperCase())}
                onKeyDown={handleKeyDown}
                placeholder="Ej: SAC, EIRL..."
                maxLength={100}
              />
            </div>

            {/* Botón */}
            <button
              className="pj-btn-primary"
              onClick={() => buscar(1)}
              disabled={loading || (razon.trim().length < 3 && siglas.trim().length < 3)}
            >
              {loading ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  Buscando...
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <path d="M21 21l-4.35-4.35" />
                  </svg>
                  Buscar
                </>
              )}
            </button>
          </div>

          {/* Nota */}
          <div style={{
            marginTop: '12px',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: 'var(--muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
            Solo acepta letras, números, Ñ y espacios · Mínimo 3 caracteres
          </div>
        </div>

        {/* ── Error ── */}
        {error && (
          <div style={{
            padding: '14px 20px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '4px',
            marginBottom: '24px',
            fontFamily: 'var(--font-body)',
            fontSize: '14px',
            color: '#b91c1c',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
            {error}
          </div>
        )}

        {/* ── Tabla ── */}
        {(loading || hasResults || empty) && (
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: '6px',
            overflow: 'hidden',
          }}>

            {/* Meta-info */}
            {!loading && resultado && (
              <div style={{
                padding: '14px 24px',
                borderBottom: '1px solid var(--line)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px',
              }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
                  {resultado.resultados.length > 0
                    ? `${resultado.resultados.length} resultados — página ${pagina} de ${resultado.totalPaginas}`
                    : 'Sin resultados'}
                </span>
                {resultado.resultados.length > 0 && (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent)' }}>
                    ~{resultado.totalResultados.toLocaleString('es-PE')} registros encontrados
                  </span>
                )}
              </div>
            )}

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'auto' }}>
                <thead>
                  <tr style={{ background: 'var(--paper)', borderBottom: '2px solid var(--line)' }}>
                    {['N°', 'Partida', 'Razón / Denominación', 'Siglas', 'Oficina'].map((col, i) => (
                      <th key={col} style={{
                        padding: '12px 16px',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '11px',
                        textTransform: 'uppercase',
                        letterSpacing: '.1em',
                        color: 'var(--muted)',
                        textAlign: i === 0 ? 'center' : 'left',
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                      }}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading
                    ? Array.from({ length: 10 }, (_, i) => <SkeletonRow key={i} />)
                    : resultado?.resultados.map((r, idx) => (
                        <tr
                          key={r.partida + idx}
                          className="pj-row"
                          style={{
                            background: idx % 2 === 0 ? 'var(--surface)' : 'var(--paper)',
                            borderBottom: '1px solid var(--line)',
                          }}
                        >
                          {/* N° */}
                          <td style={{
                            padding: '12px 16px',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '12px',
                            color: 'var(--muted)',
                            textAlign: 'center',
                          }}>
                            {(pagina - 1) * 20 + r.numero}
                          </td>

                          {/* Partida — destacado */}
                          <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                            <span style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: '13px',
                              fontWeight: 700,
                              color: 'var(--accent)',
                              letterSpacing: '.03em',
                            }}>
                              {r.partida}
                            </span>
                          </td>

                          {/* Razón Social */}
                          <td style={{
                            padding: '12px 16px',
                            fontFamily: 'var(--font-body)',
                            fontSize: '13px',
                            color: 'var(--ink)',
                            lineHeight: 1.4,
                            maxWidth: '420px',
                          }}>
                            {r.razon}
                          </td>

                          {/* Siglas */}
                          <td style={{
                            padding: '12px 16px',
                            fontFamily: 'var(--font-body)',
                            fontSize: '12px',
                            color: 'var(--muted)',
                            lineHeight: 1.4,
                            maxWidth: '200px',
                          }}>
                            {r.siglas || '—'}
                          </td>

                          {/* Oficina */}
                          <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '3px 10px',
                              background: 'var(--paper)',
                              border: '1px solid var(--line)',
                              borderRadius: '3px',
                              fontFamily: 'var(--font-mono)',
                              fontSize: '10px',
                              textTransform: 'uppercase',
                              letterSpacing: '.06em',
                              color: 'var(--muted)',
                            }}>
                              {r.oficina}
                            </span>
                          </td>
                        </tr>
                      ))
                  }
                </tbody>
              </table>
            </div>

            {/* Sin resultados */}
            {empty && (
              <div style={{
                padding: '56px 24px',
                textAlign: 'center',
                fontFamily: 'var(--font-body)',
                fontSize: '14px',
                color: 'var(--muted)',
              }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--line-mid)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '16px' }}>
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                  <path d="M8 11h6" />
                </svg>
                <p style={{ margin: 0 }}>No se encontraron personas jurídicas para esa búsqueda.</p>
              </div>
            )}

            {/* Paginación */}
            {!loading && resultado && resultado.totalPaginas > 1 && (
              <div style={{
                padding: '16px 24px',
                borderTop: '1px solid var(--line)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '16px',
              }}>
                <button className="pj-btn-page" onClick={handlePrev} disabled={pagina <= 1}>
                  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                  Anterior
                </button>

                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                  color: 'var(--muted)',
                }}>
                  {pagina} / {resultado.totalPaginas}
                </span>

                <button className="pj-btn-page" onClick={handleNext} disabled={pagina >= resultado.totalPaginas}>
                  Siguiente
                  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Estado inicial (sin búsqueda aún) ── */}
        {!loading && !resultado && !error && (
          <div style={{
            textAlign: 'center',
            padding: '64px 0',
            color: 'var(--muted)',
          }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--line-mid)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '20px' }}>
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <path d="M8 21h8M12 17v4" />
              <circle cx="12" cy="10" r="3" />
              <path d="M9 7H6M9 10H6M9 13H6" />
            </svg>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--muted)', margin: 0 }}>
              Ingresa una razón social para buscar en el Directorio Nacional de SUNARP
            </p>
          </div>
        )}

      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          .pj-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  )
}
