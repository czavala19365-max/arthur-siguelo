'use client'

import { useState, useMemo } from 'react'
import { STATE_ORDER, normalizarEstado } from '@/lib/estados'
import type { Titulo } from '@/types'
import BuscadorTitulos from './BuscadorTitulos'
import TituloSection from './TituloSection'

function normalizar(str: string) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function buildSections(titulos: Titulo[]) {
  const grouped = new Map<string, Titulo[]>()
  for (const t of titulos) {
    const key = normalizarEstado(t.ultimo_estado ?? '')
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(t)
  }

  const sections: { estado: string; titulos: Titulo[] }[] = []
  const used = new Set<string>()

  for (const canonico of STATE_ORDER) {
    const key = normalizarEstado(canonico)
    const items = grouped.get(key)
    if (items?.length) {
      sections.push({ estado: canonico, titulos: items })
      used.add(key)
    }
  }

  const otros: Titulo[] = []
  for (const [key, items] of grouped) {
    if (!used.has(key)) otros.push(...items)
  }
  if (otros.length) sections.push({ estado: 'OTROS', titulos: otros })

  return sections
}

export default function TitulosClientView({ titulos }: { titulos: Titulo[] }) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    if (!query.trim()) return titulos
    const q = normalizar(query.trim())
    return titulos.filter(t =>
      normalizar(t.numero_titulo).includes(q) ||
      normalizar(String(t.anio_titulo)).includes(q) ||
      normalizar(t.nombre_cliente).includes(q) ||
      normalizar(t.asunto ?? '').includes(q) ||
      normalizar(t.ultimo_estado ?? '').includes(q)
    )
  }, [query, titulos])

  const sections = useMemo(() => buildSections(filtered), [filtered])
  const totalFiltrado = filtered.length
  const hayBusqueda = query.trim().length > 0

  return (
    <div>
      {/* Buscador */}
      <div style={{ marginBottom: '24px' }}>
        <BuscadorTitulos value={query} onChange={setQuery} />
        {hayBusqueda && (
          <div style={{
            marginTop: '8px',
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: 'var(--muted)',
          }}>
            {totalFiltrado === 0
              ? 'Sin resultados'
              : `${totalFiltrado} ${totalFiltrado === 1 ? 'título encontrado' : 'títulos encontrados'}`
            }
          </div>
        )}
      </div>

      {/* Sin resultados */}
      {hayBusqueda && sections.length === 0 && (
        <div style={{
          padding: '48px 24px',
          textAlign: 'center',
          border: '1px solid var(--line)',
          background: 'var(--surface)',
        }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '20px', color: 'var(--ink)', marginBottom: '8px', fontStyle: 'italic' }}>
            Sin resultados
          </div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--muted)' }}>
            No se encontraron títulos para &ldquo;{query}&rdquo;
          </div>
        </div>
      )}

      {/* Secciones filtradas */}
      {sections.map(({ estado, titulos: items }) => (
        <TituloSection key={estado} estado={estado} titulos={items} />
      ))}
    </div>
  )
}
