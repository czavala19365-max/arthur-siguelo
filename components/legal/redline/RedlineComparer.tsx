'use client'

import { useState } from 'react'
import { legalStyles } from '@/lib/legal/styles'

interface Stats {
  changes_total: number
  substitutions: number
  new_blocks: number
  deleted_blocks: number
  verified: boolean
}

interface RedlineResult {
  docxUrl: string
  pdfUrl: string
  docxName: string
  pdfName: string
  summary: string
  stats: Stats
}

function base64ToBlobUrl(base64: string, mime: string): string {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return URL.createObjectURL(new Blob([bytes], { type: mime }))
}

function baseName(name: string): string {
  return name.replace(/\.docx$/i, '')
}

export default function RedlineComparer() {
  const [oldFile, setOldFile] = useState<File | null>(null)
  const [newFile, setNewFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<RedlineResult | null>(null)

  const canRun = !!oldFile && !!newFile && !loading

  async function run() {
    if (!oldFile || !newFile) return
    setError('')
    setResult(null)
    setLoading(true)
    try {
      const form = new FormData()
      form.append('old_file', oldFile)
      form.append('new_file', newFile)

      const res = await fetch('/api/legal/redline/generate', { method: 'POST', body: form })
      const data = (await res.json()) as {
        docx_base64?: string
        pdf_base64?: string
        summary?: string
        stats?: Stats
        error?: string
      }
      if (!res.ok || !data.docx_base64 || !data.pdf_base64) {
        throw new Error(data.error || 'El servidor no devolvio los archivos esperados.')
      }

      const stem = `redline_${baseName(oldFile.name)}_vs_${baseName(newFile.name)}`
      setResult({
        docxUrl: base64ToBlobUrl(
          data.docx_base64,
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ),
        pdfUrl: base64ToBlobUrl(data.pdf_base64, 'application/pdf'),
        docxName: `${stem}.docx`,
        pdfName: `${stem}.pdf`,
        summary: data.summary ?? '',
        stats: data.stats ?? { changes_total: 0, substitutions: 0, new_blocks: 0, deleted_blocks: 0, verified: false },
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido al generar el redline.')
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    if (result) {
      URL.revokeObjectURL(result.docxUrl)
      URL.revokeObjectURL(result.pdfUrl)
    }
    setResult(null)
    setError('')
  }

  return (
    <div style={{ ...legalStyles.page, paddingTop: 48 }}>
      <h1 style={legalStyles.h1}>Comparador redline</h1>
      <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 24, maxWidth: 720 }}>
        Adjunta dos versiones de un DOCX (original y revisado). Arthur genera un redline con tracked
        changes reales de Word — aceptables/rechazables en el panel Revisar — y su equivalente en PDF.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <FileSlot label="Version original (A)" file={oldFile} onChange={setOldFile} />
        <FileSlot label="Version revisada (B)" file={newFile} onChange={setNewFile} />
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20 }}>
        <button
          type="button"
          onClick={() => void run()}
          disabled={!canRun}
          style={{ ...legalStyles.btnPrimary, opacity: canRun ? 1 : 0.5 }}
        >
          {loading ? 'Generando redline...' : 'Generar redline'}
        </button>
        {(result || error) && (
          <button type="button" onClick={reset} style={legalStyles.btnSecondary}>
            Nuevo redline
          </button>
        )}
        {loading && (
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>
            El agente puede tardar entre 30 s y 3 min según el tamaño del documento.
          </span>
        )}
      </div>

      {error && (
        <div style={{ ...legalStyles.card, borderColor: '#b91c1c', color: '#b91c1c', marginBottom: 16 }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {result && (
        <>
          <div
            style={{
              ...legalStyles.card,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: 16,
              marginBottom: 16,
            }}
          >
            <Stat label="Cambios totales" value={result.stats.changes_total} />
            <Stat label="Sustituciones" value={result.stats.substitutions} />
            <Stat label="Bloques nuevos" value={result.stats.new_blocks} />
            <Stat label="Bloques eliminados" value={result.stats.deleted_blocks} />
            <Stat label="Verificado" value={result.stats.verified ? 'Si' : 'No'} />
          </div>

          <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
            <a href={result.docxUrl} download={result.docxName} style={legalStyles.btnPrimary}>
              Descargar Word (.docx)
            </a>
            <a href={result.pdfUrl} download={result.pdfName} style={legalStyles.btnPrimary}>
              Descargar PDF
            </a>
          </div>

          {result.summary && (
            <div style={legalStyles.card}>
              <h3 style={{ fontSize: 14, marginBottom: 8 }}>Resumen de cambios</h3>
              <p style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{result.summary}</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function FileSlot({
  label,
  file,
  onChange,
}: {
  label: string
  file: File | null
  onChange: (f: File | null) => void
}) {
  return (
    <div style={legalStyles.card}>
      <label style={legalStyles.label}>{label}</label>
      <input
        type="file"
        accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={e => onChange(e.target.files?.[0] ?? null)}
        style={{ fontSize: 12, marginBottom: 8 }}
      />
      {file ? (
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>
          <div style={{ fontWeight: 500, color: 'var(--ink)' }}>{file.name}</div>
          <div>{(file.size / 1024).toFixed(1)} KB</div>
        </div>
      ) : (
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>Ningun archivo seleccionado.</div>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.1em' }}>
        {label}
      </div>
      <div style={{ fontSize: 22, marginTop: 4 }}>{value}</div>
    </div>
  )
}
