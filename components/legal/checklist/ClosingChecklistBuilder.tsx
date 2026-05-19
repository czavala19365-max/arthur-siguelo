'use client'

import { useMemo, useState } from 'react'
import {
  TRANSACTION_TYPES,
  CHECKLIST_STATUSES,
  type ChecklistData,
  type ChecklistSection,
  type ChecklistItem,
} from '@/lib/legal/checklist/prompts'
import { buildWordTableHtml, downloadAsWord } from '@/lib/legal/word-export'
import { legalStyles } from '@/lib/legal/styles'

const emptyItem = (): ChecklistItem => ({
  description: '',
  status: 'Pendiente',
  responsible: '',
  dueDate: '',
  notes: '',
})

export default function ClosingChecklistBuilder() {
  const [dealName, setDealName] = useState('')
  const [transactionType, setTransactionType] = useState('ma_share')
  const [buyer, setBuyer] = useState('')
  const [seller, setSeller] = useState('')
  const [leadCounsel, setLeadCounsel] = useState('')
  const [targetClosingDate, setTargetClosingDate] = useState('')
  const [checklist, setChecklist] = useState<ChecklistData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const progress = useMemo(() => {
    if (!checklist) return 0
    const items = checklist.sections.flatMap(s => s.items)
    if (items.length === 0) return 0
    const done = items.filter(i =>
      ['Completo', 'N/A', 'Renunciado', 'Complete', 'Waived'].includes(i.status),
    ).length
    return Math.round((done / items.length) * 100)
  }, [checklist])

  async function generate() {
    if (!dealName.trim()) {
      setError('El nombre del negocio es obligatorio')
      return
    }
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/legal/checklist/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealName,
          transactionType: TRANSACTION_TYPES.find(t => t.value === transactionType)?.label || transactionType,
          buyer,
          seller,
          leadCounsel,
          targetClosingDate,
        }),
      })
      const data = (await res.json()) as ChecklistData & { error?: string }
      if (!res.ok) throw new Error(data.error || 'Error al generar')
      const sections = (data.sections || []).map(s => ({
        ...s,
        items: (s.items || []).map(it => ({
          ...it,
          status: it.status === 'Pending' ? 'Pendiente' : it.status,
        })),
      }))
      setChecklist({ sections })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  function updateSection(si: number, patch: Partial<ChecklistSection>) {
    if (!checklist) return
    const sections = [...checklist.sections]
    sections[si] = { ...sections[si], ...patch }
    setChecklist({ sections })
  }

  function updateItem(si: number, ii: number, patch: Partial<ChecklistItem>) {
    if (!checklist) return
    const sections = [...checklist.sections]
    const items = [...sections[si].items]
    items[ii] = { ...items[ii], ...patch }
    sections[si] = { ...sections[si], items }
    setChecklist({ sections })
  }

  function exportWord() {
    if (!checklist) return
    const html = buildWordTableHtml(
      checklist.sections.map(s => ({
        title: s.title,
        rows: s.items.map(it => ({
          descripcion: it.description,
          estado: it.status,
          responsable: it.responsible,
          fecha: it.dueDate,
          notas: it.notes,
        })),
      })),
      [
        { key: 'descripcion', label: 'Descripción' },
        { key: 'estado', label: 'Estado' },
        { key: 'responsable', label: 'Responsable' },
        { key: 'fecha', label: 'Fecha límite' },
        { key: 'notas', label: 'Notas' },
      ],
      dealName || 'checklist',
    )
    downloadAsWord(html, `checklist-${dealName || 'cierre'}`)
  }

  return (
    <div style={{ ...legalStyles.page, paddingTop: 48 }}>
      <h1 style={legalStyles.h1}>Checklist de cierre</h1>
      <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 24 }}>
        Genera y edita checklists de cierre para transacciones corporativas.
      </p>

      {!checklist ? (
        <div style={legalStyles.card}>
          <div style={{ display: 'grid', gap: 16 }}>
            <div>
              <label style={legalStyles.label}>Nombre del negocio *</label>
              <input style={legalStyles.input} value={dealName} onChange={e => setDealName(e.target.value)} />
            </div>
            <div>
              <label style={legalStyles.label}>Tipo de transacción</label>
              <select style={legalStyles.input} value={transactionType} onChange={e => setTransactionType(e.target.value)}>
                {TRANSACTION_TYPES.map(t => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <input placeholder="Comprador / Adquirente" style={legalStyles.input} value={buyer} onChange={e => setBuyer(e.target.value)} />
            <input placeholder="Vendedor / Objetivo" style={legalStyles.input} value={seller} onChange={e => setSeller(e.target.value)} />
            <input placeholder="Abogado líder" style={legalStyles.input} value={leadCounsel} onChange={e => setLeadCounsel(e.target.value)} />
            <div>
              <label style={legalStyles.label}>Fecha objetivo de cierre</label>
              <input type="date" style={legalStyles.input} value={targetClosingDate} onChange={e => setTargetClosingDate(e.target.value)} />
            </div>
          </div>
          {error && <p style={{ color: '#b91c1c', marginTop: 12 }}>{error}</p>}
          <button type="button" style={{ ...legalStyles.btnPrimary, marginTop: 20 }} disabled={loading} onClick={() => void generate()}>
            {loading ? 'Generando...' : 'Generar checklist con IA'}
          </button>
        </div>
      ) : (
        <>
          <div style={{ ...legalStyles.card, marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <strong>{dealName}</strong>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>Progreso: {progress}%</div>
              </div>
              <div style={{ flex: 1, maxWidth: 320, height: 8, background: 'var(--line-faint)' }}>
                <div style={{ width: `${progress}%`, height: '100%', background: 'var(--accent)', transition: 'width 0.3s' }} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" style={legalStyles.btnSecondary} onClick={() => setChecklist(null)}>
                  Nuevo
                </button>
                <button type="button" style={legalStyles.btnSecondary} onClick={exportWord}>
                  Word
                </button>
              </div>
            </div>
          </div>

          {checklist.sections.map((section, si) => (
            <div key={si} style={{ ...legalStyles.card, marginBottom: 20 }}>
              <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                <input
                  style={{ ...legalStyles.input, fontWeight: 600 }}
                  value={section.title}
                  onChange={e => updateSection(si, { title: e.target.value })}
                />
                <button
                  type="button"
                  style={legalStyles.btnSecondary}
                  onClick={() => {
                    const sections = checklist.sections.filter((_, i) => i !== si)
                    setChecklist({ sections })
                  }}
                >
                  Eliminar sección
                </button>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--line)' }}>
                    <th style={{ padding: 8 }}>Descripción</th>
                    <th style={{ padding: 8, width: 120 }}>Estado</th>
                    <th style={{ padding: 8, width: 120 }}>Responsable</th>
                    <th style={{ padding: 8, width: 110 }}>Fecha</th>
                    <th style={{ padding: 8 }}>Notas</th>
                    <th style={{ padding: 8, width: 40 }} />
                  </tr>
                </thead>
                <tbody>
                  {section.items.map((item, ii) => (
                    <tr key={ii} style={{ borderBottom: '1px solid var(--line-faint)' }}>
                      <td style={{ padding: 8 }}>
                        <input style={{ ...legalStyles.input, fontSize: 12 }} value={item.description} onChange={e => updateItem(si, ii, { description: e.target.value })} />
                      </td>
                      <td style={{ padding: 8 }}>
                        <select style={{ ...legalStyles.input, fontSize: 12 }} value={item.status} onChange={e => updateItem(si, ii, { status: e.target.value })}>
                          {CHECKLIST_STATUSES.map(s => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: 8 }}>
                        <input style={{ ...legalStyles.input, fontSize: 12 }} value={item.responsible} onChange={e => updateItem(si, ii, { responsible: e.target.value })} />
                      </td>
                      <td style={{ padding: 8 }}>
                        <input type="date" style={{ ...legalStyles.input, fontSize: 12 }} value={item.dueDate} onChange={e => updateItem(si, ii, { dueDate: e.target.value })} />
                      </td>
                      <td style={{ padding: 8 }}>
                        <input style={{ ...legalStyles.input, fontSize: 12 }} value={item.notes} onChange={e => updateItem(si, ii, { notes: e.target.value })} />
                      </td>
                      <td style={{ padding: 8 }}>
                        <button type="button" onClick={() => updateSection(si, { items: section.items.filter((_, i) => i !== ii) })} style={{ fontSize: 11 }}>
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button type="button" style={{ ...legalStyles.btnSecondary, marginTop: 12 }} onClick={() => updateSection(si, { items: [...section.items, emptyItem()] })}>
                + Añadir ítem
              </button>
            </div>
          ))}

          <button
            type="button"
            style={legalStyles.btnSecondary}
            onClick={() => setChecklist({ sections: [...checklist.sections, { title: 'Nueva sección', items: [emptyItem()] }] })}
          >
            + Nueva sección
          </button>
        </>
      )}
    </div>
  )
}
