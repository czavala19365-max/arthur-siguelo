'use client'

import { useEffect, useState } from 'react'
import { legalStyles } from '@/lib/legal/styles'
import type { DatosJGA, SeccionActa } from '@/lib/document-intelligence/types'
import { saveActaDocument } from './saveActaDocument'
import { JgaToast } from './jga-ui-shared'

type DocRow = {
  id: string
  nombre: string
  estado: string
  created_at: string
}

export default function JgaActasList() {
  const [documentos, setDocumentos] = useState<DocRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [secciones, setSecciones] = useState<SeccionActa[]>([])
  const [datos, setDatos] = useState<DatosJGA | null>(null)
  const [nombre, setNombre] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/documentos/jga')
      .then(r => r.json())
      .then(d => setDocumentos(d.documentos ?? []))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  async function openDoc(id: string) {
    setSelectedId(id)
    setError('')
    const res = await fetch(`/api/documentos/jga/${id}`)
    const data = await res.json()
    if (data.documento) {
      setNombre(data.documento.nombre)
      setSecciones(data.documento.contenido_generado ?? [])
      setDatos(data.documento.datos_entrada ?? null)
    }
  }

  async function guardarEdicion() {
    if (!selectedId && !datos) return
    setSaving(true)
    setError('')
    try {
      const result = await saveActaDocument({
        documentoId: selectedId,
        secciones,
        datos,
      })
      setSelectedId(result.documentoId)
      setToast('Cambios guardados')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  async function descargarDocx() {
    const res = await fetch('/api/documentos/descargar-docx', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documento_id: selectedId, datos, secciones }),
    })
    if (!res.ok) return
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'acta-jga.docx'
    a.click()
  }

  if (loading) return <p style={{ color: 'var(--muted)' }}>Cargando...</p>

  return (
    <div>
      <JgaToast message={toast} />
      {error && <p style={{ color: '#c0392b', marginBottom: 16 }}>{error}</p>}

      {documentos.length === 0 && (
        <div style={legalStyles.card}>
          <p style={{ margin: 0, color: 'var(--muted)' }}>Aún no hay actas generadas.</p>
        </div>
      )}

      {documentos.map(doc => (
        <div key={doc.id} style={legalStyles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
            <div>
              <div style={{ fontSize: 16, marginBottom: 4 }}>{doc.nombre}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)' }}>
                {doc.estado} · {new Date(doc.created_at).toLocaleDateString('es-PE')}
              </div>
            </div>
            <button type="button" style={legalStyles.btnSecondary} onClick={() => openDoc(doc.id)}>
              {selectedId === doc.id ? 'Abierto' : 'Ver / Editar'}
            </button>
          </div>
        </div>
      ))}

      {selectedId && secciones.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h2 style={{ fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase' }}>{nombre}</h2>
          {secciones.map((s, i) => (
            <div key={i} style={legalStyles.card}>
              {s.titulo && (
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, marginBottom: 8 }}>{s.titulo}</div>
              )}
              <textarea
                style={{ ...legalStyles.textarea, minHeight: 100, fontSize: 13 }}
                value={s.contenido}
                onChange={e => {
                  const next = [...secciones]
                  next[i] = { ...next[i], contenido: e.target.value }
                  setSecciones(next)
                }}
              />
            </div>
          ))}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button type="button" style={legalStyles.btnPrimary} disabled={saving} onClick={guardarEdicion}>
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
            <button type="button" style={legalStyles.btnSecondary} onClick={descargarDocx}>
              Descargar DOCX
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
