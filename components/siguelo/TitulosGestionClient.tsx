'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { restaurarTituloAction, eliminarTituloAction } from '@/app/actions'
import { getEstadoStyle } from '@/lib/estados'
import type { Titulo } from '@/types'

function Badge({ estado }: { estado: string | null }) {
  if (!estado) return <span style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>—</span>
  const s = getEstadoStyle(estado)
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px',
      background: s?.bg ?? 'var(--surface)', color: s?.text ?? 'var(--muted)',
      fontFamily: 'var(--font-mono)', fontSize: '10px',
      fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em',
    }}>
      {estado}
    </span>
  )
}

function Toast({ message, onHide }: { message: string; onHide: () => void }) {
  return (
    <div onClick={onHide} style={{
      position: 'fixed', bottom: '28px', left: '50%', transform: 'translateX(-50%)',
      background: 'var(--ink)', color: 'var(--paper)',
      fontFamily: 'var(--font-body)', fontSize: '13px',
      padding: '10px 20px', borderRadius: '4px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
      zIndex: 500, whiteSpace: 'nowrap', cursor: 'pointer',
    }}>
      {message}
    </div>
  )
}

interface Props {
  titulos: Titulo[]
  tipo: 'archivado' | 'eliminado'
}

export default function TitulosGestionClient({ titulos, tipo }: Props) {
  const router = useRouter()
  const [toast, setToast] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Titulo | null>(null)
  const [, startTransition] = useTransition()

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  function handleRestaurar(t: Titulo) {
    setProcessingId(t.id)
    startTransition(async () => {
      const res = await restaurarTituloAction(t.id)
      setProcessingId(null)
      if (res.error) {
        showToast(`Error: ${res.error}`)
      } else {
        showToast('Título restaurado a Activos')
        router.refresh()
      }
    })
  }

  function handleEliminarPermanente(t: Titulo) {
    setConfirmDelete(t)
  }

  function confirmarEliminarPermanente() {
    if (!confirmDelete) return
    const id = confirmDelete.id
    setConfirmDelete(null)
    setProcessingId(id)
    startTransition(async () => {
      const res = await eliminarTituloAction(id)
      setProcessingId(null)
      if (res.error) {
        showToast(`Error: ${res.error}`)
      } else {
        showToast('Título eliminado permanentemente')
        router.refresh()
      }
    })
  }

  const btnBase: React.CSSProperties = {
    fontFamily: 'var(--font-mono)', fontSize: '10px',
    textTransform: 'uppercase', letterSpacing: '0.08em',
    border: '1px solid var(--line-strong)', borderRadius: 0,
    padding: '5px 12px', cursor: 'pointer',
    background: 'transparent', color: 'var(--ink)',
    transition: 'background 0.15s, color 0.15s',
  }

  return (
    <>
      {toast && <Toast message={toast} onHide={() => setToast(null)} />}

      {/* Modal confirmación eliminar permanente */}
      {confirmDelete && (
        <>
          <div
            onClick={() => setConfirmDelete(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 400 }}
          />
          <div style={{
            position: 'fixed', top: '50%', left: '50%',
            transform: 'translate(-50%,-50%)',
            width: 'min(90vw, 440px)',
            background: 'var(--paper)', border: '1px solid var(--line)',
            borderRadius: '4px', padding: '28px 32px',
            boxShadow: '0 24px 64px rgba(0,0,0,0.22)',
            zIndex: 401,
          }}>
            <h3 style={{
              fontFamily: 'var(--font-body)', fontSize: '18px',
              fontWeight: 600, color: 'var(--ink)', marginBottom: '12px',
            }}>
              Eliminar permanentemente
            </h3>
            <p style={{
              fontFamily: 'var(--font-body)', fontSize: '14px',
              color: 'var(--muted)', lineHeight: 1.6, marginBottom: '8px',
            }}>
              ¿Estás seguro de que deseas eliminar permanentemente el título{' '}
              <strong style={{ color: 'var(--ink)' }}>
                {confirmDelete.anio_titulo}-{confirmDelete.numero_titulo}
              </strong>?
            </p>
            <p style={{
              fontFamily: 'var(--font-body)', fontSize: '13px',
              color: '#dc2626', lineHeight: 1.5, marginBottom: '24px',
            }}>
              Esta acción no se puede deshacer. Se eliminará el título y todo su historial.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setConfirmDelete(null)}
                style={{ ...btnBase, flex: 1 }}
                onMouseOver={e => { e.currentTarget.style.background = 'var(--surface)' }}
                onMouseOut={e => { e.currentTarget.style.background = 'transparent' }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmarEliminarPermanente}
                style={{
                  ...btnBase, flex: 1,
                  background: '#dc2626', color: '#fff', borderColor: '#dc2626',
                }}
                onMouseOver={e => { e.currentTarget.style.opacity = '0.85' }}
                onMouseOut={e => { e.currentTarget.style.opacity = '1' }}
              >
                Eliminar definitivamente
              </button>
            </div>
          </div>
        </>
      )}

      <div style={{ border: '1px solid var(--line)', background: 'var(--surface)', overflowX: 'auto' }}>
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
              <th style={{ padding: '10px 16px', fontWeight: 500, textAlign: 'left' }}>Estado SUNARP</th>
              <th style={{ padding: '10px 24px', fontWeight: 500, textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {titulos.map((t, i) => (
              <tr
                key={t.id}
                style={{
                  borderTop: '1px solid var(--line-faint)',
                  background: i % 2 === 1 ? 'var(--paper-dark)' : 'var(--surface)',
                  opacity: processingId === t.id ? 0.4 : 1,
                  transition: 'background 0.1s, opacity 0.2s',
                }}
              >
                <td style={{ padding: '14px 24px' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--ink)', fontWeight: 500 }}>{t.numero_titulo}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--muted)', marginTop: '2px' }}>{t.anio_titulo}</div>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--muted)' }}>{t.oficina_registral}</span>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 500, color: 'var(--ink)' }}>{t.nombre_cliente}</span>
                  {t.asunto && (
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>{t.asunto}</div>
                  )}
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <Badge estado={t.ultimo_estado} />
                </td>
                <td style={{ padding: '14px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => handleRestaurar(t)}
                      disabled={processingId === t.id}
                      style={{ ...btnBase }}
                      onMouseOver={e => { e.currentTarget.style.background = 'var(--ink)'; e.currentTarget.style.color = 'var(--paper)' }}
                      onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--ink)' }}
                    >
                      ↩ Restaurar
                    </button>
                    {tipo === 'eliminado' && (
                      <button
                        onClick={() => handleEliminarPermanente(t)}
                        disabled={processingId === t.id}
                        style={{ ...btnBase, color: '#dc2626', borderColor: 'rgba(220,38,38,0.3)' }}
                        onMouseOver={e => { e.currentTarget.style.background = 'rgba(220,38,38,0.08)' }}
                        onMouseOut={e => { e.currentTarget.style.background = 'transparent' }}
                      >
                        Eliminar definitivamente
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
