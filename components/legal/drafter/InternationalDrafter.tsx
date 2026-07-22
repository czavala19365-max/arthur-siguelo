'use client'

import { useMemo, useRef, useState } from 'react'
import BusinessSummaryCard from '@/components/legal/drafter/BusinessSummaryCard'
import DynamicDrafterForm from '@/components/legal/drafter/DynamicDrafterForm'
import IntakeChatPanel from '@/components/legal/drafter/IntakeChatPanel'
import PrecedentSelector from '@/components/legal/drafter/PrecedentSelector'
import DocumentSectionsPreview from '@/components/legal/shared/DocumentSectionsPreview'
import EditWithAIPanel from '@/components/legal/shared/EditWithAIPanel'
import FileUpload, { type UploadedFile } from '@/components/legal/shared/FileUpload'
import {
  DOCUMENT_TYPES,
  DEFAULT_JURISDICTION,
  getFieldsForType,
  documentTypeLabel,
  type DocumentTypeId,
} from '@/lib/legal/drafter/form-schemas'
import { getDocumentSchema } from '@/lib/legal/drafter/schema/registry'
import type { DrafterDocumentInput } from '@/lib/legal/drafter/document-service'
import type { CambioDrafter, SeccionDrafter } from '@/lib/legal/drafter/types'
import { legalStyles } from '@/lib/legal/styles'

interface GeneratedDoc {
  documentId: string
  documentType: DocumentTypeId
  sections: SeccionDrafter[]
}

