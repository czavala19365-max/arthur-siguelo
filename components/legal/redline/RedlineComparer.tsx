'use client'

import { useEffect, useRef, useState } from 'react'
import { legalStyles } from '@/lib/legal/styles'

interface Stats {
  substitutions: number
  insertions: number
  deletions: number
  total: number
  unmatched: number
}

interface EditItem {
  location: string
  kind: 'substitution' | 'insertion' | 'deletion'
  old_text?: string
  new_text?: string
  after_text?: string
  description?: string
}

interface ChangeGroup {
  location: string
  changes: EditItem[]
}

interface RedlineResult {
  docxUrl: string
  docxName: string
  summaryDocxUrl: string
  summaryDocxName: string
  summary: string
  changes: ChangeGroup[]
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

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

export default function RedlineComparer() {
  const [oldFile, setOldFile] = useState<File | null>(null)
  const [newFile, setNewFile] = useState<File | null>(null)
  const [progress, setProgress] = useState<ProgressState | null>(null)
  const [error, setError] = useState('')
  const [result, setResult] = useState<RedlineResult | null>(null)

  const loading = progress !== null && result === null && error === ''
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
            docxUrl: base64ToBlobUrl(data.docx_base64, DOCX_MIME),
            docxName: `${stem}.docx`,
            summaryDocxUrl: base64ToBlobUrl(data.summary_docx_base64, DOCX_MIME),
            summaryDocxName: `${stem}_resumen.docx`,
            summary: data.summary ?? '',
            changes: data.changes ?? [],
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
    if (result) {
      URL.revokeObjectURL(result.docxUrl)
      URL.revokeObjectURL(result.summaryDocxUrl)
    }
    setResult(null)
    setError('')
    setProgress(null)
  }

  return (
    <div style={{ ...legalStyles.page, paddingTop: 48 }}>
      <h1 style={legalStyles.h1}>Comparador redline</h1>
      <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 24, maxWidth: 720 }}>
        Adjunta dos versiones de un DOCX (original y revisado). Arthur genera un redline con tracked
        changes reales de Word — aceptables/rechazables en el panel Revisar — y un resumen ejecutivo
        organizado por sección.
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
          <StatsBar stats={result.stats} />

          <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
            <a href={result.docxUrl} download={result.docxName} style={legalStyles.btnPrimary}>
              Descargar redline (Word)
            </a>
            <a href={result.summaryDocxUrl} download={result.summaryDocxName} style={legalStyles.btnSecondary}>
              Descargar resumen (Word)
            </a>
          </div>

          {result.changes.length > 0 && <ChangesByLocation groups={result.changes} />}

          {result.summary && (
            <div style={{ ...legalStyles.card, marginBottom: 20 }}>
              <h3 style={{ fontSize: 14, marginBottom: 8 }}>Resumen ejecutivo</h3>
              <p style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{result.summary}</p>
            </div>
          )}

          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 14, marginBottom: 8 }}>Previsualizacion del redline</h3>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>
              Los cambios aparecen resaltados. Para aceptarlos o rechazarlos individualmente, abre el
              archivo en Word y usa el panel Revisar.
            </p>
            <DocxPreview docxUrl={result.docxUrl} />
          </div>

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

interface SSEDone {
  docx_base64: string
  summary_docx_base64: string
  summary?: string
  changes?: ChangeGroup[]
  stats: Stats
}

interface SSECallbacks {
  onProgress: (event: ProgressState) => void
  onDone: (data: SSEDone) => void
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
    let sep: number
    while ((sep = buffer.indexOf('\n\n')) !== -1) {
      const rawEvent = buffer.slice(0, sep)
      buffer = buffer.slice(sep + 2)
      handleSSEEvent(rawEvent, cb)
    }
  }
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
    else if (event === 'done') cb.onDone(parsed as SSEDone)
    else if (event === 'error') cb.onError((parsed as { error?: string }).error || 'Error desconocido')
  } catch {
    // ignorar eventos malformados
  }
}

// ---------------------------------------------------------------------------
// UI subcomponents
// ---------------------------------------------------------------------------

function StatsBar({ stats }: { stats: Stats }) {
  return (
    <div
      style={{
        ...legalStyles.card,
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: 16,
        marginBottom: 16,
      }}
    >
      <Stat label="Cambios totales" value={stats.total} />
      <Stat label="Sustituciones" value={stats.substitutions} />
      <Stat label="Inserciones" value={stats.insertions} />
      <Stat label="Eliminaciones" value={stats.deletions} />
      {stats.unmatched > 0 && <Stat label="No ancladas" value={stats.unmatched} />}
    </div>
  )
}

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

