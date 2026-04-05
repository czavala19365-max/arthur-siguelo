'use client'

import { useState } from 'react'
import { getEstadoStyle, ESTADOS_CON_ESQUELA, LABEL_ESQUELA, normalizarEstado } from '@/lib/estados'
import TituloDetailModal from './TituloDetailModal'
import type { Titulo } from '@/types'

const DownloadIcon = () => (
  <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
  </svg>
)

function RowDownloads({ titulo }: { titulo: Titulo }) {
  const estadoNorm = normalizarEstado(titulo.ultimo_estado ?? '')
  const tieneEsquela = ESTADOS_CON_ESQUELA.has(estadoNorm) && !!titulo.area_registral
  const tieneAsiento = estadoNorm === 'INSCRITO' && !!titulo.area_registral
  const label = LABEL_ESQUELA[estadoNorm]

  if (!tieneEsquela && !tieneAsiento) return null

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      {tieneEsquela && label && (
        <a
          href={`/api/descargar-esquela?id=${titulo.id}&index=0`}
          target="_blank"
          rel="noopener noreferrer"
          title={`Descargar ${label.plural}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: '#065f46',
            textDecoration: 'none',
          }}
        >
          <DownloadIcon />
          {label.plural}
        </a>
      )}
      {tieneAsiento && (
        <a
          href={`/api/descargar-asiento?id=${titulo.id}`}
          target="_blank"
          rel="noopener noreferrer"
          title="Descargar asiento de inscripción"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: '#4c1d95',
            textDecoration: 'none',
          }}
        >
          <DownloadIcon />
          Asiento
        </a>
      )}
    </div>
  )
}

export default function TituloSection({
  estado,
  titulos,
}: {
  estado: string
  titulos: Titulo[]
}) {
  const [expanded, setExpanded] = useState(true)
  const [selected, setSelected] = useState<Titulo | null>(null)

  const style = getEstadoStyle(estado) ?? { bg: '#F3F4F6', text: '#374151' }

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
    <div style={{
      border: '1px solid var(--line)',
      borderTop: `3px solid ${style.text}`,
      marginBottom: '16px',
      background: 'var(--surface)',
    }}>
      {/* Encabezado colapsable */}
      <button
        onClick={() => setExpanded(v => !v)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 24px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          borderBottom: expanded ? '1px solid var(--line-faint)' : 'none',
          transition: 'background 0.15s',
        }}
        onMouseOver={e => { e.currentTarget.style.background = 'var(--paper-dark)' }}
        onMouseOut={e => { e.currentTarget.style.background = 'none' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span
            style={{
              display: 'inline-block',
              padding: '3px 10px',
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              fontWeight: 600,
              backgroundColor: style.bg,
              color: style.text,
            }}
          >
            {estado}
          </span>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--muted)',
          }}>
            {titulos.length} {titulos.length === 1 ? 'título' : 'títulos'}
          </span>
        </div>
        <svg
          style={{
            width: '14px',
            height: '14px',
            color: 'var(--muted)',
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
            flexShrink: 0,
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
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                color: 'var(--muted)',
              }}>
                <th style={{ padding: '10px 24px', fontWeight: 500, textAlign: 'left', whiteSpace: 'nowrap' }}>Nº Título</th>
                <th style={{ padding: '10px 16px', fontWeight: 500, textAlign: 'left' }}>Oficina</th>
                <th style={{ padding: '10px 16px', fontWeight: 500, textAlign: 'left' }}>Cliente</th>
                <th style={{ padding: '10px 16px', fontWeight: 500, textAlign: 'left' }}>Asunto</th>
                <th style={{ padding: '10px 16px', fontWeight: 500, textAlign: 'left' }}>Descargas</th>
                <th style={{ padding: '10px 24px', fontWeight: 500, textAlign: 'left' }}></th>
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
                    <button
                      onClick={() => setSelected(t)}
                      style={{
                        ...actionsBtnBase,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                      onMouseOver={e => { e.currentTarget.style.background = 'var(--ink)'; e.currentTarget.style.color = 'var(--paper)' }}
                      onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--ink)' }}
                    >
                      <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

      {selected && (
        <TituloDetailModal
          titulo={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}
