import { getTitulosArchivados, getTitulosEliminados } from '@/lib/supabase'
import TitulosGestionClient from './TitulosGestionClient'

export default async function TitulosGestionList({ tipo }: { tipo: 'archivado' | 'eliminado' }) {
  let errorMsg: string | null = null
  let titulos: Awaited<ReturnType<typeof getTitulosArchivados>> = []

  try {
    titulos = tipo === 'archivado'
      ? await getTitulosArchivados()
      : await getTitulosEliminados()
  } catch (err) {
    errorMsg = err instanceof Error ? err.message : 'Error al cargar los títulos.'
  }

  if (errorMsg) {
    return (
      <div style={{
        padding: '32px 24px', textAlign: 'center',
        border: '1px solid var(--line)', background: 'var(--surface)',
        fontFamily: 'var(--font-body)', fontSize: '13px', color: '#dc2626',
      }}>
        {errorMsg}
      </div>
    )
  }

  if (titulos.length === 0) {
    return (
      <div style={{
        padding: '64px 24px', textAlign: 'center',
        border: '1px solid var(--line)', background: 'var(--surface)',
      }}>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: '11px',
          textTransform: 'uppercase', letterSpacing: '0.12em',
          color: 'var(--muted)',
        }}>
          {tipo === 'archivado' ? 'No hay títulos archivados' : 'No hay títulos eliminados'}
        </div>
      </div>
    )
  }

  return <TitulosGestionClient titulos={titulos} tipo={tipo} />
}
