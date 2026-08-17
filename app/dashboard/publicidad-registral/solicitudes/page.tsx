'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type Solicitud = {
  id: string
  user_id: string
  tipo_servicio: string
  datos: Record<string, unknown>
  estado: string | null
  created_at: string
  usuario: { email: string | null; full_name: string | null } | null
}

const estados = ['pendiente', 'en_proceso', 'completada', 'rechazada']

const etiquetasCampos: Record<string, string> = {
  oficina_registral: 'Oficina registral',
  solicitar_por: 'Solicitar por',
  numero_partida: 'Número de partida',
  numero_asiento: 'Número de asiento',
  cargo_apoderado: 'Cargo del apoderado',
  representante_tipo: 'Tipo de representante',
  razon_social: 'Razón social',
  apellido_paterno: 'Apellido paterno',
  apellido_materno: 'Apellido materno',
  nombres: 'Nombres',
  datos_adicionales: 'Datos adicionales',
}

const ordenCampos = Object.keys(etiquetasCampos)

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function formatFieldValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function getSolicitudFields(datos: Record<string, unknown>) {
  const fields = Object.entries(datos)
  return [
    ...ordenCampos
      .filter(key => Object.prototype.hasOwnProperty.call(datos, key))
      .map(key => [key, datos[key]] as const),
    ...fields.filter(([key]) => !ordenCampos.includes(key)),
  ]
}

export default function SolicitudesRegistralesPage() {
  const router = useRouter()
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadSolicitudes() {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/admin/solicitudes')
      if (response.status === 401) return router.replace('/login')
      if (response.status === 403) return router.replace('/select')
      const result = await response.json() as { solicitudes?: Solicitud[]; error?: string }
      if (!response.ok) throw new Error(result.error || 'No se pudieron cargar las solicitudes.')
      setSolicitudes(result.solicitudes ?? [])
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar las solicitudes.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void loadSolicitudes() }, [])

  async function updateStatus(id: string, estado: string) {
    const response = await fetch('/api/admin/solicitudes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, estado }),
    })
    if (!response.ok) {
      const result = await response.json() as { error?: string }
      setError(result.error || 'No se pudo actualizar el estado.')
      return
    }
    setSolicitudes(current => current.map(solicitud => solicitud.id === id ? { ...solicitud, estado } : solicitud))
  }

  return (
    <section style={{ minHeight: '100%', padding: '48px clamp(24px, 5vw, 72px)', background: 'var(--paper)' }}>
      <div style={{ maxWidth: '1180px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: '24px', marginBottom: '32px' }}>
          <div>
            <div style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '10px' }}>Publicidad registral</div>
            <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '38px', fontStyle: 'italic', fontWeight: 400 }}>Solicitudes recibidas</h1>
            <p style={{ color: 'var(--muted)', fontFamily: 'var(--font-body)', fontSize: '14px', margin: '12px 0 0' }}>Gestiona los pedidos de vigencia de poder enviados por los usuarios.</p>
          </div>
          <button type="button" onClick={() => void loadSolicitudes()} style={{ padding: '9px 14px', background: 'transparent', border: '1px solid var(--line-mid)', color: 'var(--ink)', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>Actualizar</button>
        </div>

        {error && <p style={{ color: '#b42318', fontFamily: 'var(--font-body)', fontSize: '13px' }}>{error}</p>}
        {loading ? <p style={{ color: 'var(--muted)' }}>Cargando solicitudes...</p> : solicitudes.length === 0 ? <p style={{ color: 'var(--muted)' }}>Todavía no hay solicitudes registradas.</p> : (
          <div style={{ display: 'grid', gap: '14px' }}>
            {solicitudes.map(solicitud => (
              <article key={solicitud.id} style={{ border: '1px solid var(--line-mid)', background: 'var(--surface)', padding: '20px 22px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap', marginBottom: '16px' }}>
                  <div>
                    <strong style={{ fontFamily: 'var(--font-body)', fontSize: '15px' }}>{solicitud.usuario?.full_name || solicitud.usuario?.email || solicitud.user_id}</strong>
                    {solicitud.usuario?.full_name && <div style={{ color: 'var(--muted)', fontSize: '12px', marginTop: '3px' }}>{solicitud.usuario.email}</div>}
                  </div>
                  <div style={{ textAlign: 'right', color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: '10px' }}>
                    <div>{formatDate(solicitud.created_at)}</div>
                    <div style={{ marginTop: '4px' }}>#{solicitud.id.slice(0, 8)}</div>
                  </div>
                </div>
                <div style={{ borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)', padding: '14px 0' }}>
                  <div style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '12px' }}>Datos enviados por el usuario</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '14px 20px', fontSize: '12px' }}>
                    <div>
                      <small style={{ color: 'var(--muted)' }}>Servicio</small>
                      <div style={{ marginTop: '4px', fontWeight: 600 }}>{solicitud.tipo_servicio}</div>
                    </div>
                    {getSolicitudFields(solicitud.datos).map(([key, value]) => (
                      <div key={key}>
                        <small style={{ color: 'var(--muted)' }}>{etiquetasCampos[key] || key.replaceAll('_', ' ')}</small>
                        <div style={{ marginTop: '4px', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{formatFieldValue(value)}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginTop: '15px' }}>
                  <span style={{ color: 'var(--muted)', fontSize: '11px' }}>Estado del pedido</span>
                  <select value={solicitud.estado || 'pendiente'} onChange={event => void updateStatus(solicitud.id, event.target.value)} style={{ padding: '7px 10px', border: '1px solid var(--line-mid)', background: 'var(--paper)', color: 'var(--ink)', fontSize: '12px' }}>
                    {estados.map(estado => <option key={estado} value={estado}>{estado.replace('_', ' ')}</option>)}
                  </select>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}