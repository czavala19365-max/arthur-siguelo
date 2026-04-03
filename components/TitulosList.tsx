import { getTitulos } from '@/lib/supabase'
import type { Titulo } from '@/types'
import { STATE_ORDER } from '@/lib/estados'
import TituloSection from './TituloSection'

export default async function TitulosList() {
  let titulos: Titulo[] = []
  let errorMsg: string | null = null

  try {
    titulos = await getTitulos()
  } catch (err) {
    errorMsg = err instanceof Error ? err.message : 'Error al cargar los títulos.'
  }

  if (errorMsg) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-8 text-center text-sm text-red-600">
        {errorMsg}
      </div>
    )
  }

  if (titulos.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-12 text-center text-sm text-gray-400">
        No hay títulos registrados aún.
      </div>
    )
  }

  // Agrupar por estado normalizado
  const grouped = new Map<string, Titulo[]>()

  for (const t of titulos) {
    const key = (t.ultimo_estado ?? '').toUpperCase().trim()
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(t)
  }

  // Secciones en el orden definido
  const sections: { estado: string; titulos: Titulo[] }[] = []
  for (const estado of STATE_ORDER) {
    const items = grouped.get(estado)
    if (items && items.length > 0) {
      sections.push({ estado, titulos: items })
      grouped.delete(estado)
    }
  }

  // Resto de estados no contemplados en STATE_ORDER (Otros)
  const otros: Titulo[] = []
  for (const items of grouped.values()) {
    otros.push(...items)
  }
  if (otros.length > 0) {
    sections.push({ estado: 'OTROS', titulos: otros })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-base font-semibold text-gray-700">Títulos monitoreados</h2>
        <span className="text-sm text-gray-400">
          {titulos.length} {titulos.length === 1 ? 'título' : 'títulos'} · {sections.length} {sections.length === 1 ? 'sección' : 'secciones'}
        </span>
      </div>

      {sections.map(({ estado, titulos: items }) => (
        <TituloSection key={estado} estado={estado} titulos={items} />
      ))}
    </div>
  )
}
