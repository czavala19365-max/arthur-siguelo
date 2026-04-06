'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'

const ChatModal = dynamic(() => import('./ChatModal'), { ssr: false })

const quickChips = [
  { icon: '📋', label: 'Seguimiento de Títulos', href: '/dashboard/siguelo' },
  { icon: '📅', label: 'Agenda de Plazos',        href: '/dashboard/agenda' },
  { icon: '⚖️', label: 'Consulta Legal',           href: '' },
]

export default function HomeDashboard() {
  const [query, setQuery]     = useState('')
  const [visible, setVisible] = useState(false)
  const [modal, setModal]     = useState<string | null>(null) // null = closed, string = initial query
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { requestAnimationFrame(() => setVisible(true)) }, [])

  function openChat(q?: string) {
    setModal(q ?? query.trim())
    setQuery('')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (query.trim()) openChat()
    }
  }

  const active = !!query.trim()

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .qbox:focus-within {
          border-color: rgba(194,164,109,0.55) !important;
          box-shadow: 0 4px 32px rgba(194,164,109,0.08), 0 2px 20px rgba(0,0,0,0.05) !important;
        }
        .quick-chip {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 9px 18px;
          background: var(--surface); border: 1px solid var(--line);
          border-radius: 100px;
          font-family: var(--font-body); font-size: 13px; font-weight: 500;
          color: var(--ink); text-decoration: none;
          transition: background 0.15s, border-color 0.15s;
          white-space: nowrap; cursor: pointer;
        }
        .quick-chip:hover {
          background: rgba(194,164,109,0.1);
          border-color: rgba(194,164,109,0.4);
        }
        .send-btn { transition: background 0.2s, color 0.2s, opacity 0.2s, border-color 0.2s; }
        .send-btn:hover:not(:disabled) { opacity: 0.82; }
        @media (max-width: 640px) {
          .home-wrap { padding: 40px 20px 60px !important; }
        }
      `}</style>

      {/* Modal */}
      {modal !== null && (
        <ChatModal
          initialQuery={modal}
          onClose={() => setModal(null)}
        />
      )}

      <div
        className="home-wrap"
        style={{
          padding: '64px 48px 80px',
          background: 'var(--paper)',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.4s ease',
        }}
      >
        {/* Label */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          padding: '5px 14px',
          background: 'rgba(194,164,109,0.1)',
          border: '1px solid rgba(194,164,109,0.3)',
          borderRadius: '100px',
          fontFamily: 'var(--font-mono)', fontSize: '10px',
          textTransform: 'uppercase', letterSpacing: '0.12em',
          color: 'var(--accent)',
          marginBottom: '22px',
          animation: 'fadeUp 0.45s ease forwards',
        }}>
          Arthur AI · Registros Públicos
        </div>

        {/* Headline */}
        <h1 style={{
          fontFamily: 'var(--font-body)',
          fontSize: 'clamp(28px, 4vw, 46px)',
          fontWeight: 600,
          color: 'var(--ink)',
          lineHeight: 1.15,
          letterSpacing: '-0.01em',
          textAlign: 'center',
          marginBottom: '14px',
          animation: 'fadeUp 0.45s ease 0.04s both',
        }}>
          Todo SUNARP, en un solo lugar.
        </h1>

        <p style={{
          fontFamily: 'var(--font-body)',
          fontSize: '16px',
          color: 'var(--muted)',
          lineHeight: 1.6,
          textAlign: 'center',
          maxWidth: '560px',
          margin: '0 0 36px',
          animation: 'fadeUp 0.45s ease 0.08s both',
        }}>
          Consulta, monitorea y gestiona el Registro Público con inteligencia artificial.
        </p>

        {/* Query box */}
        <div style={{
          width: '100%', maxWidth: '760px',
          marginBottom: '14px',
          animation: 'fadeUp 0.45s ease 0.12s both',
        }}>
          <div
            className="qbox"
            style={{
              border: '1.5px solid var(--line)', borderRadius: '16px',
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
              placeholder="Escribe una pregunta o dime qué necesitas hacer..."
              rows={3}
              style={{
                width: '100%', padding: '20px 24px 10px',
                border: 'none', outline: 'none', background: 'transparent',
                fontFamily: 'var(--font-body)', fontSize: '15px',
                color: 'var(--ink)', lineHeight: 1.65,
                resize: 'none', boxSizing: 'border-box', display: 'block',
              }}
            />
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 16px 14px',
              borderTop: '1px solid var(--line-faint)',
            }}>
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: '10px',
                color: 'var(--muted)', textTransform: 'uppercase',
                letterSpacing: '0.08em', opacity: 0.65,
              }}>
                Enter para enviar
              </span>
              <button
                className="send-btn"
                onClick={() => openChat()}
                disabled={!active}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '10px 22px',
                  background: active ? 'var(--accent)' : 'var(--surface)',
                  color: active ? '#141414' : 'var(--muted)',
                  border: `1px solid ${active ? 'var(--accent)' : 'var(--line)'}`,
                  borderRadius: '8px',
                  fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600,
                  cursor: active ? 'pointer' : 'default',
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
            fontFamily: 'var(--font-body)', fontSize: '11.5px',
            color: 'var(--muted)', textAlign: 'center',
            marginTop: '11px', opacity: 0.6,
          }}>
            Arthur AI puede cometer errores. Verifica la información importante.
          </p>
        </div>

        {/* Quick chips */}
        <div style={{
          display: 'flex', gap: '10px', justifyContent: 'center',
          flexWrap: 'wrap',
          animation: 'fadeUp 0.45s ease 0.18s both',
        }}>
          {quickChips.map(c =>
            c.href
              ? <Link key={c.label} href={c.href} className="quick-chip"><span>{c.icon}</span><span>{c.label}</span></Link>
              : <button key={c.label} className="quick-chip" onClick={() => openChat(c.label)} style={{ border: 'none' }}><span>{c.icon}</span><span>{c.label}</span></button>
          )}
        </div>
      </div>
    </>
  )
}
