'use client'

import { useEffect, useState } from 'react'
import { getHistorialAction } from '@/app/actions'
import ConsultarButton from './ConsultarButton'
import { getEstadoStyle } from '@/lib/estados'
import type { Titulo, HistorialEstado } from '@/types'

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
      color: 'var(--accent)', marginBottom: '12px',
      paddingBottom: '8px',
      borderBottom: '1px solid var(--line-faint)',
    }}>
      {children}
    </div>
  )
}

export default function TituloDetailModal({
  titulo,
  onClose,
}: {
  titulo: Titulo
  onClose: () => void
}) {
  const [historial, setHistorial] = useState<HistorialEstado[]>([])
  const [loadingHistorial, setLoadingHistorial] = useState(true)

  useEffect(() => {
    getHistorialAction(titulo.id).then(h => {
      setHistorial(h)
      setLoadingHistorial(false)
    })
  }, [titulo.id])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const estadoStyle = getEstadoStyle(titulo.ultimo_estado ?? '')
  const ultimaConsulta = titulo.ultima_consulta
    ? new Date(titulo.ultima_consulta).toLocaleString('es-PE', {
        timeZone: 'America/Lima',
        dateStyle: 'long',
        timeStyle: 'short',
      })
    : null

  return (
    <>
      <style>{`
        @keyframes modalIn { from { opacity: 0; transform: translate(-50%,-48%); } to { opacity: 1; transform: translate(-50%,-50%); } }
      `}</style>

      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.52)',
          zIndex: 200,
        }}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed',
        top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)',
        width: 'min(94vw, 860px)',
        maxHeight: '85vh',
        background: 'var(--paper)',
        border: '1px solid var(--line)',
        borderRadius: '4px',
        boxShadow: '0 24px 80px rgba(0,0,0,0.22)',
        zIndex: 201,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        animation: 'modalIn 0.22s ease forwards',
      }}>

        {/* ── Header ─────────────────────────────────────────────── */}
        <div style={{
          background: 'var(--ink)',
          padding: '28px 32px 24px',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Breadcrumb */}
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: '10px',
                textTransform: 'uppercase', letterSpacing: '0.12em',
                color: 'rgba(255,255,255,0.45)',
                marginBottom: '8px',
              }}>
                {titulo.oficina_registral} · {titulo.anio_titulo}
              </div>

              {/* Número grande */}
              <h2 style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(24px, 3vw, 36px)',
                fontWeight: 700,
                color: 'var(--paper)',
                lineHeight: 1.1,
                letterSpacing: '-0.01em',
                fontStyle: 'italic',
                marginBottom: '14px',
              }}>
                Título {titulo.numero_titulo}
              </h2>

              {/* Badge de estado */}
              {titulo.ultimo_estado && estadoStyle && (
                <span style={{
                  display: 'inline-block',
                  padding: '4px 12px',
                  background: estadoStyle.bg,
                  color: estadoStyle.text,
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  borderRadius: '2px',
                }}>
                  {titulo.ultimo_estado}
                </span>
              )}
              {titulo.ultimo_estado && !estadoStyle && (
                <span style={{
                  display: 'inline-block',
                  padding: '4px 12px',
                  background: 'rgba(255,255,255,0.12)',
                  color: 'rgba(255,255,255,0.75)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  borderRadius: '2px',
                }}>
                  {titulo.ultimo_estado}
                </span>
              )}
              {!titulo.ultimo_estado && (
                <span style={{
                  display: 'inline-block',
                  padding: '4px 12px',
                  background: 'rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.4)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  letterSpacing: '0.1em',
                  borderRadius: '2px',
                }}>
                  Sin estado
                </span>
              )}
            </div>

            {/* Botón cerrar */}
            <button
              onClick={onClose}
              style={{
                width: '32px', height: '32px',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '4px',
                cursor: 'pointer',
                color: 'rgba(255,255,255,0.65)',
                fontSize: '18px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-body)',
                flexShrink: 0,
                transition: 'background 0.15s',
              }}
              onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.18)' }}
              onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
              aria-label="Cerrar"
            >
              ×
            </button>
          </div>
        </div>

        {/* ── Cuerpo scrollable ────────────────────────────────────── */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '28px 32px',
          display: 'flex',
          flexDirection: 'column',
          gap: '28px',
        }}>

          {/* Título registral */}
          <section>
            <SectionLabel>Título registral</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 32px' }}>
              <Field label="Número" value={titulo.numero_titulo} />
              <Field label="Año" value={String(titulo.anio_titulo)} />
              <Field label="Oficina registral" value={titulo.oficina_registral} />
              <Field label="Tipo de registro" value={titulo.registro} />
              <Field label="Área registral" value={titulo.area_registral} />
              <Field label="Número de partida" value={titulo.numero_partida} />
            </div>
          </section>

          {/* Cliente */}
          <section>
            <SectionLabel>Cliente</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 32px' }}>
              <Field label="Nombre" value={titulo.nombre_cliente} />
              <Field label="WhatsApp" value={titulo.whatsapp_cliente} />
              <Field label="Email(s)" value={titulo.email_cliente} />
            </div>
          </section>

          {/* Expediente (solo si hay datos) */}
          {(titulo.proyecto || titulo.asunto || titulo.abogado || titulo.notaria) && (
            <section>
              <SectionLabel>Expediente</SectionLabel>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 32px' }}>
                <Field label="Proyecto" value={titulo.proyecto} />
                <Field label="Asunto" value={titulo.asunto} />
                <Field label="Abogado a cargo" value={titulo.abogado} />
                <Field label="Notaría / Presentante" value={titulo.notaria} />
              </div>
            </section>
          )}

          {/* Estado y acciones */}
          <section>
            <SectionLabel>Estado y acciones</SectionLabel>
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

          {/* Historial */}
          <section>
            <SectionLabel>Historial de estados</SectionLabel>
            {loadingHistorial ? (
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--muted)', padding: '8px 0' }}>
                Cargando historial…
              </div>
            ) : historial.length === 0 ? (
              <div style={{
                fontFamily: 'var(--font-body)', fontSize: '13px',
                color: 'var(--muted)', padding: '12px 16px',
                background: 'var(--surface)', border: '1px solid var(--line)',
              }}>
                Sin cambios de estado registrados.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {historial.map((h, i) => {
                  const fecha = new Date(h.detectado_en).toLocaleString('es-PE', {
                    timeZone: 'America/Lima',
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })
                  const prevStyle = getEstadoStyle(h.estado_anterior)
                  const nextStyle = getEstadoStyle(h.estado_nuevo)

                  return (
                    <div key={h.id} style={{ display: 'flex', alignItems: 'stretch', gap: '0' }}>
                      {/* Línea de tiempo */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '24px', flexShrink: 0 }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)', flexShrink: 0, marginTop: '14px' }} />
                        {i < historial.length - 1 && (
                          <div style={{ flex: 1, width: '1px', background: 'var(--line)', marginTop: '4px' }} />
                        )}
                      </div>
                      {/* Contenido */}
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
                        }}>
                          {h.estado_anterior}
                        </span>
                        <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--muted)', flexShrink: 0 }}>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                        <span style={{
                          padding: '3px 8px',
                          background: nextStyle?.bg ?? 'var(--surface)',
                          color: nextStyle?.text ?? 'var(--muted)',
                          fontFamily: 'var(--font-mono)', fontSize: '10px',
                          fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em',
                        }}>
                          {h.estado_nuevo}
                        </span>
                        <span style={{
                          marginLeft: 'auto',
                          fontFamily: 'var(--font-mono)', fontSize: '10px',
                          color: 'var(--muted)', whiteSpace: 'nowrap',
                        }}>
                          {fecha}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

        </div>
      </div>
    </>
  )
}