export default function InternationalDrafter() {
  const [docType, setDocType] = useState<DocumentTypeId>('mutuo')
  // El redactor opera siempre bajo legislación peruana; no hay selector de jurisdicción.
  const [jurisdiction, setJurisdiction] = useState(DEFAULT_JURISDICTION)
  const [fields, setFields] = useState<Record<string, string>>({})
  const [intakeMode, setIntakeMode] = useState<'form' | 'chat'>('form')
  const [attachments, setAttachments] = useState<UploadedFile[]>([])
  const [documents, setDocuments] = useState<GeneratedDoc[]>([])
  const [highlightedIds, setHighlightedIds] = useState<Record<string, string[]>>({})
  const [editingDocumentId, setEditingDocumentId] = useState<string | null>(null)
  const [activePrecedentId, setActivePrecedentId] = useState<string | null>(null)
  const [savingPrecedent, setSavingPrecedent] = useState(false)
  const [precedentNamePrompt, setPrecedentNamePrompt] = useState(false)
  const [precedentName, setPrecedentName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const highlightTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const schema = useMemo(() => getDocumentSchema(docType), [docType])
  const formFields = useMemo(() => getFieldsForType(docType), [docType])

  const accessoryPreview = useMemo(
    () => (schema.accessoryDocuments ?? []).filter(rule => rule.condition(fields)).map(rule => documentTypeLabel(rule.id)),
    [schema, fields],
  )

  const totalRequired = useMemo(() => formFields.filter(f => f.required).length, [formFields])
  const completedRequired = useMemo(
    () => formFields.filter(f => f.required && fields[f.id]?.trim()).length,
    [formFields, fields],
  )

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
      const data = (await res.json()) as { documents?: GeneratedDoc[]; error?: string }
      if (!res.ok) throw new Error(data.error || 'Error al generar')
      setDocuments(data.documents || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  function handleSectionsUpdate(documentId: string, updated: SeccionDrafter[], cambios: CambioDrafter[]) {
    setDocuments(prev => prev.map(d => (d.documentId === documentId ? { ...d, sections: updated } : d)))

    const changedTitles = cambios.map(c => c.seccion.toLowerCase())
    const matched = updated
      .filter(s => s.titulo && changedTitles.some(t => s.titulo!.toLowerCase().includes(t) || t.includes(s.titulo!.toLowerCase())))
      .map(s => s.id)
    setHighlightedIds(prev => ({ ...prev, [documentId]: matched }))

    if (highlightTimers.current[documentId]) clearTimeout(highlightTimers.current[documentId])
    highlightTimers.current[documentId] = setTimeout(() => {
      setHighlightedIds(prev => ({ ...prev, [documentId]: [] }))
    }, 4000)
  }

  function handleLoadPrecedent(precedenteId: string, input: DrafterDocumentInput) {
    // Precarga el formulario con la estructura del precedente — el usuario solo
    // ajusta las variables nuevas y genera un documento real (con su propio id)
    // a partir de estos campos, en vez de reusar el contenido ya generado tal cual.
    setActivePrecedentId(precedenteId)
    setDocType(input.documentType)
    setJurisdiction(input.jurisdiction)
    setFields(input.fields)
    setDocuments([])
    setHighlightedIds({})
    setEditingDocumentId(null)
  }

  async function saveAsPrecedent(nombre?: string) {
    const primary = documents[0]
    if (!primary) return
    setSavingPrecedent(true)
    setError('')
    try {
      const body = activePrecedentId
        ? { action: 'nueva_version' as const, precedenteId: activePrecedentId, documentType: docType, jurisdiction, fields, sections: primary.sections }
        : { action: 'guardar' as const, nombre, documentType: docType, jurisdiction, fields, sections: primary.sections }

      const res = await fetch('/api/legal/drafter/precedentes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al guardar el precedente')
      if (!activePrecedentId) setActivePrecedentId(data.precedente.id)
      setPrecedentNamePrompt(false)
      setPrecedentName('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setSavingPrecedent(false)
    }
  }

  const editingDoc = documents.find(d => d.documentId === editingDocumentId) ?? documents[0]

  return (
    <div style={{ ...legalStyles.page, paddingTop: 48 }}>
      <h1 style={legalStyles.h1}>Redactor de contratos</h1>
      <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 24 }}>
        Genera contratos y documentos bajo la legislación peruana vigente (Código Civil y normas
        especiales), con el mismo formato y estilo de las actas.
      </p>

      <div style={legalStyles.card}>
        <label style={legalStyles.label}>Tipo de documento</label>
        <select
          value={docType}
          onChange={e => {
            setDocType(e.target.value as DocumentTypeId)
            setFields({})
            setActivePrecedentId(null)
          }}
          style={legalStyles.input}
        >
          {DOCUMENT_TYPES.map(t => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <PrecedentSelector
        documentType={docType}
        activePrecedentId={activePrecedentId}
        onLoadPrecedent={handleLoadPrecedent}
        onClearPrecedent={() => setActivePrecedentId(null)}
      />

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {(['form', 'chat'] as const).map(m => (
          <button
            key={m}
            type="button"
            onClick={() => setIntakeMode(m)}
            style={{
              ...legalStyles.btnSecondary,
              background: intakeMode === m ? 'var(--accent)' : 'transparent',
              color: intakeMode === m ? '#141414' : 'var(--accent)',
            }}
          >
            {m === 'form' ? 'Formulario' : 'Conversar con Arthur'}
          </button>
        ))}
      </div>

      {intakeMode === 'form' ? (
        <div style={legalStyles.card}>
          <h2 style={{ fontSize: 16, marginBottom: 16 }}>Datos del negocio</h2>
          <DynamicDrafterForm fields={formFields} values={fields} onChange={setField} />
        </div>
      ) : (
        <IntakeChatPanel
          documentType={docType}
          jurisdiction={jurisdiction}
          fields={fields}
          onFieldsUpdate={setFields}
          completedRequired={completedRequired}
          totalRequired={totalRequired}
        />
      )}

      <FileUpload files={attachments} onChange={setAttachments} />

      <BusinessSummaryCard
        documentType={docType}
        jurisdiction={jurisdiction}
        fields={fields}
        formFields={formFields}
        accessoryPreview={accessoryPreview}
        completedRequired={completedRequired}
        totalRequired={totalRequired}
      />

      {error && <p style={{ color: '#b91c1c', marginBottom: 16 }}>{error}</p>}

      <button
        type="button"
        style={{ ...legalStyles.btnPrimary, marginBottom: 32, opacity: loading ? 0.6 : 1 }}
        disabled={loading}
        onClick={() => void generate()}
      >
        {loading ? 'Generando...' : 'Generar documento'}
      </button>

      {documents.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          {precedentNamePrompt ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                value={precedentName}
                onChange={e => setPrecedentName(e.target.value)}
                placeholder="Nombre de referencia (ej. Mutuo Friends & Family)"
                style={legalStyles.input}
              />
              <button
                type="button"
                style={{ ...legalStyles.btnPrimary, opacity: savingPrecedent || !precedentName.trim() ? 0.6 : 1 }}
                disabled={savingPrecedent || !precedentName.trim()}
                onClick={() => void saveAsPrecedent(precedentName.trim())}
              >
                Guardar
              </button>
              <button type="button" style={legalStyles.btnSecondary} onClick={() => setPrecedentNamePrompt(false)}>
                Cancelar
              </button>
            </div>
          ) : (
            <button
              type="button"
              style={{ ...legalStyles.btnSecondary, opacity: savingPrecedent ? 0.6 : 1 }}
              disabled={savingPrecedent}
              onClick={() => (activePrecedentId ? void saveAsPrecedent() : setPrecedentNamePrompt(true))}
            >
              {savingPrecedent ? 'Guardando...' : activePrecedentId ? 'Guardar nueva versión del precedente' : 'Guardar como precedente'}
            </button>
          )}
        </div>
      )}

      {documents.map(doc => (
        <div key={doc.documentId} style={{ marginBottom: 20 }}>
          <DocumentSectionsPreview
            title={documentTypeLabel(doc.documentType)}
            sections={doc.sections}
            documentType={doc.documentType}
            documentId={doc.documentId}
            highlightedIds={highlightedIds[doc.documentId] ?? []}
          />
          <button
            type="button"
            style={legalStyles.btnSecondary}
            onClick={() => setEditingDocumentId(doc.documentId)}
          >
            Editar con IA
          </button>
        </div>
      ))}

      {documents.length > 0 && editingDoc && (
        <EditWithAIPanel
          documentId={editingDoc.documentId}
          sections={editingDoc.sections}
          open={editingDocumentId !== null}
          onClose={() => setEditingDocumentId(null)}
          onSectionsUpdate={(updated, cambios) => handleSectionsUpdate(editingDoc.documentId, updated, cambios)}
        />
      )}
    </div>
  )
}
