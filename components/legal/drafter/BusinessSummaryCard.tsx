'use client'

import { documentTypeLabel, jurisdictionLabel, type DocumentTypeId } from '@/lib/legal/drafter/form-schemas'
import type { DrafterField } from '@/lib/legal/drafter/schema/types'
import { legalStyles } from '@/lib/legal/styles'

interface BusinessSummaryCardProps {
  documentType: DocumentTypeId
  jurisdiction: string
  fields: Record<string, string>
  formFields: DrafterField[]
  accessoryPreview: string[]
  completedRequired: number
  totalRequired: number
}

function truncate(value: string, max = 80): string {
  const trimmed = value.trim()
  return trimmed.length > max ? `${trimmed.slice(0, max)}…` : trimmed
}

export default function BusinessSummaryCard({
  documentType,
  jurisdiction,
  fields,
  formFields,
  accessoryPreview,
  completedRequired,
  totalRequired,
}: BusinessSummaryCardProps) {
  const filled = formFields.filter(f => fields[f.id]?.trim())
  const missingRequiredLabels = formFields.filter(f => f.required && !fields[f.id]?.trim()).map(f => f.label)

  return (
    <div style={legalStyles.card}>
      <h2 style={{ fontSize: 16, marginBottom: 4 }}>Resumen del negocio</h2>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>
        {documentTypeLabel(documentType)} — {jurisdictionLabel(jurisdiction)}
      </p>

      {totalRequired > 0 && (
        <p style={{ fontSize: 13, marginBottom: 12, color: completedRequired >= totalRequired ? 'var(--accent)' : 'var(--muted)' }}>
          {completedRequired}/{totalRequired} campos requeridos completos
          {completedRequired < totalRequired && ` — faltan: ${missingRequiredLabels.join(', ')}`}
        </p>
      )}

      {filled.length > 0 ? (
        <ul style={{ margin: 0, marginBottom: 12, paddingLeft: 18, fontSize: 13, lineHeight: 1.6 }}>
          {filled.map(f => (
            <li key={f.id}>
              <strong>{f.label}:</strong> {truncate(fields[f.id])}
            </li>
          ))}
        </ul>
      ) : (
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>Todavía no hay campos llenados.</p>
      )}

      {accessoryPreview.length > 0 && (
        <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>Se generarán además: {accessoryPreview.join(', ')}.</p>
      )}
    </div>
  )
}
