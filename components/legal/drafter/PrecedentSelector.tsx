'use client'

import { useEffect, useState } from 'react'
import { legalStyles } from '@/lib/legal/styles'
import type { DrafterDocumentInput } from '@/lib/legal/drafter/document-service'
import type { DocumentTypeId } from '@/lib/legal/drafter/form-schemas'

type Mode = 'template' | 'mine' | 'company'

interface PrecedenteListItem {
  id: string
  nombreReferencia: string
  version: number
}

interface SociedadOption {
  id: string
  razon_social: string
}

interface VersionItem {
  id: string
  version: number
  createdAt: string
}

interface PrecedentSelectorProps {
  documentType: DocumentTypeId
  activePrecedentId: string | null
  onLoadPrecedent: (precedenteId: string, input: DrafterDocumentInput) => void
  onClearPrecedent: () => void
}

export default function PrecedentSelector({
  documentType,
  activePrecedentId,
  onLoadPrecedent,
  onClearPrecedent,
}: PrecedentSelectorProps) {
  const [mode, setMode] = useState<Mode>('template')
  const [sociedades, setSociedades] = useState<SociedadOption[]>([])
  const [selectedSociedadId, setSelectedSociedadId] = useState('')
  const [precedentes, setPrecedentes] = useState<PrecedenteListItem[]>([])
  const [versions, setVersions] = useState<VersionItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (mode !== 'company' || sociedades.length > 0) return
    fetch('/api/documentos/sociedades')
      .then(res => res.json())
      .then(data => setSociedades(data.sociedades ?? []))
      .catch(() => setError('No se pudieron cargar las sociedades'))
  }, [mode, sociedades.length])

  useEffect(() => {
    if (mode === 'template') {
      setPrecedentes([])
      return
    }
    if (mode === 'company' && !selectedSociedadId) {
      setPrecedentes([])
      return
    }

    const sociedadId = mode === 'mine' ? null : selectedSociedadId
    const params = new URLSearchParams({ documentType })
    if (sociedadId) params.set('sociedadId', sociedadId)

    fetch(`/api/legal/drafter/precedentes?${params.toString()}`)
      .then(res => res.json())
      .then(data => setPrecedentes(data.precedentes ?? []))
      .catch(() => setError('No se pudieron cargar los precedentes'))
  }, [mode, documentType, selectedSociedadId])

  useEffect(() => {
    if (!activePrecedentId) {
      setVersions([])
      return
    }
    fetch(`/api/legal/drafter/precedentes/${activePrecedentId}/versiones`)
      .then(res => res.json())
      .then(data => setVersions(data.versiones ?? []))
      .catch(() => setVersions([]))
  }, [activePrecedentId])

  async function selectPrecedent(id: string) {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/legal/drafter/precedentes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cargar', precedenteId: id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al cargar el precedente')
      onLoadPrecedent(id, data.input)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  async function restoreVersion(version: number) {
    if (!activePrecedentId) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/legal/drafter/precedentes/${activePrecedentId}/versiones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al restaurar la versión')
      onLoadPrecedent(activePrecedentId, data.input)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={legalStyles.card}>
      <label style={legalStyles.label}>Crear desde</label>
      <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
        {(
          [
            ['template', 'Plantilla Arthur'],
            ['mine', 'Mi precedente'],
            ['company', 'Precedente de la sociedad'],
          ] as const
        ).map(([value, label]) => (
          <label key={value} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
            <input
              type="radio"
              name="precedent-mode"
              checked={mode === value}
              onChange={() => {
                setMode(value)
                if (value === 'template') onClearPrecedent()
              }}
            />
            {label}
          </label>
        ))}
      </div>

      {mode === 'company' && (
        <select value={selectedSociedadId} onChange={e => setSelectedSociedadId(e.target.value)} style={{ ...legalStyles.input, marginBottom: 12 }}>
          <option value="">Seleccionar sociedad...</option>
          {sociedades.map(s => (
            <option key={s.id} value={s.id}>
              {s.razon_social}
            </option>
          ))}
        </select>
      )}

      {mode !== 'template' && (mode === 'mine' || selectedSociedadId) && (
        <select
          value={activePrecedentId ?? ''}
          disabled={loading}
          onChange={e => e.target.value && void selectPrecedent(e.target.value)}
          style={legalStyles.input}
        >
          <option value="">{precedentes.length ? 'Seleccionar precedente...' : 'Sin precedentes guardados'}</option>
          {precedentes.map(p => (
            <option key={p.id} value={p.id}>
              {p.nombreReferencia} (v{p.version})
            </option>
          ))}
        </select>
      )}

      {activePrecedentId && versions.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)', marginBottom: 6 }}>
            Historial de versiones
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {versions.map(v => (
              <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                <span>v{v.version}</span>
                <button type="button" style={legalStyles.btnSecondary} disabled={loading} onClick={() => void restoreVersion(v.version)}>
                  Restaurar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <p style={{ color: '#b91c1c', fontSize: 12, marginTop: 8 }}>{error}</p>}
    </div>
  )
}
