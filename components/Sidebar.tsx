'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface SidebarProps {
  observadosCount?: number;
}

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

const IconHome = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 7L8 2l6 5" />
    <path d="M4 7v7h8V7" />
    <path d="M6 14v-4h4v4" />
  </svg>
);

const IconSiguelo = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="6.5" cy="6.5" r="4.5" />
    <path d="M10 10l4 4" />
  </svg>
);

const IconArchive = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="2" width="14" height="3" rx="0.5" />
    <path d="M2.5 5v8.5a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V5" />
    <path d="M6 8h4" />
  </svg>
);

const IconTrash = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 4h12M5 4V2.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 .5.5V4" />
    <path d="M3.5 4l.5 10a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l.5-10" />
    <path d="M6.5 7v5M9.5 7v5" />
  </svg>
);

export default function Sidebar({ observadosCount = 0 }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [count, setCount] = useState(observadosCount);
  const [userEmail, setUserEmail] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sigueloOpen, setSigueloOpen] = useState(false);

  // Close sidebar on route change; auto-open siguelo group if on a siguelo path
  useEffect(() => {
    setMobileOpen(false);
    if (pathname.startsWith('/dashboard/siguelo')) setSigueloOpen(true);
  }, [pathname]);

  useEffect(() => {
    fetch('/api/dashboard/stats')
      .then(r => r.json())
      .then(data => setCount(data.observados || 0))
      .catch(() => {});
    try {
      const auth = JSON.parse(localStorage.getItem('arthur_auth') || '{}');
      if (auth.email) queueMicrotask(() => setUserEmail(auth.email));
    } catch { /* ignore */ }
  }, []);

  const links = [
    { href: '/dashboard', label: 'Inicio', hasAlert: false, Icon: IconHome },
    { href: '/dashboard/agenda', label: 'Agenda de Plazos', hasAlert: false, Icon: IconCalendar },
    { href: '/dashboard/alertas', label: 'Alertas', hasAlert: false, Icon: IconBell },
    { href: '/dashboard/chat', label: 'Consulta Legal', hasAlert: false, Icon: IconChat },
  ];

  const sigueloSubLinks = [
    { href: '/dashboard/siguelo', label: 'Títulos Activos', Icon: IconSiguelo },
    { href: '/dashboard/siguelo/archivados', label: 'Archivados', Icon: IconArchive },
    { href: '/dashboard/siguelo/eliminados', label: 'Eliminados', Icon: IconTrash },
  ];

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    if (href === '/dashboard/siguelo') return pathname === '/dashboard/siguelo';
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Responsive CSS — injected once with the sidebar */}
      <style>{`
        .arthur-sidebar {
          transform: none;
          transition: none;
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
        @media (max-width: 767px) {
          .arthur-sidebar {
            transform: translateX(-260px);
            transition: transform 200ms ease;
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
        }
      `}</style>

      {/* Hamburger button — mobile only */}
      <button
        className="arthur-hamburger"
        onClick={() => setMobileOpen(v => !v)}
        aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
        style={{
          position: 'fixed',
          top: '14px',
          left: '14px',
          zIndex: 400,
          width: '38px',
          height: '38px',
          backgroundColor: 'var(--sidebar-bg)',
          border: '1px solid var(--sidebar-edge)',
          borderRadius: '4px',
          cursor: 'pointer',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--sidebar-text)',
          flexShrink: 0,
        }}
      >
        {mobileOpen ? (
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24">
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        )}
      </button>

      {/* Overlay — mobile only, visible when open */}
      <div
        className={`arthur-overlay${mobileOpen ? ' is-open' : ''}`}
        onClick={() => setMobileOpen(false)}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 250,
          background: 'rgba(0,0,0,0.55)',
        }}
      />

      {/* Sidebar */}
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
        {/* Logo */}
        <div style={{ padding: '32px 28px 0' }}>
          <Link href="/select" style={{ textDecoration: 'none' }}>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '36px',
                color: 'var(--sidebar-text)',
                fontStyle: 'italic',
                lineHeight: 1,
                letterSpacing: '0.5px',
              }}
            >
              arthur
            </div>
          </Link>
          <div
            style={{
              width: '60px',
              height: '2px',
              background: 'rgba(194, 164, 109, 0.35)',
              marginTop: '16px',
            }}
          />
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
            registral
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ marginTop: '36px', padding: '0 16px', flex: 1 }}>

          {/* Inicio */}
          {links.slice(0, 1).map(link => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 16px',
                fontFamily: 'var(--font-body)', fontSize: '13px',
                color: isActive(link.href) ? 'var(--sidebar-text)' : 'var(--sidebar-muted)',
                background: isActive(link.href) ? 'var(--sidebar-active-bg)' : 'transparent',
                borderRadius: '4px', marginBottom: '4px',
                transition: 'color 0.15s, background 0.15s',
                textDecoration: 'none',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <link.Icon />
                {link.label}
              </span>
            </Link>
          ))}

          {/* ── Síguelo (desplegable) ───────────────────────────── */}
          <div style={{ marginBottom: '4px' }}>
            {/* Ítem padre — solo expande/colapsa */}
            <button
              onClick={() => setSigueloOpen(v => !v)}
              style={{
                width: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 16px',
                fontFamily: 'var(--font-body)', fontSize: '13px',
                color: pathname.startsWith('/dashboard/siguelo') ? 'var(--sidebar-text)' : 'var(--sidebar-muted)',
                background: pathname.startsWith('/dashboard/siguelo') ? 'var(--sidebar-active-bg)' : 'transparent',
                borderRadius: '4px',
                border: 'none', cursor: 'pointer',
                transition: 'color 0.15s, background 0.15s',
              }}
              onMouseOver={e => { if (!pathname.startsWith('/dashboard/siguelo')) e.currentTarget.style.color = 'var(--sidebar-text)' }}
              onMouseOut={e => { if (!pathname.startsWith('/dashboard/siguelo')) e.currentTarget.style.color = 'var(--sidebar-muted)' }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <IconSiguelo />
                Seguimiento · Síguelo
              </span>
              <svg
                width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"
                viewBox="0 0 24 24"
                style={{
                  transform: sigueloOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s',
                  flexShrink: 0,
                  opacity: 0.5,
                }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Sub-ítems */}
            {sigueloOpen && (
              <div style={{ paddingLeft: '8px', marginTop: '2px' }}>
                {sigueloSubLinks.map(sub => (
                  <Link
                    key={sub.href}
                    href={sub.href}
                    onClick={() => setMobileOpen(false)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '8px 16px 8px 20px',
                      fontFamily: 'var(--font-body)', fontSize: '12px',
                      color: isActive(sub.href) ? 'var(--sidebar-text)' : 'var(--sidebar-muted)',
                      background: isActive(sub.href) ? 'var(--sidebar-active-bg)' : 'transparent',
                      borderRadius: '4px', marginBottom: '2px',
                      transition: 'color 0.15s, background 0.15s',
                      textDecoration: 'none',
                      borderLeft: isActive(sub.href) ? '2px solid var(--accent)' : '2px solid transparent',
                    }}
                  >
                    <sub.Icon />
                    {sub.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Resto de links */}
          {links.slice(1).map(link => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 16px',
                fontFamily: 'var(--font-body)', fontSize: '13px',
                color: isActive(link.href) ? 'var(--sidebar-text)' : 'var(--sidebar-muted)',
                background: isActive(link.href) ? 'var(--sidebar-active-bg)' : 'transparent',
                borderRadius: '4px', marginBottom: '4px',
                transition: 'color 0.15s, background 0.15s',
                textDecoration: 'none',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <link.Icon />
                {link.label}
              </span>
              {link.hasAlert && (
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', display: 'inline-block', flexShrink: 0 }} />
              )}
            </Link>
          ))}
        </nav>

        {/* User section */}
        <div
          style={{
            padding: '0 28px 24px',
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
          }}
        >
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
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '12px',
                  color: 'var(--sidebar-text)',
                  lineHeight: 1.3,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {userEmail || 'Usuario'}
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem('arthur_auth');
              router.push('/');
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
              transition: 'all 0.15s',
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
