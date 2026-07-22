'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getAuthClient } from '@/lib/supabase-auth-client'

const links = [
  { href: '/legal', label: 'Inicio' },
  { href: '/legal/drafter', label: 'Redactor de contratos' },
  { href: '/legal/actas', label: 'Actas JGA' },
  { href: '/legal/redline', label: 'Comparador redline' },
  { href: '/legal/checklist', label: 'Checklist de cierre' },
]

export default function LegalSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  const isActive = (href: string) => {
    if (href === '/legal') return pathname === '/legal'
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  return (
    <>
      <button
        type="button"
        className="arthur-hamburger"
        onClick={() => setMobileOpen(v => !v)}
        aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
        style={{
          position: 'fixed',
          top: 12,
          left: 12,
          zIndex: 400,
          width: 44,
          height: 44,
          backgroundColor: 'var(--paper)',
          border: '1px solid var(--line-mid)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--ink)',
        }}
      >
        <span style={{ fontSize: 20 }}>{mobileOpen ? '×' : '☰'}</span>
      </button>

      <div
        className={`arthur-overlay${mobileOpen ? ' is-open' : ''}`}
        onClick={() => setMobileOpen(false)}
        style={{ position: 'fixed', inset: 0, zIndex: 250, background: 'rgba(0,0,0,0.6)' }}
      />

      <aside
        className={`arthur-sidebar${mobileOpen ? ' is-open' : ''}`}
        style={{
          width: 260,
          minWidth: 260,
          height: '100vh',
          backgroundColor: 'var(--sidebar-bg)',
          borderRight: '1px solid var(--sidebar-edge)',
          position: 'fixed',
          left: 0,
          top: 0,
          display: 'flex',
          flexDirection: 'column',
          zIndex: 300,
          color: 'var(--sidebar-text)',
          overflowY: 'auto',
        }}
      >
        <div style={{ padding: '32px 28px 0' }}>
          <Link href="/select" style={{ textDecoration: 'none' }} onClick={() => setMobileOpen(false)}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, color: 'var(--sidebar-text)', fontStyle: 'italic' }}>
              arthur
            </div>
          </Link>
          <div
            style={{
              marginTop: 10,
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              color: 'var(--sidebar-module-label)',
            }}
          >
            herramientas legales
          </div>
        </div>

        <nav style={{ marginTop: 36, padding: '0 16px', flex: 1 }}>
          {links.map(link => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              style={{
                display: 'block',
                padding: '10px 16px',
                marginBottom: 4,
                textDecoration: 'none',
                fontFamily: 'var(--font-body)',
                fontSize: 14,
                color: isActive(link.href) ? 'var(--sidebar-text)' : 'var(--sidebar-muted)',
                background: isActive(link.href) ? 'var(--sidebar-active-bg)' : 'transparent',
                borderLeft: isActive(link.href) ? '2px solid var(--accent)' : '2px solid transparent',
              }}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div style={{ padding: '24px 16px 32px' }}>
          <button
            type="button"
            onClick={async () => {
              await getAuthClient().auth.signOut()
              router.push('/login')
            }}
            style={{
              width: '100%',
              padding: '10px',
              background: 'transparent',
              border: '1px solid var(--sidebar-btn-border)',
              color: 'var(--sidebar-btn-fg)',
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  )
}
