'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AnimatedBackground from '@/components/AnimatedBackground';
import { getAuthClient } from '@/lib/supabase-auth-client';

const gold = '194, 164, 109';

type AdminViewingUser = {
  id: string;
  email: string;
  full_name: string | null;
};

export default function SelectModulePage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [viewingUser, setViewingUser] = useState<AdminViewingUser | null>(null);

  useEffect(() => {
    void (async () => {
      const {
        data: { user },
      } = await getAuthClient().auth.getUser();
      if (!user) return;

      const authClient = getAuthClient();
      const { data: profile } = await authClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role === 'admin') {
        setIsAdmin(true);
        return;
      }

      const res = await fetch('/api/admin/users');
      if (res.ok) setIsAdmin(true);
    })();
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const raw = localStorage.getItem('admin_viewing_user');
        if (!raw) return;
        const parsed = JSON.parse(raw) as AdminViewingUser;
        const res = await fetch('/api/admin/users');
        if (res.ok) {
          setViewingUser(parsed);
        } else {
          localStorage.removeItem('admin_viewing_user');
        }
      } catch {
        localStorage.removeItem('admin_viewing_user');
      }
    })();
  }, []);

  const cardBase: React.CSSProperties = {
    width: '320px',
    cursor: 'pointer',
    background: 'rgba(255,255,255,0.04)',
    border: `1px solid rgba(${gold}, 0.28)`,
    padding: '40px 36px 48px',
    borderRadius: 0,
    transition: 'all 0.2s ease',
    boxShadow: '0 0 0 1px rgba(0,0,0,0.2) inset',
  };

  const cardHoverIn = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.background = 'rgba(194, 164, 109, 0.1)';
    e.currentTarget.style.borderColor = `rgba(${gold}, 0.55)`;
    e.currentTarget.style.transform = 'translateY(-2px)';
    e.currentTarget.style.boxShadow = `0 12px 40px rgba(0,0,0,0.35), 0 0 0 1px rgba(${gold}, 0.2) inset`;
  };

  const cardHoverOut = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
    e.currentTarget.style.borderColor = `rgba(${gold}, 0.28)`;
    e.currentTarget.style.transform = 'translateY(0)';
    e.currentTarget.style.boxShadow = '0 0 0 1px rgba(0,0,0,0.2) inset';
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', overflowX: 'hidden', overflowY: 'auto', background: '#0b0b0b' }}>
      {viewingUser && (
        <div
          style={{
            position: 'relative',
            zIndex: 3,
            background: 'rgba(201,168,76,0.15)',
            borderBottom: '1px solid rgba(201,168,76,0.3)',
            padding: '12px 24px',
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            color: '#c9a84c',
            textAlign: 'center',
          }}
        >
          Estás viendo como: {viewingUser.full_name || viewingUser.email} ({viewingUser.email}){' '}
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem('admin_viewing_user');
              setViewingUser(null);
              router.push('/admin');
            }}
            style={{
              background: 'transparent',
              border: 'none',
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              color: '#c9a84c',
              cursor: 'pointer',
              textDecoration: 'underline',
              padding: 0,
              marginLeft: '8px',
            }}
          >
            Volver a admin →
          </button>
        </div>
      )}

      {isAdmin && (
        <button
          type="button"
          onClick={() => router.push('/admin')}
          style={{
            position: 'fixed',
            top: viewingUser ? '52px' : '20px',
            right: '20px',
            zIndex: 4,
            padding: '8px 14px',
            cursor: 'pointer',
            background: 'rgba(72, 92, 128, 0.35)',
            border: '1px solid rgba(130, 160, 200, 0.4)',
            borderRadius: 0,
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            letterSpacing: '0.08em',
            color: 'rgba(200, 215, 235, 0.9)',
            transition: 'all 0.15s ease',
          }}
          onMouseOver={e => {
            e.currentTarget.style.background = 'rgba(90, 115, 155, 0.5)';
            e.currentTarget.style.color = '#fff';
          }}
          onMouseOut={e => {
            e.currentTarget.style.background = 'rgba(72, 92, 128, 0.35)';
            e.currentTarget.style.color = 'rgba(200, 215, 235, 0.9)';
          }}
        >
          Administrador
        </button>
      )}

      <AnimatedBackground />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(11,11,11,0.72) 100%)',
          zIndex: 1,
        }}
      />

      <div
        style={{
          position: 'relative',
          zIndex: 2,
          minHeight: viewingUser ? 'calc(100vh - 44px)' : '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '24px',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '28px',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
            color: '#ffffff',
          }}
        >
          arthur
        </div>
        <div
          style={{
            width: '40px',
            height: '1px',
            marginTop: '12px',
            background: `linear-gradient(90deg, transparent, rgba(${gold}, 0.65), transparent)`,
          }}
        />

        <div
          style={{
            marginTop: '48px',
            marginBottom: '40px',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            color: 'rgba(248,248,248,0.48)',
          }}
        >
          ¿Qué deseas gestionar hoy?
        </div>

        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <div
            style={cardBase}
            onClick={() => router.push('/dashboard')}
            onMouseOver={cardHoverIn}
            onMouseOut={cardHoverOut}
          >
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                color: `rgba(${gold}, 0.75)`,
                marginBottom: '20px',
              }}
            >
              Registros públicos
            </div>
            <div
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '42px',
                fontWeight: 600,
                letterSpacing: '-0.02em',
                color: '#ffffff',
                lineHeight: 1.3,
              }}
            >
              registral
            </div>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '14px',
                color: 'rgba(248,248,248,0.62)',
                lineHeight: 1.6,
                marginTop: '16px',
              }}
            >
              Seguimiento de títulos y trámites ante SUNARP. Alertas automáticas por WhatsApp y email.
            </p>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                textTransform: 'uppercase',
                color: `rgba(${gold}, 0.65)`,
                marginTop: '32px',
              }}
            >
              Ingresar →
            </div>
          </div>

          <div
            style={cardBase}
            onClick={() => router.push('/judicial')}
            onMouseOver={cardHoverIn}
            onMouseOut={cardHoverOut}
          >
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                color: `rgba(${gold}, 0.75)`,
                marginBottom: '20px',
              }}
            >
              Poder Judicial · CEJ
            </div>
            <div
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '42px',
                fontWeight: 600,
                letterSpacing: '-0.02em',
                color: '#ffffff',
                lineHeight: 1.3,
              }}
            >
              judicial
            </div>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '14px',
                color: 'rgba(248,248,248,0.62)',
                lineHeight: 1.6,
                marginTop: '16px',
              }}
            >
              Seguimiento de procesos judiciales ante el CEJ. Alertas de movimientos, plazos y resoluciones.
            </p>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                textTransform: 'uppercase',
                color: `rgba(${gold}, 0.65)`,
                marginTop: '32px',
              }}
            >
              Ingresar →
            </div>
          </div>

          <div
            style={cardBase}
            onClick={() => router.push('/legal')}
            onMouseOver={cardHoverIn}
            onMouseOut={cardHoverOut}
          >
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                color: `rgba(${gold}, 0.75)`,
                marginBottom: '20px',
              }}
            >
              Redacción documental
            </div>
            <div
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '42px',
                fontWeight: 600,
                letterSpacing: '-0.02em',
                color: '#ffffff',
                lineHeight: 1.3,
              }}
            >
              legal
            </div>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '14px',
                color: 'rgba(248,248,248,0.62)',
                lineHeight: 1.6,
                marginTop: '16px',
              }}
            >
              Contratos internacionales, actas JGA, redline y checklists de cierre con IA.
            </p>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                textTransform: 'uppercase',
                color: `rgba(${gold}, 0.65)`,
                marginTop: '32px',
              }}
            >
              Ingresar →
            </div>
          </div>

        </div>

        <button
          type="button"
          onClick={async () => {
            await getAuthClient().auth.signOut();
            router.push('/login');
          }}
          style={{
            marginTop: '44px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            textTransform: 'uppercase',
            color: 'rgba(248,248,248,0.28)',
            letterSpacing: '0.12em',
          }}
          onMouseOver={e => {
            e.currentTarget.style.color = `rgba(${gold}, 0.85)`;
          }}
          onMouseOut={e => {
            e.currentTarget.style.color = 'rgba(248,248,248,0.28)';
          }}
        >
          ← Cerrar sesión
        </button>
      </div>
    </div>
  );
}