function ChangesByLocation({ groups }: { groups: ChangeGroup[] }) {
  const [openAll, setOpenAll] = useState(true)
  return (
    <div style={{ ...legalStyles.card, marginBottom: 20 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <h3 style={{ fontSize: 14, margin: 0 }}>Cambios por seccion</h3>
        <button
          type="button"
          onClick={() => setOpenAll(v => !v)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--accent)',
            fontSize: 12,
            cursor: 'pointer',
            fontFamily: 'var(--font-mono)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          {openAll ? 'Contraer todo' : 'Expandir todo'}
        </button>
      </div>
      {groups.map((group, i) => (
        <ChangeGroupCard key={i} group={group} defaultOpen={openAll} />
      ))}
    </div>
  )
}

function ChangeGroupCard({ group, defaultOpen }: { group: ChangeGroup; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  useEffect(() => setOpen(defaultOpen), [defaultOpen])

  return (
    <div
      style={{
        borderTop: '1px solid var(--line)',
        paddingTop: 12,
        paddingBottom: 12,
      }}
    >
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{
          background: 'transparent',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          width: '100%',
          textAlign: 'left',
        }}
      >
        <span
          style={{
            display: 'inline-block',
            width: 12,
            fontSize: 10,
            color: 'var(--muted)',
            transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 120ms',
          }}
        >
          ▶
        </span>
        <span style={{ fontWeight: 500, fontSize: 13, color: 'var(--ink)' }}>{group.location}</span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--muted)' }}>
          {group.changes.length} cambio{group.changes.length !== 1 && 's'}
        </span>
      </button>
      {open && (
        <ul style={{ margin: '8px 0 0 24px', padding: 0, listStyle: 'none' }}>
          {group.changes.map((edit, i) => (
            <li key={i} style={{ marginBottom: 6, fontSize: 12, lineHeight: 1.55 }}>
              <ChangeBadge kind={edit.kind} />
              <span style={{ marginLeft: 6, color: 'var(--ink)' }}>{describeEdit(edit)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ChangeBadge({ kind }: { kind: EditItem['kind'] }) {
  const map: Record<EditItem['kind'], { label: string; bg: string; fg: string }> = {
    substitution: { label: 'MOD', bg: '#fef3c7', fg: '#92400e' },
    insertion: { label: 'ADD', bg: '#dcfce7', fg: '#166534' },
    deletion: { label: 'DEL', bg: '#fee2e2', fg: '#991b1b' },
  }
  const { label, bg, fg } = map[kind]
  return (
    <span
      style={{
        display: 'inline-block',
        background: bg,
        color: fg,
        fontFamily: 'var(--font-mono)',
        fontSize: 9,
        fontWeight: 700,
        padding: '2px 6px',
        borderRadius: 2,
        letterSpacing: '0.05em',
      }}
    >
      {label}
    </span>
  )
}

function describeEdit(edit: EditItem): string {
  if (edit.description) return edit.description
  const trunc = (s: string) => (s.length > 100 ? s.slice(0, 100) + '...' : s)
  if (edit.kind === 'substitution') {
    return `Reemplaza «${trunc(edit.old_text ?? '')}» por «${trunc(edit.new_text ?? '')}».`
  }
  if (edit.kind === 'insertion') {
    return `Inserta despues de «${trunc(edit.after_text ?? '')}»: «${trunc(edit.new_text ?? '')}».`
  }
  return `Elimina «${trunc(edit.old_text ?? '')}».`
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

// ---------------------------------------------------------------------------
// Previsualizacion del DOCX con docx-preview (dynamic import, client-only)
// ---------------------------------------------------------------------------

function DocxPreview({ docxUrl }: { docxUrl: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    let cancelled = false
    setState('loading')
    setErrorMsg('')

    ;(async () => {
      if (!containerRef.current) return
      try {
        const dp = await import('docx-preview')
        if (cancelled || !containerRef.current) return
        const blob = await fetch(docxUrl).then(r => r.blob())
        if (cancelled || !containerRef.current) return
        containerRef.current.innerHTML = ''
        await dp.renderAsync(blob, containerRef.current, undefined, {
          className: 'arthur-docx-viewer',
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          renderChanges: true,
        })
        if (!cancelled) setState('ready')
      } catch (err) {
        if (!cancelled) {
          setErrorMsg(err instanceof Error ? err.message : 'Error al renderear el DOCX')
          setState('error')
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [docxUrl])

  return (
    <div
      style={{
        border: '1px solid var(--line)',
        borderRadius: 4,
        background: '#f7f7f5',
        padding: 12,
        maxHeight: 700,
        overflow: 'auto',
        position: 'relative',
      }}
    >
      {state === 'loading' && (
        <div style={{ fontSize: 12, color: 'var(--muted)', padding: 12 }}>
          Cargando previsualizacion...
        </div>
      )}
      {state === 'error' && (
        <div style={{ fontSize: 12, color: '#b91c1c', padding: 12 }}>
          <strong>No se pudo renderear la previsualizacion:</strong> {errorMsg}. Descarga el Word para
          revisarlo.
        </div>
      )}
      <div ref={containerRef} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// FileSlot con drag & drop
// ---------------------------------------------------------------------------

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
