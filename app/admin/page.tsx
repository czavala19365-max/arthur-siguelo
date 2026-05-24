'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import JudicialSidebar from '@/components/JudicialSidebar';
import { getAuthClient } from '@/lib/supabase-auth-client';

type ProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  created_at: string;
};

type UserRow = ProfileRow & { casoCount: number };

function formatRelativeDate(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days < 1) return 'hoy';
  if (days === 1) return 'hace 1 día';
  return `hace ${days} días`;
}

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserRow[]>([]);

  const loadUsers = useCallback(async () => {
    const db = getAuthClient();
    const {
      data: { user },
    } = await db.auth.getUser();
    if (!user?.id) {
      router.replace('/login');
      return;
    }

    const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') {
      router.replace('/select');
      return;
    }

    const { data: profiles, error } = await db
      .from('profiles')
      .select('id, email, full_name, role, created_at')
      .order('created_at', { ascending: false });

    if (error || !profiles) {
      setUsers([]);
      setLoading(false);
      return;
    }

    const withCounts: UserRow[] = await Promise.all(
      (profiles as ProfileRow[]).map(async p => {
        const { count } = await db
          .from('casos')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', p.id)
          .eq('activo', true)
          .is('archived_at', null)
          .is('deleted_at', null);
        return { ...p, casoCount: count ?? 0 };
      }),
    );

    setUsers(withCounts);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const totalUsuarios = users.length;
  const usuariosActivos = users.filter(u => u.casoCount > 0).length;
  const totalCasos = users.reduce((sum, u) => sum + u.casoCount, 0);

  const handleViewAs = (target: UserRow) => {
    localStorage.setItem(
      'admin_viewing_user',
      JSON.stringify({
        id: target.id,
        email: target.email,
        full_name: target.full_name,
      }),
    );
    router.push('/judicial');
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0a0a0a', color: '#fff', overflow: 'hidden' }}>
      <JudicialSidebar />
      <main
        className="arthur-main"
        style={{
          flex: 1,
          height: '100vh',
          overflow: 'auto',
          background: '#0a0a0a',
        }}
      >
        <div style={{ padding: '32px 40px' }}>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              color: '#c9a84c',
              marginBottom: '8px',
            }}
          >
            PANEL DE ADMINISTRACIÓN
          </div>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '36px',
              fontStyle: 'italic',
              fontWeight: 400,
              color: '#fff',
              margin: '0 0 8px',
            }}
          >
            Usuarios
          </h1>
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: 'rgba(255,255,255,0.4)',
              margin: '0 0 32px',
            }}
          >
            Gestión de cuentas y acceso a datos
          </p>

          {loading ? (
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.4)',
              }}
            >
              Cargando usuarios...
            </div>
          ) : (
            <>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '20px',
                  marginBottom: '32px',
                }}
              >
                {[
                  { label: 'Total usuarios registrados', value: totalUsuarios },
                  { label: 'Usuarios activos (con al menos 1 caso)', value: usuariosActivos },
                  { label: 'Total casos en plataforma', value: totalCasos },
                ].map(card => (
                  <div
                    key={card.label}
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderTop: '3px solid #c9a84c',
                      padding: '24px 28px',
                    }}
                  >
                    <div
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '10px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.12em',
                        color: 'rgba(255,255,255,0.45)',
                        marginBottom: '8px',
                      }}
                    >
                      {card.label}
                    </div>
                    <div
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '48px',
                        lineHeight: 1,
                        color: '#c9a84c',
                      }}
                    >
                      {card.value}
                    </div>
                  </div>
                ))}
              </div>

              <div
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 100px 80px 120px 160px',
                    padding: '14px 20px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: 'rgba(255,255,255,0.35)',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <span>Usuario</span>
                  <span>Rol</span>
                  <span>Casos</span>
                  <span>Registrado</span>
                  <span>Acciones</span>
                </div>

                {users.map(u => (
                  <div
                    key={u.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '2fr 100px 80px 120px 160px',
                      padding: '16px 20px',
                      fontSize: '13px',
                      color: 'rgba(255,255,255,0.8)',
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      alignItems: 'center',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <div>
                      <div style={{ fontFamily: 'var(--font-body)', fontWeight: 600 }}>
                        {u.full_name || '—'}
                      </div>
                      <div
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '11px',
                          color: 'rgba(255,255,255,0.4)',
                          marginTop: '4px',
                        }}
                      >
                        {u.email}
                      </div>
                    </div>
                    <div>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '10px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                          color: u.role === 'admin' ? '#c9a84c' : 'rgba(255,255,255,0.35)',
                          border: `1px solid ${u.role === 'admin' ? 'rgba(201,168,76,0.4)' : 'rgba(255,255,255,0.15)'}`,
                          padding: '4px 8px',
                        }}
                      >
                        {u.role}
                      </span>
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px' }}>{u.casoCount}</div>
                    <div
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '11px',
                        color: 'rgba(255,255,255,0.45)',
                      }}
                    >
                      {formatRelativeDate(u.created_at)}
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={() => handleViewAs(u)}
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '10px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.1em',
                          color: '#c9a84c',
                          background: 'transparent',
                          border: '1px solid rgba(201,168,76,0.3)',
                          padding: '6px 12px',
                          cursor: 'pointer',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = 'rgba(201,168,76,0.1)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        Ver como usuario →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
