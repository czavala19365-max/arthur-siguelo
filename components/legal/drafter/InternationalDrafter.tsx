'use client'

import { useMemo, useState } from 'react'
import DocumentOutput from '@/components/legal/shared/DocumentOutput'
import FileUpload, { type UploadedFile } from '@/components/legal/shared/FileUpload'
import {
  DOCUMENT_TYPES,
  JURISDICTIONS,
  getFieldsForType,
  type DocumentTypeId,
} from '@/lib/legal/drafter/form-schemas'
import { legalStyles } from '@/lib/legal/styles'

export default function InternationalDrafter() {
  const [docType, setDocType] = useState<DocumentTypeId>('loan_agreement')
  const [jurisdiction, setJurisdiction] = useState('england_wales')
  const [fields, setFields] = useState<Record<string, string>>({})
  const [attachments, setAttachments] = useState<UploadedFile[]>([])
  const [document, setDocument] = useState('')
  const [refineInput, setRefineInput] = useState('')
  const [history, setHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([])
  const [loading, setLoading] = useState(false)
  const [refining, setRefining] = useState(false)
  const [error, setError] = useState('')

  const formFields = useMemo(() => getFieldsForType(docType), [docType])

  function setField(id: string, value: string) {
    setFields(prev => ({ ...prev, [id]: value }))
  }

  async function generate() {
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/legal/drafter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentType: docType,
          jurisdiction,
          fields,
          attachments,
        }),
      })
      const data = (await res.json()) as { document?: string; error?: string }
      if (!res.ok) throw new Error(data.error || 'Error al generar')
      setDocument(data.document || '')
      setHistory([])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  async function refine() {
    if (!refineInput.trim() || !document) return
    setError('')
    setRefining(true)
    const instruction = refineInput.trim()
    setRefineInput('')
    try {
      const res = await fetch('/api/legal/drafter/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document,
          instruction,
          history,
        }),
      })
      const data = (await res.json()) as { document?: string; error?: string }
      if (!res.ok) throw new Error(data.error || 'Error al refinar')
      const next = data.document || ''
      setHistory(h => [
        ...h,
        { role: 'user', content: instruction },
        { role: 'assistant', content: next },
      ])
      setDocument(next)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setRefining(false)
    }
  }

  return (
    <div style={{ ...legalStyles.page, paddingTop: 48 }}>
      <h1 style={legalStyles.h1}>Redactor internacional</h1>
      <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 24 }}>
        Genera documentos legales en inglés según la jurisdicción seleccionada.
      </p>

      <div style={legalStyles.card}>
        <label style={legalStyles.label}>Tipo de documento</label>
        <select
          value={docType}
          onChange={e => {
            setDocType(e.target.value as DocumentTypeId)
            setFields({})
          }}
          style={legalStyles.input}
        >
          {DOCUMENT_TYPES.map(t => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>

        <label style={{ ...legalStyles.label, marginTop: 16 }}>Jurisdicción</label>
        <select value={jurisdiction} onChange={e => setJurisdiction(e.target.value)} style={legalStyles.input}>
          {JURISDICTIONS.map(j => (
            <option key={j.value} value={j.value}>
              {j.label}
            </option>
          ))}
        </select>
      </div>

      <div style={legalStyles.card}>
        <h2 style={{ fontSize: 16, marginBottom: 16 }}>Datos del negocio</h2>
        {formFields.map(f => (
          <div key={f.id} style={{ marginBottom: 16 }}>
            <label style={legalStyles.label}>{f.label}</label>
            <textarea
              rows={f.rows || 2}
              value={fields[f.id] || ''}
              onChange={e => setField(f.id, e.target.value)}
              placeholder={f.placeholder}
              style={legalStyles.textarea}
            />
          </div>
        ))}
      </div>

      <FileUpload files={attachments} onChange={setAttachments} />

      {error && <p style={{ color: '#b91c1c', marginBottom: 16 }}>{error}</p>}

      <button
        type="button"
        style={{ ...legalStyles.btnPrimary, marginBottom: 32, opacity: loading ? 0.6 : 1 }}
        disabled={loading}
        onClick={() => void generate()}
      >
        {loading ? 'Generando...' : 'Generar documento'}
      </button>

      {document && (
        <>
          <DocumentOutput document={document} filename="contrato-internacional" title="Documento generado" />
          <div style={{ ...legalStyles.card, marginTop: 20 }}>
            <label style={legalStyles.label}>Solicitar refinamiento</label>
            <textarea
              rows={3}
              value={refineInput}
              onChange={e => setRefineInput(e.target.value)}
              placeholder="Ej.: Añade una cláusula de confidencialidad más estricta..."
              style={legalStyles.textarea}
            />
            <button
              type="button"
              style={{ ...legalStyles.btnSecondary, marginTop: 12 }}
              disabled={refining || !refineInput.trim()}
              onClick={() => void refine()}
            >
              {refining ? 'Aplicando...' : 'Aplicar cambios'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
