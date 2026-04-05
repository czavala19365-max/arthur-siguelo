'use client'

import { useEffect, useRef, useState } from 'react'

export type PillData = {
  label: string
  value: number
  color: string
  bg: string
}

export default function MetricsPills({ pills }: { pills: PillData[] }) {
  const [counts, setCounts] = useState<number[]>(() => pills.map(() => 0))
  const [visible, setVisible] = useState(false)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    setVisible(true)
    const targets = pills.map(p => p.value)
    const duration = 500
    const start = performance.now()

    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setCounts(targets.map(v => Math.round(v * eased)))
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <style>{`
        @media (max-width: 640px) {
          .metrics-pills { gap: 6px !important; }
          .metrics-pill { flex: 1 1 calc(50% - 3px) !important; }
        }
      `}</style>
      <div
        className="metrics-pills"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(6px)',
          transition: 'opacity 0.4s ease, transform 0.4s ease',
        }}
      >
        {pills.map((pill, i) => (
          <div
            key={pill.label}
            className="metrics-pill"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 16px 8px 12px',
              background: pill.bg,
              borderLeft: `2px solid ${pill.color}`,
            }}
          >
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: '22px',
              fontWeight: 600,
              color: pill.color,
              lineHeight: 1,
              minWidth: '1ch',
            }}>
              {counts[i]}
            </span>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: 'var(--muted)',
            }}>
              {pill.label}
            </span>
          </div>
        ))}
      </div>
    </>
  )
}
