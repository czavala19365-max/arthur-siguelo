'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import CalendarButtons from '@/components/CalendarButtons';

interface AgendaFecha {
  tipo: 'vencimiento' | 'presentacion' | 'calificacion';
  label: string;
  fecha: string;
}

interface TituloAgenda {
  id: string;
  numero_titulo: string;
  anio_titulo: number;
  oficina_registral: string;
  nombre_cliente: string;
  ultimo_estado: string | null;
  actos: string[] | null;
  fechas: AgendaFecha[];
}

function parsePeruvianDate(dateStr: string): Date {
  const [datePart, timePart] = dateStr.trim().split(" ");

  const [day, month, year] = datePart.split("/").map(Number);

  const date = new Date(year, month - 1, day);

  if (timePart) {
    const [hour, minute, second] = timePart.split(":").map(Number);
    date.setHours(hour, minute, second ?? 0, 0);
  }

  return date;
}

/** Agrega N días hábiles (lun–vie) a una fecha */
function addBusinessDays(date: Date, days: number): Date {
  let count = 0;
  const result = new Date(date);
  while (count < days) {
    result.setDate(result.getDate() + 1);
    const d = result.getDay();
    if (d !== 0 && d !== 6) count++;
  }
  return result;
}

/** Devuelve fecha en formato YYYY-MM-DD para CalendarButtons */
function toISODate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function formatDateLong(date: Date): string {
  return date.toLocaleDateString('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

const TIPO_FECHA_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  vencimiento: { label: 'Vencimiento', color: '#991b1b', bg: 'rgba(153,27,27,0.08)' },
  presentacion: { label: 'Presentación', color: '#1e4d7a', bg: 'rgba(30,77,122,0.08)' },
  calificacion: { label: 'Ingreso Calificación', color: '#5b3a8e', bg: 'rgba(91,58,142,0.08)' },
};

export default function AgendaPage() {
  const [titulosAgenda, setTitulosAgenda] = useState<TituloAgenda[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalTitulo, setModalTitulo] = useState<TituloAgenda | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const resSunarp = await fetch('/api/siguelo/plazos');
        const sunarpData = await resSunarp.json() as { titulos: TituloAgenda[] };
        if (sunarpData.titulos) setTitulosAgenda(sunarpData.titulos);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '48px 64px' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', textTransform: 'uppercase', color: 'var(--muted)' }}>
          Cargando agenda...
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '48px 64px', background: 'var(--paper)', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ animation: 'fadeUp 0.4s ease forwards' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--muted)', marginBottom: '8px' }}>
          AGENDA DE PLAZOS
        </div>
        <h1 style={{ fontFamily: 'var(--font-body)', fontSize: 'clamp(32px, 4vw, 48px)', color: 'var(--ink)', fontWeight: 600 }}>
          Agenda
        </h1>
        <div style={{ width: '60px', height: '2px', background: 'var(--accent)', marginTop: '16px' }} />
      </div>

      {titulosAgenda.length === 0 ? (
        <div style={{ textAlign: 'center', marginTop: '80px' }}>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '24px', color: 'var(--ink)', marginBottom: '8px', fontWeight: 600 }}>
            No hay títulos con fechas registradas. ✔
          </div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--muted)' }}>
            Las agendas aparecerán aquí una vez que SUNARP devuelva fechas al consultar el estado.
          </div>
        </div>
      ) : (
        <div style={{ marginTop: '48px' }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            color: 'var(--muted)',
            marginBottom: '20px',
            paddingLeft: '16px',
            borderLeft: '3px solid var(--accent)',
            lineHeight: 1.8,
          }}>
            TÍTULOS REGISTRALES — {titulosAgenda.length} título{titulosAgenda.length > 1 ? 's' : ''}
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '16px',
          }}>
            {titulosAgenda.map(titulo => (
              <div
                key={titulo.id}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--line)',
                  borderRadius: '8px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: '200px',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
                onMouseOver={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(15,15,15,0.25)';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)';
                }}
                onMouseOut={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--line)';
                  (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                }}
              >
                {/* Card header */}
                <div style={{ marginBottom: '4px' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: '4px' }}>
                    {titulo.oficina_registral} {titulo.anio_titulo}
                  </div>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: '16px', fontWeight: 700, color: 'var(--ink)', lineHeight: 1.2 }}>
                    Título {titulo.numero_titulo}
                  </div>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--muted)', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {titulo.nombre_cliente}
                  </div>
                </div>

                {/* Estado */}
                {titulo.ultimo_estado && (
                  <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    padding: '3px 8px',
                    borderRadius: '2px',
                    background: titulo.ultimo_estado.toUpperCase().includes('OBSERV') ? 'rgba(153,27,27,0.1)' : 'rgba(0,0,0,0.05)',
                    color: titulo.ultimo_estado.toUpperCase().includes('OBSERV') ? '#991b1b' : 'var(--muted)',
                    display: 'inline-block',
                    marginTop: '8px',
                    marginBottom: '12px',
                  }}>
                    {titulo.ultimo_estado}
                  </div>
                )}

                {/* Fechas (resumen) */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {titulo.fechas.map(f => {
                    const cfg = TIPO_FECHA_CONFIG[f.tipo];
                    return (
                      <div key={f.tipo} style={{ background: cfg?.bg ?? 'rgba(0,0,0,0.04)', borderRadius: '4px', padding: '8px 10px' }}>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', color: cfg?.color ?? 'var(--muted)', marginBottom: '2px' }}>
                          {f.label}
                        </div>
                        <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--ink)' }}>
                          {parsePeruvianDate(f.fecha).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Actos */}
                {titulo.actos && titulo.actos.length > 0 && (
                  <div style={{ marginTop: '10px', fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--muted)', lineHeight: 1.5, borderTop: '1px solid var(--line)', paddingTop: '8px' }}>
                    {titulo.actos.slice(0, 2).join(' Â· ')}{titulo.actos.length > 2 ? ` +${titulo.actos.length - 2}` : ''}
                  </div>
                )}

                {/* Footer */}
                <button
                  type="button"
                  onClick={() => setModalTitulo(titulo)}
                  style={{
                    marginTop: '16px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: 'var(--accent)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'right',
                    display: 'block',
                    width: '100%',
                    padding: 0,
                  }}
                >
                  ver agendas →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* â”€â”€ Modal â”€â”€ */}
      {modalTitulo && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setModalTitulo(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '24px',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--paper)',
              border: '1px solid var(--line)',
              borderRadius: '10px',
              padding: '32px',
              maxWidth: '520px',
              width: '100%',
              maxHeight: '85vh',
              overflowY: 'auto',
            }}
          >
            {/* Modal header */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: '6px' }}>
                {modalTitulo.oficina_registral} {modalTitulo.anio_titulo}
              </div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '20px', fontWeight: 700, color: 'var(--ink)' }}>
                Título {modalTitulo.numero_titulo}
              </div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--muted)', marginTop: '4px' }}>
                {modalTitulo.nombre_cliente}
              </div>
            </div>

            {/* Agenda items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {modalTitulo.fechas.map(f => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                if (f.tipo === 'presentacion') {
                  console.log("Fecha original:", f.fecha);
                  const fechaBase = parsePeruvianDate(f.fecha);
                  const fechaAgenda = addBusinessDays(fechaBase, 8);
                  const isoAgenda = toISODate(fechaAgenda);
                  const isPast = fechaAgenda < today;
                  const desc = `Título: ${modalTitulo.numero_titulo}\nCliente: ${modalTitulo.nombre_cliente}\nFecha de presentación: ${f.fecha}\nSeguimiento al 7° día hábil`;
                  const tituloEvento = `SUNARP — Reclamo por demora (día 8) — T° ${modalTitulo.numero_titulo} (${modalTitulo.oficina_registral})`;
                  return (
                    <div key={f.tipo} style={{ background: 'rgba(30,77,122,0.06)', border: '1px solid rgba(30,77,122,0.15)', borderRadius: '6px', padding: '16px' }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#1e4d7a', marginBottom: '6px' }}>
                        Seguimiento de presentación
                      </div>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--muted)', marginBottom: '4px' }}>
                        Presentado: {formatDateLong(fechaBase)}
                      </div>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 600, color: 'var(--ink)', marginBottom: '10px' }}>
                        Alerta de presentación: {formatDateLong(fechaAgenda)}
                      </div>
                      <CalendarButtons
                        title={tituloEvento}
                        date={isoAgenda}
                        description={desc}
                        disabled={isPast}
                      />
                    </div>
                  );
                }
                if (f.tipo === 'vencimiento') {
                  const fechaVenc = parsePeruvianDate(f.fecha);
                  const isoVenc = toISODate(fechaVenc);
                  const isPast = fechaVenc < today;
                  const desc = `Título: ${modalTitulo.numero_titulo}\nCliente: ${modalTitulo.nombre_cliente}\nEstado: ${modalTitulo.ultimo_estado ?? ''}\nFecha de vencimiento`;
                  const tituloEvento = `SUNARP — Vencimiento de plazo — T° ${modalTitulo.numero_titulo}`;
                  return (
                    <div key={f.tipo} style={{ background: 'rgba(153,27,27,0.06)', border: '1px solid rgba(153,27,27,0.15)', borderRadius: '6px', padding: '16px' }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#991b1b', marginBottom: '6px' }}>
                        Vencimiento
                      </div>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 600, color: 'var(--ink)', marginBottom: '10px' }}>
                        {formatDateLong(fechaVenc)}
                      </div>
                      <CalendarButtons
                        title={tituloEvento}
                        date={isoVenc}
                        description={desc}
                        disabled={isPast}
                      />
                    </div>
                  );
                }
                if (f.tipo === 'calificacion') {
                  const fechaCalif = parsePeruvianDate(f.fecha);
                  return (
                    <div key={f.tipo} style={{ background: 'rgba(91,58,142,0.06)', border: '1px solid rgba(91,58,142,0.15)', borderRadius: '6px', padding: '16px' }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#5b3a8e', marginBottom: '6px' }}>
                        Ingreso a Calificación
                      </div>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 600, color: 'var(--ink)' }}>
                        {formatDateLong(fechaCalif)}
                      </div>
                    </div>
                  );
                }
                return null;
              })}
            </div>

            {/* Close + link */}
            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Link
                href="/dashboard/siguelo"
                style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', textDecoration: 'none' }}
              >
                Ver en Síguelo →
              </Link>
              <button
                type="button"
                onClick={() => setModalTitulo(null)}
                style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '8px 18px', border: '1px solid var(--line)', background: 'none', cursor: 'pointer', color: 'var(--ink)', borderRadius: '4px' }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

