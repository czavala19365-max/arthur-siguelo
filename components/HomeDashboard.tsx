'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getEstadoStyle } from '@/lib/estados'
import type { MovimientoReciente } from '@/lib/supabase'

type PlazoItem = {
  id: number
  descripcion: string
  fecha_vencimiento: string
  alias: string | null
  tipo: string | null
}

interface Props {
  movimientos: MovimientoReciente[]
  plazosProximos: PlazoItem[]
  plazosVencidos: number
}

function tiempoRelativo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'ahora mismo'
  if (mins < 60) return `hace ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs}h`
  return `hace ${Math.floor(hrs / 24)}d`
}

function daysUntil(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr + 'T00:00:00')
  return Math.round((target.getTime() - today.getTime()) / 86400000)
}

function EstadoBadgeSmall({ estado }: { estado: string }) {
  const s = getEstadoStyle(estado)
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 7px',
      background: s?.bg ?? '#F3F4F6',
      color: s?.text ?? '#6B7280',
      fontFamily: 'var(--font-mono)',
      fontSize: '9px',
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      whiteSpace: 'nowrap',
    }}>
      {estado}
    </span>
  )
}

const quickChips = [
  { icon: '📋', label: 'Seguimiento de Títulos', href: '/dashboard/siguelo' },
  { icon: '📅', label: 'Agenda de Plazos', href: '/dashboard/agenda' },
  { icon: '⚖️', label: 'Consulta Legal IA', href: '/dashboard/chat' },
]

