'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { getEstadoStyle, ESTADOS_CON_ESQUELA, LABEL_ESQUELA, normalizarEstado, ESTADO_PLURAL } from '@/lib/estados'
import { archivarTituloAction, eliminarTituloLogicoAction } from '@/app/actions'
import TituloDetailModal from './TituloDetailModal'
import type { Titulo } from '@/types'

// ── Íconos ────────────────────────────────────────────────────────────────────

const DownloadIcon = () => (
  <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
  </svg>
)

const ArchiveIcon = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
  </svg>
)

const TrashIcon = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
)

// ── Downloads en fila ─────────────────────────────────────────────────────────

function RowDownloads({ titulo }: { titulo: Titulo }) {
  const estadoNorm = normalizarEstado(titulo.ultimo_estado ?? '')
  const tieneEsquela = ESTADOS_CON_ESQUELA.has(estadoNorm) && !!titulo.area_registral
  const tieneAsiento = estadoNorm === 'INSCRITO' && !!titulo.area_registral
  const label = LABEL_ESQUELA[estadoNorm]

  if (!tieneEsquela && !tieneAsiento) return null

  const linkStyle: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: '4px',
    fontFamily: 'var(--font-mono)', fontSize: '10px',
    textTransform: 'uppercase', letterSpacing: '0.06em',
    textDecoration: 'none',
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
      {tieneEsquela && label && (
        <a
          href={`/api/descargar-esquela?id=${titulo.id}&index=0`}
          target="_blank"
          rel="noopener noreferrer"
          title={`Descargar ${label.singular}`}
          style={{ ...linkStyle, color: '#065f46' }}
        >
          <DownloadIcon />
          {label.singular}
        </a>
      )}
      {tieneAsiento && (
        <a
          href={`/api/descargar-asiento?id=${titulo.id}`}
          target="_blank"
          rel="noopener noreferrer"
          title="Descargar asiento de inscripción"
          style={{ ...linkStyle, color: '#4c1d95' }}
        >
          <DownloadIcon />
          Asiento(s)
        </a>
      )}
    </div>
  )
}

// ── Toast ─────────────────────────────────────────────────────────────────────

