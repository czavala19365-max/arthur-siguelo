'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthClient } from '@/lib/supabase-auth-client';

const accent = '#c2a46d';
const ink = '#141414';
const muted = '#525252';

export default function RegisterPage() {
  const router = useRouter();
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirm) {
      setError('Las contraseñas no coinciden');
      return;
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    setLoading(true);
    try {
      const { error: signUpError } = await getAuthClient().auth.signUp({
        email,
        password,
        options: {
          data: { full_name: nombre },
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
        },
      });
      if (signUpError) {
        if (signUpError.message.includes('User already registered')) {
          setError('Ya existe una cuenta con ese correo electrónico');
        } else {
          setError(signUpError.message);
        }
      } else {
        setSuccess(true);
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '14px 16px',
    background: '#fafafa',
    border: '1px solid rgba(0, 0, 0, 0.1)',
    borderRadius: 0,
    fontFamily: 'var(--font-body), Inter, sans-serif',
    fontSize: '14px',
    color: ink,
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    marginBottom: '16px',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: 'var(--font-mono)',
    fontSize: '10px',
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    color: muted,
    marginBottom: '8px',
    display: 'block',
  };

  const focusHandlers = {
    onFocus: (e: React.FocusEvent<HTMLInputElement>) => {
      e.currentTarget.style.borderColor = accent;
      e.currentTarget.style.boxShadow = `0 0 0 1px ${accent}`;
      e.currentTarget.style.background = '#ffffff';
    },
    onBlur: (e: React.FocusEvent<HTMLInputElement>) => {
      e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.1)';
      e.currentTarget.style.boxShadow = 'none';
      e.currentTarget.style.background = '#fafafa';
    },
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        minHeight: '100vh',
        overflow: 'auto',
        background: '#000000',
      }}
    >
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '48px 24px',
        }}
      >
        <div
          style={{
            width: '440px',
            maxWidth: '100%',
            background: '#ffffff',
            border: '1px solid rgba(194, 164, 109, 0.35)',
            padding: 0,
            borderRadius: 0,
            animation: 'fadeUp 0.6s ease forwards',
            boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
          }}
        >
          <div
            style={{
              padding: '28px 40px 20px',
              borderBottom: `3px solid ${accent}`,
              background: 'linear-gradient(180deg, rgba(194, 164, 109, 0.08) 0%, #ffffff 100%)',
            }}
          >
            <button
              type="button"
              onClick={() => router.push('/login')}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                textTransform: 'uppercase',
                color: muted,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                marginBottom: '24px',
                display: 'block',
                transition: 'color 0.15s',
              }}
              onMouseOver={e => {
                e.currentTarget.style.color = ink;
              }}
              onMouseOut={e => {
                e.currentTarget.style.color = muted;
              }}
            >
              &larr; Volver
            </button>

            <div
              style={{
                fontFamily: 'var(--font-display), Georgia, serif',
                fontStyle: 'italic',
                fontSize: '36px',
                color: ink,
                lineHeight: 1,
                marginBottom: '12px',
              }}
            >
              arthur
            </div>
            <div
              style={{
                width: '40px',
                height: '2px',
                background: accent,
                marginBottom: '0',
              }}
            />
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                color: '#525252',
                marginTop: '8px',
              }}
            >
              Crear cuenta
            </div>
          </div>

          <div style={{ padding: '32px 40px 40px' }}>
            {success ? (
              <div
                style={{
                  background: 'rgba(194, 164, 109, 0.1)',
                  border: '1px solid rgba(194, 164, 109, 0.35)',
                  padding: '24px',
                }}
              >
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    fontWeight: 600,
                    marginBottom: '12px',
                    color: '#141414',
                  }}
                >
                  Revisa tu correo
                </div>
                <p
                  style={{
                    fontFamily: 'var(--font-body), Inter, sans-serif',
                    fontSize: '14px',
                    lineHeight: 1.6,
                    color: '#141414',
                    margin: '0 0 12px',
                  }}
                >
                  Te enviamos un enlace de confirmación a <strong>{email}</strong>. Haz clic en el
                  enlace para activar tu cuenta e ingresar a arthur.
                </p>
                <p
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    color: '#525252',
                    margin: 0,
                  }}
                >
                  ¿No llegó? Revisa la carpeta de spam.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <label style={labelStyle}>Nombre completo</label>
                <input
                  type="text"
                  required
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  placeholder="Tu nombre completo"
                  style={inputStyle}
                  {...focusHandlers}
                />

                <label style={labelStyle}>Correo electr&oacute;nico</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="tu@correo.com"
                  style={inputStyle}
                  {...focusHandlers}
                />

                <label style={labelStyle}>Contrase&ntilde;a</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  style={inputStyle}
                  {...focusHandlers}
                />
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    color: '#525252',
                    marginTop: '-12px',
                    marginBottom: '16px',
                  }}
                >
                  Mínimo 8 caracteres
                </div>

                <label style={labelStyle}>Confirmar contrase&ntilde;a</label>
                <input
                  type="password"
                  required
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Repite tu contraseña"
                  style={inputStyle}
                  {...focusHandlers}
                />

                {error && (
                  <div
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                      color: '#b91c1c',
                      marginBottom: '12px',
                    }}
                  >
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '16px',
                    background: loading ? 'rgba(194,164,109,0.35)' : accent,
                    border: `1px solid ${loading ? 'rgba(194,164,109,0.5)' : accent}`,
                    borderRadius: 0,
                    color: loading ? 'rgba(20,20,20,0.5)' : ink,
                    fontFamily: 'var(--font-mono)',
                    fontSize: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.15em',
                    fontWeight: 600,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    marginTop: '8px',
                    boxSizing: 'border-box',
                  }}
                >
                  {loading ? 'Creando cuenta...' : 'Crear cuenta'}
                </button>
              </form>
            )}

            <p
              style={{
                textAlign: 'center',
                marginTop: '16px',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: '#525252',
              }}
            >
              ¿Ya tienes cuenta?{' '}
              <a href="/login" style={{ color: '#c2a46d', textDecoration: 'none' }}>
                Inicia sesión
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
