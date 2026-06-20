'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { legalStyles } from '@/lib/legal/styles'
import {
  getOperationTemplate,
  getTituloOperacion,
} from '@/lib/document-intelligence/templates/operation-templates'
import type {
  Accionista,
  DatosJGA,
  DatosSociedad,
  SeccionActa,
  TipoOperacionJGA,
} from '@/lib/document-intelligence/types'
import { saveActaDocument } from './saveActaDocument'
import JgaChatWidget from './JgaChatPanel'
import type { CambioRealizado } from '@/lib/legal/jga/chat-acta-service'
import {
  JgaToast,
  pathCardAction,
  pathCardDesc,
  pathCardLabel,
  pathCardStyle,
} from './jga-ui-shared'

const TIPOS_OPERACION: TipoOperacionJGA[] = [
  'financiamiento',
  'emision_bonos',
  'fideicomiso',
  'aumento_capital_aportes',
  'aumento_capital_capitalizacion',
  'modificacion_estatuto',
  'nombramiento_gg',
  'garantia_mobiliaria',
  'hipoteca',
  'cesion_derechos',
  'fianza_solidaria',
  'dacion_en_pago',
  'compraventa_acciones',
  'compraventa_inmueble',
  'transaccion_extrajudicial',
  'poderes_especiales',
  'otro',
]

const TIPOS_SOCIETARIOS: DatosSociedad['tipo_societario'][] = ['S.A.', 'S.A.C.', 'S.R.L.', 'S.A.A.']

const emptySociedad: DatosSociedad = {
  razon_social: '',
  tipo_societario: 'S.A.C.',
  ruc: '',
  domicilio: '',
  distrito: '',
  provincia: 'Lima',
  departamento: 'Lima',
  capital_social: 0,
  moneda_capital: 'PEN',
  total_acciones: 0,
  valor_nominal_accion: 1,
  gerente_general: { nombre_completo: '', dni: '' },
}

type WizardPath = 'cero' | 'guardada' | 'precedente'

type SociedadRow = {
  id: string
  razon_social: string
  tipo_societario: DatosSociedad['tipo_societario']
  ruc: string | null
  domicilio: string | null
  distrito: string | null
  provincia: string | null
  departamento: string | null
  capital_social: number | null
  moneda_capital: string | null
  total_acciones: number | null
  valor_nominal_accion: number | null
  partida_electronica: string | null
  gerente_general: DatosSociedad['gerente_general'] | null
}

type PrecedenteRow = {
  id: string
  nombre_referencia: string
  razon_social: string
  tipo_operaciones: string[]
  fecha_acta: string
  created_at: string
}

function defaultDatosJGA(sociedad: DatosSociedad, accionistas: Accionista[]): DatosJGA {
  return {
    sociedad,
    accionistas,
    fecha: new Date().toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' }),
    hora_inicio: '10:00',
    hora_fin: '11:30',
    lugar: sociedad.domicilio
      ? `${sociedad.domicilio}, distrito de ${sociedad.distrito}, provincia de ${sociedad.provincia}, departamento de ${sociedad.departamento}`
      : '',
    presidente: accionistas[0]?.nombre_completo ?? '',
    secretario: sociedad.gerente_general?.nombre_completo ?? '',
    agenda: [],
    apoderado_formalizacion: {
      nombre_completo: sociedad.gerente_general?.nombre_completo ?? '',
      dni: sociedad.gerente_general?.dni ?? '',
    },
    tipo_convocatoria: 'universal',
    ciudad: 'Lima',
  }
}

