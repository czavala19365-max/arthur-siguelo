'use client'

import type { CSSProperties } from 'react'

export function JgaToast({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 500,
        background: '#0a0a0a',
        border: '1px solid rgba(201, 168, 76, 0.3)',
        color: '#c9a84c',
        padding: '12px 20px',
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        borderRadius: 0,
      }}
    >
      {message}
    </div>
  )
}

export const pathCardStyle = (selected: boolean): CSSProperties => ({
  background: '#0a0a0a',
  border: `1px solid rgba(201, 168, 76, ${selected ? 0.3 : 0.15})`,
  padding: 24,
  cursor: 'pointer',
  borderRadius: 0,
  flex: 1,
  minWidth: 220,
  transition: 'border-color 0.15s',
  color: '#f5f5f5',
})

export const pathCardLabel: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  color: '#c9a84c',
  marginBottom: 12,
}

export const pathCardTitle: CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: 16,
  fontWeight: 600,
  marginBottom: 12,
}

export const pathCardDesc: CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: 13,
  color: 'rgba(245,245,245,0.62)',
  lineHeight: 1.6,
  marginBottom: 20,
}

export const pathCardAction: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  textTransform: 'uppercase',
  color: 'rgba(201, 168, 76, 0.75)',
  letterSpacing: '0.08em',
}
