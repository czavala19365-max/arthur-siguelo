'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import CalendarButtons from '@/components/CalendarButtons';

interface Caso {
  id: number;
  alias: string | null;
  cliente: string | null;
  tipo_proceso: string | null;
}

interface Audiencia {
  id: number;
  caso_id: number;
  descripcion: string;
  fecha: string;
  tipo: string | null;
}

interface Item {
  casoId: number;
  alias: string;
  tipo: string | null;
  fecha: string;
  descripcion: string;
}

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function getDaysColor(days: number): string {
  if (days < 0) return '#666666';
  if (days === 0) return '#991b1b';
  if (days < 3) return '#d97706';
  if (days < 7) return '#92400e';
  if (days < 15) return '#0369a1';
  return 'var(--ink)';
}

export default function JudicialAgendaPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        console.log('[Agenda] Cargando casos...');
        const casosRes = await fetch('/api/casos');
        if (!casosRes.ok) throw new Error('Error al cargar casos');

        const casos = (await casosRes.json()) as Caso[];
        console.log(`[Agenda] ✅ ${casos.length} casos cargados`);

        const rows: Item[] = [];

        for (const c of casos) {
          try {
            console.log(`[Agenda] Cargando detalles del caso ${c.id} (${c.alias || c.cliente})`);
            const detRes = await fetch(`/api/casos/${c.id}`);
            if (!detRes.ok) {
              console.warn(`[Agenda] ⚠️ Error cargando caso ${c.id}: ${detRes.status}`);
              continue;
            }

            const detData = (await detRes.json()) as {
              audiencias?: Audiencia[];
            };

            const audiencias = detData.audiencias || [];
            console.log(`[Agenda] 📋 Caso ${c.id}: ${audiencias.length} audiencias encontradas`);

            for (const aud of audiencias) {
              rows.push({
                casoId: c.id,
                alias: c.alias || c.cliente || `Caso ${c.id}`,
                tipo: c.tipo_proceso || aud.tipo,
                fecha: aud.fecha,
                descripcion: aud.descripcion,
              });
            }
          } catch (err) {
            console.error(`[Agenda] ❌ Error procesando caso ${c.id}:`, err);
          }
        }

        // Ordenar por fecha
        rows.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
        console.log(`[Agenda] 🎯 Total de audiencias a mostrar: ${rows.length}`);
        setItems(rows);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[Agenda] ❌ Error cargando agenda:', err);
        setError(msg);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const thisWeek = items.filter(i => {
    const days = daysUntil(i.fecha);
    return days >= 0 && days <= 7;
  });
  const thisMonth = items.filter(i => {
    const days = daysUntil(i.fecha);
    return days > 7 && days <= 30;
  });
  const upcoming = items.filter(i => daysUntil(i.fecha) > 30);
  const past = items.filter(i => daysUntil(i.fecha) < 0);

  const sections = [
    { label: 'Esta semana', items: thisWeek, color: '#991b1b' },
    { label: 'Este mes', items: thisMonth, color: '#d97706' },
    { label: 'Próximos meses', items: upcoming, color: 'rgba(136,136,136,0.3)' },
    { label: 'Vencidos', items: past, color: '#9ca3af' },
  ];

  return (
    <div style={{ padding: '48px 64px', background: 'var(--paper)', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ animation: 'fadeUp 0.4s ease forwards' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--muted)', marginBottom: '8px' }}>
          AGENDA JUDICIAL
        </div>
        <h1 style={{ fontFamily: 'var(--font-body)', fontSize: 'clamp(32px, 4vw, 48px)', color: 'var(--ink)', fontWeight: 600 }}>
          Agenda
        </h1>
        <div style={{ width: '60px', height: '2px', background: 'var(--accent)', marginTop: '16px' }} />
      </div>

      {/* Mensaje de error */}
      {error && (
        <div style={{ marginTop: '24px', padding: '16px', background: '#fff3cd', border: '1px solid #ffc107', color: '#856404', borderRadius: '4px' }}>
          <strong>⚠️ Error:</strong> {error}
        </div>
      )}

      {/* Contenido */}
      {loading ? (
        <div style={{ padding: '48px 64px', fontFamily: 'var(--font-mono)', fontSize: '11px', textTransform: 'uppercase', color: 'var(--muted)' }}>
          Cargando agenda...
        </div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', marginTop: '80px' }}>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '24px', color: 'var(--ink)', marginBottom: '8px', fontWeight: 600 }}>
            No hay eventos próximos. ✓
          </div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--muted)' }}>
            Los eventos aparecerán aquí cuando se extraigan fechas de tus expedientes judiciales.
          </div>
        </div>
      ) : (
        <div style={{ marginTop: '40px', display: 'flex', flexDirection: 'column', gap: '40px' }}>
          {sections.map(section => (
            section.items.length > 0 && (
              <div key={section.label}>
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  color: 'var(--muted)',
                  paddingLeft: '16px',
                  borderLeft: `3px solid ${section.color}`,
                  marginBottom: '20px',
                  lineHeight: 1.8,
                }}>
                  {section.label} — {section.items.length} evento{section.items.length > 1 ? 's' : ''}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {section.items.map((i, idx) => {
                    const days = daysUntil(i.fecha);
                    return (
                      <Link
                        key={`${i.casoId}-${idx}`}
                        href={`/judicial/${i.casoId}`}
                        style={{
                          background: 'var(--surface)',
                          border: '1px solid var(--line)',
                          padding: '20px 24px',
                          display: 'flex',
                          gap: '24px',
                          alignItems: 'center',
                          textDecoration: 'none',
                          transition: 'border-color 0.15s',
                        }}
                        onMouseOver={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(15,15,15,0.2)'; }}
                        onMouseOut={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--line)'; }}
                      >
                        {/* Days counter */}
                        <div style={{ textAlign: 'center', flexShrink: 0, minWidth: '80px' }}>
                          <div style={{ fontFamily: 'var(--font-display)', fontSize: '40px', color: getDaysColor(days), lineHeight: 1 }}>
                            {days < 0 ? Math.abs(days) : days}
                          </div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase' }}>
                            {days < 0 ? 'hace días' : 'días'}
                          </div>
                        </div>

                        {/* Details */}
                        <div style={{ flex: 1 }}>
                          <div style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 600, color: 'var(--ink)', marginBottom: '4px' }}>
                            {i.descripcion}
                          </div>
                          <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--muted)' }}>
                            {i.alias}
                          </div>
                        </div>

                        {/* Right side */}
                        <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <div>
                            <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--ink)', marginBottom: '6px' }}>
                              {formatDate(i.fecha)}
                            </div>
                            {i.tipo && (
                              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase' }}>
                                {i.tipo}
                              </div>
                            )}
                          </div>
                          <div onClick={e => e.stopPropagation()}>
                            <CalendarButtons
                              title={`${i.descripcion} — ${i.alias}`}
                              date={i.fecha}
                              description={`Expediente: ${i.alias}\nTipo: ${i.tipo || 'Evento judicial'}\nEvento: ${i.descripcion}`}
                            />
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )
          ))}
        </div>
      )}
    </div>
  );
}
