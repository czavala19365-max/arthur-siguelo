'use client'

import { useState, useTransition } from 'react'
import { consultarAhora } from '@/app/actions'

const ESTADO_COLORS: Record<string, string> = {
  INSCRITO:        'bg-green-100 text-green-800',
  OBSERVADO:       'bg-yellow-100 text-yellow-800',
  TACHADO:         'bg-red-100 text-red-800',
  'EN CALIFICACION': 'bg-blue-100 text-blue-800',
}

function EstadoBadge({ estado }: { estado: string }) {
  const color = ESTADO_COLORS[estado.toUpperCase()] ?? 'bg-gray-100 text-gray-700'
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${color}`}>
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
  const [isPending, startTransition] = useTransition()

  const estadoVisible = result?.estado ?? ultimoEstado

  const handleClick = () => {
    startTransition(async () => {
      const res = await consultarAhora(tituloId)
      setResult(res)
    })
  }

  return (
    <div className="flex flex-col gap-1 items-start min-w-[120px]">
      {estadoVisible && !result?.error && (
        <EstadoBadge estado={estadoVisible} />
      )}
      {result?.detalle && (
        <span className="text-xs text-gray-500 leading-tight">{result.detalle}</span>
      )}
      {result?.error && (
        <span className="text-xs text-red-500 leading-tight">{result.error}</span>
      )}
      <button
        onClick={handleClick}
        disabled={isPending}
        className="mt-0.5 text-xs text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed font-medium"
      >
        {isPending ? '⏳ Consultando…' : ultimoEstado ? '↻ Actualizar' : 'Consultar ahora'}
      </button>
    </div>
  )
}
