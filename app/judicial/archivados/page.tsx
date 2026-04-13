'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { formatPartesDisplay } from '@/lib/format-partes-judicial';

interface Caso {
  id: number;
  tipo_proceso: string | null;
  alias: string | null;
  cliente: string | null;
  partes: string | null;
  numero_expediente: string;
  archived_at: string | null;
}

function asList(raw: unknown): Caso[] {
  if (raw == null || !Array.isArray(raw)) return [];
  return raw.filter(
    (item): item is Caso =>
      typeof item === 'object' && item !== null && 'id' in item && typeof (item as Caso).id === 'number'
  );
}

export default function JudicialArchivadosPage() {
  const [casos, setCasos] = useState<Caso[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/casos/archivados');
      const raw: unknown = r.ok ? await r.json() : null;
      setCasos(asList(raw));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function restaurar(id: number) {
    const r = await fetch(`/api/casos/${id}/restore`, { method: 'POST' });
    if (!r.ok) {
      alert('No se pudo restaurar.');
      return;
    }
    await load();
  }

  async function aPapelera(id: number) {
    if (!confirm('¿Mover a la papelera? Se eliminará del sistema a los 30 días.')) return;
    const r = await fetch(`/api/casos/${id}`, { method: 'DELETE' });
    if (!r.ok) {
      alert('No se pudo eliminar.');
      return;
    }
    await load();
  }

  if (loading) {
    return (
      <div style={{ padding: '48px 64px', fontFamily: 'var(--font-mono)', fontSize: '11px', textTransform: 'uppercase', color: 'var(--muted)' }}>
        Cargando archivados…
      </div>
    );
  }

  return (
    <div style={{ padding: '48px 64px', background: 'var(--paper)', minHeight: '100vh' }}>
      <Link href="/judicial" style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', textTransform: 'uppercase', color: 'var(--muted)' }}>
        ← Mis procesos
      </Link>
      <div style={{ marginTop: '16px', borderLeft: '4px solid #c2a46d', paddingLeft: '24px' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#c2a46d', marginBottom: '8px' }}>
          ARCHIVO
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px, 3vw, 40px)', color: 'var(--ink)', fontWeight: 400 }}>
          Procesos archivados
        </h1>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--muted)', maxWidth: '560px', marginTop: '8px' }}>
          No se consultan en el listado principal. Puedes restaurarlos o enviarlos a la papelera (eliminación definitiva tras 30 días).
        </p>
      </div>

      <div style={{ marginTop: '32px', background: 'var(--surface)', border: '1px solid var(--line)' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.2fr 1.4fr 220px 160px 200px',
            padding: '12px 24px',
            background: 'var(--paper-dark)',
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            color: 'var(--muted)',
            gap: '12px',
          }}
        >
          <span>Tipo</span>
          <span>Alias / cliente</span>
          <span>Expediente</span>
          <span>Archivado</span>
          <span>Acciones</span>
        </div>
        {casos.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--muted)', fontFamily: 'var(--font-body)' }}>
            No hay procesos archivados.
          </div>
        ) : (
          casos.map(c => (
            <div
              key={c.id}
              onClick={() => {
                window.location.href = `/judicial/${c.id}`;
              }}
              style={{
                display: 'grid',
                gridTemplateColumns: '1.2fr 1.4fr 220px 160px 200px',
                padding: '14px 24px',
                alignItems: 'center',
                borderBottom: '1px solid var(--line-faint)',
                gap: '12px',
                cursor: 'pointer',
              }}
            >
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px' }}>{c.tipo_proceso || '—'}</div>
              <div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 600 }}>{c.alias || c.cliente || '—'}</div>
                {formatPartesDisplay(c.partes) ? (
                  <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: 4 }}>{formatPartesDisplay(c.partes)}</div>
                ) : null}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--muted)' }}>{c.numero_expediente}</div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--muted)' }}>
                {c.archived_at ? new Date(c.archived_at).toLocaleString('es-PE') : '—'}
              </div>
              <div onClick={e => e.stopPropagation()} style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => void restaurar(c.id)}
                  style={{
                    border: '1px solid var(--line-strong)',
                    background: 'transparent',
                    padding: '6px 10px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                  }}
                >
                  Restaurar
                </button>
                <button
                  type="button"
                  onClick={() => void aPapelera(c.id)}
                  style={{
                    border: '1px solid #991b1b',
                    background: 'transparent',
                    color: '#991b1b',
                    padding: '6px 10px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                  }}
                >
                  A papelera
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
