'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AnimatedBackground from '@/components/AnimatedBackground';

/** Misma caja para «arthur» y «Empieza Ahora»: ceñida al tamaño del logo. */
const LOGO_BOX = {
  width: 'min(82vw, 300px)',
  height: '88px',
  boxSizing: 'border-box' as const,
};

export default function LandingPage() {
  const router = useRouter();
  const [hoverLogo, setHoverLogo] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('arthur_auth')) {
      router.replace('/select');
    }
  }, [router]);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        minHeight: '100vh',
        overflow: 'hidden',
        background: '#000000',
      }}
    >
      <AnimatedBackground />

      <div
        style={{
          position: 'relative',
          zIndex: 2,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 'clamp(32px, 6vw, 64px)',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <button
            type="button"
            onClick={() => router.push('/login')}
            onMouseEnter={() => setHoverLogo(true)}
            onMouseLeave={() => setHoverLogo(false)}
            aria-label={hoverLogo ? 'Empieza ahora' : 'arthur'}
            style={{
              ...LOGO_BOX,
              position: 'relative',
              background: 'transparent',
              border: hoverLogo ? '1px solid rgba(255, 255, 255, 0.92)' : '1px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 10px',
              transition: 'border-color 0.2s ease',
            }}
          >
            <span
              style={{
                fontFamily: hoverLogo
                  ? 'var(--font-body), Inter, system-ui, sans-serif'
                  : 'var(--font-display), Georgia, serif',
                fontSize: hoverLogo
                  ? 'clamp(0.8rem, 2.05vw, 0.95rem)'
                  : 'clamp(2.75rem, 7vw, 3.85rem)',
                fontWeight: hoverLogo ? 600 : 500,
                fontStyle: hoverLogo ? 'normal' : 'italic',
                color: '#ffffff',
                letterSpacing: hoverLogo ? '0.06em' : '-0.02em',
                lineHeight: 1.05,
                whiteSpace: 'nowrap',
              }}
            >
              {hoverLogo ? 'Empieza Ahora' : 'arthur'}
            </span>
          </button>

          <div
            style={{
              width: 'min(180px, 42vw)',
              height: '1px',
              marginTop: '10px',
              background: 'linear-gradient(90deg, transparent, rgba(194, 164, 109, 0.55), transparent)',
            }}
          />
        </div>

        <p
          style={{
            flexShrink: 0,
            paddingBottom: '12px',
            paddingLeft: 'clamp(16px, 4vw, 32px)',
            paddingRight: 'clamp(16px, 4vw, 32px)',
            fontFamily: 'var(--font-display), Georgia, serif',
            fontSize: 'clamp(12px, 1.65vw, 15px)',
            fontStyle: 'italic',
            fontWeight: 500,
            letterSpacing: '0.04em',
            color: '#c2a46d',
            textAlign: 'center',
            maxWidth: 'min(36em, 92vw)',
            marginLeft: 'auto',
            marginRight: 'auto',
            lineHeight: 1.45,
          }}
        >
          Céntrate en lo que verdaderamente importa
        </p>
      </div>
    </div>
  );
}
