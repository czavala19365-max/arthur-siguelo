'use client'

import { useMemo, useState } from 'react'
import {
  CHECKLIST_TYPES,
  CHECKLIST_STATUSES,
  getChecklistTemplate,
  type ChecklistData,
  type ChecklistSection,
  type ChecklistItem,
} from '@/lib/legal/checklist/prompts'
import { buildWordTableHtml, downloadAsWord } from '@/lib/legal/word-export'
import { legalStyles } from '@/lib/legal/styles'

export default function ClosingChecklistBuilder() {
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [checklist, setChecklist] = useState<ChecklistData | null>(null)
  const [projectName, setProjectName] = useState('')

  const typeInfo = useMemo(
    () => CHECKLIST_TYPES.find(t => t.value === selectedType),
    [selectedType],
  )

  const progress = useMemo(() => {
    if (!checklist) return 0
    const items = checklist.sections.flatMap(s => s.items)
    if (items.length === 0) return 0
    const done = items.filter(i => i.status === 'Completo' || i.status === 'N/A').length
    return Math.round((done / items.length) * 100)
  }, [checklist])

  const totalItems = useMemo(
    () => checklist?.sections.reduce((n, s) => n + s.items.length, 0) ?? 0,
    [checklist],
  )

  function selectType(type: string) {
    setSelectedType(type)
    const template = getChecklistTemplate(type)
    const deep: ChecklistData = JSON.parse(JSON.stringify(template))
    setChecklist(deep)
  }

  function reset() {
    setSelectedType(null)
    setChecklist(null)
    setProjectName('')
  }

  function updateItem(si: number, ii: number, patch: Partial<ChecklistItem>) {
    if (!checklist) return
    const sections = checklist.sections.map((s, sIdx) => {
      if (sIdx !== si) return s
      return {
        ...s,
        items: s.items.map((it, iIdx) => (iIdx === ii ? { ...it, ...patch } : it)),
      }
    })
    setChecklist({ sections })
  }

  function removeItem(si: number, ii: number) {
    if (!checklist) return
    const sections = checklist.sections.map((s, sIdx) => {
      if (sIdx !== si) return s
      return { ...s, items: s.items.filter((_, i) => i !== ii) }
    })
    setChecklist({ sections })
  }

  function addItem(si: number) {
    if (!checklist) return
    const blank: ChecklistItem = {
      description: '',
      responsible: '',
      timeline: '',
      status: 'Pendiente',
      notes: '',
    }
    const sections = checklist.sections.map((s, sIdx) => {
      if (sIdx !== si) return s
      return { ...s, items: [...s.items, blank] }
    })
    setChecklist({ sections })
  }

  function addSection() {
    if (!checklist) return
    setChecklist({
      sections: [
        ...checklist.sections,
        {
          title: 'Nueva sección',
          items: [{ description: '', responsible: '', timeline: '', status: 'Pendiente', notes: '' }],
        },
      ],
    })
  }

  function removeSection(si: number) {
    if (!checklist) return
    setChecklist({ sections: checklist.sections.filter((_, i) => i !== si) })
  }

  function updateSectionTitle(si: number, title: string) {
    if (!checklist) return
    const sections = checklist.sections.map((s, i) => (i === si ? { ...s, title } : s))
    setChecklist({ sections })
  }

  function exportWord() {
    if (!checklist) return
    const label = typeInfo?.label ?? 'checklist'
    const html = buildWordTableHtml(
      checklist.sections.map(s => ({
        title: s.title,
        rows: s.items.map(it => ({
          descripcion: it.description + (it.details ? `\n${it.details}` : ''),
          responsable: it.responsible,
          plazo: it.timeline,
          estado: it.status,
          notas: it.notes,
        })),
      })),
      [
        { key: 'descripcion', label: 'Acto / Procedimiento' },
        { key: 'responsable', label: 'Responsable' },
        { key: 'plazo', label: 'Plazo' },
        { key: 'estado', label: 'Estado' },
        { key: 'notas', label: 'Notas' },
      ],
      projectName || `Checklist - ${label}`,
    )
    downloadAsWord(html, `checklist-${projectName || label}`)
  }

  if (!selectedType || !checklist) {
    return (
      <div style={{ ...legalStyles.page, paddingTop: 48 }}>
        <h1 style={legalStyles.h1}>Checklist</h1>
        <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 32, maxWidth: 600 }}>
          Selecciona un tipo de operación societaria para obtener el checklist de pasos y documentos requeridos bajo la legislación peruana.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {CHECKLIST_TYPES.map(t => (
            <button
              key={t.value}
              type="button"
              onClick={() => selectType(t.value)}
              style={{
                textAlign: 'left',
                background: 'var(--surface)',
                border: '1px solid var(--line)',
                padding: 24,
                cursor: 'pointer',
                color: 'inherit',
                transition: 'border-color 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--line)' }}
            >
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, marginBottom: 8 }}>
                {t.label}
              </div>
              <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5, margin: 0 }}>
                {t.description}
              </p>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ ...legalStyles.page, paddingTop: 48 }}>
      <h1 style={legalStyles.h1}>Checklist</h1>

      {/* Header bar */}
      <div style={{ ...legalStyles.card, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 6 }}>
              {typeInfo?.label}
            </div>
            <input
              placeholder="Nombre del proyecto (opcional)"
              style={{ ...legalStyles.input, maxWidth: 360 }}
              value={projectName}
              onChange={e => setProjectName(e.target.value)}
            />
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 8 }}>
              {totalItems} items — Progreso: {progress}%
            </div>
            <div style={{ maxWidth: 320, height: 6, background: 'var(--line-faint)', marginTop: 6 }}>
              <div
                style={{
                  width: `${progress}%`,
                  height: '100%',
                  background: progress === 100 ? '#22c55e' : 'var(--accent)',
                  transition: 'width 0.3s',
                }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button type="button" style={legalStyles.btnSecondary} onClick={reset}>
              Cambiar tipo
            </button>
            <button type="button" style={legalStyles.btnSecondary} onClick={exportWord}>
              Exportar Word
            </button>
          </div>
        </div>
      </div>

      {/* Sections */}
      {checklist.sections.map((section, si) => (
        <div key={si} style={{ ...legalStyles.card, marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
            <input
              style={{ ...legalStyles.input, fontWeight: 600, flex: 1 }}
              value={section.title}
              onChange={e => updateSectionTitle(si, e.target.value)}
            />
            <button type="button" style={{ ...legalStyles.btnSecondary, fontSize: 10, whiteSpace: 'nowrap' }} onClick={() => removeSection(si)}>
              Eliminar
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 700 }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--line)' }}>
                  <th style={{ padding: 8 }}>Acto / Procedimiento</th>
                  <th style={{ padding: 8, width: 130 }}>Responsable</th>
                  <th style={{ padding: 8, width: 120 }}>Plazo</th>
                  <th style={{ padding: 8, width: 110 }}>Estado</th>
                  <th style={{ padding: 8, width: 130 }}>Notas</th>
                  <th style={{ padding: 8, width: 36 }} />
                </tr>
              </thead>
              <tbody>
                {section.items.map((it, ii) => (
                  <tr key={ii} style={{ borderBottom: '1px solid var(--line-faint)', verticalAlign: 'top' }}>
                    <td style={{ padding: 8 }}>
                      <input
                        style={{ ...legalStyles.input, fontSize: 12, marginBottom: it.details ? 4 : 0 }}
                        value={it.description}
                        onChange={e => updateItem(si, ii, { description: e.target.value })}
                      />
                      {it.details && (
                        <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.4, padding: '2px 4px' }}>
                          {it.details}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: 8 }}>
                      <input style={{ ...legalStyles.input, fontSize: 12 }} value={it.responsible} onChange={e => updateItem(si, ii, { responsible: e.target.value })} />
                    </td>
                    <td style={{ padding: 8 }}>
                      <input style={{ ...legalStyles.input, fontSize: 12 }} value={it.timeline} onChange={e => updateItem(si, ii, { timeline: e.target.value })} />
                    </td>
                    <td style={{ padding: 8 }}>
                      <select style={{ ...legalStyles.input, fontSize: 12 }} value={it.status} onChange={e => updateItem(si, ii, { status: e.target.value })}>
                        {CHECKLIST_STATUSES.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: 8 }}>
                      <input style={{ ...legalStyles.input, fontSize: 12 }} value={it.notes} onChange={e => updateItem(si, ii, { notes: e.target.value })} />
                    </td>
                    <td style={{ padding: 8 }}>
                      <button
                        type="button"
                        onClick={() => removeItem(si, ii)}
                        style={{ fontSize: 11, background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button type="button" style={{ ...legalStyles.btnSecondary, marginTop: 12, fontSize: 10 }} onClick={() => addItem(si)}>
            + Agregar paso
          </button>
        </div>
      ))}

      <button type="button" style={legalStyles.btnSecondary} onClick={addSection}>
        + Nueva sección
      </button>
    </div>
  )
}
