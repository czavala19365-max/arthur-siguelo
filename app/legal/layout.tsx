'use client'

import LegalSidebar from '@/components/legal/LegalSidebar'

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="workspace-light judicial-layout"
      style={{ display: 'flex', height: '100vh', background: 'var(--paper)', color: 'var(--ink)', overflow: 'hidden' }}
    >
      <LegalSidebar />
      <main className="arthur-main" style={{ flex: 1, height: '100vh', overflow: 'auto', background: 'var(--paper)' }}>
        {children}
      </main>
    </div>
  )
}
