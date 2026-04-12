'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const IconGrid = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="1" width="6" height="6" rx="0.5" />
    <rect x="9" y="1" width="6" height="6" rx="0.5" />
    <rect x="1" y="9" width="6" height="6" rx="0.5" />
    <rect x="9" y="9" width="6" height="6" rx="0.5" />
  </svg>
);

const IconCalendar = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1.5" y="2.5" width="13" height="12" rx="1" />
    <path d="M1.5 6.5h13" />
    <path d="M5 1v3M11 1v3" />
  </svg>
);

const IconBell = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 1.5a4.5 4.5 0 0 0-4.5 4.5v3l-1 1.5h11l-1-1.5V6A4.5 4.5 0 0 0 8 1.5z" />
    <path d="M6.5 13a1.5 1.5 0 0 0 3 0" />
  </svg>
);

const IconChat = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 2.5h12a.5.5 0 0 1 .5.5v8a.5.5 0 0 1-.5.5H5L2 14V3a.5.5 0 0 1 .5-.5z" />
    <path d="M5 6h6M5 8.5h4" />
  </svg>
);

export default function JudicialSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try {
      const auth = JSON.parse(localStorage.getItem('arthur_auth') || '{}');
      if (auth.email) queueMicrotask(() => setUserEmail(auth.email));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const links = [
    { href: '/judicial', label: 'Mis Procesos', Icon: IconGrid },
    { href: '/judicial/agenda', label: 'Agenda', Icon: IconCalendar },
    { href: '/judicial/alertas', label: 'Alertas', Icon: IconBell },
    { href: '/judicial/chat', label: 'Chat IA', Icon: IconChat },
  ];

  const isActive = (href: string) => (href === '/judicial' ? pathname === '/judicial' : pathname.startsWith(href));

  return (
    <>
      <style>{`
        .arthur-sidebar {
          transform: none;
          transition: transform 200ms ease;
        }
        .arthur-hamburger {
          display: none;
        }
        .arthur-overlay {
          display: none;
        }
        .arthur-main {
          margin-left: 260px;
        }
        .arthur-sidebar-close-mobile {
          display: none;
        }
        @media (max-width: 767px) {
          .arthur-sidebar {
            transform: translateX(-260px);
            box-shadow: none !important;
          }
          .arthur-sidebar.is-open {
            transform: translateX(0);
            box-shadow: 8px 0 32px rgba(0,0,0,0.35) !important;
          }
          .arthur-hamburger {
            display: flex;
          }
          .arthur-overlay.is-open {
            display: block;
          }
          .arthur-main {
            margin-left: 0 !important;
          }
          .arthur-sidebar-close-mobile {
            display: flex;
          }
        }
      `}</style>

      <button
        type="button"
        className="arthur-hamburger"
        onClick={() => setMobileOpen(v => !v)}
        aria-label="Abrir menú"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: 400,
          width: '44px',
          height: '44px',
          backgroundColor: '#0a0a0a',
          border: '1px solid #2a2a2a',
          borderRadius: 0,
          cursor: 'pointer',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#c9a84c',
          flexShrink: 0,
          padding: 0,
        }}
      >
        <span style={{ fontSize: '20px', lineHeight: 1 }} aria-hidden>☰</span>
      </button>

      <div
        className={`arthur-overlay${mobileOpen ? ' is-open' : ''}`}
        onClick={() => setMobileOpen(false)}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 250,
          background: 'rgba(0,0,0,0.6)',
        }}
      />

      <aside
        className={`arthur-sidebar${mobileOpen ? ' is-open' : ''}`}
        style={{
          width: '260px',
          minWidth: '260px',
          height: '100vh',
          backgroundColor: 'var(--sidebar-bg)',
          borderRight: '1px solid var(--sidebar-edge)',
          boxShadow: 'var(--sidebar-shadow)',
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
        <button
          type="button"
          className="arthur-sidebar-close-mobile"
          onClick={() => setMobileOpen(false)}
          aria-label="Cerrar menú"
          style={{
            position: 'absolute',
            top: '20px',
            right: '12px',
            zIndex: 2,
            width: '36px',
            height: '36px',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: 'none',
            color: '#c9a84c',
            fontSize: '24px',
            lineHeight: 1,
            cursor: 'pointer',
            padding: 0,
          }}
        >
          ×
        </button>

        <div style={{ padding: '32px 28px 0' }}>
          <Link href="/select" style={{ textDecoration: 'none' }} onClick={() => setMobileOpen(false)}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '36px', color: 'var(--sidebar-text)', fontStyle: 'italic', lineHeight: 1 }}>
              arthur
            </div>
          </Link>
          <div style={{ width: '60px', height: '2px', background: 'rgba(194, 164, 109, 0.4)', marginTop: '16px' }} />
          <div
            style={{
              marginTop: '10px',
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              color: 'var(--sidebar-module-label)',
            }}
          >
            judicial
          </div>
        </div>

        <nav style={{ marginTop: '36px', padding: '0 16px', flex: 1 }}>
          {links.map(link => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '10px 16px',
                fontFamily: 'var(--font-body)',
                fontSize: '13px',
                color: isActive(link.href) ? 'var(--sidebar-text)' : 'var(--sidebar-muted)',
                background: isActive(link.href) ? 'var(--sidebar-active-bg)' : 'transparent',
                borderRadius: '4px',
                marginBottom: '4px',
                textDecoration: 'none',
                transition: 'color 0.15s, background 0.15s',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <link.Icon />
                {link.label}
              </span>
            </Link>
          ))}
        </nav>

        <div style={{ padding: '0 28px 24px', position: 'absolute', bottom: 0, left: 0, right: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'var(--sidebar-avatar-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                color: 'var(--sidebar-text)',
                flexShrink: 0,
              }}
            >
              {userEmail ? userEmail.charAt(0).toUpperCase() : 'U'}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '12px',
                color: 'var(--sidebar-text)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {userEmail || 'Usuario'}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem('arthur_auth');
              router.push('/login');
            }}
            style={{
              width: '100%',
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              padding: '8px',
              background: 'var(--sidebar-btn-bg)',
              border: '1px solid var(--sidebar-btn-border)',
              color: 'var(--sidebar-btn-fg)',
              cursor: 'pointer',
              borderRadius: '2px',
            }}
            onMouseOver={e => {
              e.currentTarget.style.background = 'var(--sidebar-hover-bg)';
              e.currentTarget.style.color = 'var(--sidebar-text)';
            }}
            onMouseOut={e => {
              e.currentTarget.style.background = 'var(--sidebar-btn-bg)';
              e.currentTarget.style.color = 'var(--sidebar-btn-fg)';
            }}
          >
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  );
}
