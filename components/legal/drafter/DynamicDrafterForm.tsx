'use client'

import type { DrafterField } from '@/lib/legal/drafter/schema/types'
import { legalStyles } from '@/lib/legal/styles'

interface DynamicDrafterFormProps {
  fields: DrafterField[]
  values: Record<string, string>
  onChange: (id: string, value: string) => void
}

function renderField(field: DrafterField, value: string, onChange: (id: string, value: string) => void) {
  switch (field.type) {
    case 'select':
      return (
        <select value={value} onChange={e => onChange(field.id, e.target.value)} style={legalStyles.input}>
          <option value="">Seleccionar...</option>
          {field.options?.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )
    case 'date':
      return (
        <input
          type="date"
          value={value}
          onChange={e => onChange(field.id, e.target.value)}
          style={legalStyles.input}
        />
      )
    case 'number':
    case 'currency':
      return (
        <input
          type="number"
          value={value}
          onChange={e => onChange(field.id, e.target.value)}
          placeholder={field.placeholder}
          style={legalStyles.input}
        />
      )
    case 'text':
      return (
        <input
          type="text"
          value={value}
          onChange={e => onChange(field.id, e.target.value)}
          placeholder={field.placeholder}
          style={legalStyles.input}
        />
      )
    case 'textarea':
    default:
      return (
        <textarea
          rows={field.rows || 2}
          value={value}
          onChange={e => onChange(field.id, e.target.value)}
          placeholder={field.placeholder}
          style={legalStyles.textarea}
        />
      )
  }
}

export default function DynamicDrafterForm({ fields, values, onChange }: DynamicDrafterFormProps) {
  return (
    <>
      {fields.map(f => (
        <div key={f.id} style={{ marginBottom: 16 }}>
          <label style={legalStyles.label}>
            {f.label}
            {f.required ? ' *' : ''}
          </label>
          {renderField(f, values[f.id] || '', onChange)}
        </div>
      ))}
    </>
  )
}
