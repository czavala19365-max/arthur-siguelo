'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { formatPartesDisplay } from '@/lib/format-partes-judicial';

interface Caso {
  id: number;
  tipo_proceso: string | null;
  alias: string | null;
  cliente: string | null;
  partes: string | null;
  numero_expediente: string;
  ultimo_movimiento_fecha: string | null;
  proximo_evento: string | null;
  proximo_evento_fecha: string | null;
  prioridad: 'alta' | 'media' | 'baja';
}

interface Movimiento {
  id: number;
  urgencia: 'alta' | 'normal' | 'info';
  es_nuevo: number;
}

interface Audiencia {
  id: number;
  fecha: string;
}

const DISTRITOS = [
  'Lima', 'Lima Norte', 'Lima Sur', 'Lima Este', 'Callao',
  'Arequipa', 'Cusco', 'La Libertad', 'Piura', 'Junín',
  'Lambayeque', 'Ica', 'Áncash', 'Cajamarca', 'Loreto',
  'Puno', 'San Martín', 'Tacna', 'Ayacucho', 'Huánuco',
  'Moquegua', 'Tumbes', 'Ucayali', 'Amazonas', 'Apurímac',
  'Huancavelica', 'Madre de Dios', 'Pasco',
]

const ESPECIALIDADES = [
  'Civil', 'Laboral', 'Penal', 'Familia', 'Comercial',
  'Constitucional', 'Contencioso Administrativo', 'Laboral Previsional',
]

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return 'Nunca';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Hace un momento';
  if (mins < 60) return `Hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `Hace ${days}d`;
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const now = new Date();
  const d = new Date(dateStr);
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/** Parse expediente date string for external calendar links (same calendar day, 09:00–10:00). */
function parseEventDateForCalendar(raw: string): { ymd: string; ymdDash: string } | null {
  const t = raw.trim();
  const slash = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) {
    const d0 = parseInt(slash[1], 10);
    const m0 = parseInt(slash[2], 10);
    const y0 = parseInt(slash[3], 10);
    const date = new Date(y0, m0 - 1, d0);
    if (Number.isNaN(date.getTime())) return null;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return { ymd: `${y}${m}${d}`, ymdDash: `${y}-${m}-${d}` };
  }
  const date = new Date(t);
  if (Number.isNaN(date.getTime())) return null;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return { ymd: `${y}${m}${d}`, ymdDash: `${y}-${m}-${d}` };
}

function calendarGoogleUrl(alias: string, ymd: string) {
  const details = encodeURIComponent('Proceso judicial - arthur.ia');
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(alias)}&dates=${ymd}T090000/${ymd}T100000&details=${details}`;
}

function calendarOutlookUrl(alias: string, ymdDash: string) {
  const body = encodeURIComponent('Proceso judicial - arthur.ia');
  return `https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(alias)}&startdt=${encodeURIComponent(`${ymdDash}T09:00:00`)}&enddt=${encodeURIComponent(`${ymdDash}T10:00:00`)}&body=${body}`;
}

const CURRENT_YEAR = String(new Date().getFullYear());

function asCasoList(raw: unknown): Caso[] {
  if (raw == null || !Array.isArray(raw)) return [];
  return raw.filter(
    (item): item is Caso =>
      typeof item === 'object' &&
      item !== null &&
      'id' in item &&
      typeof (item as Caso).id === 'number'
  );
}