export default function HomeDashboard({ movimientos, plazosProximos, plazosVencidos }: Props) {
  const [query, setQuery] = useState('')
  const [visible, setVisible] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const router = useRouter()

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  function handleSubmit() {
    const q = query.trim()
    if (!q) return
    router.push(`/dashboard/chat?q=${encodeURIComponent(q)}`)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .query-box:focus-within {
          border-color: rgba(194,164,109,0.55) !important;
          box-shadow: 0 4px 32px rgba(194,164,109,0.08), 0 2px 20px rgba(0,0,0,0.05) !important;
        }
        .quick-chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 9px 18px;
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: 100px;
          font-family: var(--font-body);
          font-size: 13px;
          font-weight: 500;
          color: var(--ink);
          text-decoration: none;
          transition: background 0.15s, border-color 0.15s;
          white-space: nowrap;
        }
        .quick-chip:hover {
          background: rgba(194,164,109,0.1);
          border-color: rgba(194,164,109,0.4);
        }
        .sec-card {
          background: var(--surface);
          border: 1px solid var(--line);
          border-left: 3px solid var(--line-mid);
          padding: 20px 24px;
          transition: box-shadow 0.2s;
        }
        .sec-card:hover {
          box-shadow: 0 2px 16px rgba(0,0,0,0.05);
        }
        .mov-row {
          padding: 9px 11px;
          border: 1px solid var(--line-faint);
          background: var(--paper);
          transition: background 0.15s;
        }
        .mov-row:hover { background: rgba(194,164,109,0.04); }
        .cta-link { transition: opacity 0.15s; }
        .cta-link:hover { opacity: 0.55; }
        .send-btn:hover:not(:disabled) { opacity: 0.82; }
        @media (max-width: 640px) {
          .home-wrap { padding: 40px 20px 64px !important; }
          .hero-section { margin-bottom: 28px !important; }
          .chips-row { gap: 8px !important; }
        }
      `}</style>

      <div
        className="home-wrap"
        style={{
          padding: '56px 48px 80px',
          background: 'var(--paper)',
          minHeight: '100vh',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.4s ease',
        }}
      >

        {/* ── Hero ──────────────────────────────────── */}
        <div
          className="hero-section"
          style={{
            maxWidth: '760px',
            margin: '0 auto',
            textAlign: 'center',
            marginBottom: '32px',
            animation: 'fadeUp 0.5s ease forwards',
          }}
        >
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '5px 14px',
            background: 'rgba(194,164,109,0.1)',
            border: '1px solid rgba(194,164,109,0.3)',
            borderRadius: '100px',
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            color: 'var(--accent)',
            marginBottom: '22px',
          }}>
            Arthur AI · Registros Públicos
          </div>

          <h1 style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'clamp(28px, 4vw, 46px)',
            fontWeight: 600,
            color: 'var(--ink)',
            lineHeight: 1.15,
            letterSpacing: '-0.01em',
            marginBottom: '14px',
          }}>
            Todo SUNARP, en un solo lugar.
          </h1>
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: '16px',
            color: 'var(--muted)',
            lineHeight: 1.6,
            margin: 0,
          }}>
            Consulta, monitorea y gestiona el Registro Público con inteligencia artificial.
          </p>
        </div>

        {/* ── Query box ─────────────────────────────── */}
        <div style={{
          maxWidth: '760px',
          margin: '0 auto',
          marginBottom: '16px',
          animation: 'fadeUp 0.5s ease 0.08s both',
        }}>
          <div
            className="query-box"
            style={{
              border: '1.5px solid var(--line)',
              borderRadius: '16px',
              background: 'var(--paper)',
              boxShadow: '0 2px 20px rgba(0,0,0,0.05)',
              overflow: 'hidden',
              transition: 'border-color 0.2s, box-shadow 0.2s',
            }}
          >
            <textarea
              ref={textareaRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Hazme una pregunta sobre SUNARP, títulos registrales, vigencias de poder, copias literales..."
              rows={3}
              style={{
                width: '100%',
                padding: '20px 24px 10px',
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontFamily: 'var(--font-body)',
                fontSize: '15px',
                color: 'var(--ink)',
                lineHeight: 1.65,
                resize: 'none',
                boxSizing: 'border-box',
                display: 'block',
              }}
            />
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 16px 14px',
              borderTop: '1px solid var(--line-faint)',
            }}>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                color: 'var(--muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                opacity: 0.7,
              }}>
                Ctrl + Enter
              </span>
              <button
                className="send-btn"
                onClick={handleSubmit}
                disabled={!query.trim()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 22px',
                  background: query.trim() ? 'var(--accent)' : 'var(--surface)',
                  color: query.trim() ? '#141414' : 'var(--muted)',
                  border: `1px solid ${query.trim() ? 'var(--accent)' : 'var(--line)'}`,
                  borderRadius: '8px',
                  fontFamily: 'var(--font-body)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: query.trim() ? 'pointer' : 'default',
                  transition: 'background 0.2s, color 0.2s, opacity 0.2s',
                }}
              >
                Consultar
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </button>
            </div>
          </div>

          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: '11.5px',
            color: 'var(--muted)',
            textAlign: 'center',
            marginTop: '11px',
            opacity: 0.65,
            lineHeight: 1.5,
          }}>
            Arthur AI puede cometer errores. Verifica la información importante con fuentes oficiales.
          </p>
        </div>

        {/* ── Quick access chips ────────────────────── */}
        <div
          className="chips-row"
          style={{
            display: 'flex',
            gap: '10px',
            justifyContent: 'center',
            flexWrap: 'wrap',
            marginBottom: '60px',
            animation: 'fadeUp 0.5s ease 0.14s both',
          }}
        >
          {quickChips.map(chip => (
            <Link key={chip.href} href={chip.href} className="quick-chip">
              <span>{chip.icon}</span>
              <span>{chip.label}</span>
            </Link>
          ))}
        </div>

        {/* ── Divider + section label ───────────────── */}
        <div style={{
          maxWidth: '880px',
          margin: '0 auto',
          borderTop: '1px solid var(--line)',
          paddingTop: '28px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          animation: 'fadeUp 0.5s ease 0.2s both',
        }}>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
            color: 'var(--muted)',
          }}>
            Resumen
          </span>
          <div style={{ flex: 1, height: '1px', background: 'var(--line-faint)' }} />
        </div>

        {/* ── Secondary cards ───────────────────────── */}
        <div style={{
          maxWidth: '880px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '16px',
          animation: 'fadeUp 0.5s ease 0.22s both',
        }}>

          {/* Card — Últimos movimientos */}
          <div className="sec-card" style={{ borderLeftColor: 'var(--accent)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                color: 'var(--accent)',
              }}>
                Últimos movimientos
              </div>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="var(--muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}>
                <circle cx="6.5" cy="6.5" r="4.5" /><path d="M10 10l4 4" />
              </svg>
            </div>

            {movimientos.length === 0 ? (
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--muted)', lineHeight: 1.5, marginBottom: '16px' }}>
                Sin movimientos recientes. El sistema consulta automáticamente 3 veces al día.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '14px' }}>
                {movimientos.slice(0, 4).map((m, i) => (
                  <div
                    key={m.id}
                    className="mov-row"
                    style={{ animation: `fadeUp 0.3s ease ${0.25 + i * 0.05}s both` }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '3px' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--ink)', fontWeight: 600 }}>
                        {m.numero_titulo}
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap', marginLeft: '8px' }}>
                        {tiempoRelativo(m.detectado_en)}
                      </span>
                    </div>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--muted)', marginBottom: '5px' }}>
                      {m.nombre_cliente}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                      <EstadoBadgeSmall estado={m.estado_anterior} />
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M5 12h14M13 6l6 6-6 6" />
                      </svg>
                      <EstadoBadgeSmall estado={m.estado_nuevo} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Link href="/dashboard/siguelo" className="cta-link" style={{
              fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase',
              letterSpacing: '0.1em', color: 'var(--ink)', textDecoration: 'none',
            }}>
              Ver todos los títulos →
            </Link>
          </div>

          {/* Card — Vencimientos */}
          <div className="sec-card" style={{ borderLeftColor: plazosVencidos > 0 ? '#dc2626' : 'var(--accent)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
              <div>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase',
                  letterSpacing: '0.12em', color: plazosVencidos > 0 ? '#dc2626' : 'var(--accent)',
                }}>
                  Vencimientos próximos
                </div>
                {plazosVencidos > 0 && (
                  <div style={{
                    marginTop: '6px', display: 'inline-flex', alignItems: 'center', gap: '5px',
                    padding: '3px 8px', background: 'rgba(220,38,38,0.08)',
                    border: '1px solid rgba(220,38,38,0.2)',
                    fontFamily: 'var(--font-mono)', fontSize: '9px',
                    textTransform: 'uppercase', color: '#dc2626',
                  }}>
                    ⚠ {plazosVencidos} vencido{plazosVencidos !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="var(--muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6, flexShrink: 0 }}>
                <rect x="1.5" y="2.5" width="13" height="12" rx="1" /><path d="M1.5 6.5h13M5 1v3M11 1v3" />
              </svg>
            </div>

            {plazosProximos.length === 0 ? (
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--muted)', marginBottom: '16px' }}>
                Sin vencimientos próximos.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '14px' }}>
                {plazosProximos.map(p => {
                  const days = daysUntil(p.fecha_vencimiento)
                  const urgent = days <= 3
                  return (
                    <div key={p.id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                      padding: '8px 10px',
                      background: urgent ? 'rgba(220,38,38,0.04)' : 'var(--paper)',
                      border: `1px solid ${urgent ? 'rgba(220,38,38,0.12)' : 'var(--line-faint)'}`,
                    }}>
                      <div>
                        <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--ink)', marginBottom: '2px' }}>
                          {p.descripcion}
                        </div>
                        {p.alias && (
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            {p.alias}
                          </div>
                        )}
                      </div>
                      <div style={{
                        fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase',
                        letterSpacing: '0.06em', color: urgent ? '#dc2626' : 'var(--muted)',
                        whiteSpace: 'nowrap', marginLeft: '10px',
                      }}>
                        {days === 0 ? 'Hoy' : days === 1 ? 'Mañana' : `${days}d`}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <Link href="/dashboard/agenda" className="cta-link" style={{
              fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase',
              letterSpacing: '0.1em', color: 'var(--ink)', textDecoration: 'none',
            }}>
              Ver agenda →
            </Link>
          </div>

        </div>
      </div>
    </>
  )
}
