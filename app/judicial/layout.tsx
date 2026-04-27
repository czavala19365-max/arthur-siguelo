'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import JudicialSidebar from '@/components/JudicialSidebar';

export default function JudicialLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const auth = localStorage.getItem('arthur_auth');
    if (!auth) router.replace('/login');
    else queueMicrotask(() => setAuthorized(true));
  }, [router]);

  if (!authorized) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase' }}>
        Verificando acceso...
      </div>
    );
  }

  return (
    <div className="workspace-light" style={{ display: 'flex', height: '100vh', background: 'var(--paper)', color: 'var(--ink)', overflow: 'hidden' }}>
      <JudicialSidebar />
      <main className="arthur-main" style={{ flex: 1, height: '100vh', overflow: 'auto', background: 'var(--paper)', color: 'var(--ink)' }}>
        {children}
      </main>
    </div>
  );
}
