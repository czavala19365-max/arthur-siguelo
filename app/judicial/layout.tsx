'use client';

import JudicialSidebar from '@/components/JudicialSidebar';

export default function JudicialLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="workspace-light judicial-layout" style={{ display: 'flex', height: '100vh', background: 'var(--paper)', color: 'var(--ink)', overflow: 'hidden' }}>
      <JudicialSidebar />
      <main className="arthur-main" style={{ flex: 1, height: '100vh', overflow: 'auto', background: 'var(--paper)', color: 'var(--ink)' }}>
        {children}
      </main>
    </div>
  );
}
