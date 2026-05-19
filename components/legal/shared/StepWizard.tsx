'use client'

import { legalStyles } from '@/lib/legal/styles'

interface StepWizardProps {
  steps: string[]
  current: number
  children: React.ReactNode
  onBack?: () => void
  onNext?: () => void
  nextLabel?: string
  backLabel?: string
  nextDisabled?: boolean
  showNav?: boolean
}

export default function StepWizard({
  steps,
  current,
  children,
  onBack,
  onNext,
  nextLabel = 'Siguiente',
  backLabel = 'Atrás',
  nextDisabled = false,
  showNav = true,
}: StepWizardProps) {
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 28, flexWrap: 'wrap' }}>
        {steps.map((label, i) => (
          <div
            key={label}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              padding: '8px 14px',
              border: `1px solid ${i === current ? 'var(--accent)' : 'var(--line)'}`,
              background: i === current ? 'rgba(194,164,109,0.12)' : 'transparent',
              color: i === current ? 'var(--ink)' : 'var(--muted)',
            }}
          >
            {i + 1}. {label}
          </div>
        ))}
      </div>
      {children}
      {showNav && (
        <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
          {current > 0 && onBack && (
            <button type="button" style={legalStyles.btnSecondary} onClick={onBack}>
              {backLabel}
            </button>
          )}
          {onNext && (
            <button type="button" style={{ ...legalStyles.btnPrimary, opacity: nextDisabled ? 0.5 : 1 }} disabled={nextDisabled} onClick={onNext}>
              {nextLabel}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
