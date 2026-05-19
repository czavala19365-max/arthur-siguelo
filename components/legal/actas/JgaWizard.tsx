'use client'

import { useMemo, useState } from 'react'
import StepWizard from '@/components/legal/shared/StepWizard'
import DocumentOutput from '@/components/legal/shared/DocumentOutput'
import FileUpload, { type UploadedFile } from '@/components/legal/shared/FileUpload'
import { buildDoc, defaultJgaState } from '@/lib/legal/jga/build-doc'
import type { JgaWizardState, Shareholder, Gender, EntityType } from '@/lib/legal/jga/types'
import { legalStyles } from '@/lib/legal/styles'

const STEPS = ['Sociedad', 'Accionistas', 'Mesa directiva', 'Agenda', 'Referencias', 'Vista previa']

function newShareholder(): Shareholder {
  return {
    id: crypto.randomUUID(),
    name: '',
    entityType: 'natural',
    gender: 'masculino',
    idNumber: '',
    shares: 0,
    representativeName: '',
    representativeDni: '',
  }
}

export default function JgaWizard() {
  const [step, setStep] = useState(0)
  const [state, setState] = useState<JgaWizardState>(defaultJgaState())
  const [attachments, setAttachments] = useState<UploadedFile[]>([])
  const [preview, setPreview] = useState('')
  const [loadingAgenda, setLoadingAgenda] = useState(false)
  const [error, setError] = useState('')

  const totalShares = useMemo(
    () => state.shareholders.reduce((s, sh) => s + (sh.shares || 0), 0),
    [state.shareholders],
  )

  function updateCompany<K extends keyof JgaWizardState['company']>(key: K, value: JgaWizardState['company'][K]) {
    setState(s => ({ ...s, company: { ...s.company, [key]: value } }))
  }

  function updateBoard<K extends keyof JgaWizardState['board']>(key: K, value: JgaWizardState['board'][K]) {
    setState(s => ({ ...s, board: { ...s.board, [key]: value } }))
  }

  function updateAgenda(path: string, value: unknown) {
    setState(s => {
      const agenda = { ...s.agenda }
      const parts = path.split('.')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let cur: any = agenda
      for (let i = 0; i < parts.length - 1; i++) cur = cur[parts[i]]
      cur[parts[parts.length - 1]] = value
      return { ...s, agenda }
    })
  }

  async function generateCustomAgenda() {
    const custom = state.agenda.custom
    if (!custom.title || !custom.description) return
    setLoadingAgenda(true)
    setError('')
    try {
      const res = await fetch('/api/legal/actas/custom-agenda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: state.company.name,
          title: custom.title,
          description: custom.description,
        }),
      })
      const data = (await res.json()) as { text?: string; error?: string }
      if (!res.ok) throw new Error(data.error || 'Error')
      updateAgenda('custom.generatedText', data.text || '')
      updateAgenda('custom.enabled', true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoadingAgenda(false)
    }
  }

  function buildPreview() {
    const doc = buildDoc(state)
    setPreview(doc)
    setStep(5)
  }

  function renderStep() {
    switch (step) {
      case 0:
        return (
          <div style={legalStyles.card}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={legalStyles.label}>Tipo de sociedad</label>
                <input style={legalStyles.input} value={state.company.entityType} onChange={e => updateCompany('entityType', e.target.value)} />
              </div>
              <div>
                <label style={legalStyles.label}>Razón social</label>
                <input style={legalStyles.input} value={state.company.name} onChange={e => updateCompany('name', e.target.value)} />
              </div>
              <div>
                <label style={legalStyles.label}>Capital (número)</label>
                <input type="number" style={legalStyles.input} value={state.company.capital || ''} onChange={e => updateCompany('capital', Number(e.target.value))} />
              </div>
              <div>
                <label style={legalStyles.label}>Capital (letras)</label>
                <input style={legalStyles.input} value={state.company.capitalWritten} onChange={e => updateCompany('capitalWritten', e.target.value)} />
              </div>
              <div>
                <label style={legalStyles.label}>Ciudad</label>
                <input style={legalStyles.input} value={state.company.city} onChange={e => updateCompany('city', e.target.value)} />
              </div>
              <div>
                <label style={legalStyles.label}>Fecha</label>
                <input type="date" style={legalStyles.input} value={state.company.date} onChange={e => updateCompany('date', e.target.value)} />
              </div>
              <div>
                <label style={legalStyles.label}>Hora inicio</label>
                <input type="time" style={legalStyles.input} value={state.company.startTime} onChange={e => updateCompany('startTime', e.target.value)} />
              </div>
              <div>
                <label style={legalStyles.label}>Hora cierre</label>
                <input type="time" style={legalStyles.input} value={state.company.endTime} onChange={e => updateCompany('endTime', e.target.value)} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={legalStyles.label}>Dirección</label>
                <input style={legalStyles.input} value={state.company.address} onChange={e => updateCompany('address', e.target.value)} />
              </div>
              <div>
                <label style={legalStyles.label}>Valor nominal por acción</label>
                <input type="number" step="0.01" style={legalStyles.input} value={state.company.nominalValue} onChange={e => updateCompany('nominalValue', Number(e.target.value))} />
              </div>
            </div>
          </div>
        )
      case 1:
        return (
          <div style={legalStyles.card}>
            {state.shareholders.map((sh, idx) => (
              <div key={sh.id} style={{ borderBottom: '1px solid var(--line-faint)', paddingBottom: 16, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <strong>Accionista {idx + 1}</strong>
                  <button type="button" style={legalStyles.btnSecondary} onClick={() => setState(s => ({ ...s, shareholders: s.shareholders.filter(x => x.id !== sh.id) }))}>
                    Eliminar
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <input placeholder="Nombre" style={legalStyles.input} value={sh.name} onChange={e => {
                    const v = e.target.value
                    setState(s => ({ ...s, shareholders: s.shareholders.map(x => x.id === sh.id ? { ...x, name: v } : x) }))
                  }} />
                  <select style={legalStyles.input} value={sh.entityType} onChange={e => {
                    const v = e.target.value as EntityType
                    setState(s => ({ ...s, shareholders: s.shareholders.map(x => x.id === sh.id ? { ...x, entityType: v } : x) }))
                  }}>
                    <option value="natural">Persona natural</option>
                    <option value="juridica">Persona jurídica</option>
                  </select>
                  <select style={legalStyles.input} value={sh.gender} onChange={e => {
                    const v = e.target.value as Gender
                    setState(s => ({ ...s, shareholders: s.shareholders.map(x => x.id === sh.id ? { ...x, gender: v } : x) }))
                  }}>
                    <option value="masculino">Masculino</option>
                    <option value="femenino">Femenino</option>
                  </select>
                  <input placeholder="DNI / RUC" style={legalStyles.input} value={sh.idNumber} onChange={e => {
                    const v = e.target.value
                    setState(s => ({ ...s, shareholders: s.shareholders.map(x => x.id === sh.id ? { ...x, idNumber: v } : x) }))
                  }} />
                  <input type="number" placeholder="N° acciones" style={legalStyles.input} value={sh.shares || ''} onChange={e => {
                    const v = Number(e.target.value)
                    setState(s => ({ ...s, shareholders: s.shareholders.map(x => x.id === sh.id ? { ...x, shares: v } : x) }))
                  }} />
                  <div style={{ fontSize: 13, color: 'var(--muted)', alignSelf: 'center' }}>
                    {totalShares > 0 ? `${((sh.shares / totalShares) * 100).toFixed(2)}%` : '—'}
                  </div>
                  {sh.entityType === 'juridica' && (
                    <>
                      <input placeholder="Representante" style={legalStyles.input} value={sh.representativeName} onChange={e => {
                        const v = e.target.value
                        setState(s => ({ ...s, shareholders: s.shareholders.map(x => x.id === sh.id ? { ...x, representativeName: v } : x) }))
                      }} />
                      <input placeholder="DNI representante" style={legalStyles.input} value={sh.representativeDni} onChange={e => {
                        const v = e.target.value
                        setState(s => ({ ...s, shareholders: s.shareholders.map(x => x.id === sh.id ? { ...x, representativeDni: v } : x) }))
                      }} />
                    </>
                  )}
                </div>
              </div>
            ))}
            <button type="button" style={legalStyles.btnSecondary} onClick={() => setState(s => ({ ...s, shareholders: [...s.shareholders, newShareholder()] }))}>
              + Añadir accionista
            </button>
          </div>
        )
      case 2:
        return (
          <div style={legalStyles.card}>
            <div style={{ display: 'grid', gap: 16 }}>
              <input placeholder="Presidente — nombre" style={legalStyles.input} value={state.board.chairmanName} onChange={e => updateBoard('chairmanName', e.target.value)} />
              <input placeholder="Presidente — cargo" style={legalStyles.input} value={state.board.chairmanTitle} onChange={e => updateBoard('chairmanTitle', e.target.value)} />
              <input placeholder="Presidente — rol en junta" style={legalStyles.input} value={state.board.chairmanRole} onChange={e => updateBoard('chairmanRole', e.target.value)} />
              <input placeholder="Secretario — nombre" style={legalStyles.input} value={state.board.secretaryName} onChange={e => updateBoard('secretaryName', e.target.value)} />
              <input placeholder="Secretario — cargo" style={legalStyles.input} value={state.board.secretaryTitle} onChange={e => updateBoard('secretaryTitle', e.target.value)} />
              <input placeholder="Gerente General certificante — nombre" style={legalStyles.input} value={state.board.certifyingManagerName} onChange={e => updateBoard('certifyingManagerName', e.target.value)} />
              <input placeholder="Gerente General — DNI" style={legalStyles.input} value={state.board.certifyingManagerDni} onChange={e => updateBoard('certifyingManagerDni', e.target.value)} />
            </div>
          </div>
        )
      case 3:
        return (
          <div style={legalStyles.card}>
            <AgendaCheckbox label="Aumento de capital" checked={state.agenda.capitalIncrease.enabled} onChange={v => updateAgenda('capitalIncrease.enabled', v)} />
            {state.agenda.capitalIncrease.enabled && (
              <div style={{ marginLeft: 24, marginBottom: 16, display: 'grid', gap: 8 }}>
                <input placeholder="Monto aumento" type="number" style={legalStyles.input} value={state.agenda.capitalIncrease.amount || ''} onChange={e => updateAgenda('capitalIncrease.amount', Number(e.target.value))} />
                <input placeholder="Monto en letras" style={legalStyles.input} value={state.agenda.capitalIncrease.amountWritten} onChange={e => updateAgenda('capitalIncrease.amountWritten', e.target.value)} />
                <input placeholder="Nuevo capital" type="number" style={legalStyles.input} value={state.agenda.capitalIncrease.newCapital || ''} onChange={e => updateAgenda('capitalIncrease.newCapital', Number(e.target.value))} />
                <input placeholder="Nuevo capital en letras" style={legalStyles.input} value={state.agenda.capitalIncrease.newCapitalWritten} onChange={e => updateAgenda('capitalIncrease.newCapitalWritten', e.target.value)} />
                <input placeholder="Capital anterior en letras" style={legalStyles.input} value={state.agenda.capitalIncrease.priorCapitalWritten} onChange={e => updateAgenda('capitalIncrease.priorCapitalWritten', e.target.value)} />
                <input placeholder="Método" style={legalStyles.input} value={state.agenda.capitalIncrease.method} onChange={e => updateAgenda('capitalIncrease.method', e.target.value)} />
              </div>
            )}
            <AgendaCheckbox label="Reducción de capital" checked={state.agenda.capitalReduction.enabled} onChange={v => updateAgenda('capitalReduction.enabled', v)} />
            {state.agenda.capitalReduction.enabled && (
              <div style={{ marginLeft: 24, marginBottom: 16, display: 'grid', gap: 8 }}>
                <input type="number" placeholder="Monto reducción" style={legalStyles.input} value={state.agenda.capitalReduction.amount || ''} onChange={e => updateAgenda('capitalReduction.amount', Number(e.target.value))} />
                <input type="number" placeholder="Nuevo capital" style={legalStyles.input} value={state.agenda.capitalReduction.newCapital || ''} onChange={e => updateAgenda('capitalReduction.newCapital', Number(e.target.value))} />
                <select style={legalStyles.input} value={state.agenda.capitalReduction.reason} onChange={e => updateAgenda('capitalReduction.reason', e.target.value)}>
                  <option value="pérdidas">Pérdidas</option>
                  <option value="devolución de aportes">Devolución de aportes</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
            )}
            <AgendaCheckbox label="Cambio de Gerente General" checked={state.agenda.managerChange.enabled} onChange={v => updateAgenda('managerChange.enabled', v)} />
            {state.agenda.managerChange.enabled && (
              <div style={{ marginLeft: 24, marginBottom: 16, display: 'grid', gap: 8 }}>
                <input placeholder="Gerente saliente" style={legalStyles.input} value={state.agenda.managerChange.outgoingName} onChange={e => updateAgenda('managerChange.outgoingName', e.target.value)} />
                <input placeholder="Gerente entrante" style={legalStyles.input} value={state.agenda.managerChange.incomingName} onChange={e => updateAgenda('managerChange.incomingName', e.target.value)} />
                <input placeholder="DNI gerente entrante" style={legalStyles.input} value={state.agenda.managerChange.incomingDni} onChange={e => updateAgenda('managerChange.incomingDni', e.target.value)} />
              </div>
            )}
            <AgendaCheckbox label="Poderes" checked={state.agenda.powers.enabled} onChange={v => updateAgenda('powers.enabled', v)} />
            {state.agenda.powers.enabled && (
              <div style={{ marginLeft: 24, marginBottom: 16 }}>
                <textarea placeholder="Finalidad de los poderes" style={legalStyles.textarea} value={state.agenda.powers.purpose} onChange={e => updateAgenda('powers.purpose', e.target.value)} rows={2} />
                {state.agenda.powers.attorneys.map((a, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px', gap: 8, marginTop: 8 }}>
                    <input placeholder="Nombre" style={legalStyles.input} value={a.name} onChange={e => {
                      const attorneys = [...state.agenda.powers.attorneys]
                      attorneys[i] = { ...attorneys[i], name: e.target.value }
                      updateAgenda('powers.attorneys', attorneys)
                    }} />
                    <input placeholder="DNI" style={legalStyles.input} value={a.dni} onChange={e => {
                      const attorneys = [...state.agenda.powers.attorneys]
                      attorneys[i] = { ...attorneys[i], dni: e.target.value }
                      updateAgenda('powers.attorneys', attorneys)
                    }} />
                    <select style={legalStyles.input} value={a.gender} onChange={e => {
                      const attorneys = [...state.agenda.powers.attorneys]
                      attorneys[i] = { ...attorneys[i], gender: e.target.value as Gender }
                      updateAgenda('powers.attorneys', attorneys)
                    }}>
                      <option value="masculino">M</option>
                      <option value="femenino">F</option>
                    </select>
                  </div>
                ))}
                <button type="button" style={{ ...legalStyles.btnSecondary, marginTop: 8 }} onClick={() => updateAgenda('powers.attorneys', [...state.agenda.powers.attorneys, { name: '', dni: '', gender: 'masculino' as Gender }])}>
                  + Apoderado
                </button>
              </div>
            )}
            <AgendaCheckbox label="Reforma parcial de estatuto" checked={state.agenda.articlesAmendment.enabled} onChange={v => updateAgenda('articlesAmendment.enabled', v)} />
            {state.agenda.articlesAmendment.enabled && (
              <div style={{ marginLeft: 24, marginBottom: 16, display: 'grid', gap: 8 }}>
                <input placeholder="Artículo" style={legalStyles.input} value={state.agenda.articlesAmendment.articleName} onChange={e => updateAgenda('articlesAmendment.articleName', e.target.value)} />
                <textarea placeholder="Nuevo texto" style={legalStyles.textarea} value={state.agenda.articlesAmendment.newText} onChange={e => updateAgenda('articlesAmendment.newText', e.target.value)} rows={3} />
              </div>
            )}
            <AgendaCheckbox label="Punto personalizado (IA)" checked={state.agenda.custom.enabled} onChange={v => updateAgenda('custom.enabled', v)} />
            {state.agenda.custom.enabled && (
              <div style={{ marginLeft: 24, marginBottom: 16 }}>
                <input placeholder="Título del punto" style={legalStyles.input} value={state.agenda.custom.title} onChange={e => updateAgenda('custom.title', e.target.value)} />
                <textarea placeholder="Descripción" style={{ ...legalStyles.textarea, marginTop: 8 }} value={state.agenda.custom.description} onChange={e => updateAgenda('custom.description', e.target.value)} rows={3} />
                <button type="button" style={{ ...legalStyles.btnSecondary, marginTop: 8 }} disabled={loadingAgenda} onClick={() => void generateCustomAgenda()}>
                  {loadingAgenda ? 'Generando texto...' : 'Generar texto con IA'}
                </button>
              </div>
            )}
          </div>
        )
      case 4:
        return <FileUpload files={attachments} onChange={setAttachments} label="Documentos de referencia (opcional)" />
      case 5:
        return preview ? (
          <DocumentOutput document={preview} filename="acta-jga" title="Acta de Junta General de Accionistas" />
        ) : (
          <p style={{ color: 'var(--muted)' }}>Genera la vista previa en el paso anterior.</p>
        )
      default:
        return null
    }
  }

  return (
    <div style={{ ...legalStyles.page, paddingTop: 48 }}>
      <h1 style={legalStyles.h1}>Actas JGA</h1>
      <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 24 }}>
        Generador de actas de Junta General de Accionistas — formato notarial peruano.
      </p>
      {error && <p style={{ color: '#b91c1c', marginBottom: 12 }}>{error}</p>}
      <StepWizard
        steps={STEPS}
        current={step}
        showNav={step < 5}
        onBack={() => setStep(s => Math.max(0, s - 1))}
        onNext={() => {
          if (step === 4) buildPreview()
          else setStep(s => Math.min(5, s + 1))
        }}
        nextLabel={step === 4 ? 'Generar acta' : 'Siguiente'}
      >
        {renderStep()}
      </StepWizard>
    </div>
  )
}

function AgendaCheckbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, cursor: 'pointer' }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span style={{ fontSize: 14 }}>{label}</span>
    </label>
  )
}
