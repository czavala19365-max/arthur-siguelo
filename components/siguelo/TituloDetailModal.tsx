'use client'

import { useEffect, useState } from 'react'
import { getHistorialAction } from '@/app/actions'
import ConsultarButton from './ConsultarButton'
import { getEstadoStyle } from '@/lib/estados'
import type { Titulo, HistorialEstado, DetalleCronologiaEntry } from '@/types'

// ── Tipos de tab ──────────────────────────────────────────────────────────────
type TabId = 'datos' | 'sunarp' | 'pagos' | 'actos' | 'cronologia' | 'descargas'
const TABS: { id: TabId; label: string }[] = [
  { id: 'datos',      label: 'Datos' },
  { id: 'sunarp',     label: 'SUNARP' },
  { id: 'pagos',      label: 'Pagos' },
  { id: 'actos',      label: 'Actos' },
  { id: 'cronologia', label: 'Cronología' },
  { id: 'descargas',  label: 'Descargas' },
]

// ── Sub-componentes ───────────────────────────────────────────────────────────
function Field({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: '9px',
        textTransform: 'uppercase', letterSpacing: '0.12em',
        color: 'var(--muted)', marginBottom: '4px',
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'var(--font-body)', fontSize: '13px',
        color: 'var(--ink)', lineHeight: 1.45, wordBreak: 'break-word',
      }}>
        {value}
      </div>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: 'var(--font-mono)', fontSize: '9px',
      textTransform: 'uppercase', letterSpacing: '0.14em',
      color: 'var(--accent)', marginBottom: '14px',
      paddingBottom: '8px',
      borderBottom: '1px solid var(--line-faint)',
    }}>
      {children}
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div style={{
      padding: '20px 16px', textAlign: 'center',
      border: '1px solid var(--line-faint)',
      background: 'var(--surface)',
      fontFamily: 'var(--font-mono)', fontSize: '10px',
      textTransform: 'uppercase', letterSpacing: '0.1em',
      color: 'var(--muted)',
    }}>
      {text}
    </div>
  )
}

