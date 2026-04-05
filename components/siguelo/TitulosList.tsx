import { getTitulos } from '@/lib/supabase'
import TitulosClientView from './TitulosClientView'

export default async function TitulosList() {
  let errorMsg: string | null = null
  let titulos: Awaited<ReturnType<typeof getTitulos>> = []

  try {
    titulos = await getTitulos()
  } catch (err) {
    errorMsg = err instanceof Error ? err.message : 'Error al cargar los títulos.'
  }

  if (errorMsg) {
    return (
      <div style={{
        padding: '32px 24px',
        textAlign: 'center',
        border: '1px solid var(--line)',
        background: 'var(--surface)',
        fontFamily: 'var(--font-body)',
        fontSize: '13px',
        color: '#dc2626',
      }}>
        {errorMsg}
      </div>
    )
  }

  if (titulos.length === 0) {
    return (
      <div style={{
        padding: '48px 24px',
        textAlign: 'center',
        border: '1px solid var(--line)',
        background: 'var(--surface)',
        fontFamily: 'var(--font-body)',
        fontSize: '13px',
        color: 'var(--muted)',
      }}>
        No hay títulos registrados aún.
      </div>
    )
  }

  return <TitulosClientView titulos={titulos} />
}
