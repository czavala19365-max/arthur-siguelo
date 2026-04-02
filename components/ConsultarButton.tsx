'use client'

import { useState, useTransition } from 'react'
import { consultarAhora, eliminarTituloAction } from '@/app/actions'

// Colores exactos por estado (text + background con 15% opacidad)
const ESTADO_STYLES: Record<string, { bg: string; text: string }> = {
  'PRESENTADO':  { bg: '#CCFBF1', text: '#0D9488' },
  'REINGRESADO': { bg: '#DBEAFE', text: '#2563EB' },
  'APELADO':     { bg: '#FFEDD5', text: '#F97316' },
  'EN PROCESO':  { bg: '#F3F4F6', text: '#6B7280' },
  'DISTRIBUIDO': { bg: '#FCE7F3', text: '#EC4899' },
  'LIQUIDADO':   { bg: '#DCFCE7', text: '#15803D' },
  'PRORROGADO':  { bg: '#E0F2FE', text: '#38BDF8' },
  'OBSERVADO':   { bg: '#FEE2E2', text: '#DC2626' },
  'TACHADO':     { bg: '#F1F5F9', text: '#111827' },
  'INSCRITO':    { bg: '#DCFCE7', text: '#166534' },
}

function EstadoBadge({ estado }: { estado: string }) {
  const key = estado.toUpperCase()
  const style = ESTADO_STYLES[key]
  if (style) {
    return (
      <span
        className="inline-block rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap"
        style={{ backgroundColor: style.bg, color: style.text }}
      >
        {estado}
      </span>
    )
  }
  return (
    <span className="inline-block rounded-full px-2 py-0.5 text-xs font-semibold bg-gray-100 text-gray-700 whitespace-nowrap">
      {estado}
    </span>
  )
}

export default function ConsultarButton({
  tituloId,
  ultimoEstado,
}: {
  tituloId: string
  ultimoEstado: string | null
}) {
  const [result, setResult] = useState<{ estado?: string; detalle?: string; error?: string } | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isDeleting, startDeleteTransition] = useTransition()

  const estadoVisible = result?.estado ?? ultimoEstado

  const handleConsultar = () => {
    startTransition(async () => {
      const res = await consultarAhora(tituloId)
      setResult(res)
    })
  }

  const handleEliminar = () => {
    if (!confirm('¿Eliminar este título y todo su historial de estados?')) return
    setDeleteError(null)
    startDeleteTransition(async () => {
      console.log('[eliminar] llamando eliminarTituloAction con id:', tituloId)
      const res = await eliminarTituloAction(tituloId)
      console.log('[eliminar] resultado:', res)
      if (res.error) {
        console.error('[eliminar] error:', res.error)
        setDeleteError(res.error)
      }
    })
  }

  return (
    <div className="flex items-start gap-3">
      {/* Columna estado + acción consultar */}
      <div className="flex flex-col gap-1 items-start min-w-[130px]">
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
          disabled={isPending || isDeleting}
          className="mt-0.5 text-xs text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed font-medium"
        >
          {isPending ? '⏳ Consultando…' : ultimoEstado ? '↻ Actualizar' : 'Consultar ahora'}
        </button>
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