function getEtapaStyle(etapa: string): React.CSSProperties {
  const u = (etapa ?? '').toUpperCase()
  if (u.includes('CAJA'))         return { background: '#dbeafe', color: '#1d4ed8' }
  if (u.includes('CALIFICACION')) return { background: '#fef3c7', color: '#92400e' }
  if (u.includes('MESA'))         return { background: '#d1fae5', color: '#065f46' }
  if (u.includes('APELACION') || u.includes('APELACI')) return { background: '#fce7f3', color: '#9d174d' }
  return { background: 'var(--surface)', color: 'var(--muted)' }
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function TituloDetailModal({
  titulo,
  onClose,
}: {
  titulo: Titulo
  onClose: () => void
}) {
  const [activeTab, setActiveTab]         = useState<TabId>('datos')
  const [historial, setHistorial]         = useState<HistorialEstado[]>([])
  const [loadingHistorial, setLoadingHistorial] = useState(true)
  const [cronologia, setCronologia]       = useState<DetalleCronologiaEntry[] | null>(null)
  const [loadingCron, setLoadingCron]     = useState(false)
  const [cronError, setCronError]         = useState<string | null>(null)
  const [cronAuthRequired, setCronAuthRequired] = useState(false)

  // Cerrar con Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // Cargar historial
  useEffect(() => {
    getHistorialAction(titulo.id).then(h => {
      setHistorial(h)
      setLoadingHistorial(false)
    })
  }, [titulo.id])

  // Cargar cronología al activar esa pestaña (solo una vez)
  useEffect(() => {
    if (activeTab !== 'cronologia' || cronologia !== null || loadingCron || cronError) return
    setLoadingCron(true)
    fetch(`/api/siguelo/detalle-cronologia?id=${titulo.id}`)
      .then(r => r.json())
      .then((data: { entries?: DetalleCronologiaEntry[]; error?: string; authRequired?: boolean }) => {
        if (data.error) {
          setCronError(data.error)
          setCronAuthRequired(!!data.authRequired)
        } else {
          setCronologia(data.entries ?? [])
        }
      })
      .catch(() => setCronError('Error al cargar la cronología.'))
      .finally(() => setLoadingCron(false))
  }, [activeTab, titulo.id, cronologia, loadingCron, cronError])

  const estadoStyle  = getEstadoStyle(titulo.ultimo_estado ?? '')
  const ultimaConsulta = titulo.ultima_consulta
    ? new Date(titulo.ultima_consulta).toLocaleString('es-PE', {
        timeZone: 'America/Lima', dateStyle: 'short', timeStyle: 'short',
      })
    : null

  const tabBtn = (id: TabId): React.CSSProperties => ({
    fontFamily: 'var(--font-mono)', fontSize: '10px',
    textTransform: 'uppercase', letterSpacing: '0.1em',
    padding: '11px 18px', border: 'none',
    borderBottom: activeTab === id ? '2px solid var(--accent)' : '2px solid transparent',
    background: 'transparent',
    color: activeTab === id ? 'var(--ink)' : 'var(--muted)',
    cursor: 'pointer',
    fontWeight: activeTab === id ? 600 : 400,
    whiteSpace: 'nowrap' as const,
    transition: 'color 0.15s, border-color 0.15s',
  })

  return (
    <>
      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: translate(-50%, -48%); }
          to   { opacity: 1; transform: translate(-50%, -50%); }
        }
        .det-modal-scroll::-webkit-scrollbar { width: 6px; }
        .det-modal-scroll::-webkit-scrollbar-track { background: var(--surface); }
        .det-modal-scroll::-webkit-scrollbar-thumb { background: var(--line); border-radius: 3px; }
        .det-cron-table th, .det-cron-table td {
          padding: 9px 12px; text-align: left;
          border-bottom: 1px solid var(--line-faint);
          vertical-align: top;
        }
        .det-pagos-table th, .det-pagos-table td {
          padding: 9px 14px; text-align: left;
          border-bottom: 1px solid var(--line-faint);
        }
      `}</style>

      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.55)',
          zIndex: 200,
        }}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed',
        top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)',
        width: 'min(94vw, 960px)',
        minWidth: 'min(94vw, 800px)',
        maxHeight: '90vh',
        background: 'var(--paper)',
        border: '1px solid var(--line)',
        borderRadius: '4px',
        boxShadow: '0 32px 96px rgba(0,0,0,0.25)',
        zIndex: 201,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        animation: 'modalIn 0.22s ease forwards',
      }}>

        {/* ── Header oscuro ──────────────────────────────────────────── */}
        <div style={{ background: 'var(--ink)', padding: '24px 28px 20px', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: '10px',
                textTransform: 'uppercase', letterSpacing: '0.12em',
                color: 'rgba(255,255,255,0.45)', marginBottom: '6px',
              }}>
                {titulo.oficina_registral} · {titulo.anio_titulo}
              </div>
              <h2 style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(22px, 3vw, 32px)',
                fontWeight: 700, color: 'var(--paper)',
                lineHeight: 1.1, letterSpacing: '-0.01em',
                fontStyle: 'italic', marginBottom: '12px',
              }}>
                Título {titulo.numero_titulo}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                {titulo.ultimo_estado ? (
                  <span style={{
                    display: 'inline-block', padding: '4px 12px',
                    background: estadoStyle?.bg ?? 'rgba(255,255,255,0.12)',
                    color: estadoStyle?.text ?? 'rgba(255,255,255,0.75)',
                    fontFamily: 'var(--font-mono)', fontSize: '11px',
                    fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em',
                    borderRadius: '2px',
                  }}>
                    {titulo.ultimo_estado}
                  </span>
                ) : (
                  <span style={{
                    display: 'inline-block', padding: '4px 12px',
                    background: 'rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.4)',
                    fontFamily: 'var(--font-mono)', fontSize: '11px',
                    letterSpacing: '0.1em', borderRadius: '2px',
                  }}>
                    Sin estado
                  </span>
                )}
                {ultimaConsulta && (
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: '10px',
                    color: 'rgba(255,255,255,0.35)', letterSpacing: '0.06em',
                  }}>
                    Consultado: {ultimaConsulta}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                width: '32px', height: '32px',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '4px', cursor: 'pointer',
                color: 'rgba(255,255,255,0.65)', fontSize: '18px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-body)', flexShrink: 0,
                transition: 'background 0.15s',
              }}
              onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.18)' }}
              onMouseOut={e =>  { e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
              aria-label="Cerrar"
            >×</button>
          </div>
        </div>

        {/* ── Tab bar ─────────────────────────────────────────────────── */}
        <div style={{
          display: 'flex', overflowX: 'auto',
          background: 'var(--paper)',
          borderBottom: '1px solid var(--line)',
          padding: '0 28px', gap: 0, flexShrink: 0,
        }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={tabBtn(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Contenido scrollable ────────────────────────────────────── */}
        <div
          className="det-modal-scroll"
          style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}
        >

          {/* ══ TAB: DATOS ══════════════════════════════════════════════ */}
          {activeTab === 'datos' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

              <section>
                <SectionLabel>Título registral</SectionLabel>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 28px' }}>
                  <Field label="Número"            value={titulo.numero_titulo} />
                  <Field label="Año"               value={String(titulo.anio_titulo)} />
                  <Field label="Oficina registral" value={titulo.oficina_registral} />
                  <Field label="Tipo de registro"  value={titulo.registro} />
                  <Field label="Área registral"    value={titulo.area_registral} />
                  <Field label="Número de partida" value={titulo.numero_partida} />
                </div>
              </section>

              <section>
                <SectionLabel>Cliente</SectionLabel>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 28px' }}>
                  <Field label="Nombre"    value={titulo.nombre_cliente} />
                  <Field label="WhatsApp"  value={titulo.whatsapp_cliente} />
                  <Field label="Email(s)"  value={titulo.email_cliente} />
                </div>
              </section>

              {(titulo.proyecto || titulo.asunto || titulo.abogado || titulo.notaria) && (
                <section>
                  <SectionLabel>Expediente</SectionLabel>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 28px' }}>
                    <Field label="Proyecto"              value={titulo.proyecto} />
                    <Field label="Asunto"                value={titulo.asunto} />
                    <Field label="Abogado a cargo"       value={titulo.abogado} />
                    <Field label="Notaría / Presentante" value={titulo.notaria} />
                  </div>
                </section>
              )}

              {/* Historial de estados */}
              <section>
                <SectionLabel>Historial de estados</SectionLabel>
                {loadingHistorial ? (
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--muted)', padding: '8px 0' }}>
                    Cargando…
                  </div>
                ) : historial.length === 0 ? (
                  <EmptyState text="Sin cambios de estado registrados" />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {historial.map((h, i) => {
                      const fecha = new Date(h.detectado_en).toLocaleString('es-PE', {
                        timeZone: 'America/Lima', dateStyle: 'short', timeStyle: 'short',
                      })
                      const prevStyle = getEstadoStyle(h.estado_anterior)
                      const nextStyle = getEstadoStyle(h.estado_nuevo)
                      return (
                        <div key={h.id} style={{ display: 'flex', alignItems: 'stretch' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '24px', flexShrink: 0 }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)', flexShrink: 0, marginTop: '14px' }} />
                            {i < historial.length - 1 && (
                              <div style={{ flex: 1, width: '1px', background: 'var(--line)', marginTop: '4px' }} />
                            )}
                          </div>
                          <div style={{
                            flex: 1, padding: '10px 0 16px 12px',
                            display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap',
                          }}>
                            <span style={{
                              padding: '3px 8px',
                              background: prevStyle?.bg ?? 'var(--surface)',
                              color: prevStyle?.text ?? 'var(--muted)',
                              fontFamily: 'var(--font-mono)', fontSize: '10px',
                              fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em',
                            }}>{h.estado_anterior}</span>
                            <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--muted)', flexShrink: 0 }}>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                            <span style={{
                              padding: '3px 8px',
                              background: nextStyle?.bg ?? 'var(--surface)',
                              color: nextStyle?.text ?? 'var(--muted)',
                              fontFamily: 'var(--font-mono)', fontSize: '10px',
                              fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em',
                            }}>{h.estado_nuevo}</span>
                            <span style={{
                              marginLeft: 'auto',
                              fontFamily: 'var(--font-mono)', fontSize: '10px',
                              color: 'var(--muted)', whiteSpace: 'nowrap',
                            }}>{fecha}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>
            </div>
          )}

          {/* ══ TAB: SUNARP ═════════════════════════════════════════════ */}
          {activeTab === 'sunarp' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

              {!(titulo.fecha_presentacion || titulo.fecha_vencimiento || titulo.lugar_presentacion || titulo.nombre_presentante) && (
                <div style={{
                  padding: '20px', background: 'var(--surface)',
                  border: '1px solid var(--line)',
                  fontFamily: 'var(--font-body)', fontSize: '13px',
                  color: 'var(--muted)', lineHeight: 1.6,
                }}>
                  No hay datos de SUNARP disponibles. Usa{' '}
                  <strong style={{ color: 'var(--ink)' }}>Actualizar estado</strong>{' '}
                  en la pestaña Descargas para cargar esta información.
                </div>
              )}

              {(titulo.fecha_presentacion || titulo.fecha_vencimiento || titulo.lugar_presentacion) && (
                <section>
                  <SectionLabel>Presentación</SectionLabel>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 28px' }}>
                    <Field label="Fecha y Hora de Presentación" value={titulo.fecha_presentacion} />
                    <Field label="Fecha de Vencimiento"         value={titulo.fecha_vencimiento} />
                    <Field label="Lugar de Presentación"        value={titulo.lugar_presentacion} />
                  </div>
                </section>
              )}

              {titulo.nombre_presentante && (
                <section>
                  <SectionLabel>Presentante</SectionLabel>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 28px' }}>
                    <Field label="Nombre del Presentante" value={titulo.nombre_presentante} />
                    <Field label="Tipo de Registro SUNARP" value={titulo.tipo_registro} />
                  </div>
                </section>
              )}

              {(titulo.indi_prorroga === '1' || titulo.indi_suspension === '1' || titulo.monto_devolucion) && (
                <section>
                  <SectionLabel>Indicadores</SectionLabel>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 28px' }}>
                    {titulo.indi_prorroga === '1' && (
                      <div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--muted)', marginBottom: '4px' }}>
                          Prórroga
                        </div>
                        <span style={{
                          display: 'inline-block', padding: '3px 10px',
                          background: '#fef3c7', color: '#92400e',
                          fontFamily: 'var(--font-mono)', fontSize: '10px',
                          fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em',
                        }}>
                          Prorrogado
                        </span>
                      </div>
                    )}
                    {titulo.indi_suspension === '1' && (
                      <div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--muted)', marginBottom: '4px' }}>
                          Suspensión
                        </div>
                        <span style={{
                          display: 'inline-block', padding: '3px 10px',
                          background: '#fee2e2', color: '#991b1b',
                          fontFamily: 'var(--font-mono)', fontSize: '10px',
                          fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em',
                        }}>
                          Suspendido
                        </span>
                      </div>
                    )}
                    {titulo.monto_devolucion && titulo.monto_devolucion !== '0' && (
                      <Field label="Monto de Devolución" value={`S/ ${titulo.monto_devolucion}`} />
                    )}
                  </div>
                </section>
              )}

            </div>
          )}

          {/* ══ TAB: PAGOS ══════════════════════════════════════════════ */}
          {activeTab === 'pagos' && (
            <div>
              {!titulo.pagos || titulo.pagos.length === 0 ? (
                <EmptyState text="Sin pagos registrados — actualiza el estado para cargar" />
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table
                    className="det-pagos-table"
                    style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid var(--line)' }}
                  >
                    <thead>
                      <tr style={{
                        background: 'var(--surface)',
                        fontFamily: 'var(--font-mono)', fontSize: '9px',
                        textTransform: 'uppercase', letterSpacing: '0.12em',
                        color: 'var(--muted)',
                      }}>
                        <th style={{ fontWeight: 500 }}>Recibo</th>
                        <th style={{ fontWeight: 500 }}>Monto</th>
                        <th style={{ fontWeight: 500 }}>Fecha</th>
                        <th style={{ fontWeight: 500 }}>Exoneración</th>
                        <th style={{ fontWeight: 500 }}>Zona</th>
                      </tr>
                    </thead>
                    <tbody>
                      {titulo.pagos.map((p, i) => (
                        <tr
                          key={i}
                          style={{ background: i % 2 === 1 ? 'var(--surface)' : 'var(--paper)' }}
                        >
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--ink)', fontWeight: 500 }}>
                            {p.anioRecibo}-{p.numeroRecibo}
                          </td>
                          <td style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--ink)', fontWeight: 600 }}>
                            S/ {p.montoTotalRecibo}
                          </td>
                          <td style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--muted)' }}>
                            {p.fechaOperacion}
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--muted)' }}>
                            {p.inExoneracion ?? '—'}
                          </td>
                          <td style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--muted)' }}>
                            {p.descriZonaRegistral ?? '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ══ TAB: ACTOS ══════════════════════════════════════════════ */}
          {activeTab === 'actos' && (
            <div>
              {!titulo.actos || titulo.actos.length === 0 ? (
                <EmptyState text="Sin actos registrales — actualiza el estado para cargar" />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                  {titulo.actos.map((acto, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid var(--line-faint)',
                        background: i % 2 === 1 ? 'var(--surface)' : 'var(--paper)',
                        display: 'flex', alignItems: 'flex-start', gap: '12px',
                      }}
                    >
                      <div style={{
                        width: '20px', height: '20px', borderRadius: '50%',
                        background: 'var(--surface)', border: '1px solid var(--line)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'var(--font-mono)', fontSize: '9px',
                        color: 'var(--muted)', flexShrink: 0, marginTop: '1px',
                      }}>
                        {i + 1}
                      </div>
                      <span style={{
                        fontFamily: 'var(--font-body)', fontSize: '13px',
                        color: 'var(--ink)', lineHeight: 1.5,
                      }}>
                        {acto}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ══ TAB: CRONOLOGÍA ═════════════════════════════════════════ */}
          {activeTab === 'cronologia' && (
            <div>
              {loadingCron && (
                <div style={{
                  padding: '40px', textAlign: 'center',
                  fontFamily: 'var(--font-mono)', fontSize: '10px',
                  textTransform: 'uppercase', letterSpacing: '0.1em',
                  color: 'var(--muted)',
                }}>
                  Consultando SUNARP…
                </div>
              )}

              {cronError && (
                <div style={{
                  padding: '20px 16px',
                  border: '1px solid var(--line)',
                  background: 'var(--surface)',
                }}>
                  <div style={{
                    fontFamily: 'var(--font-body)', fontSize: '13px',
                    color: cronAuthRequired ? 'var(--muted)' : '#dc2626',
                    lineHeight: 1.6, marginBottom: cronAuthRequired ? '12px' : 0,
                  }}>
                    {cronError}
                  </div>
                  {cronAuthRequired && (
                    <div style={{
                      fontFamily: 'var(--font-mono)', fontSize: '10px',
                      textTransform: 'uppercase', letterSpacing: '0.08em',
                      color: 'var(--muted)',
                    }}>
                      El endpoint detalleTitulo de SUNARP requiere un token de sesión autenticado.
                      Esta funcionalidad no está disponible en consultas anónimas.
                    </div>
                  )}
                </div>
              )}

              {cronologia !== null && cronologia.length === 0 && !loadingCron && !cronError && (
                <EmptyState text="No se encontraron movimientos en la cronología" />
              )}

              {cronologia !== null && cronologia.length > 0 && (
                <div style={{ overflowX: 'auto' }}>
                  <table
                    className="det-cron-table"
                    style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid var(--line)' }}
                  >
                    <thead>
                      <tr style={{
                        background: 'var(--surface)',
                        fontFamily: 'var(--font-mono)', fontSize: '9px',
                        textTransform: 'uppercase', letterSpacing: '0.12em',
                        color: 'var(--muted)',
                      }}>
                        <th style={{ fontWeight: 500, width: '48px' }}>#</th>
                        <th style={{ fontWeight: 500 }}>Etapa</th>
                        <th style={{ fontWeight: 500 }}>Estado</th>
                        <th style={{ fontWeight: 500 }}>Fecha</th>
                        <th style={{ fontWeight: 500 }}>Documento</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cronologia.map((entry, i) => {
                        const estadoS = getEstadoStyle(entry.desEstado)
                        const etapaS  = getEtapaStyle(entry.etapa)
                        return (
                          <tr
                            key={i}
                            style={{ background: i % 2 === 1 ? 'var(--surface)' : 'var(--paper)' }}
                          >
                            <td style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--muted)' }}>
                              {entry.secuencia || i + 1}
                            </td>
                            <td>
                              <span style={{
                                ...etapaS,
                                display: 'inline-block', padding: '2px 8px',
                                fontFamily: 'var(--font-mono)', fontSize: '9px',
                                fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em',
                              }}>
                                {entry.etapa}
                              </span>
                            </td>
                            <td>
                              <span style={{
                                display: 'inline-block', padding: '2px 8px',
                                background: estadoS?.bg ?? 'var(--surface)',
                                color: estadoS?.text ?? 'var(--muted)',
                                fontFamily: 'var(--font-mono)', fontSize: '9px',
                                fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em',
                              }}>
                                {entry.desEstado}
                              </span>
                            </td>
                            <td style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                              {entry.fecha ?? '—'}
                            </td>
                            <td>
                              {entry.documento2 ? (
                                <span style={{
                                  fontFamily: 'var(--font-mono)', fontSize: '9px',
                                  textTransform: 'uppercase', letterSpacing: '0.06em',
                                  color: 'var(--muted)',
                                }}>
                                  {entry.documento2}
                                  {entry.tipoEsquela2 ? ` (${entry.tipoEsquela2})` : ''}
                                </span>
                              ) : '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ══ TAB: DESCARGAS ══════════════════════════════════════════ */}
          {activeTab === 'descargas' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

              {/* Reporte Resumen PDF — siempre visible si hay area_registral */}
              <section>
                <SectionLabel>Reporte Resumen</SectionLabel>
                {titulo.area_registral ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <a
                      href={`/api/siguelo/reporte-resumen?id=${titulo.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '8px',
                        padding: '10px 20px',
                        background: 'var(--ink)', color: 'var(--paper)',
                        fontFamily: 'var(--font-mono)', fontSize: '11px',
                        textTransform: 'uppercase', letterSpacing: '0.1em',
                        fontWeight: 600, textDecoration: 'none',
                        border: '1px solid var(--ink)',
                        borderRadius: '3px',
                        transition: 'opacity 0.15s',
                      }}
                      onMouseOver={e => { (e.currentTarget as HTMLAnchorElement).style.opacity = '0.8' }}
                      onMouseOut={e =>  { (e.currentTarget as HTMLAnchorElement).style.opacity = '1' }}
                    >
                      <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Generar Reporte Resumen PDF
                    </a>
                    <span style={{
                      fontFamily: 'var(--font-body)', fontSize: '12px',
                      color: 'var(--muted)',
                    }}>
                      Se abre en una nueva pestaña
                    </span>
                  </div>
                ) : (
                  <div style={{
                    padding: '14px 16px',
                    background: 'var(--surface)', border: '1px solid var(--line)',
                    fontFamily: 'var(--font-body)', fontSize: '13px',
                    color: 'var(--muted)', lineHeight: 1.5,
                  }}>
                    Requiere área registral. Actualiza el estado primero.
                  </div>
                )}
              </section>

              {/* Consultar + Esquelas + Asientos */}
              <section>
                <SectionLabel>Estado y documentos oficiales</SectionLabel>
                <div style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--line)',
                  padding: '16px 20px',
                }}>
                  {ultimaConsulta && (
                    <div style={{
                      fontFamily: 'var(--font-mono)', fontSize: '10px',
                      color: 'var(--muted)', textTransform: 'uppercase',
                      letterSpacing: '0.08em', marginBottom: '14px',
                    }}>
                      Última consulta: {ultimaConsulta}
                    </div>
                  )}
                  <ConsultarButton
                    tituloId={titulo.id}
                    ultimoEstado={titulo.ultimo_estado}
                    areaRegistral={titulo.area_registral}
                    onEliminar={onClose}
                  />
                </div>
              </section>

            </div>
          )}

        </div>{/* fin scroll */}
      </div>{/* fin panel */}
    </>
  )
}