function Toast({ message, onHide }: { message: string; onHide: () => void }) {
  return (
    <div
      onClick={onHide}
      style={{
        position: 'fixed', bottom: '28px', left: '50%',
        transform: 'translateX(-50%)',
        background: 'var(--ink)', color: 'var(--paper)',
        fontFamily: 'var(--font-body)', fontSize: '13px',
        padding: '10px 20px',
        borderRadius: '4px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        zIndex: 500, whiteSpace: 'nowrap',
        cursor: 'pointer',
      }}
    >
      {message}
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function TituloSection({
  estado,
  titulos,
}: {
  estado: string
  titulos: Titulo[]
}) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(true)
  const [selected, setSelected] = useState<Titulo | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [pendingAction, setPendingAction] = useState<{ tipo: 'archivar' | 'eliminar'; titulo: Titulo } | null>(null)
  const [, startAction] = useTransition()

  const estadoStyle = getEstadoStyle(estado) ?? { bg: '#F3F4F6', text: '#374151' }
  const estadoPlural = ESTADO_PLURAL[estado] ?? estado

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  function confirmarAccion() {
    if (!pendingAction) return
    const { tipo, titulo: t } = pendingAction
    setPendingAction(null)
    setProcessingId(t.id)
    startAction(async () => {
      const res = tipo === 'archivar'
        ? await archivarTituloAction(t.id)
        : await eliminarTituloLogicoAction(t.id)
      setProcessingId(null)
      if (res.error) {
        showToast(`Error: ${res.error}`)
      } else {
        showToast(tipo === 'archivar' ? 'Título archivado correctamente' : 'Título eliminado')
        router.refresh()
      }
    })
  }

  const iconBtnBase: React.CSSProperties = {
    width: '28px', height: '28px',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    background: 'transparent',
    border: '1px solid var(--line)',
    borderRadius: '4px',
    cursor: 'pointer',
    color: 'var(--muted)',
    transition: 'background 0.15s, color 0.15s, border-color 0.15s',
    padding: 0,
    flexShrink: 0,
  }

  const actionsBtnBase: React.CSSProperties = {
    background: 'transparent',
    border: '1px solid var(--line-strong)',
    borderRadius: 0,
    padding: '5px 12px',
    fontFamily: 'var(--font-mono)',
    fontSize: '10px',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: 'var(--ink)',
    cursor: 'pointer',
    transition: 'background 0.15s, color 0.15s',
  }

  return (
    <>
      {toast && <Toast message={toast} onHide={() => setToast(null)} />}

      {/* Modal de confirmación archivar/eliminar */}
      {pendingAction && (
        <>
          <div
            onClick={() => setPendingAction(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 400 }}
          />
          <div style={{
            position: 'fixed', top: '50%', left: '50%',
            transform: 'translate(-50%,-50%)',
            width: 'min(90vw, 440px)',
            background: 'var(--paper)', border: '1px solid var(--line)',
            borderRadius: '4px', padding: '28px 32px',
            boxShadow: '0 24px 64px rgba(0,0,0,0.22)', zIndex: 401,
          }}>
            <h3 style={{
              fontFamily: 'var(--font-body)', fontSize: '18px',
              fontWeight: 600, color: 'var(--ink)', marginBottom: '12px',
            }}>
              {pendingAction.tipo === 'archivar' ? 'Archivar título' : 'Eliminar título'}
            </h3>
            <p style={{
              fontFamily: 'var(--font-body)', fontSize: '14px',
              color: 'var(--muted)', lineHeight: 1.6, marginBottom: '8px',
            }}>
              {pendingAction.tipo === 'archivar'
                ? <>¿Deseas archivar el título{' '}
                    <strong style={{ color: 'var(--ink)' }}>
                      {pendingAction.titulo.anio_titulo}-{pendingAction.titulo.numero_titulo}
                    </strong>?</>
                : <>¿Deseas eliminar el título{' '}
                    <strong style={{ color: 'var(--ink)' }}>
                      {pendingAction.titulo.anio_titulo}-{pendingAction.titulo.numero_titulo}
                    </strong>?</>
              }
            </p>
            <p style={{
              fontFamily: 'var(--font-body)', fontSize: '13px',
              color: 'var(--muted)', lineHeight: 1.5, marginBottom: '24px',
            }}>
              {pendingAction.tipo === 'archivar'
                ? 'El título se moverá a Títulos Archivados y dejará de recibir monitoreo automático.'
                : 'El título se moverá a Títulos Eliminados.'}
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setPendingAction(null)}
                style={{
                  flex: 1,
                  fontFamily: 'var(--font-mono)', fontSize: '11px',
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                  background: 'transparent', border: '1px solid var(--line-strong)',
                  color: 'var(--ink)', borderRadius: 0, padding: '11px 16px', cursor: 'pointer',
                }}
                onMouseOver={e => { e.currentTarget.style.background = 'var(--surface)' }}
                onMouseOut={e => { e.currentTarget.style.background = 'transparent' }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmarAccion}
                style={{
                  flex: 1,
                  fontFamily: 'var(--font-mono)', fontSize: '11px',
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                  background: pendingAction.tipo === 'archivar' ? 'var(--accent)' : '#dc2626',
                  border: 'none', color: pendingAction.tipo === 'archivar' ? '#141414' : '#fff',
                  borderRadius: 0, padding: '11px 16px', cursor: 'pointer',
                }}
                onMouseOver={e => { e.currentTarget.style.opacity = '0.85' }}
                onMouseOut={e => { e.currentTarget.style.opacity = '1' }}
              >
                {pendingAction.tipo === 'archivar' ? 'Archivar' : 'Eliminar'}
              </button>
            </div>
          </div>
        </>
      )}

      <div style={{
        border: '1px solid var(--line)',
        borderTop: `3px solid ${estadoStyle.text}`,
        marginBottom: '16px',
        background: 'var(--surface)',
      }}>
        {/* Encabezado colapsable */}
        <button
          onClick={() => setExpanded(v => !v)}
          style={{
            width: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 24px',
            background: 'none', border: 'none', cursor: 'pointer',
            borderBottom: expanded ? '1px solid var(--line-faint)' : 'none',
            transition: 'background 0.15s',
          }}
          onMouseOver={e => { e.currentTarget.style.background = 'var(--paper-dark)' }}
          onMouseOut={e => { e.currentTarget.style.background = 'none' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{
              display: 'inline-block', padding: '3px 10px',
              fontFamily: 'var(--font-mono)', fontSize: '10px',
              textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600,
              backgroundColor: estadoStyle.bg, color: estadoStyle.text,
            }}>
              {estadoPlural}
            </span>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: '10px',
              textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)',
            }}>
              {titulos.length} {titulos.length === 1 ? 'título' : 'títulos'}
            </span>
          </div>
          <svg
            style={{
              width: '14px', height: '14px', color: 'var(--muted)',
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s', flexShrink: 0,
            }}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Tabla */}
        {expanded && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{
                  background: 'var(--paper-dark)',
                  fontFamily: 'var(--font-mono)', fontSize: '10px',
                  textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--muted)',
                }}>
                  <th style={{ padding: '10px 24px', fontWeight: 500, textAlign: 'left', whiteSpace: 'nowrap' }}>Nº Título</th>
                  <th style={{ padding: '10px 16px', fontWeight: 500, textAlign: 'left' }}>Oficina</th>
                  <th style={{ padding: '10px 16px', fontWeight: 500, textAlign: 'left' }}>Cliente</th>
                  <th style={{ padding: '10px 16px', fontWeight: 500, textAlign: 'left' }}>Asunto</th>
                  <th style={{ padding: '10px 16px', fontWeight: 500, textAlign: 'left' }}>Descargas</th>
                  <th style={{ padding: '10px 24px', fontWeight: 500, textAlign: 'right' }}></th>
                </tr>
              </thead>
              <tbody>
                {titulos.map((t, i) => (
                  <tr
                    key={t.id}
                    style={{
                      borderTop: '1px solid var(--line-faint)',
                      background: i % 2 === 1 ? 'var(--paper-dark)' : 'var(--surface)',
                      transition: 'background 0.1s',
                      opacity: processingId === t.id ? 0.4 : 1,
                    }}
                    onMouseOver={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(194,164,109,0.06)' }}
                    onMouseOut={e => { (e.currentTarget as HTMLElement).style.background = i % 2 === 1 ? 'var(--paper-dark)' : 'var(--surface)' }}
                  >
                    <td style={{ padding: '14px 24px' }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--ink)', fontWeight: 500 }}>{t.numero_titulo}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--muted)', marginTop: '2px' }}>{t.anio_titulo}</div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--muted)' }}>
                        {t.oficina_registral}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 500, color: 'var(--ink)' }}>
                        {t.nombre_cliente}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--muted)' }}>
                        {t.asunto ?? <span style={{ color: 'var(--line-strong)' }}>—</span>}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <RowDownloads titulo={t} />
                    </td>
                    <td style={{ padding: '14px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                        {/* Ver detalle */}
                        <button
                          onClick={() => setSelected(t)}
                          style={{ ...actionsBtnBase, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                          onMouseOver={e => { e.currentTarget.style.background = 'var(--ink)'; e.currentTarget.style.color = 'var(--paper)' }}
                          onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--ink)' }}
                        >
                          <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          Ver detalle
                        </button>

                        {/* Archivar */}
                        <button
                          onClick={() => setPendingAction({ tipo: 'archivar', titulo: t })}
                          disabled={processingId === t.id}
                          title="Archivar"
                          style={iconBtnBase}
                          onMouseOver={e => { e.currentTarget.style.background = 'rgba(194,164,109,0.12)'; e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
                          onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.color = 'var(--muted)' }}
                        >
                          <ArchiveIcon />
                        </button>

                        {/* Eliminar (mover a eliminados) */}
                        <button
                          onClick={() => setPendingAction({ tipo: 'eliminar', titulo: t })}
                          disabled={processingId === t.id}
                          title="Mover a Eliminados"
                          style={{
                            ...iconBtnBase,
                            cursor: processingId === t.id ? 'not-allowed' : 'pointer',
                          }}
                          onMouseOver={e => { if (!processingId) { e.currentTarget.style.background = 'rgba(220,38,38,0.08)'; e.currentTarget.style.borderColor = '#dc2626'; e.currentTarget.style.color = '#dc2626' } }}
                          onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.color = 'var(--muted)' }}
                        >
                          {processingId === t.id ? (
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px' }}>…</span>
                          ) : (
                            <TrashIcon />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selected && (
          <TituloDetailModal
            titulo={selected}
            onClose={() => setSelected(null)}
          />
        )}
      </div>
    </>
  )
}
