'use client'

import { useMemo, useRef, useState } from 'react'
import {
  compareTexts,
  computeStats,
  changeSegmentIndices,
  formatRedlineCopy,
  type Segment,
} from '@/lib/legal/redline/diff'
import { downloadTextAsWord } from '@/lib/legal/word-export'
import { legalStyles } from '@/lib/legal/styles'

type ViewMode = 'inline' | 'side'

function segmentToChangeList(segments: Segment[]) {
  const changes: Array<{ index: number; type: string; oldText: string; newText: string }> = []
  let changeIdx = 0
  segments.forEach(seg => {
    if (seg.type === 'equal') return
    changes.push({
      index: changeIdx++,
      type: seg.type,
      oldText: seg.oldText,
      newText: seg.newText,
    })
  })
  return changes
}

async function parseFile(file: File): Promise<string> {
  const name = file.name.toLowerCase()
  if (name.endsWith('.txt')) return file.text()
  if (name.endsWith('.docx')) {
    const mammoth = await import('mammoth')
    const buf = await file.arrayBuffer()
    const result = await mammoth.extractRawText({ arrayBuffer: buf })
    return result.value
  }
  throw new Error('Use DOCX o TXT')
}

function InlineSegment({
  seg,
  changeIndex,
  annotation,
  active,
  onInfo,
}: {
  seg: Segment
  changeIndex: number | null
  annotation?: string
  active: boolean
  onInfo?: () => void
}) {
  const base: React.CSSProperties = active ? { outline: '2px solid var(--accent)' } : {}

  if (seg.type === 'equal') return <span>{seg.oldText}</span>
  if (seg.type === 'insert') {
    return (
      <span style={{ ...base, background: 'rgba(34,197,94,0.25)', textDecoration: 'underline' }} data-change={changeIndex ?? undefined}>
        {seg.newText}
      </span>
    )
  }
  if (seg.type === 'delete') {
    return (
      <span style={{ ...base, background: 'rgba(239,68,68,0.25)', textDecoration: 'line-through' }} data-change={changeIndex ?? undefined}>
        {seg.oldText}
        {onInfo && (
          <button type="button" onClick={onInfo} style={{ marginLeft: 4, fontSize: 10, cursor: 'pointer' }} title={annotation || 'Ver análisis'}>
            ⓘ
          </button>
        )}
      </span>
    )
  }
  return (
    <span style={base} data-change={changeIndex ?? undefined}>
      <span style={{ background: 'rgba(239,68,68,0.25)', textDecoration: 'line-through' }}>{seg.oldText}</span>
      <span style={{ background: 'rgba(34,197,94,0.25)', textDecoration: 'underline' }}>{seg.newText}</span>
      {onInfo && (
        <button type="button" onClick={onInfo} style={{ marginLeft: 4, fontSize: 10, cursor: 'pointer' }} title={annotation || 'Ver análisis'}>
          ⓘ
        </button>
      )}
    </span>
  )
}

