'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import TituloForm from './TituloForm'
import type { CronResumen } from '@/types'

// ── Íconos ────────────────────────────────────────────────────────────────────
function IconRefresh() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  )
}

function IconDownload() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

function IconSpinner() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
      style={{ animation: 'spin 1s linear infinite' }}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  )
}

// ── Tipos de estado del modal de actualización ─────────────────────────────
type UpdateState =
  | { phase: 'idle' }
  | { phase: 'confirm' }
  | { phase: 'loading' }
  | { phase: 'done'; resumen: CronResumen }
  | { phase: 'error'; message: string }

// ── Componente principal ───────────────────────────────────────────────────
export default function SigueloHeaderButtons() {
  const router = useRouter()

  // ── Estado del modal de agregar título ───────────────────────────────────
  const [addOpen, setAddOpen] = useState(false)

  // ── Estado del flujo de actualización ───────────────────────────────────
  const [update, setUpdate] = useState<UpdateState>({ phase: 'idle' })

  // ── Descarga Excel ───────────────────────────────────────────────────────
  function descargarExcel() {
    // window.location.href funciona en todos los navegadores incluyendo Safari iOS
    window.location.href = '/api/siguelo/descargar-reporte-excel'
  }

  // ── Actualizar estado de títulos ─────────────────────────────────────────
  async function ejecutarActualizacion() {
    setUpdate({ phase: 'loading' })
    let res: Response
    try {
      res = await fetch('/api/siguelo/actualizar-estado', { method: 'POST' })
    } catch {
      setUpdate({ phase: 'error', message: 'No se pudo conectar con el servidor.' })
      return
    }

    // Siempre intentar parsear JSON — si el servidor devuelve HTML (error fatal de Next.js)
    // capturarlo aquí y mostrar un mensaje claro en lugar de una excepción críptica
    let data: (CronResumen & { error?: string }) | null = null
    try {
      data = await res.json() as CronResumen & { error?: string }
    } catch {
      setUpdate({ phase: 'error', message: `Error del servidor (HTTP ${res.status}). Revisa los logs de Vercel para más detalles.` })
      return
    }

    if (!res.ok) {
      setUpdate({ phase: 'error', message: data?.error ?? `Error ${res.status}` })
      return
    }

    setUpdate({ phase: 'done', resumen: data as CronResumen })
    router.refresh()
  }

  function closeUpdate() { setUpdate({ phase: 'idle' }) }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .sig-btn {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 11px 20px;
          font-family: var(--font-body); font-size: 13px; font-weight: 500;
          border-radius: 0; cursor: pointer;
          transition: opacity .15s, background .15s;
          white-space: nowrap;
        }
        .sig-btn:hover:not(:disabled) { opacity: .82; }
        .sig-btn:disabled { opacity: .45; cursor: not-allowed; }
        .sig-btn-secondary {
          background: var(--surface); color: var(--ink);
          border: 1px solid var(--line-mid);
        }
        .sig-btn-green {
          background: var(--surface); color: #166534;
          border: 1px solid rgba(22,101,52,.35);
        }
        .sig-btn-primary {
          background: var(--ink); color: var(--paper);
          border: none;
        }
        @media (max-width: 700px) {
          .sig-header-btns { flex-direction: column !important; align-items: stretch !important; }
          .sig-btn { justify-content: center; }
        }
      `}</style>

      {/* ── Fila de botones ── */}
      <div className="sig-header-btns" style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '8px', flexWrap: 'wrap' }}>

        {/* Actualizar */}
        <button
          className="sig-btn sig-btn-secondary"
          onClick={() => setUpdate({ phase: 'confirm' })}
          disabled={update.phase === 'loading'}
          title="Consultar SUNARP y actualizar el estado de todos los títulos activos"
        >
          {update.phase === 'loading' ? <IconSpinner /> : <IconRefresh />}
          Actualizar
        </button>

        {/* Exportar Excel */}
        <button
          className="sig-btn sig-btn-green"
          onClick={descargarExcel}
          title="Descargar Excel con todos los títulos y sus estados actuales"
        >
          <IconDownload />
          Exportar Excel
        </button>

        {/* Agregar Título */}
        <button
          className="sig-btn sig-btn-primary"
          onClick={() => setAddOpen(true)}
          title="Registrar un nuevo título para seguimiento"
        >
          + Agregar Título
        </button>
      </div>

      {/* ── Modal: Agregar título ── */}
      {addOpen && (
        <>
          <div onClick={() => setAddOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.52)', zIndex: 40 }} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%',
            transform: 'translate(-50%,-50%)',
            width: 'min(92vw,680px)', maxHeight: '88vh', overflowY: 'auto',
            zIndex: 41, background: 'var(--paper)', border: '1px solid var(--line)',
            borderRadius: '4px', boxShadow: '0 24px 80px rgba(0,0,0,0.22)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 32px 0' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--accent)' }}>
                Arthur · Síguelo
              </div>
              <button
                onClick={() => setAddOpen(false)}
                style={{ width: '32px', height: '32px', background: 'transparent', border: '1px solid var(--line)', borderRadius: '4px', cursor: 'pointer', color: 'var(--muted)', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >×</button>
            </div>
            <TituloForm />
          </div>
        </>
      )}

      {/* ── Modal: Confirmación / progreso / resultado de actualización ── */}
      {update.phase !== 'idle' && (
        <>
          <div onClick={update.phase === 'loading' ? undefined : closeUpdate}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.52)', zIndex: 40 }} />

          <div style={{
            position: 'fixed', top: '50%', left: '50%',
            transform: 'translate(-50%,-50%)',
            width: 'min(92vw,480px)',
            zIndex: 41, background: 'var(--paper)', border: '1px solid var(--line)',
            borderRadius: '4px', boxShadow: '0 24px 80px rgba(0,0,0,0.22)',
            padding: '32px',
          }}>

            {/* Confirmar */}
            {update.phase === 'confirm' && (
              <>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--accent)', marginBottom: '16px' }}>
                  Confirmar actualización
                </div>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--ink)', lineHeight: 1.65, marginBottom: '24px' }}>
                  ¿Deseas actualizar el estado de todos los títulos activos?<br />
                  <span style={{ color: 'var(--muted)', fontSize: '13px' }}>
                    Este proceso consultará SUNARP para cada título y puede tomar varios minutos dependiendo de la cantidad.
                  </span>
                </p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button className="sig-btn sig-btn-secondary" onClick={closeUpdate}>Cancelar</button>
                  <button className="sig-btn sig-btn-primary" onClick={ejecutarActualizacion}>Actualizar todos</button>
                </div>
              </>
            )}

            {/* Cargando */}
            {update.phase === 'loading' && (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    style={{ animation: 'spin 1s linear infinite' }}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                </div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--ink)', fontWeight: 600, marginBottom: '8px' }}>
                  Actualizando títulos…
                </div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--muted)' }}>
                  Consultando SUNARP para cada título activo.<br />Esto puede tomar varios minutos.
                </div>
              </div>
            )}

            {/* Resultado */}
            {update.phase === 'done' && (
              <>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '.12em', color: '#166534', marginBottom: '16px' }}>
                  ✅ Actualización completada
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                  {[
                    { label: 'Títulos consultados',        value: update.resumen.total,      color: 'var(--ink)' },
                    { label: 'Actualizados correctamente', value: update.resumen.exitosos,   color: 'var(--ink)' },
                    { label: 'Con cambios de estado',      value: update.resumen.conCambios, color: update.resumen.conCambios > 0 ? '#92400e' : 'var(--muted)' },
                    { label: 'Con errores',                value: update.resumen.errores,    color: update.resumen.errores > 0 ? '#b91c1c' : 'var(--muted)' },
                  ].map(row => (
                    <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '4px' }}>
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--muted)' }}>{row.label}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '16px', fontWeight: 700, color: row.color }}>{row.value}</span>
                    </div>
                  ))}
                </div>
                <button className="sig-btn sig-btn-primary" onClick={closeUpdate} style={{ width: '100%', justifyContent: 'center' }}>
                  Cerrar
                </button>
              </>
            )}

            {/* Error */}
            {update.phase === 'error' && (
              <>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '.12em', color: '#b91c1c', marginBottom: '16px' }}>
                  Error al actualizar
                </div>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--ink)', marginBottom: '24px' }}>
                  {update.message}
                </p>
                <button className="sig-btn sig-btn-secondary" onClick={closeUpdate} style={{ width: '100%', justifyContent: 'center' }}>
                  Cerrar
                </button>
              </>
            )}
          </div>
        </>
      )}
    </>
  )
}