export default function JudicialDashboardPage() {
  const [casos, setCasos] = useState<Caso[]>([]);
  const [stats, setStats] = useState({ total: 0, activos: 0, conAlerta: 0, proximasAudiencias: 0 });
  const [details, setDetails] = useState<Record<number, { movimientos: Movimiento[]; audiencias: Audiencia[] }>>({});
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pollingId, setPollingId] = useState<number | null>(null);
  const [calendarHoverId, setCalendarHoverId] = useState<number | null>(null);

  // Tabbed form state
  const [activeTab, setActiveTab] = useState<'codigo' | 'filtros'>('codigo');
  const [expFields, setExpFields] = useState({ sec: '', ano: CURRENT_YEAR, dist: '', tipo: '', esp: '', juz: '' });
  const [form, setForm] = useState({
    parte: '',
    filtro_distrito: 'Lima',
    filtro_ano: CURRENT_YEAR,
    filtro_numero: '',
    filtro_especialidad: 'Civil',
    alias: '',
    whatsapp_number: '',
    email: '',
    polling_frequency_hours: 4,
  });
  const [submitStatus, setSubmitStatus] = useState('');

  // Refs for auto-advance in tab 1
  const refSec = useRef<HTMLInputElement>(null);
  const refAno = useRef<HTMLInputElement>(null);
  const refDist = useRef<HTMLInputElement>(null);
  const refTipo = useRef<HTMLInputElement>(null);
  const refEsp = useRef<HTMLInputElement>(null);
  const refJuz = useRef<HTMLInputElement>(null);
  const cejSyncPollRef = useRef<number | null>(null);
  const cejSyncTimeoutRef = useRef<number | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [casosRes, statsRes] = await Promise.all([
        fetch('/api/casos'),
        fetch('/api/casos/stats'),
      ]);

      let casosRaw: unknown;
      try {
        casosRaw = await casosRes.json();
      } catch {
        casosRaw = null;
      }
      const casosList = asCasoList(casosRaw);

      let statsData: typeof stats = { total: 0, activos: 0, conAlerta: 0, proximasAudiencias: 0 };
      try {
        const statsRaw: unknown = await statsRes.json();
        if (statsRaw && typeof statsRaw === 'object' && !Array.isArray(statsRaw) && 'total' in statsRaw) {
          const o = statsRaw as Record<string, unknown>;
          statsData = {
            total: Number(o.total) || 0,
            activos: Number(o.activos) || 0,
            conAlerta: Number(o.conAlerta) || 0,
            proximasAudiencias: Number(o.proximasAudiencias) || 0,
          };
        }
      } catch {
        /* keep defaults */
      }

      setCasos(casosList);
      setStats(statsData);

      const map: Record<number, { movimientos: Movimiento[]; audiencias: Audiencia[] }> = {};
      for (let i = 0; i < casosList.length; i++) {
        const c = casosList[i];
        const r = await fetch(`/api/casos/${c.id}`);
        if (!r.ok) continue;
        let d: { movimientos?: Movimiento[]; audiencias?: Audiencia[] };
        try {
          d = (await r.json()) as { movimientos?: Movimiento[]; audiencias?: Audiencia[] };
        } catch {
          continue;
        }
        map[c.id] = { movimientos: d.movimientos || [], audiencias: d.audiencias || [] };
      }
      setDetails(map);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  useEffect(
    () => () => {
      if (cejSyncPollRef.current) {
        clearInterval(cejSyncPollRef.current);
        cejSyncPollRef.current = null;
      }
      if (cejSyncTimeoutRef.current) {
        clearTimeout(cejSyncTimeoutRef.current);
        cejSyncTimeoutRef.current = null;
      }
    },
    []
  );

  const highAlertCase = useMemo(() => {
    const list = Array.isArray(casos) ? casos : [];
    return list.find(c =>
      (details[c.id]?.movimientos || []).some(m => m.es_nuevo === 1 && m.urgencia === 'alta')
    );
  }, [casos, details]);

  function resetForm() {
    setActiveTab('codigo');
    setExpFields({ sec: '', ano: CURRENT_YEAR, dist: '', tipo: '', esp: '', juz: '' });
    setForm({
      parte: '',
      filtro_distrito: 'Lima',
      filtro_ano: CURRENT_YEAR,
      filtro_numero: '',
      filtro_especialidad: 'Civil',
      alias: '',
      whatsapp_number: '',
      email: '',
      polling_frequency_hours: 4,
    });
    setSubmitStatus('');
  }

  function advanceField(
    value: string,
    maxLen: number,
    nextRef: React.RefObject<HTMLInputElement | null> | null
  ) {
    if (value.length === maxLen && nextRef?.current) {
      nextRef.current.focus();
    }
  }

  async function createCaso() {
    let numero_expediente: string;
    if (activeTab === 'codigo') {
      numero_expediente = `${expFields.sec}-${expFields.ano}-0-${expFields.dist}-${expFields.tipo}-${expFields.esp}-${expFields.juz}`;
    } else {
      numero_expediente = form.filtro_numero;
    }

    setSubmitStatus('Guardando proceso...');

    const payload: Record<string, unknown> = {
      numero_expediente,
      parte: form.parte,
      alias: form.alias || null,
      searchType: activeTab,
      whatsapp_number: form.whatsapp_number || null,
      email: form.email || null,
      polling_frequency_hours: form.polling_frequency_hours,
    };
    if (activeTab === 'filtros') {
      payload.distrito_judicial = form.filtro_distrito;
      payload.tipo_proceso = form.filtro_especialidad;
    }

    const res = await fetch('/api/casos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      let msg = 'Error al guardar el proceso.';
      try {
        const j = JSON.parse(text) as { error?: string; detail?: string };
        if (j.detail) msg = `${msg} ${j.detail}`;
        else if (j.error && j.error !== 'Error al crear proceso judicial') msg = j.error;
      } catch {
        if (text) msg = `${msg} (${text.slice(0, 120)})`;
      }
      setSubmitStatus(msg);
      return;
    }

    const data = await res.json() as Record<string, unknown>;

    if (data.portalDown) {
      setSubmitStatus('⚠️ Proceso guardado. CEJ no disponible — revisión automática pendiente.');
    } else if (data.captchaFailed) {
      setSubmitStatus('⚠️ Proceso guardado. Captcha no resuelto — reintentará en próxima revisión.');
    } else if (data.syncPending) {
      const casoId = data.id as number;
      const initialLastChecked = (data.last_checked as string | null | undefined) ?? null;
      setSubmitStatus('✅ Caso guardado. Sincronizando con el CEJ en segundo plano…');
      void loadData();

      if (cejSyncPollRef.current) clearInterval(cejSyncPollRef.current);
      if (cejSyncTimeoutRef.current) clearTimeout(cejSyncTimeoutRef.current);

      let ticks = 0;
      cejSyncPollRef.current = window.setInterval(async () => {
        ticks += 1;
        await loadData();
        try {
          const r = await fetch(`/api/casos/${casoId}`);
          if (!r.ok) return;
          const detail = (await r.json()) as {
            last_checked?: string | null;
            movimientos?: unknown[];
          };
          const movs = Array.isArray(detail.movimientos) ? detail.movimientos.length : 0;
          const synced =
            movs > 0 ||
            (detail.last_checked != null && detail.last_checked !== initialLastChecked);
          if (synced || ticks >= 26) {
            if (cejSyncPollRef.current) {
              clearInterval(cejSyncPollRef.current);
              cejSyncPollRef.current = null;
            }
            if (cejSyncTimeoutRef.current) {
              clearTimeout(cejSyncTimeoutRef.current);
              cejSyncTimeoutRef.current = null;
            }
            if (movs > 0) {
              setSubmitStatus(`✅ Sincronizado: ${movs} movimiento(s) en el expediente.`);
            } else if (synced && detail.last_checked) {
              setSubmitStatus('✅ Sincronización con el CEJ completada.');
            } else {
              setSubmitStatus(
                '✅ Caso guardado. Si no ves movimientos, abre el expediente y pulsa «Actualizar ahora».'
              );
            }
          }
        } catch {
          /* ignore */
        }
      }, 6000);
      cejSyncTimeoutRef.current = window.setTimeout(() => {
        if (cejSyncPollRef.current) {
          clearInterval(cejSyncPollRef.current);
          cejSyncPollRef.current = null;
        }
        cejSyncTimeoutRef.current = null;
      }, 165000);
    } else {
      const count = data.movimientosCount as number | undefined;
      setSubmitStatus(`✅ Proceso agregado con ${count ?? 0} movimientos detectados`);
    }

    const delay = data.syncPending ? 1200 : 2500;
    setTimeout(() => {
      setDrawerOpen(false);
      resetForm();
      if (!data.syncPending) void loadData();
    }, delay);
  }

  async function pollNow(id: number) {
    setPollingId(id);
    await fetch(`/api/casos/${id}/poll-now`, { method: 'POST' });
    setPollingId(null);
    await loadData();
  }

  async function archiveCasoRow(id: number) {
    if (!confirm('¿Archivar este proceso? Dejará de mostrarse en Mis Procesos (podrás restaurarlo desde Archivados).')) return;
    const r = await fetch(`/api/casos/${id}/archive`, { method: 'POST' });
    if (!r.ok) {
      alert('No se pudo archivar el proceso.');
      return;
    }
    await loadData();
  }

  async function eliminarCasoRow(id: number) {
    if (
      !confirm(
        '¿Eliminar este proceso? Irá a la papelera y se borrará permanentemente del sistema a los 30 días.'
      )
    )
      return;
    const r = await fetch(`/api/casos/${id}`, { method: 'DELETE' });
    if (!r.ok) {
      alert('No se pudo eliminar el proceso.');
      return;
    }
    await loadData();
  }

  async function togglePriority(c: Caso) {
    const next = c.prioridad === 'alta' ? 'media' : c.prioridad === 'media' ? 'baja' : 'alta';
    await fetch(`/api/casos/${c.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prioridad: next }),
    });
    await loadData();
  }

  if (loading) {
    return <div style={{ padding: '48px 64px', fontFamily: 'var(--font-mono)', fontSize: '11px', textTransform: 'uppercase', color: 'var(--muted)' }}>Cargando procesos...</div>;
  }

  const labelStyle: React.CSSProperties = { fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: 'var(--muted)' };
  const inputStyle: React.CSSProperties = { width: '100%', border: '1px solid var(--line-strong)', padding: '12px 14px', marginTop: 6, marginBottom: 16, fontFamily: 'var(--font-body)', fontSize: '13px', background: 'var(--paper)', color: 'var(--ink)', boxSizing: 'border-box' };

  return (
    <div style={{ padding: '48px 64px', background: 'var(--paper)', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderLeft: '4px solid #c2a46d', paddingLeft: '24px' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#c2a46d', marginBottom: '8px' }}>
            MIS PROCESOS
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(32px, 4vw, 48px)', color: 'var(--ink)', fontWeight: 400 }}>Mis Procesos</h1>
        </div>
        <button onClick={() => setDrawerOpen(true)} style={{ background: 'var(--ink)', color: 'var(--paper)', border: 'none', borderRadius: 0, padding: '12px 24px', fontFamily: 'var(--font-body)', fontSize: '13px', cursor: 'pointer' }}>
          + Nuevo proceso
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginTop: '32px' }}>
        {[
          { label: 'TOTAL PROCESOS', value: stats.total, color: 'var(--ink)', top: 'transparent', bg: 'var(--surface)' },
          { label: 'CON ALERTAS', value: stats.conAlerta, color: '#991b1b', top: '#991b1b', bg: 'rgba(153,27,27,0.04)' },
          { label: 'ACTIVOS', value: stats.activos, color: '#166534', top: '#166534', bg: 'rgba(22,101,52,0.04)' },
          { label: 'PRÓXIMAS AUDIENCIAS', value: stats.proximasAudiencias, color: '#92400e', top: '#d97706', bg: 'rgba(217,119,6,0.06)' },
        ].map(card => (
          <div key={card.label} style={{ background: card.bg, border: '1px solid var(--line)', borderTop: card.label === 'TOTAL PROCESOS' ? '3px solid #c2a46d' : card.top === 'transparent' ? '1px solid var(--line)' : `3px solid ${card.top}`, padding: '24px 28px' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.12em', color: card.color, marginBottom: '8px' }}>{card.label}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '52px', lineHeight: 1, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      {highAlertCase && (
        <div style={{ background: 'var(--accent-navy)', color: 'white', padding: '16px 28px', marginTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px' }}>
            🔴 {highAlertCase.alias || highAlertCase.cliente} tiene movimiento urgente pendiente.
          </span>
          <Link href={`/judicial/${highAlertCase.id}`} style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', textTransform: 'uppercase', opacity: 0.9 }}>Ver detalle →</Link>
        </div>
      )}

      <div style={{ marginTop: '32px', background: 'var(--surface)', border: '1px solid var(--line)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '90px 120px 1.4fr 220px 150px 170px 110px 120px 130px', padding: '12px 24px', background: 'var(--paper-dark)', fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--muted)', gap: '12px' }}>
          <span>ESTADO</span><span>TIPO</span><span>ALIAS / CLIENTE</span><span>EXPEDIENTE</span><span>ÚLTIMA ACTUALIZACIÓN</span><span>PRÓXIMO EVENTO</span><span>PRIORIDAD</span><span>CEJ</span><span>GESTIÓN</span>
        </div>

        {(!Array.isArray(casos) || casos.length === 0) ? (
          <div style={{ padding: '56px 24px', textAlign: 'center', fontFamily: 'var(--font-body)', color: 'var(--muted)' }}>
            No hay procesos registrados todavía.
          </div>
        ) : casos.map(c => {
          const det = details[c.id] || { movimientos: [], audiencias: [] };
          const urgentNew = det.movimientos.some(m => m.es_nuevo === 1 && m.urgencia === 'alta');
          const normalNew = det.movimientos.some(m => m.es_nuevo === 1 && m.urgencia !== 'alta');
          const hasAny = det.movimientos.length > 0;
          const nextAud = [...det.audiencias].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())[0];
          const dleft = daysUntil(nextAud?.fecha || null);
          const calParts = nextAud ? parseEventDateForCalendar(nextAud.fecha) : null;
          const eventAlias = c.alias || c.cliente || 'Sin alias';

          return (
            <div key={c.id} onClick={() => (window.location.href = `/judicial/${c.id}`)} style={{ display: 'grid', gridTemplateColumns: '90px 120px 1.4fr 220px 150px 170px 110px 120px 130px', padding: '0 24px', minHeight: '66px', alignItems: 'center', borderBottom: '1px solid var(--line-faint)', gap: '12px', cursor: 'pointer' }}>
              <div>
                <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: urgentNew ? '#991b1b' : normalNew ? '#d97706' : hasAny ? '#166534' : '#9ca3af', animation: urgentNew ? 'pulse 1.5s infinite' : undefined }} />
              </div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px' }}>{c.tipo_proceso || '—'}</div>
              <div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 600 }}>{c.alias || c.cliente || 'Sin alias'}</div>
                {(() => {
                  const partesLine = formatPartesDisplay(c.partes);
                  if (!partesLine) return null;
                  return (
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--muted)', marginTop: '4px', lineHeight: 1.45 }}>
                      {partesLine}
                    </div>
                  );
                })()}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--muted)' }}>{c.numero_expediente}</div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--muted)' }}>{relativeTime(c.ultimo_movimiento_fecha)}</div>
              <div
                style={{ position: 'relative', fontFamily: 'var(--font-body)', fontSize: '12px', color: dleft === null ? 'var(--muted)' : dleft < 3 ? '#991b1b' : dleft < 7 ? '#92400e' : 'var(--ink)' }}
                onMouseEnter={() => { if (calParts) setCalendarHoverId(c.id); }}
                onMouseLeave={() => setCalendarHoverId(null)}
                onClick={e => e.stopPropagation()}
              >
                {nextAud ? `${nextAud.fecha} (${dleft}d)` : 'Sin evento'}
                {calendarHoverId === c.id && calParts && (
                  <div style={{ position: 'absolute', left: 0, top: '100%', marginTop: 6, zIndex: 50, background: '#141414', border: '1px solid #2a2a2a', minWidth: 200, opacity: 1, transition: 'opacity 0.2s ease', boxShadow: '0 8px 24px rgba(0,0,0,0.35)' }}>
                    <a href={calendarGoogleUrl(eventAlias, calParts.ymd)} target="_blank" rel="noopener noreferrer" style={{ display: 'block', padding: '8px 16px', fontFamily: 'DM Mono, monospace', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#c9a84c', textDecoration: 'none' }} onMouseOver={e => { e.currentTarget.style.background = '#1c1c1c'; }} onMouseOut={e => { e.currentTarget.style.background = 'transparent'; }}>
                      Google Calendar
                    </a>
                    <a href={calendarOutlookUrl(eventAlias, calParts.ymdDash)} target="_blank" rel="noopener noreferrer" style={{ display: 'block', padding: '8px 16px', fontFamily: 'DM Mono, monospace', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#c9a84c', textDecoration: 'none', borderTop: '1px solid #2a2a2a' }} onMouseOver={e => { e.currentTarget.style.background = '#1c1c1c'; }} onMouseOut={e => { e.currentTarget.style.background = 'transparent'; }}>
                      Outlook
                    </a>
                  </div>
                )}
              </div>
              <div>
                <button
                  onClick={(e) => { e.stopPropagation(); void togglePriority(c); }}
                  style={{ border: '1px solid var(--line-strong)', background: c.prioridad === 'alta' ? 'rgba(153,27,27,0.08)' : c.prioridad === 'media' ? 'rgba(217,119,6,0.09)' : 'rgba(107,101,96,0.08)', color: c.prioridad === 'alta' ? '#991b1b' : c.prioridad === 'media' ? '#92400e' : '#6b6560', fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', padding: '5px 8px', cursor: 'pointer' }}
                >
                  {c.prioridad}
                </button>
              </div>
              <div>
                <button
                  onClick={(e) => { e.stopPropagation(); void pollNow(c.id); }}
                  disabled={pollingId === c.id}
                  style={{ background: 'transparent', border: '1px solid var(--line-strong)', borderRadius: 0, padding: '7px 10px', fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', cursor: pollingId === c.id ? 'not-allowed' : 'pointer', opacity: pollingId === c.id ? 0.6 : 1 }}
                >
                  {pollingId === c.id ? '...' : 'Revisar ahora'}
                </button>
              </div>
              <div onClick={e => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <button
                  type="button"
                  onClick={() => void archiveCasoRow(c.id)}
                  style={{ background: 'transparent', border: '1px solid var(--line-strong)', padding: '5px 8px', fontFamily: 'var(--font-mono)', fontSize: '9px', textTransform: 'uppercase', cursor: 'pointer', color: 'var(--muted)' }}
                >
                  Archivar
                </button>
                <button
                  type="button"
                  onClick={() => void eliminarCasoRow(c.id)}
                  style={{ background: 'transparent', border: '1px solid #991b1b', padding: '5px 8px', fontFamily: 'var(--font-mono)', fontSize: '9px', textTransform: 'uppercase', cursor: 'pointer', color: '#991b1b' }}
                >
                  Eliminar
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {drawerOpen && (
        <>
          <div onClick={() => setDrawerOpen(false)} style={{ position: 'fixed', inset: 0, background: 'var(--overlay-scrim)', zIndex: 200 }} />
          <div className="animate-slideInRight" style={{ position: 'fixed', top: 0, right: 0, width: '520px', height: '100vh', background: 'var(--paper)', borderLeft: '1px solid var(--line-mid)', zIndex: 300, overflowY: 'auto', padding: '40px 36px' }}>
            <button onClick={() => setDrawerOpen(false)} style={{ position: 'absolute', right: '20px', top: '16px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '20px' }}>×</button>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 400 }}>Nuevo proceso</h2>
            <div style={{ width: '60px', height: '2px', background: 'var(--accent)', marginTop: '12px', marginBottom: '24px' }} />

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--line-strong)', marginBottom: '24px' }}>
              {(['codigo', 'filtros'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    border: 'none',
                    borderBottom: activeTab === tab ? '2px solid var(--ink)' : '2px solid transparent',
                    background: 'none',
                    padding: '10px 16px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    cursor: 'pointer',
                    color: activeTab === tab ? 'var(--ink)' : 'var(--muted)',
                    marginBottom: '-1px',
                  }}
                >
                  {tab === 'codigo' ? 'Por Código de Expediente' : 'Por Filtros'}
                </button>
              ))}
            </div>

            {/* TAB 1: Por Código de Expediente */}
            {activeTab === 'codigo' && (
              <div>
                <label style={labelStyle}>Código de Expediente</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: 8, marginBottom: 6, flexWrap: 'nowrap' }}>
                  <input
                    ref={refSec}
                    maxLength={5}
                    placeholder="00001"
                    value={expFields.sec}
                    onChange={e => {
                      const v = e.target.value;
                      setExpFields(p => ({ ...p, sec: v }));
                      advanceField(v, 5, refAno);
                    }}
                    style={{ width: '60px', border: '1px solid var(--line-strong)', padding: '10px 8px', fontFamily: 'var(--font-mono)', fontSize: '12px', textAlign: 'center', background: 'var(--paper)', color: 'var(--ink)' }}
                  />
                  <span style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>-</span>
                  <input
                    ref={refAno}
                    maxLength={4}
                    placeholder={CURRENT_YEAR}
                    value={expFields.ano}
                    onChange={e => {
                      const v = e.target.value;
                      setExpFields(p => ({ ...p, ano: v }));
                      advanceField(v, 4, refDist);
                    }}
                    style={{ width: '52px', border: '1px solid var(--line-strong)', padding: '10px 8px', fontFamily: 'var(--font-mono)', fontSize: '12px', textAlign: 'center', background: 'var(--paper)', color: 'var(--ink)' }}
                  />
                  <span style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>-</span>
                  <input
                    value="0"
                    disabled
                    style={{ width: '28px', border: '1px solid var(--line)', padding: '10px 6px', fontFamily: 'var(--font-mono)', fontSize: '12px', textAlign: 'center', background: 'var(--surface)', color: 'var(--muted)' }}
                  />
                  <span style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>-</span>
                  <input
                    ref={refDist}
                    maxLength={4}
                    placeholder="1801"
                    value={expFields.dist}
                    onChange={e => {
                      const v = e.target.value;
                      setExpFields(p => ({ ...p, dist: v }));
                      advanceField(v, 4, refTipo);
                    }}
                    style={{ width: '52px', border: '1px solid var(--line-strong)', padding: '10px 8px', fontFamily: 'var(--font-mono)', fontSize: '12px', textAlign: 'center', background: 'var(--paper)', color: 'var(--ink)' }}
                  />
                  <span style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>-</span>
                  <input
                    ref={refTipo}
                    maxLength={2}
                    placeholder="JR"
                    value={expFields.tipo}
                    onChange={e => {
                      const v = e.target.value;
                      setExpFields(p => ({ ...p, tipo: v }));
                      advanceField(v, 2, refEsp);
                    }}
                    style={{ width: '36px', border: '1px solid var(--line-strong)', padding: '10px 6px', fontFamily: 'var(--font-mono)', fontSize: '12px', textAlign: 'center', background: 'var(--paper)', color: 'var(--ink)' }}
                  />
                  <span style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>-</span>
                  <input
                    ref={refEsp}
                    maxLength={2}
                    placeholder="CI"
                    value={expFields.esp}
                    onChange={e => {
                      const v = e.target.value;
                      setExpFields(p => ({ ...p, esp: v }));
                      advanceField(v, 2, refJuz);
                    }}
                    style={{ width: '36px', border: '1px solid var(--line-strong)', padding: '10px 6px', fontFamily: 'var(--font-mono)', fontSize: '12px', textAlign: 'center', background: 'var(--paper)', color: 'var(--ink)' }}
                  />
                  <span style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>-</span>
                  <input
                    ref={refJuz}
                    maxLength={2}
                    placeholder="06"
                    value={expFields.juz}
                    onChange={e => setExpFields(p => ({ ...p, juz: e.target.value }))}
                    style={{ width: '36px', border: '1px solid var(--line-strong)', padding: '10px 6px', fontFamily: 'var(--font-mono)', fontSize: '12px', textAlign: 'center', background: 'var(--paper)', color: 'var(--ink)' }}
                  />
                </div>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--muted)', marginBottom: '20px' }}>
                  Ej: 00001-2005-0-1817-JR-CO-06
                </p>

                <label style={labelStyle}>
                  APELLIDO PATERNO Y APELLIDO MATERNO O RAZÓN SOCIAL <span style={{ color: '#991b1b' }}>*</span>
                </label>
                <input
                  value={form.parte}
                  onChange={e => setForm(p => ({ ...p, parte: e.target.value }))}
                  placeholder="Tal como aparece en las resoluciones"
                  required
                  style={inputStyle}
                />
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--muted)', marginTop: -12, marginBottom: '16px' }}>
                  (*) Dato obligatorio requerido por el CEJ
                </p>
              </div>
            )}

            {/* TAB 2: Por Filtros */}
            {activeTab === 'filtros' && (
              <div>
                <label style={labelStyle}>Distrito Judicial</label>
                <select
                  value={form.filtro_distrito}
                  onChange={e => setForm(p => ({ ...p, filtro_distrito: e.target.value }))}
                  style={{ ...inputStyle }}
                >
                  {DISTRITOS.map(d => <option key={d}>{d}</option>)}
                </select>

                <label style={labelStyle}>Año</label>
                <input
                  type="number"
                  value={form.filtro_ano}
                  onChange={e => setForm(p => ({ ...p, filtro_ano: e.target.value }))}
                  style={inputStyle}
                />

                <label style={labelStyle}>Número</label>
                <input
                  value={form.filtro_numero}
                  onChange={e => setForm(p => ({ ...p, filtro_numero: e.target.value }))}
                  style={inputStyle}
                />

                <label style={labelStyle}>Especialidad</label>
                <select
                  value={form.filtro_especialidad}
                  onChange={e => setForm(p => ({ ...p, filtro_especialidad: e.target.value }))}
                  style={{ ...inputStyle }}
                >
                  {ESPECIALIDADES.map(e => <option key={e}>{e}</option>)}
                </select>

                <label style={labelStyle}>
                  APELLIDO PATERNO Y APELLIDO MATERNO O RAZÓN SOCIAL <span style={{ color: '#991b1b' }}>*</span>
                </label>
                <input
                  value={form.parte}
                  onChange={e => setForm(p => ({ ...p, parte: e.target.value }))}
                  placeholder="Tal como aparece en las resoluciones"
                  required
                  style={inputStyle}
                />
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--muted)', marginTop: -12, marginBottom: '16px' }}>
                  (*) Dato obligatorio requerido por el CEJ
                </p>
              </div>
            )}

            {/* Always visible below tabs */}
            <label style={labelStyle}>Alias del caso</label>
            <input
              value={form.alias}
              onChange={e => setForm(p => ({ ...p, alias: e.target.value }))}
              placeholder="Nombre descriptivo para identificar el caso"
              style={inputStyle}
            />

            <label style={labelStyle}>WhatsApp</label>
            <input
              value={form.whatsapp_number}
              onChange={e => setForm(p => ({ ...p, whatsapp_number: e.target.value }))}
              placeholder="+51999000000"
              style={inputStyle}
            />

            <label style={labelStyle}>Email</label>
            <input
              value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              style={inputStyle}
            />

            <label style={labelStyle}>Frecuencia de revisión</label>
            <select
              value={form.polling_frequency_hours}
              onChange={e => setForm(p => ({ ...p, polling_frequency_hours: Number(e.target.value) }))}
              style={{ ...inputStyle }}
            >
              <option value={1}>Cada hora</option>
              <option value={2}>Cada 2h</option>
              <option value={4}>Cada 4h</option>
              <option value={12}>Cada 12h</option>
              <option value={24}>Cada 24h</option>
            </select>

            {submitStatus ? (
              <div style={{
                padding: '16px',
                border: '1px solid var(--line)',
                background: 'var(--surface)',
                fontFamily: 'var(--font-body)',
                fontSize: '13px',
                color: 'var(--ink)',
                marginTop: 8,
              }}>
                {submitStatus}
              </div>
            ) : (
              <button
                onClick={() => void createCaso()}
                style={{ width: '100%', background: 'var(--ink)', color: 'var(--paper)', border: 'none', borderRadius: 0, padding: '16px', fontFamily: 'var(--font-body)', fontSize: '14px', cursor: 'pointer', marginTop: 8 }}
              >
                Comenzar seguimiento →
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
