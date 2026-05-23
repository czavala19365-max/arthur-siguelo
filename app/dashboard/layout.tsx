'use client';

import Sidebar from '@/components/Sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="workspace-light" style={{ display: 'flex', height: '100vh', background: 'var(--paper)', color: 'var(--ink)', overflow: 'hidden' }}>
      <Sidebar />
      <main
        className="arthur-main"
        style={{
          flex: 1,
          height: '100vh',
          overflow: 'auto',
          background: 'var(--paper)',
          color: 'var(--ink)',
        }}
      >
        {children}
      </main>
    </div>
  );
}
