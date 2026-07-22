'use client'

import Link from 'next/link'
import { legalStyles } from '@/lib/legal/styles'

const tools = [
  {
    href: '/legal/drafter',
    tag: 'Contratos — Perú',
    title: 'Redactor de contratos',
    desc: 'Genera contratos peruanos (mutuo, compraventa, garantías, arrendamiento, poderes, fideicomiso y más) con IA y formato de firma.',
  },
  {
    href: '/legal/actas',
    tag: 'Derecho societario — Perú',
    title: 'Actas JGA',
    desc: 'Motor profesional de actas JGA: 17 tipos de operación, precedentes, DOCX e IA.',
  },
  {
    href: '/legal/redline',
    tag: 'Revisión documental',
    title: 'Comparador redline',
    desc: 'Compara dos versiones de un documento con cambios resaltados y análisis IA.',
  },
  {
    href: '/legal/checklist',
    tag: 'Transacciones M&A',
    title: 'Checklist de cierre',
    desc: 'Genera y edita checklists de cierre para operaciones corporativas.',
  },
]

export default function LegalHubPage() {
  return (
    <div style={{ ...legalStyles.page, paddingTop: 48 }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--accent)', marginBottom: 8 }}>
        Módulo legal IA
      </div>
      <h1 style={legalStyles.h1}>Herramientas legales</h1>
      <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 32, maxWidth: 560 }}>
        Suite de redacción, actas societarias, comparación documental y checklists de cierre.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
        {tools.map(t => (
          <Link
            key={t.href}
            href={t.href}
            style={{
              textDecoration: 'none',
              color: 'inherit',
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              padding: 28,
            }}
          >
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 12 }}>
              {t.tag}
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, marginBottom: 10 }}>{t.title}</div>
            <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>{t.desc}</p>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)', marginTop: 20, textTransform: 'uppercase' }}>
              Abrir →
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
