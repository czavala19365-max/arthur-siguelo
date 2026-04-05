'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type TituloPill = { label: string; count: number; color: string; bg: string }
type UltimoTitulo = { numero: string; estado: string; color: string; bg: string } | null
type PlazoItem = { id: number; descripcion: string; fecha_vencimiento: string; alias: string | null; tipo: string | null }

interface Props {
  titulosTotal: number
  titulosPills: TituloPill[]
  ultimoTitulo: UltimoTitulo
  plazosProximos: PlazoItem[]
  plazosVencidos: number
}

function getGreeting(): string {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return 'Buenos días'
  if (h >= 12 && h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

function getFormattedDate(): string {
  return new Date().toLocaleDateString('es-PE', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
}

function getName(email: string): string {
  const prefix = email.split('@')[0].replace(/[0-9_.-]/g, ' ').trim()
  return prefix.charAt(0).toUpperCase() + prefix.slice(1)
}

function daysUntil(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr + 'T00:00:00')
  return Math.round((target.getTime() - today.getTime()) / 86400000)
}

const cardBase: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--line)',
  borderLeft: '3px solid var(--accent)',
  padding: '28px 32px',
  transition: 'box-shadow 0.2s ease, transform 0.2s ease',
}

export default function HomeDashboard({ titulosTotal, titulosPills, ultimoTitulo, plazosProximos, plazosVencidos }: Props) {
  const [name, setName] = useState('')
  const [greeting, setGreeting] = useState('')
  const [date, setDate] = useState('')
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      const auth = JSON.parse(localStorage.getItem('arthur_auth') || '{}')
      if (auth.email) setName(getName(auth.email))
    } catch { /* ignore */ }
    setGreeting(getGreeting())
    setDate(getFormattedDate())
    requestAnimationFrame(() => setVisible(true))
  }, [])

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .home-card:hover {
          box-shadow: 0 4px 24px rgba(0,0,0,0.08);
          transform: translateY(-1px);
        }
        .home-cta:hover { opacity: 0.75; }
      `}</style>

      <div style={{
        padding: '48px 64px',
        background: 'var(--paper)',
        minHeight: '100vh',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.3s ease',
      }}>

        {/* Header — saludo */}
        <div style={{
          borderLeft: '4px solid var(--accent)',
          paddingLeft: '24px',
          marginBottom: '40px',
          animation: 'fadeUp 0.4s ease forwards',
        }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            color: 'var(--accent)',
            marginBottom: '8px',
          }}>
            {date}
          </div>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(28px, 3.5vw, 44px)',
            color: 'var(--ink)',
            fontWeight: 400,
            lineHeight: 1.15,
            margin: 0,
            fontStyle: 'italic',
          }}>
            {greeting}{name ? `, ${name}` : ''}
          </h1>
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: '14px',
            color: 'var(--muted)',
            marginTop: '10px',
            marginBottom: 0,
          }}>
            Aquí está el resumen de tus módulos activos.
          </p>
        </div>

        {/* Grid de cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '20px',
        }}>

          {/* Card 1 — Títulos Registrales */}
          <div
            className="home-card"
            style={{ ...cardBase, animation: 'fadeUp 0.4s ease 0.05s both' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--accent)', marginBottom: '6px' }}>
                  Títulos Registrales
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '48px', color: 'var(--ink)', lineHeight: 1, fontWeight: 700 }}>
                  {titulosTotal}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', marginTop: '4px' }}>
                  monitoreados
                </div>
              </div>
              <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: '4px', opacity: 0.7 }}>
                <circle cx="6.5" cy="6.5" r="4.5" /><path d="M10 10l4 4" />
              </svg>
            </div>

            {/* Pills de estado */}
            {titulosPills.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '20px' }}>
                {titulosPills.map(p => (
                  <span key={p.label} style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '4px 10px',
                    background: p.bg,
                    borderLeft: `2px solid ${p.color}`,
                    fontFamily: 'var(--font-mono)', fontSize: '10px',
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                    color: p.color,
                  }}>
                    <strong style={{ fontSize: '12px' }}>{p.count}</strong>
                    {p.label}
                  </span>
                ))}
              </div>
            )}

            {/* Último título */}
            {ultimoTitulo && (
              <div style={{
                borderTop: '1px solid var(--line-faint)',
                paddingTop: '14px',
                marginBottom: '18px',
              }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: '6px' }}>
                  Último consultado
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--ink)' }}>
                    {ultimoTitulo.numero}
                  </span>
                  <span style={{
                    padding: '2px 8px',
                    background: ultimoTitulo.bg,
                    color: ultimoTitulo.color,
                    fontFamily: 'var(--font-mono)', fontSize: '9px',
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                  }}>
                    {ultimoTitulo.estado}
                  </span>
                </div>
              </div>
            )}

            <Link href="/dashboard/siguelo" className="home-cta" style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              fontFamily: 'var(--font-mono)', fontSize: '10px',
              textTransform: 'uppercase', letterSpacing: '0.1em',
              color: 'var(--ink)', textDecoration: 'none',
              transition: 'opacity 0.15s',
            }}>
              Ver todos →
            </Link>
          </div>

          {/* Card 2 — Agenda de Plazos */}
          <div
            className="home-card"
            style={{ ...cardBase, borderLeftColor: plazosVencidos > 0 ? '#dc2626' : 'var(--accent)', animation: 'fadeUp 0.4s ease 0.12s both' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.12em', color: plazosVencidos > 0 ? '#dc2626' : 'var(--accent)', marginBottom: '6px' }}>
                  Agenda de Plazos
                </div>
                {plazosVencidos > 0 && (
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)',
                    padding: '4px 10px', marginBottom: '12px',
                    fontFamily: 'var(--font-mono)', fontSize: '10px',
                    textTransform: 'uppercase', letterSpacing: '0.06em', color: '#dc2626',
                  }}>
                    ⚠ {plazosVencidos} plazo{plazosVencidos > 1 ? 's' : ''} vencido{plazosVencidos > 1 ? 's' : ''}
                  </div>
                )}
              </div>
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7, flexShrink: 0 }}>
                <rect x="1.5" y="2.5" width="13" height="12" rx="1" />
                <path d="M1.5 6.5h13M5 1v3M11 1v3" />
              </svg>
            </div>

            {plazosProximos.length === 0 ? (
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--muted)', marginBottom: '20px' }}>
                Sin vencimientos próximos.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                {plazosProximos.map(p => {
                  const days = daysUntil(p.fecha_vencimiento)
                  const urgent = days <= 3
                  return (
                    <div key={p.id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                      padding: '10px 12px',
                      background: urgent ? 'rgba(220,38,38,0.05)' : 'var(--paper)',
                      border: `1px solid ${urgent ? 'rgba(220,38,38,0.15)' : 'var(--line-faint)'}`,
                    }}>
                      <div>
                        <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--ink)', marginBottom: '2px' }}>
                          {p.descripcion}
                        </div>
                        {p.alias && (
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            {p.alias}
                          </div>
                        )}
                      </div>
                      <div style={{
                        fontFamily: 'var(--font-mono)', fontSize: '10px',
                        textTransform: 'uppercase', letterSpacing: '0.06em',
                        color: urgent ? '#dc2626' : 'var(--muted)',
                        whiteSpace: 'nowrap', marginLeft: '12px',
                      }}>
                        {days === 0 ? 'Hoy' : days === 1 ? 'Mañana' : `${days}d`}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <Link href="/dashboard/agenda" className="home-cta" style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              fontFamily: 'var(--font-mono)', fontSize: '10px',
              textTransform: 'uppercase', letterSpacing: '0.1em',
              color: 'var(--ink)', textDecoration: 'none',
              transition: 'opacity 0.15s',
            }}>
              Ver agenda →
            </Link>
          </div>

          {/* Card 3 — Consulta Legal IA */}
          <div
            className="home-card"
            style={{ ...cardBase, animation: 'fadeUp 0.4s ease 0.19s both' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--accent)' }}>
                Consulta Legal IA
              </div>
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7, flexShrink: 0 }}>
                <path d="M2 2.5h12a.5.5 0 0 1 .5.5v8a.5.5 0 0 1-.5.5H5L2 14V3a.5.5 0 0 1 .5-.5z" />
                <path d="M5 6h6M5 8.5h4" />
              </svg>
            </div>

            <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--muted)', lineHeight: 1.6, marginBottom: '20px' }}>
              Arthur analiza tus documentos y responde consultas legales sobre registros, plazos y procedimientos SUNARP con inteligencia artificial.
            </p>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: '10px' }}>
                Preguntas frecuentes
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {[
                  '¿Cuánto demora una inscripción de predio?',
                  '¿Qué documentos necesito para una hipoteca?',
                  '¿Cómo apelar un título observado?',
                ].map(q => (
                  <Link
                    key={q}
                    href={`/dashboard/chat?q=${encodeURIComponent(q)}`}
                    style={{
                      display: 'block',
                      padding: '8px 12px',
                      background: 'var(--paper)',
                      border: '1px solid var(--line-faint)',
                      fontFamily: 'var(--font-body)', fontSize: '12px',
                      color: 'var(--muted)', textDecoration: 'none',
                      transition: 'color 0.15s, border-color 0.15s',
                    }}
                    onMouseOver={e => { e.currentTarget.style.color = 'var(--ink)'; e.currentTarget.style.borderColor = 'var(--accent)'; }}
                    onMouseOut={e => { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.borderColor = 'var(--line-faint)'; }}
                  >
                    {q}
                  </Link>
                ))}
              </div>
            </div>

            <Link href="/dashboard/chat" className="home-cta" style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              fontFamily: 'var(--font-mono)', fontSize: '10px',
              textTransform: 'uppercase', letterSpacing: '0.1em',
              color: 'var(--ink)', textDecoration: 'none',
              transition: 'opacity 0.15s',
            }}>
              Consultar →
            </Link>
          </div>

        </div>
      </div>
    </>
  )
}
