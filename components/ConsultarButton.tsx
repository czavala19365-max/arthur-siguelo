'use client'

import { useState, useTransition } from 'react'
import { consultarAhora, eliminarTituloAction, descargarEsquelaAction, descargarAsientoAction } from '@/app/actions'
import { ESTADO_STYLES, ESTADOS_CON_ESQUELA, LABEL_ESQUELA } from '@/lib/estados'
import EstadoBadge from './EstadoBadge'

export default function ConsultarButton({
  tituloId,
  ultimoEstado,
  areaRegistral,
  onEliminar,
}: {
  tituloId: string
  ultimoEstado: string | null
  areaRegistral: string | null
  onEliminar?: () => void
}) {
  const [result, setResult] = useState<{ estado?: string; detalle?: string; error?: string } | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [esquelas, setEsquelas] = useState<string[] | null>(null)
  const [esquelaError, setEsquelaError] = useState<string | null>(null)
  const [mostrarEsquelas, setMostrarEsquelas] = useState(false)
  const [asientos, setAsientos] = useState<string[] | null>(null)
  const [asientoError, setAsientoError] = useState<string | null>(null)
  const [mostrarAsientos, setMostrarAsientos] = useState(false)
  const [esquelaPending, startEsquelaTransition] = useTransition()
  const [asientoPending, startAsientoTransition] = useTransition()
  const [isPending, startTransition] = useTransition()
  const [isDeleting, startDeleteTransition] = useTransition()

  const estadoVisible = result?.estado ?? ultimoEstado
  const estadoParaEsquela = (result?.estado ?? ultimoEstado ?? '').toUpperCase()
  const tieneEsquela = ESTADOS_CON_ESQUELA.has(estadoParaEsquela) && areaRegistral !== null
  const tieneAsiento = estadoParaEsquela === 'INSCRITO' && areaRegistral !== null
  const labelEsquela = LABEL_ESQUELA[estadoParaEsquela] ?? { singular: 'Esquela', plural: 'Esquelas' }

  const handleConsultar = () => {
    startTransition(async () => {
      const res = await consultarAhora(tituloId)
      setResult(res)
      setEsquelas(null)
      setMostrarEsquelas(false)
      setAsientos(null)
      setMostrarAsientos(false)
    })
  }

  const handleEliminar = () => {
    if (!confirm('¿Eliminar este título y todo su historial de estados?')) return
    setDeleteError(null)
    startDeleteTransition(async () => {
      const res = await eliminarTituloAction(tituloId)
      if (res.error) {
        setDeleteError(res.error)
      } else {
        onEliminar?.()
      }
    })
  }

  const handleVerEsquelas = () => {
    if (esquelas !== null) { setMostrarEsquelas(v => !v); return }
    startEsquelaTransition(async () => {
      const res = await descargarEsquelaAction(tituloId)
      if (res.error) { setEsquelaError(res.error); return }
      setEsquelas(res.pdfs ?? [])
      setMostrarEsquelas(true)
    })
  }

  const handleVerAsientos = () => {
    if (asientos !== null) { setMostrarAsientos(v => !v); return }
    startAsientoTransition(async () => {
      const res = await descargarAsientoAction(tituloId)
      if (res.error) { setAsientoError(res.error); return }
      if (res.pdf) { setAsientos([res.pdf]); setMostrarAsientos(true) }
    })
  }

  const descargarPdf = (base64: string, filename: string) => {
    const link = document.createElement('a')
    link.href = `data:application/pdf;base64,${base64}`
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="flex items-start gap-3">
      <div className="flex flex-col gap-1.5 items-start min-w-[160px]">
        {estadoVisible && !result?.error && <EstadoBadge estado={estadoVisible} />}
        {result?.detalle && (
          <span className="text-xs text-gray-500 leading-tight">{result.detalle}</span>
        )}
        {result?.error && (
          <span className="text-xs text-red-500 leading-tight">{result.error}</span>
        )}
        {deleteError && (
          <span className="text-xs text-red-500 leading-tight">{deleteError}</span>
        )}

        <button
          onClick={handleConsultar}
          disabled={isPending || isDeleting || esquelaPending}
          className="mt-0.5 text-xs text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed font-medium"
        >
          {isPending ? '⏳ Consultando…' : ultimoEstado ? '↻ Actualizar estado' : 'Consultar ahora'}
        </button>

        {tieneEsquela && (
          <button
            onClick={handleVerEsquelas}
            disabled={isPending || isDeleting || esquelaPending}
            className="text-xs text-emerald-600 hover:text-emerald-800 disabled:text-gray-400 disabled:cursor-not-allowed font-medium"
          >
            {esquelaPending
              ? '⏳ Cargando…'
              : esquelas !== null
                ? (mostrarEsquelas ? `▲ Ocultar (${esquelas.length})` : `▼ ${labelEsquela.plural} (${esquelas.length})`)
                : `↓ ${labelEsquela.plural}`
            }
          </button>
        )}

        {esquelaError && (
          <span className="text-xs text-red-500 leading-tight">{esquelaError}</span>
        )}

        {tieneAsiento && (
          <button
            onClick={handleVerAsientos}
            disabled={isPending || isDeleting || esquelaPending || asientoPending}
            className="text-xs text-violet-600 hover:text-violet-800 disabled:text-gray-400 disabled:cursor-not-allowed font-medium"
          >
            {asientoPending
              ? '⏳ Obteniendo asiento…'
              : asientos !== null
                ? (mostrarAsientos ? `▲ Ocultar asientos (${asientos.length})` : `▼ Asientos (${asientos.length})`)
                : '↓ Asiento'
            }
          </button>
        )}

        {asientoError && (
          <span className="text-xs text-red-500 leading-tight">{asientoError}</span>
        )}

        {mostrarAsientos && asientos && asientos.length > 0 && (
          <div className="mt-1 flex flex-col gap-0.5 w-full">
            {asientos.map((pdf, i) => (
              <button
                key={i}
                onClick={() => descargarPdf(pdf, `asiento-${i + 1}-${tituloId.slice(0, 8)}.pdf`)}
                className="text-left text-xs text-violet-700 hover:text-violet-900 font-medium flex items-center gap-1"
              >
                <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                </svg>
                Asiento {asientos.length > 1 ? i + 1 : ''}
              </button>
            ))}
          </div>
        )}

        {mostrarEsquelas && esquelas && esquelas.length > 0 && (
          <div className="mt-1 flex flex-col gap-0.5 w-full">
            {esquelas.map((pdf, i) => (
              <button
                key={i}
                onClick={() => descargarPdf(
                  pdf,
                  `${labelEsquela.singular.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}-${i + 1}-${tituloId.slice(0, 8)}.pdf`
                )}
                className="text-left text-xs text-emerald-700 hover:text-emerald-900 font-medium flex items-center gap-1"
              >
                <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                </svg>
                {labelEsquela.singular} {esquelas.length > 1 ? i + 1 : ''}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Botón eliminar */}
      <button
        onClick={handleEliminar}
        disabled={isPending || isDeleting}
        title="Eliminar título"
        className="mt-0.5 flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-gray-300 hover:bg-red-50 hover:text-red-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {isDeleting ? (
          <span className="text-xs">…</span>
        ) : (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
      </button>
    </div>
  )
}