export default function RedlineComparer() {
  const [oldText, setOldText] = useState('')
  const [newText, setNewText] = useState('')
  const [segments, setSegments] = useState<Segment[] | null>(null)
  const [view, setView] = useState<ViewMode>('inline')
  const [annotations, setAnnotations] = useState<Record<number, string>>({})
  const [summary, setSummary] = useState('')
  const [activeChange, setActiveChange] = useState(0)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState('')
  const [tooltip, setTooltip] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  const stats = useMemo(() => (segments ? computeStats(segments) : null), [segments])
  const changeIndices = useMemo(() => (segments ? changeSegmentIndices(segments) : []), [segments])

  const segChangeMap = useMemo(() => {
    const map = new Map<number, number>()
    if (!segments) return map
    let ci = 0
    segments.forEach((seg, si) => {
      if (seg.type !== 'equal') {
        map.set(si, ci++)
      }
    })
    return map
  }, [segments])

  async function analyze(segs: Segment[]) {
    setAnalyzing(true)
    try {
      const changes = segmentToChangeList(segs)
      const res = await fetch('/api/legal/redline/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changes }),
      })
      const data = (await res.json()) as {
        annotations?: Array<{ index: number; reason: string }>
        summary?: string
        error?: string
      }
      if (!res.ok) throw new Error(data.error || 'Error en análisis')
      const ann: Record<number, string> = {}
      for (const a of data.annotations || []) ann[a.index] = a.reason
      setAnnotations(ann)
      setSummary(data.summary || '')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error en análisis IA')
    } finally {
      setAnalyzing(false)
    }
  }

  function runCompare() {
    setError('')
    const result = compareTexts(oldText, newText)
    if (!result) {
      setError('Documento demasiado grande para comparar. Reduce el tamaño del texto.')
      setSegments(null)
      return
    }
    setSegments(result)
    setActiveChange(0)
    void analyze(result)
  }

  function scrollToChange(dir: -1 | 1) {
    if (!changeIndices.length) return
    const next = (activeChange + dir + changeIndices.length) % changeIndices.length
    setActiveChange(next)
    const el = containerRef.current?.querySelector(`[data-change="${next}"]`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  async function onUpload(side: 'old' | 'new', file: File) {
    try {
      const text = await parseFile(file)
      if (side === 'old') setOldText(text)
      else setNewText(text)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al leer archivo')
    }
  }

  return (
    <div style={{ ...legalStyles.page, paddingTop: 48 }}>
      <h1 style={legalStyles.h1}>Comparador redline</h1>
      <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 24 }}>
        Compara dos versiones de un documento con cambios resaltados y análisis IA.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div style={legalStyles.card}>
          <label style={legalStyles.label}>Versión anterior</label>
          <input type="file" accept=".docx,.txt" onChange={e => e.target.files?.[0] && void onUpload('old', e.target.files[0])} style={{ marginBottom: 8, fontSize: 12 }} />
          <textarea rows={12} value={oldText} onChange={e => setOldText(e.target.value)} style={legalStyles.textarea} />
        </div>
        <div style={legalStyles.card}>
          <label style={legalStyles.label}>Versión nueva</label>
          <input type="file" accept=".docx,.txt" onChange={e => e.target.files?.[0] && void onUpload('new', e.target.files[0])} style={{ marginBottom: 8, fontSize: 12 }} />
          <textarea rows={12} value={newText} onChange={e => setNewText(e.target.value)} style={legalStyles.textarea} />
        </div>
      </div>

      <button type="button" style={{ ...legalStyles.btnPrimary, marginBottom: 20 }} onClick={runCompare}>
        Comparar documentos
      </button>

      {error && <p style={{ color: '#b91c1c', marginBottom: 12 }}>{error}</p>}

      {segments && stats && (
        <>
          <div style={{ ...legalStyles.card, display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
            <span>+{stats.wordsAdded} palabras</span>
            <span>-{stats.wordsDeleted} palabras</span>
            <span>{stats.modifications} modificaciones</span>
            <span>{stats.totalChanges} cambios totales</span>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <button type="button" style={legalStyles.btnSecondary} onClick={() => setView('inline')}>
                Vista en línea
              </button>
              <button type="button" style={legalStyles.btnSecondary} onClick={() => setView('side')}>
                Lado a lado
              </button>
              <button type="button" style={legalStyles.btnSecondary} onClick={() => scrollToChange(-1)}>
                ← Anterior
              </button>
              <button type="button" style={legalStyles.btnSecondary} onClick={() => scrollToChange(1)}>
                Siguiente →
              </button>
              <button type="button" style={legalStyles.btnSecondary} onClick={() => void navigator.clipboard.writeText(formatRedlineCopy(segments))}>
                Copiar redline
              </button>
              <button type="button" style={legalStyles.btnSecondary} onClick={() => downloadTextAsWord(formatRedlineCopy(segments), 'redline')}>
                Word
              </button>
            </div>
          </div>

          {analyzing && <p style={{ color: 'var(--muted)', marginBottom: 12 }}>Analizando cambios con IA...</p>}

          {tooltip && (
            <div style={{ ...legalStyles.card, background: 'rgba(194,164,109,0.08)', fontSize: 13 }}>
              {tooltip}
              <button type="button" onClick={() => setTooltip('')} style={{ marginLeft: 12, fontSize: 11 }}>
                Cerrar
              </button>
            </div>
          )}

          <div ref={containerRef} style={{ ...legalStyles.card, maxHeight: 480, overflow: 'auto', lineHeight: 1.7, fontSize: 14 }}>
            {view === 'inline' ? (
              <div>
                {segments.map((seg, i) => {
                  const ci = segChangeMap.get(i)
                  return (
                    <InlineSegment
                      key={i}
                      seg={seg}
                      changeIndex={ci ?? null}
                      active={ci === activeChange}
                      annotation={ci != null ? annotations[ci] : undefined}
                      onInfo={
                        ci != null && annotations[ci]
                          ? () => setTooltip(annotations[ci])
                          : undefined
                      }
                    />
                  )
                })}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, marginBottom: 8, color: 'var(--muted)' }}>ANTERIOR</div>
                  {segments.map((seg, i) => (
                    <span key={i}>
                      {seg.type === 'insert' ? (
                        <span style={{ color: 'var(--muted)' }}>░</span>
                      ) : (
                        <span style={seg.type === 'delete' || seg.type === 'modify' ? { background: 'rgba(239,68,68,0.2)', textDecoration: 'line-through' } : undefined}>
                          {seg.oldText || (seg.type === 'modify' ? '' : '')}
                        </span>
                      )}
                    </span>
                  ))}
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, marginBottom: 8, color: 'var(--muted)' }}>NUEVA</div>
                  {segments.map((seg, i) => (
                    <span key={i}>
                      {seg.type === 'delete' ? (
                        <span style={{ color: 'var(--muted)' }}>░</span>
                      ) : (
                        <span style={seg.type === 'insert' || seg.type === 'modify' ? { background: 'rgba(34,197,94,0.2)', textDecoration: 'underline' } : undefined}>
                          {seg.newText || (seg.type === 'modify' ? '' : '')}
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {summary && (
            <div style={{ ...legalStyles.card, marginTop: 16 }}>
              <h3 style={{ fontSize: 14, marginBottom: 8 }}>Análisis general</h3>
              <p style={{ fontSize: 13, lineHeight: 1.6 }}>{summary}</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
