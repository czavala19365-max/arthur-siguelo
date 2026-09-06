'use client'

import type { CSSProperties } from 'react'
import { legalStyles } from '@/lib/legal/styles'

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
        ...legalStyles.tag,
        borderRadius: 0,
      }}
    >
      {message}
    </div>
  )
}

export const pathCardStyle = (selected: boolean): CSSProperties => ({
  background: 'var(--surface)',
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
  ...legalStyles.tag,
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
  color: 'var(--muted)',
  lineHeight: 1.6,
  marginBottom: 20,
}

export const pathCardAction: CSSProperties = {
  ...legalStyles.tag,
  color: 'rgba(201, 168, 76, 0.75)',
}
