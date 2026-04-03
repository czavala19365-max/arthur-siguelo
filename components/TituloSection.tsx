'use client'

import { useState, useTransition } from 'react'
import { descargarEsquelaAction, descargarAsientoAction } from '@/app/actions'
import { ESTADO_STYLES, ESTADOS_CON_ESQUELA, LABEL_ESQUELA } from '@/lib/estados'
import EstadoBadge from './EstadoBadge'
import TituloDetailModal from './TituloDetailModal'
import type { Titulo } from '@/types'

// ── Descarga rápida en la fila ────────────────────────────────────────────────
function RowDownloads({ titulo }: { titulo: Titulo }) {
  const estadoUpper = (titulo.ultimo_estado ?? '').toUpperCase()
  const tieneEsquela = ESTADOS_CON_ESQUELA.has(estadoUpper) && !!titulo.area_registral
  const tieneAsiento = estadoUpper === 'INSCRITO' && !!titulo.area_registral
  const label = LABEL_ESQUELA[estadoUpper]

  const [error, setError] = useState<string | null>(null)
  const [esquelaPending, startEsquela] = useTransition()
  const [asientoPending, startAsiento] = useTransition()

  if (!tieneEsquela && !tieneAsiento) return null

  const downloadPdf = (base64: string, filename: string) => {
    const link = document.createElement('a')
    link.href = `data:application/pdf;base64,${base64}`
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="flex items-center gap-2">
      {tieneEsquela && label && (
        <button
          onClick={() => {
            setError(null)
            startEsquela(async () => {
              const res = await descargarEsquelaAction(titulo.id)
              if (res.error) { setError(res.error); return }
              const pdfs = res.pdfs ?? []
              pdfs.forEach((pdf, i) =>
                downloadPdf(pdf, `${label.singular.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}-${i + 1}-${titulo.id.slice(0, 8)}.pdf`)
              )
            })
          }}
          disabled={esquelaPending || asientoPending}
          title={`Descargar ${label.plural}`}
          className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-800 disabled:text-gray-400 font-medium"
        >
          {esquelaPending ? (
            <span className="text-xs">⏳</span>
          ) : (
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
          )}
          <span className="hidden sm:inline">{label.plural}</span>
        </button>
      )}

      {tieneAsiento && (
        <button
          onClick={() => {
            setError(null)
            startAsiento(async () => {
              const res = await descargarAsientoAction(titulo.id)
              if (res.error) { setError(res.error); return }
              if (res.pdf) downloadPdf(res.pdf, `asiento-${titulo.id.slice(0, 8)}.pdf`)
            })
          }}
          disabled={esquelaPending || asientoPending}
          title="Descargar asiento de inscripción"
          className="inline-flex items-center gap-1 text-xs text-violet-600 hover:text-violet-800 disabled:text-gray-400 font-medium"
        >
          {asientoPending ? (
            <span className="text-xs">⏳</span>
          ) : (
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
          )}
          <span className="hidden sm:inline">Asiento</span>
        </button>
      )}

      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  )
}

// ── Sección colapsable por estado ─────────────────────────────────────────────
export default function TituloSection({
  estado,
  titulos,
}: {
  estado: string
  titulos: Titulo[]
}) {
  const [expanded, setExpanded] = useState(true)
  const [selected, setSelected] = useState<Titulo | null>(null)

  const style = ESTADO_STYLES[estado.toUpperCase()] ?? { bg: '#F3F4F6', text: '#374151' }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Encabezado colapsable */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-6 py-3.5 hover:bg-gray-50/60 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <span
            className="inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold"
            style={{ backgroundColor: style.bg, color: style.text }}
          >
            {estado}
          </span>
          <span className="text-sm text-gray-400 font-medium">
            {titulos.length} {titulos.length === 1 ? 'título' : 'títulos'}
          </span>
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Tabla de títulos */}
      {expanded && (
        <div className="border-t border-gray-100 overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs font-semibold text-gray-400 uppercase tracking-wide bg-gray-50/70">
                <th className="px-4 py-2.5 whitespace-nowrap">Nº Título</th>
                <th className="px-4 py-2.5">Oficina</th>
                <th className="px-4 py-2.5">Cliente</th>
                <th className="px-4 py-2.5">Asunto</th>
                <th className="px-4 py-2.5 whitespace-nowrap">Estado</th>
                <th className="px-4 py-2.5">Descargas</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {titulos.map((t, i) => (
                <tr
                  key={t.id}
                  className={`border-t border-gray-50 hover:bg-blue-50/30 transition-colors ${i % 2 === 1 ? 'bg-gray-50/40' : ''}`}
                >
                  <td className="px-4 py-3">
                    <div className="font-semibold text-sm text-gray-900 tabular-nums">{t.numero_titulo}</div>
                    <div className="text-xs text-gray-400">{t.anio_titulo}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 max-w-[100px]">
                    <span className="truncate block" title={t.oficina_registral}>{t.oficina_registral}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 font-medium max-w-[140px]">
                    <span className="truncate block" title={t.nombre_cliente}>{t.nombre_cliente}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 max-w-[160px]">
                    <span className="truncate block" title={t.asunto ?? ''}>
                      {t.asunto ?? <span className="text-gray-300">—</span>}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {t.ultimo_estado
                      ? <EstadoBadge estado={t.ultimo_estado} />
                      : <span className="text-xs text-gray-300">Sin consultar</span>
                    }
                  </td>
                  <td className="px-4 py-3">
                    <RowDownloads titulo={t} />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelected(t)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 whitespace-nowrap rounded-lg border border-blue-100 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 transition-colors"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Ver detalle
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de detalle */}
      {selected && (
        <TituloDetailModal
          titulo={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}
