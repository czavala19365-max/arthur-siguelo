'use client'

import { useRef, useState } from 'react'
import { legalStyles } from '@/lib/legal/styles'

interface Stats {
  substitutions: number
  insertions: number
  deletions: number
  total: number
  unmatched: number
}

interface RedlineResult {
  docxUrl: string
  docxName: string
  summary: string
  stats: Stats
}

interface ProgressState {
  phase: string
  progress: number
  message: string
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
  const [progress, setProgress] = useState<ProgressState | null>(null)
  const [error, setError] = useState('')
  const [result, setResult] = useState<RedlineResult | null>(null)

  const loading = progress !== null && (result === null && error === '')
  const canRun = !!oldFile && !!newFile && !loading

  async function run() {
    if (!oldFile || !newFile) return
    setError('')
    setResult(null)
    setProgress({ phase: 'starting', progress: 0, message: 'Iniciando...' })

    try {
      const form = new FormData()
      form.append('old_file', oldFile)
      form.append('new_file', newFile)

      const res = await fetch('/api/legal/redline/generate', { method: 'POST', body: form })
      if (!res.ok || !res.body) {
        const text = await res.text().catch(() => '')
        throw new Error(text || `El servidor respondio ${res.status}`)
      }

      await consumeSSE(res.body, {
        onProgress: ev => setProgress(ev),
        onDone: data => {
          const stem = `redline_${baseName(oldFile.name)}_vs_${baseName(newFile.name)}`
          setResult({
            docxUrl: base64ToBlobUrl(
              data.docx_base64,
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            ),
            docxName: `${stem}.docx`,
            summary: data.summary ?? '',
            stats: data.stats,
          })
          setProgress(null)
        },
        onError: msg => {
          throw new Error(msg)
        },
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido al generar el redline.')
      setProgress(null)
    }
  }

  function reset() {
    if (result) URL.revokeObjectURL(result.docxUrl)
    setResult(null)
    setError('')
    setProgress(null)
  }

  return (
    <div style={{ ...legalStyles.page, paddingTop: 48 }}>
      <h1 style={legalStyles.h1}>Comparador redline</h1>
      <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 24, maxWidth: 720 }}>
        Adjunta dos versiones de un DOCX (original y revisado). Arthur genera un redline con tracked
        changes reales de Word — aceptables/rechazables en el panel Revisar.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <FileSlot label="Version original (A)" file={oldFile} onChange={setOldFile} disabled={loading} />
        <FileSlot label="Version revisada (B)" file={newFile} onChange={setNewFile} disabled={loading} />
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
      </div>

      {progress && !result && !error && <ProgressBar progress={progress} />}

      {error && (
        <div
          style={{
            ...legalStyles.card,
            borderColor: '#b91c1c',
            color: '#b91c1c',
            marginBottom: 16,
          }}
        >
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
            <Stat label="Cambios totales" value={result.stats.total} />
            <Stat label="Sustituciones" value={result.stats.substitutions} />
            <Stat label="Inserciones" value={result.stats.insertions} />
            <Stat label="Eliminaciones" value={result.stats.deletions} />
            {result.stats.unmatched > 0 && (
              <Stat label="No ancladas" value={result.stats.unmatched} />
            )}
          </div>

          <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
            <a href={result.docxUrl} download={result.docxName} style={legalStyles.btnPrimary}>
              Descargar Word (.docx)
            </a>
          </div>

          {result.summary && (
            <div style={legalStyles.card}>
              <h3 style={{ fontSize: 14, marginBottom: 8 }}>Resumen de cambios</h3>
              <p style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{result.summary}</p>
            </div>
          )}

          {result.stats.unmatched > 0 && (
            <div style={{ ...legalStyles.card, marginTop: 12, fontSize: 12, color: 'var(--muted)' }}>
              El agente sugirio {result.stats.unmatched} cambio(s) adicional(es) que no se pudieron
              anclar exactamente en el original — revisa los dos documentos para asegurar que no
              falte nada relevante en el DOCX descargado.
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// SSE consumer
// ---------------------------------------------------------------------------

interface SSECallbacks {
  onProgress: (event: ProgressState) => void
  onDone: (data: { docx_base64: string; summary?: string; stats: Stats }) => void
  onError: (message: string) => void
}

async function consumeSSE(body: ReadableStream<Uint8Array>, cb: SSECallbacks): Promise<void> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    // Los eventos SSE se separan por doble salto de linea. Procesamos los
    // completos y dejamos el fragmento parcial para la siguiente iteracion.
    let sep: number
    while ((sep = buffer.indexOf('\n\n')) !== -1) {
      const rawEvent = buffer.slice(0, sep)
      buffer = buffer.slice(sep + 2)
      handleSSEEvent(rawEvent, cb)
    }
  }
  // Vaciar cualquier evento residual (el server siempre cierra con \n\n al
  // final del ultimo evento, pero por robustez lo intentamos).
  if (buffer.trim()) handleSSEEvent(buffer, cb)
}

function handleSSEEvent(raw: string, cb: SSECallbacks): void {
  let event = 'message'
  let data = ''
  for (const line of raw.split('\n')) {
    if (line.startsWith('event:')) event = line.slice(6).trim()
    else if (line.startsWith('data:')) data += line.slice(5).trim()
  }
  if (!data) return
  try {
    const parsed = JSON.parse(data)
    if (event === 'progress') cb.onProgress(parsed as ProgressState)
    else if (event === 'done') cb.onDone(parsed)
    else if (event === 'error') cb.onError(parsed.error || 'Error desconocido')
  } catch {
    // ignorar eventos malformados
  }
}

// ---------------------------------------------------------------------------
// UI subcomponents
// ---------------------------------------------------------------------------

function ProgressBar({ progress }: { progress: ProgressState }) {
  const pct = Math.max(0, Math.min(100, Math.round(progress.progress)))
  return (
    <div style={{ ...legalStyles.card, marginBottom: 16 }}>
      <div style={{ fontSize: 13, marginBottom: 8, color: 'var(--ink)' }}>{progress.message}</div>
      <div
        style={{
          width: '100%',
          height: 6,
          background: 'var(--line)',
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: 'var(--accent)',
            transition: 'width 400ms ease',
          }}
        />
      </div>
      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6, fontFamily: 'var(--font-mono)' }}>
        {pct}%
      </div>
    </div>
  )
}

function FileSlot({
  label,
  file,
  onChange,
  disabled,
}: {
  label: string
  file: File | null
  onChange: (f: File | null) => void
  disabled?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  function pickDocx(files: FileList | null): File | null {
    if (!files || files.length === 0) return null
    const first = Array.from(files).find(f => f.name.toLowerCase().endsWith('.docx'))
    return first ?? null
  }

  const clickable = !disabled

  return (
    <div style={legalStyles.card}>
      <label style={legalStyles.label}>{label}</label>
      <input
        ref={inputRef}
        type="file"
        accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={e => onChange(pickDocx(e.target.files))}
        style={{ display: 'none' }}
        disabled={disabled}
      />
      <div
        role={clickable ? 'button' : undefined}
        tabIndex={clickable ? 0 : -1}
        onClick={() => clickable && inputRef.current?.click()}
        onKeyDown={e => {
          if (!clickable) return
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
        onDragOver={e => {
          if (!clickable) return
          e.preventDefault()
          if (!dragOver) setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => {
          if (!clickable) return
          e.preventDefault()
          setDragOver(false)
          const picked = pickDocx(e.dataTransfer.files)
          if (picked) onChange(picked)
        }}
        style={{
          border: `1px dashed ${dragOver ? 'var(--accent)' : 'var(--line-mid)'}`,
          background: dragOver ? 'rgba(180, 140, 60, 0.06)' : 'transparent',
          borderRadius: 4,
          padding: 16,
          textAlign: 'center',
          cursor: clickable ? 'pointer' : 'not-allowed',
          opacity: disabled ? 0.6 : 1,
          transition: 'border-color 120ms, background 120ms',
        }}
      >
        {file ? (
          <>
            <PaperclipIcon />
            <div
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--ink)',
                marginTop: 8,
                wordBreak: 'break-all',
              }}
            >
              {file.name}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
              {(file.size / 1024).toFixed(1)} KB — clic o arrastra para reemplazar
            </div>
          </>
        ) : (
          <>
            <UploadIcon />
            <div style={{ fontSize: 13, color: 'var(--ink)', marginTop: 8 }}>
              Arrastra un archivo .docx aquí
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
              o haz clic para elegirlo
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function UploadIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ color: 'var(--muted)' }}
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  )
}

function PaperclipIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ color: 'var(--accent)' }}
    >
      <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 17.93 8.8l-8.58 8.57a2 2 0 0 1-2.83-2.83l7.75-7.75" />
    </svg>
  )
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          textTransform: 'uppercase',
          color: 'var(--muted)',
          letterSpacing: '0.1em',
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 22, marginTop: 4 }}>{value}</div>
    </div>
  )
}