function mapSociedadRow(row: SociedadRow): DatosSociedad {
  return {
    razon_social: row.razon_social,
    tipo_societario: row.tipo_societario,
    ruc: row.ruc ?? '',
    domicilio: row.domicilio ?? '',
    distrito: row.distrito ?? '',
    provincia: row.provincia ?? 'Lima',
    departamento: row.departamento ?? 'Lima',
    capital_social: Number(row.capital_social ?? 0),
    moneda_capital: (row.moneda_capital as 'PEN' | 'USD') ?? 'PEN',
    total_acciones: Number(row.total_acciones ?? 0),
    valor_nominal_accion: Number(row.valor_nominal_accion ?? 1),
    partida_electronica: row.partida_electronica ?? undefined,
    gerente_general: row.gerente_general ?? { nombre_completo: '', dni: '' },
  }
}

function JgaNuevaActaWizardInner() {
  const searchParams = useSearchParams()
  const [step, setStep] = useState(1)
  const [path, setPath] = useState<WizardPath | null>(
    searchParams.get('precedente') ? 'precedente' : searchParams.get('sociedad') ? 'guardada' : null,
  )
  const [sociedades, setSociedades] = useState<SociedadRow[]>([])
  const [precedentes, setPrecedentes] = useState<PrecedenteRow[]>([])
  const [sociedadId, setSociedadId] = useState(searchParams.get('sociedad') ?? '')
  const [precedenteId, setPrecedenteId] = useState(searchParams.get('precedente') ?? '')
  const [formSociedad, setFormSociedad] = useState(emptySociedad)
  const [formAccionistas, setFormAccionistas] = useState<Accionista[]>([])
  const [draftAccionista, setDraftAccionista] = useState<Partial<Accionista>>({
    tipo: 'persona_natural',
    nombre_completo: '',
    dni: '',
    num_acciones: 0,
    valor_nominal: 1,
    moneda: 'PEN',
  })
  const [guardarSociedadCheck, setGuardarSociedadCheck] = useState(true)
  const [datos, setDatos] = useState<DatosJGA | null>(null)
  const [secciones, setSecciones] = useState<SeccionActa[]>([])
  const [documentoId, setDocumentoId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loadingIa, setLoadingIa] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const [showPrecedenteModal, setShowPrecedenteModal] = useState(false)
  const [precedenteNombre, setPrecedenteNombre] = useState('')
  const [flashSections, setFlashSections] = useState<Set<number>>(new Set())

  useEffect(() => {
    fetch('/api/documentos/sociedades')
      .then(r => r.json())
      .then(d => setSociedades(d.sociedades ?? []))
    fetch('/api/documentos/precedentes')
      .then(r => r.json())
      .then(d => setPrecedentes(d.precedentes ?? []))
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  useEffect(() => {
    if (path === 'guardada' && sociedadId) void loadSociedadIntoForm(sociedadId)
  }, [path, sociedadId])

  async function loadSociedadIntoForm(id: string) {
    const accRes = await fetch(`/api/documentos/accionistas?sociedad_id=${id}`).then(r => r.json())
    const socRow = sociedades.find(s => s.id === id)
    if (!socRow) {
      const socRes = await fetch('/api/documentos/sociedades').then(r => r.json())
      const found = (socRes.sociedades ?? []).find((s: SociedadRow) => s.id === id)
      if (found) {
        setFormSociedad(mapSociedadRow(found))
      }
    } else {
      setFormSociedad(mapSociedadRow(socRow))
    }
    setFormAccionistas(
      (accRes.accionistas ?? []).map((a: Accionista) => ({
        tipo: a.tipo,
        razon_social: a.razon_social,
        ruc: a.ruc,
        nombre_completo: a.nombre_completo,
        dni: a.dni,
        num_acciones: a.num_acciones,
        valor_nominal: a.valor_nominal ?? 1,
        moneda: a.moneda ?? 'PEN',
        representantes: a.representantes,
        poderes_referencia: a.poderes_referencia,
      })),
    )
  }

  async function loadPrecedente(id: string) {
    const res = await fetch('/api/documentos/precedentes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'crear_desde', precedente_id: id, cambios: {} }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error)
    setDatos(data.datos)
    const preRes = await fetch('/api/documentos/precedentes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'cargar', precedente_id: id }),
    })
    const preData = await preRes.json()
    setSociedadId(preData.precedente?.sociedad_id ?? '')
    setFormSociedad(data.datos.sociedad)
    setFormAccionistas(data.datos.accionistas)
  }

  useEffect(() => {
    if (path === 'precedente' && precedenteId) {
      loadPrecedente(precedenteId).catch(e => setError(e instanceof Error ? e.message : 'Error'))
    }
  }, [path, precedenteId])

  async function handleStep1Next() {
    setError('')
    setLoading(true)
    try {
      if (path === 'precedente') {
        if (!precedenteId || !datos) throw new Error('Selecciona un precedente')
      } else if (path === 'guardada') {
        if (!sociedadId) throw new Error('Selecciona una sociedad')
        if (!formSociedad.razon_social || formAccionistas.length === 0) {
          throw new Error('La sociedad debe tener al menos un accionista')
        }
        setDatos(defaultDatosJGA(formSociedad, formAccionistas))
      } else if (path === 'cero') {
        if (!formSociedad.razon_social || formAccionistas.length === 0) {
          throw new Error('Complete la sociedad y al menos un accionista')
        }
        if (guardarSociedadCheck) {
          const resSoc = await fetch('/api/documentos/sociedades', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...formSociedad, accionistas: formAccionistas }),
          })
          const socData = await resSoc.json()
          if (!resSoc.ok) throw new Error(socData.error)
          setSociedadId(socData.sociedad?.id ?? '')
        }
        setDatos(defaultDatosJGA(formSociedad, formAccionistas))
      } else {
        throw new Error('Selecciona un punto de partida')
      }
      setStep(2)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  function addAgendaPoint(tipo: TipoOperacionJGA) {
    if (!datos) return
    const n = datos.agenda.length + 1
    setDatos({
      ...datos,
      agenda: [
        ...datos.agenda,
        { numero: n, titulo: getTituloOperacion(tipo), tipo_operacion: tipo, datos_operacion: {} },
      ],
    })
  }

  function updatePuntoCampo(index: number, campo: string, valor: string | number) {
    if (!datos) return
    const agenda = [...datos.agenda]
    agenda[index] = {
      ...agenda[index],
      datos_operacion: { ...agenda[index].datos_operacion, [campo]: valor },
    }
    setDatos({ ...datos, agenda })
  }

  async function generarDesarrolloIa(idx: number) {
    if (!datos) return
    setLoadingIa(idx)
    setError('')
    try {
      const res = await fetch('/api/documentos/ai/desarrollo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ punto: datos.agenda[idx], datos }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      updatePuntoCampo(idx, 'desarrollo_ia', data.desarrollo)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error IA')
    } finally {
      setLoadingIa(null)
    }
  }

  async function ensureSociedadId(): Promise<string | undefined> {
    if (sociedadId) return sociedadId
    if (!datos) return undefined
    const resSoc = await fetch('/api/documentos/sociedades', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...datos.sociedad, accionistas: datos.accionistas }),
    })
    const socData = await resSoc.json()
    if (!resSoc.ok) throw new Error(socData.error)
    const sid = socData.sociedad?.id as string
    setSociedadId(sid)
    return sid
  }

  async function generarActa() {
    if (!datos) return
    setLoading(true)
    setError('')
    try {
      const sid = await ensureSociedadId()
      const res = await fetch('/api/documentos/generar-acta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ datos, sociedad_id: sid, guardar: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSecciones(data.secciones)
      setDocumentoId(data.documento_id)
      setPrecedenteNombre(`Acta ${datos.sociedad.razon_social} - ${datos.fecha}`)
      setStep(4)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al generar')
    } finally {
      setLoading(false)
    }
  }

  async function guardarCambios() {
    if (!datos) return
    setSaving(true)
    setError('')
    try {
      const result = await saveActaDocument({
        documentoId,
        secciones,
        datos,
        sociedadId: sociedadId || undefined,
      })
      setDocumentoId(result.documentoId)
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
      body: JSON.stringify({ documento_id: documentoId, datos, secciones }),
    })
    if (!res.ok) return
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'acta-jga.docx'
    a.click()
  }

  async function confirmarGuardarPrecedente() {
    if (!datos || !precedenteNombre.trim()) return
    setSaving(true)
    setError('')
    try {
      const sid = await ensureSociedadId()
      if (!sid) throw new Error('No se pudo vincular la sociedad')
      const res = await fetch('/api/documentos/precedentes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          datos,
          sociedad_id: sid,
          nombre_referencia: precedenteNombre.trim(),
          secciones,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setShowPrecedenteModal(false)
      setToast('Precedente guardado. Podrás reutilizarlo en futuras actas.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar precedente')
    } finally {
      setSaving(false)
    }
  }

  function updateSeccion(index: number, contenido: string) {
    const next = [...secciones]
    next[index] = { ...next[index], contenido }
    setSecciones(next)
  }

  function handleChatSeccionesUpdate(updated: SeccionActa[], cambios: CambioRealizado[]) {
    setSecciones(updated)
    const indices = new Set<number>()
    cambios.forEach(c => {
      const key = c.seccion.toLowerCase()
      updated.forEach((s, i) => {
        if (s.tipo === key || s.titulo?.toLowerCase().includes(key)) {
          indices.add(i)
        }
      })
    })
    if (indices.size === 0 && cambios.length > 0) {
      updated.forEach((_, i) => indices.add(i))
    }
    setFlashSections(indices)
    window.setTimeout(() => setFlashSections(new Set()), 1000)
  }

  function renderSociedadForm(showSaveCheckbox: boolean) {
    return (
      <>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={legalStyles.label}>Razón social</label>
            <input
              style={legalStyles.input}
              value={formSociedad.razon_social}
              onChange={e => setFormSociedad({ ...formSociedad, razon_social: e.target.value })}
            />
          </div>
          <div>
            <label style={legalStyles.label}>Tipo societario</label>
            <select
              style={legalStyles.input}
              value={formSociedad.tipo_societario}
              onChange={e =>
                setFormSociedad({
                  ...formSociedad,
                  tipo_societario: e.target.value as DatosSociedad['tipo_societario'],
                })
              }
            >
              {TIPOS_SOCIETARIOS.map(t => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          {(
            [
              ['ruc', 'RUC'],
              ['domicilio', 'Domicilio'],
              ['distrito', 'Distrito'],
              ['capital_social', 'Capital social'],
              ['total_acciones', 'Total acciones'],
            ] as const
          ).map(([key, label]) => (
            <div key={key}>
              <label style={legalStyles.label}>{label}</label>
              <input
                style={legalStyles.input}
                value={String(formSociedad[key] ?? '')}
                onChange={e =>
                  setFormSociedad({
                    ...formSociedad,
                    [key]:
                      key === 'capital_social' || key === 'total_acciones'
                        ? Number(e.target.value)
                        : e.target.value,
                  })
                }
              />
            </div>
          ))}
        </div>
        <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: 11, marginTop: 20 }}>Accionistas</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <input
            style={legalStyles.input}
            placeholder="Nombre"
            value={draftAccionista.nombre_completo ?? ''}
            onChange={e => setDraftAccionista({ ...draftAccionista, nombre_completo: e.target.value })}
          />
          <input
            style={legalStyles.input}
            placeholder="DNI"
            value={draftAccionista.dni ?? ''}
            onChange={e => setDraftAccionista({ ...draftAccionista, dni: e.target.value })}
          />
          <input
            style={legalStyles.input}
            placeholder="Acciones"
            type="number"
            value={draftAccionista.num_acciones ?? 0}
            onChange={e => setDraftAccionista({ ...draftAccionista, num_acciones: Number(e.target.value) })}
          />
        </div>
        <button
          type="button"
          style={{ ...legalStyles.btnSecondary, marginTop: 12 }}
          onClick={() => {
            if (!draftAccionista.nombre_completo || !draftAccionista.dni) return
            setFormAccionistas([
              ...formAccionistas,
              {
                tipo: 'persona_natural',
                nombre_completo: draftAccionista.nombre_completo!,
                dni: draftAccionista.dni!,
                num_acciones: draftAccionista.num_acciones ?? 0,
                valor_nominal: 1,
                moneda: 'PEN',
              },
            ])
            setDraftAccionista({
              tipo: 'persona_natural',
              nombre_completo: '',
              dni: '',
              num_acciones: 0,
              valor_nominal: 1,
              moneda: 'PEN',
            })
          }}
        >
          Agregar accionista
        </button>
        {formAccionistas.length > 0 && (
          <ul style={{ marginTop: 12, fontSize: 13 }}>
            {formAccionistas.map((a, i) => (
              <li key={i}>
                {a.nombre_completo} — {a.num_acciones} acciones
              </li>
            ))}
          </ul>
        )}
        {showSaveCheckbox && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, fontSize: 13 }}>
            <input
              type="checkbox"
              checked={guardarSociedadCheck}
              onChange={e => setGuardarSociedadCheck(e.target.checked)}
            />
            ¿Guardar esta sociedad para futuros documentos?
          </label>
        )}
      </>
    )
  }

  return (
    <>
      <JgaToast message={toast} />
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)', marginBottom: 16 }}>
        Paso {step} de 4
      </p>
      {error && <p style={{ color: '#c0392b', marginBottom: 16 }}>{error}</p>}

      {step === 1 && (
        <div>
          <label style={legalStyles.label}>Punto de partida</label>
          <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
            {(
              [
                ['cero', 'Desde cero', 'Completa todos los datos de la sociedad y los accionistas.'],
                ['guardada', 'Sociedad guardada', 'Selecciona una sociedad que ya hayas guardado y solo ajusta la agenda.'],
                ['precedente', 'Precedente', 'Usa un acta anterior como modelo. Solo cambia fecha, montos y partes.'],
              ] as const
            ).map(([p, title, desc]) => (
              <div
                key={p}
                style={pathCardStyle(path === p)}
                onMouseOver={e => {
                  if (path !== p) e.currentTarget.style.borderColor = 'rgba(201, 168, 76, 0.3)'
                }}
                onMouseOut={e => {
                  if (path !== p) e.currentTarget.style.borderColor = 'rgba(201, 168, 76, 0.15)'
                }}
                onClick={() => setPath(p)}
              >
                <div style={pathCardLabel}>{title}</div>
                <p style={pathCardDesc}>{desc}</p>
                <div style={pathCardAction}>{path === p ? 'Seleccionado' : 'Seleccionar →'}</div>
              </div>
            ))}
          </div>

          {path === 'cero' && <div style={legalStyles.card}>{renderSociedadForm(true)}</div>}

          {path === 'guardada' && (
            <div style={legalStyles.card}>
              <label style={legalStyles.label}>Sociedad guardada</label>
              <select
                style={{ ...legalStyles.input, marginBottom: 16 }}
                value={sociedadId}
                onChange={e => setSociedadId(e.target.value)}
              >
                <option value="">Seleccionar...</option>
                {sociedades.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.razon_social}
                  </option>
                ))}
              </select>
              {sociedadId && renderSociedadForm(false)}
            </div>
          )}

          {path === 'precedente' && (
            <div style={legalStyles.card}>
              <label style={legalStyles.label}>Precedentes guardados</label>
              {precedentes.length === 0 && (
                <p style={{ color: 'var(--muted)', fontSize: 13 }}>No hay precedentes. Genere un acta y guárdela como precedente.</p>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {precedentes.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPrecedenteId(p.id)}
                    style={{
                      ...pathCardStyle(precedenteId === p.id),
                      textAlign: 'left',
                      width: '100%',
                    }}
                  >
                    <div style={{ fontSize: 15, marginBottom: 4 }}>{p.nombre_referencia}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'rgba(201,168,76,0.65)' }}>
                      {p.razon_social} · {(p.tipo_operaciones ?? []).join(', ')} · {p.fecha_acta || new Date(p.created_at).toLocaleDateString('es-PE')}
                    </div>
                  </button>
                ))}
              </div>
              {datos && precedenteId && (
                <p style={{ marginTop: 16, fontSize: 13, color: 'var(--muted)' }}>
                  Precedente cargado: {datos.agenda.length} punto(s) de agenda listos para ajustar en los pasos siguientes.
                </p>
              )}
            </div>
          )}

          {path && (
            <div style={{ marginTop: 24 }}>
              <button type="button" style={legalStyles.btnPrimary} disabled={loading} onClick={handleStep1Next}>
                Continuar
              </button>
            </div>
          )}
        </div>
      )}

      {step === 2 && datos && (
        <div style={legalStyles.card}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {(
              [
                ['fecha', 'Fecha'],
                ['hora_inicio', 'Hora inicio'],
                ['hora_fin', 'Hora fin'],
                ['lugar', 'Lugar'],
                ['presidente', 'Presidente'],
                ['secretario', 'Secretario'],
              ] as const
            ).map(([key, label]) => (
              <div key={key}>
                <label style={legalStyles.label}>{label}</label>
                <input
                  style={legalStyles.input}
                  value={String(datos[key] ?? '')}
                  onChange={e => setDatos({ ...datos, [key]: e.target.value })}
                />
              </div>
            ))}
          </div>
          <label style={{ ...legalStyles.label, marginTop: 16 }}>Convocatoria</label>
          <select
            style={legalStyles.input}
            value={datos.tipo_convocatoria}
            onChange={e =>
              setDatos({ ...datos, tipo_convocatoria: e.target.value as DatosJGA['tipo_convocatoria'] })
            }
          >
            <option value="universal">Universal (Art. 120° LGS)</option>
            <option value="con_convocatoria">Con convocatoria previa</option>
          </select>
          <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
            <button type="button" style={legalStyles.btnSecondary} onClick={() => setStep(1)}>
              Atrás
            </button>
            <button type="button" style={legalStyles.btnPrimary} onClick={() => setStep(3)}>
              Siguiente
            </button>
          </div>
        </div>
      )}

      {step === 3 && datos && (
        <div>
          <div style={legalStyles.card}>
            <label style={legalStyles.label}>Agregar punto de agenda</label>
            <select
              style={legalStyles.input}
              defaultValue=""
              onChange={e => {
                if (e.target.value) {
                  addAgendaPoint(e.target.value as TipoOperacionJGA)
                  e.target.value = ''
                }
              }}
            >
              <option value="">Tipo de operación...</option>
              {TIPOS_OPERACION.map(t => (
                <option key={t} value={t}>
                  {getTituloOperacion(t)}
                </option>
              ))}
            </select>
          </div>

          {datos.agenda.map((punto, idx) => {
            const tpl = getOperationTemplate(punto.tipo_operacion)
            return (
              <div key={idx} style={legalStyles.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: 12, margin: 0 }}>
                    {punto.numero}. {punto.titulo}
                  </h3>
                  <button
                    type="button"
                    style={legalStyles.btnSecondary}
                    disabled={loadingIa === idx}
                    onClick={() => generarDesarrolloIa(idx)}
                  >
                    {loadingIa === idx ? 'Generando...' : 'Generar desarrollo con IA'}
                  </button>
                </div>
                {typeof punto.datos_operacion.desarrollo_ia === 'string' && punto.datos_operacion.desarrollo_ia && (
                  <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 12 }}>
                    Desarrollo IA cargado para este punto.
                  </p>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                  {tpl.campos_requeridos.map(campo => (
                    <div key={campo.nombre}>
                      <label style={legalStyles.label}>{campo.label}</label>
                      {campo.tipo === 'select' ? (
                        <select
                          style={legalStyles.input}
                          value={String(punto.datos_operacion[campo.nombre] ?? '')}
                          onChange={e => updatePuntoCampo(idx, campo.nombre, e.target.value)}
                        >
                          <option value="">—</option>
                          {campo.opciones?.map(o => (
                            <option key={o} value={o}>
                              {o}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          style={legalStyles.input}
                          type={campo.tipo === 'number' || campo.tipo === 'currency' ? 'number' : 'text'}
                          value={String(punto.datos_operacion[campo.nombre] ?? '')}
                          onChange={e =>
                            updatePuntoCampo(
                              idx,
                              campo.nombre,
                              campo.tipo === 'number' || campo.tipo === 'currency'
                                ? Number(e.target.value)
                                : e.target.value,
                            )
                          }
                          placeholder={campo.placeholder}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          <div style={{ display: 'flex', gap: 12 }}>
            <button type="button" style={legalStyles.btnSecondary} onClick={() => setStep(2)}>
              Atrás
            </button>
            <button
              type="button"
              style={legalStyles.btnPrimary}
              disabled={loading || datos.agenda.length === 0}
              onClick={generarActa}
            >
              Generar acta
            </button>
          </div>
        </div>
      )}

      {step === 4 && secciones.length > 0 && datos && (
        <div>
          {secciones.map((s, i) => (
            <div
              key={i}
              style={{
                ...legalStyles.card,
                transition: 'background-color 0.3s ease',
                backgroundColor: flashSections.has(i) ? 'rgba(201, 168, 76, 0.2)' : undefined,
              }}
            >
              {s.titulo && (
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, marginBottom: 8 }}>{s.titulo}</div>
              )}
              <textarea
                style={{ ...legalStyles.textarea, minHeight: 120, fontSize: 13 }}
                value={s.contenido}
                onChange={e => updateSeccion(i, e.target.value)}
              />
            </div>
          ))}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button type="button" style={legalStyles.btnPrimary} disabled={saving} onClick={guardarCambios}>
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
            <button type="button" style={legalStyles.btnSecondary} onClick={descargarDocx}>
              Descargar DOCX
            </button>
            <button type="button" style={legalStyles.btnSecondary} onClick={() => setShowPrecedenteModal(true)}>
              Guardar como precedente
            </button>
          </div>
          <JgaChatWidget secciones={secciones} datos={datos} onSeccionesUpdate={handleChatSeccionesUpdate} />
        </div>
      )}

      {showPrecedenteModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 400,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => setShowPrecedenteModal(false)}
        >
          <div
            style={{ ...legalStyles.card, width: '100%', maxWidth: 440, background: '#0a0a0a', border: '1px solid rgba(201,168,76,0.3)' }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: 12, textTransform: 'uppercase', color: '#c9a84c' }}>
              Guardar como precedente
            </h3>
            <label style={{ ...legalStyles.label, marginTop: 16 }}>Nombre de referencia</label>
            <input
              style={legalStyles.input}
              value={precedenteNombre}
              onChange={e => setPrecedenteNombre(e.target.value)}
              placeholder="Financiamiento Acri - Jun 2026"
            />
            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              <button type="button" style={legalStyles.btnPrimary} disabled={saving || !precedenteNombre.trim()} onClick={confirmarGuardarPrecedente}>
                Guardar
              </button>
              <button type="button" style={legalStyles.btnSecondary} onClick={() => setShowPrecedenteModal(false)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default function JgaNuevaActaWizard() {
  return (
    <Suspense fallback={<div>Cargando wizard...</div>}>
      <JgaNuevaActaWizardInner />
    </Suspense>
  )
}
