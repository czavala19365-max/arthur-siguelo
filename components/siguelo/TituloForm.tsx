'use client'

import { useState, useTransition, useRef } from 'react'
import { agregarYConsultarTitulo } from '@/app/actions'
import { OFICINAS_SUNARP } from '@/lib/oficinas'

type FormValues = {
  oficina_registral: string
  anio_titulo: string
  numero_titulo: string
  nombre_cliente: string
  email_cliente: string
  whatsapp_cliente: string
  proyecto: string
  asunto: string
  registro: string
  abogado: string
  notaria: string
}

type Result = {
  error?: string
  success?: boolean
  estado?: string
  detalle?: string
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: 'var(--font-mono)',
  fontSize: '13px',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  color: 'var(--muted)',
  marginBottom: '8px',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  fontFamily: 'var(--font-body)',
  fontSize: '14px',
  color: 'var(--ink)',
  background: 'var(--surface)',
  border: '1px solid var(--line-mid)',
  borderRadius: '4px',
  padding: '10px 12px',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s',
}

const requiredMark = (
  <span style={{ color: 'var(--accent)', marginLeft: '2px' }}>*</span>
)

export default function TituloForm() {
  const [pendingValues, setPendingValues] = useState<FormValues | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const [isPending, startTransition] = useTransition()
  const [showOptional, setShowOptional] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    setPendingValues({
      oficina_registral: data.get('oficina_registral') as string,
      anio_titulo: data.get('anio_titulo') as string,
      numero_titulo: data.get('numero_titulo') as string,
      nombre_cliente: data.get('nombre_cliente') as string,
      email_cliente: data.get('email_cliente') as string,
      whatsapp_cliente: data.get('whatsapp_cliente') as string,
      proyecto: (data.get('proyecto') as string) ?? '',
      asunto: (data.get('asunto') as string) ?? '',
      registro: (data.get('registro') as string) ?? '',
      abogado: (data.get('abogado') as string) ?? '',
      notaria: (data.get('notaria') as string) ?? '',
    })
  }

  const handleConfirm = () => {
    if (!pendingValues) return
    const values = pendingValues
    setPendingValues(null)
    setResult(null)
    startTransition(async () => {
      const formData = new FormData()
      Object.entries(values).forEach(([k, v]) => formData.set(k, v))
      const res = await agregarYConsultarTitulo(formData)
      setResult(res)
      if (res.success) formRef.current?.reset()
    })
  }

  return (
    <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '6px', padding: '32px', position: 'relative' }}>

      <h2 style={{ fontFamily: 'var(--font-body)', fontSize: '22px', fontWeight: 600, color: 'var(--ink)', marginBottom: '28px', lineHeight: 1.3 }}>
        Agregar título registral
      </h2>

      {result?.error && (
        <div style={{ marginBottom: '20px', borderRadius: '4px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.06)', padding: '12px 16px', fontFamily: 'var(--font-body)', fontSize: '13px', color: '#dc2626' }}>
          {result.error}
        </div>
      )}
      {result?.success && (
        <div style={{ marginBottom: '20px', borderRadius: '4px', border: '1px solid rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.06)', padding: '12px 16px', fontFamily: 'var(--font-body)', fontSize: '13px', color: '#16a34a' }}>
          Título agregado correctamente.
          {result.estado && (
            <> Estado actual: <strong>{result.estado}</strong>{result.detalle ? ` — ${result.detalle}` : ''}.</>
          )}
        </div>
      )}

      <form ref={formRef} onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Oficina registral */}
          <div>
            <label htmlFor="oficina_registral" style={labelStyle}>
              Oficina registral {requiredMark}
            </label>
            <select
              id="oficina_registral"
              name="oficina_registral"
              required
              style={inputStyle}
              onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'var(--line-mid)')}
            >
              <option value="">Seleccionar oficina…</option>
              {OFICINAS_SUNARP.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>

          {/* Año y número */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label htmlFor="anio_titulo" style={labelStyle}>
                Año del título {requiredMark}
              </label>
              <input
                id="anio_titulo"
                name="anio_titulo"
                type="number"
                min={1900}
                max={new Date().getFullYear() + 1}
                placeholder={String(new Date().getFullYear())}
                required
                style={inputStyle}
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'var(--line-mid)')}
              />
            </div>
            <div>
              <label htmlFor="numero_titulo" style={labelStyle}>
                Número del título {requiredMark}
              </label>
              <input
                id="numero_titulo"
                name="numero_titulo"
                type="text"
                placeholder="Ej. 431663"
                required
                style={inputStyle}
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'var(--line-mid)')}
              />
            </div>
          </div>

          {/* Cliente */}
          <div>
            <label htmlFor="nombre_cliente" style={labelStyle}>
              Cliente {requiredMark}
            </label>
            <input
              id="nombre_cliente"
              name="nombre_cliente"
              type="text"
              placeholder="Nombre completo"
              required
              style={inputStyle}
              onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'var(--line-mid)')}
            />
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email_cliente" style={labelStyle}>
              Email(s) para recibir alertas {requiredMark}
            </label>
            <input
              id="email_cliente"
              name="email_cliente"
              type="text"
              placeholder="correo1@gmail.com, correo2@gmail.com"
              required
              style={inputStyle}
              onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'var(--line-mid)')}
            />
          </div>

          {/* WhatsApp */}
          <div>
            <label htmlFor="whatsapp_cliente" style={labelStyle}>
              WhatsApp(s) para recibir alertas {requiredMark}
            </label>
            <input
              id="whatsapp_cliente"
              name="whatsapp_cliente"
              type="tel"
              placeholder="+51 999 999 999"
              required
              style={inputStyle}
              onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'var(--line-mid)')}
            />
          </div>

          {/* Toggle opcional */}
          <div>
            <button
              type="button"
              onClick={() => setShowOptional(v => !v)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--accent)',
                padding: '0',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {showOptional ? '− Menos detalles' : '+ Más detalles (Opcional)'}
            </button>
          </div>

          {/* Campos opcionales */}
          <div style={{
            display: 'grid',
            gridTemplateRows: showOptional ? '1fr' : '0fr',
            transition: 'grid-template-rows 0.25s ease',
          }}>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingTop: '4px' }}>

                <div style={{ borderTop: '1px solid var(--line-faint)', paddingTop: '20px' }}>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--muted)', marginBottom: '20px' }}>
                    Información del título registral
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Proyecto y Asunto */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div>
                        <label htmlFor="proyecto" style={labelStyle}>Proyecto</label>
                        <input
                          id="proyecto"
                          name="proyecto"
                          type="text"
                          placeholder="Nombre del proyecto"
                          style={inputStyle}
                          onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                          onBlur={e => (e.currentTarget.style.borderColor = 'var(--line-mid)')}
                        />
                      </div>
                      <div>
                        <label htmlFor="asunto" style={labelStyle}>Asunto</label>
                        <input
                          id="asunto"
                          name="asunto"
                          type="text"
                          placeholder="Descripción del asunto"
                          style={inputStyle}
                          onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                          onBlur={e => (e.currentTarget.style.borderColor = 'var(--line-mid)')}
                        />
                      </div>
                    </div>

                    {/* Registro */}
                    <div>
                      <label htmlFor="registro" style={labelStyle}>Registro</label>
                      <select
                        id="registro"
                        name="registro"
                        style={inputStyle}
                        onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                        onBlur={e => (e.currentTarget.style.borderColor = 'var(--line-mid)')}
                      >
                        <option value="">Seleccionar registro…</option>
                        <option value="Registro de Personas Jurídicas">Registro de Personas Jurídicas</option>
                        <option value="Registro de Propiedad Inmueble">Registro de Propiedad Inmueble</option>
                        <option value="Registro de Propiedad Minera">Registro de Propiedad Minera</option>
                        <option value="Registro de Propiedad Vehicular">Registro de Propiedad Vehicular</option>
                        <option value="Registro de Sucesiones Intestadas">Registro de Sucesiones Intestadas</option>
                        <option value="Registro Personal">Registro Personal</option>
                        <option value="Registro de Testamentos">Registro de Testamentos</option>
                        <option value="Registro de Mandatos y Poderes">Registro de Mandatos y Poderes</option>
                        <option value="Registro de Bienes Muebles">Registro de Bienes Muebles</option>
                        <option value="Registro Mobiliario de Contratos">Registro Mobiliario de Contratos</option>
                        <option value="Registro de Garantías Mobiliarias">Registro de Garantías Mobiliarias</option>
                        <option value="Registro de Derechos Mineros">Registro de Derechos Mineros</option>
                        <option value="Registro de Concesiones para la Explotación de Servicios Públicos">Registro de Concesiones para la Explotación de Servicios Públicos</option>
                        <option value="Registro de Áreas Naturales Protegidas">Registro de Áreas Naturales Protegidas</option>
                        <option value="Registro de Predios">Registro de Predios</option>
                        <option value="Otro">Otro</option>
                      </select>
                    </div>

                    {/* Abogado y Notaría */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div>
                        <label htmlFor="abogado" style={labelStyle}>Abogado a cargo</label>
                        <input
                          id="abogado"
                          name="abogado"
                          type="text"
                          placeholder="Nombre del abogado"
                          style={inputStyle}
                          onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                          onBlur={e => (e.currentTarget.style.borderColor = 'var(--line-mid)')}
                        />
                      </div>
                      <div>
                        <label htmlFor="notaria" style={labelStyle}>Notaría y/o Presentante</label>
                        <input
                          id="notaria"
                          name="notaria"
                          type="text"
                          placeholder="Notaría o presentante"
                          style={inputStyle}
                          onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                          onBlur={e => (e.currentTarget.style.borderColor = 'var(--line-mid)')}
                        />
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* Botón submit */}
          <div style={{ paddingTop: '8px' }}>
            <button
              type="submit"
              disabled={isPending}
              style={{
                width: '100%',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                background: 'var(--ink)',
                color: 'var(--paper)',
                border: 'none',
                borderRadius: '4px',
                padding: '13px 24px',
                cursor: isPending ? 'not-allowed' : 'pointer',
                opacity: isPending ? 0.5 : 1,
                transition: 'opacity 0.15s',
              }}
            >
              Agregar título
            </button>
          </div>

        </div>
      </form>

      {/* Spinner overlay */}
      {isPending && (
        <div style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '6px',
          background: 'rgba(var(--paper), 0.92)',
          backdropFilter: 'blur(2px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          zIndex: 10,
          backgroundColor: 'color-mix(in srgb, var(--paper) 92%, transparent)',
        }}>
          <svg style={{ width: '28px', height: '28px', color: 'var(--accent)', animation: 'spin 1s linear infinite' }} fill="none" viewBox="0 0 24 24">
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path style={{ opacity: 0.85 }} fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--ink)', fontWeight: 500 }}>
            Consultando estado en SUNARP…
          </p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Aproximadamente 20 segundos
          </p>
        </div>
      )}

      {/* Modal de confirmación */}
      {pendingValues && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--overlay-scrim)',
        }}>
          <div style={{
            background: 'var(--paper)',
            border: '1px solid var(--line-mid)',
            borderRadius: '6px',
            padding: '32px',
            width: '100%',
            maxWidth: '420px',
            margin: '0 16px',
            boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
          }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600, color: 'var(--ink)', marginBottom: '20px', fontStyle: 'italic' }}>
              ¿Confirmar agregar título?
            </h3>

            <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '4px', padding: '16px', marginBottom: '16px' }}>
              {[
                { label: 'Oficina', value: pendingValues.oficina_registral },
                { label: 'Título', value: `${pendingValues.anio_titulo} — ${pendingValues.numero_titulo}` },
                { label: 'Cliente', value: pendingValues.nombre_cliente },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', gap: '12px', marginBottom: '8px', fontFamily: 'var(--font-body)', fontSize: '13px' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', paddingTop: '2px', minWidth: '52px' }}>
                    {label}
                  </span>
                  <span style={{ color: 'var(--ink)' }}>{value}</span>
                </div>
              ))}
            </div>

            <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--muted)', marginBottom: '24px', lineHeight: 1.6 }}>
              Se guardará el título y se consultará automáticamente su estado en SUNARP.
            </p>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setPendingValues(null)}
                style={{
                  flex: 1,
                  fontFamily: 'var(--font-mono)',
                  fontSize: '13px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  background: 'transparent',
                  border: '1px solid var(--line-mid)',
                  color: 'var(--ink)',
                  borderRadius: '4px',
                  padding: '11px 16px',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s',
                }}
                onMouseOver={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                onMouseOut={e => (e.currentTarget.style.borderColor = 'var(--line-mid)')}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                style={{
                  flex: 1,
                  fontFamily: 'var(--font-mono)',
                  fontSize: '13px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  background: 'var(--ink)',
                  border: '1px solid transparent',
                  color: 'var(--paper)',
                  borderRadius: '4px',
                  padding: '11px 16px',
                  cursor: 'pointer',
                  transition: 'opacity 0.15s',
                }}
                onMouseOver={e => (e.currentTarget.style.opacity = '0.85')}
                onMouseOut={e => (e.currentTarget.style.opacity = '1')}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
