'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function JudicialLandingPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/judicial/chat');
  }, [router]);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--paper)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--muted)',
        fontFamily: 'var(--font-mono)',
        fontSize: '11px',
        textTransform: 'uppercase',
        letterSpacing: '0.12em',
      }}
    >
      Cargando chat judicial...
    </div>
  );
}




