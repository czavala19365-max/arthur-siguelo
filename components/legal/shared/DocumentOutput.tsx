'use client'

import { downloadTextAsWord } from '@/lib/legal/word-export'
import { legalStyles } from '@/lib/legal/styles'

interface DocumentOutputProps {
  title?: string
  document: string
  filename?: string
}

export default function DocumentOutput({
  title = 'Documento generado',
  document,
  filename = 'documento',
}: DocumentOutputProps) {
  async function copy() {
    await navigator.clipboard.writeText(document)
  }

  return (
    <div style={legalStyles.card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ ...legalStyles.h1, fontSize: 18, margin: 0 }}>{title}</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" style={legalStyles.btnSecondary} onClick={() => void copy()}>
            Copiar
          </button>
          <button type="button" style={legalStyles.btnPrimary} onClick={() => downloadTextAsWord(document, filename)}>
            Descargar Word
          </button>
        </div>
      </div>
      <pre
        style={{
          whiteSpace: 'pre-wrap',
          wordWrap: 'break-word',
          fontFamily: 'var(--font-body)',
          fontSize: 13,
          lineHeight: 1.65,
          maxHeight: 520,
          overflow: 'auto',
          padding: 16,
          background: 'var(--paper)',
          border: '1px solid var(--line-faint)',
        }}
      >
        {document}
      </pre>
    </div>
  )
}
