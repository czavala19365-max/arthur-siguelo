'use client'

import { useState } from 'react'
import { legalStyles } from '@/lib/legal/styles'
import type { SeccionDrafter } from '@/lib/legal/drafter/types'
import { seccionesDrafterToTexto } from '@/lib/legal/drafter/types'
import type { DocumentTypeId } from '@/lib/legal/drafter/form-schemas'

interface DocumentSectionsPreviewProps {
  title?: string
  sections: SeccionDrafter[]
  documentType: DocumentTypeId
  documentId: string
  highlightedIds?: string[]
}

export default function DocumentSectionsPreview({
  title = 'Documento generado',
  sections,
  documentType,
  documentId,
  highlightedIds = [],
}: DocumentSectionsPreviewProps) {
  const [downloading, setDownloading] = useState(false)
  const ordenadas = sections.slice().sort((a, b) => a.orden - b.orden)

  async function copy() {
    await navigator.clipboard.writeText(seccionesDrafterToTexto(sections))
  }

  async function downloadDocx() {
    setDownloading(true)
    try {
      const res = await fetch('/api/legal/drafter/docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId, sections, documentType }),
      })
      if (!res.ok) throw new Error('Error al generar el documento Word')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${documentType}.docx`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div style={legalStyles.card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ ...legalStyles.h1, fontSize: 18, margin: 0 }}>{title}</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" style={legalStyles.btnSecondary} onClick={() => void copy()}>
            Copiar
          </button>
          <button type="button" style={{ ...legalStyles.btnPrimary, opacity: downloading ? 0.6 : 1 }} disabled={downloading} onClick={() => void downloadDocx()}>
            {downloading ? 'Generando...' : 'Descargar Word'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 560, overflow: 'auto' }}>
        {ordenadas.map(s => (
          <div
            key={s.id}
            style={{
              padding: 16,
              border: '1px solid var(--line-faint)',
              background: highlightedIds.includes(s.id) ? 'rgba(201, 168, 76, 0.08)' : 'var(--paper)',
              transition: 'background 400ms ease-out',
            }}
          >
            {s.titulo && (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)', marginBottom: 8 }}>
                {s.titulo}
              </div>
            )}
            <div style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word', fontFamily: 'var(--font-body)', fontSize: 13, lineHeight: 1.65 }}>
              {s.contenido}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
