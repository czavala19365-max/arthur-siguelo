import { getTitulos } from '@/lib/supabase'
import type { Titulo } from '@/types'

function TituloRow({ titulo }: { titulo: Titulo }) {
  const fecha = new Date(titulo.created_at).toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3 text-sm text-gray-900">
        <div className="font-medium">{titulo.numero_titulo}</div>
        <div className="text-xs text-gray-500">{titulo.anio_titulo}</div>
      </td>
      <td className="px-4 py-3 text-sm text-gray-600 max-w-48">
        <span className="truncate block" title={titulo.oficina_registral}>
          {titulo.oficina_registral}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-gray-900">{titulo.nombre_cliente}</td>
      <td className="px-4 py-3 text-sm text-gray-600">
        <a
          href={`mailto:${titulo.email_cliente}`}
          className="hover:text-blue-600 transition-colors"
        >
          {titulo.email_cliente}
        </a>
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">
        <a
          href={`https://wa.me/${titulo.whatsapp_cliente.replace(/\D/g, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-green-600 transition-colors"
        >
          {titulo.whatsapp_cliente}
        </a>
      </td>
      <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{fecha}</td>
    </tr>
  )
}

export default async function TitulosList() {
  let titulos: Titulo[] = []
  let errorMsg: string | null = null

  try {
    titulos = await getTitulos()
  } catch (err) {
    errorMsg = err instanceof Error ? err.message : 'Error al cargar los títulos.'
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          Títulos monitoreados
        </h2>
        <span className="text-sm text-gray-500">
          {titulos.length} {titulos.length === 1 ? 'registro' : 'registros'}
        </span>
      </div>

      {errorMsg ? (
        <div className="px-6 py-8 text-center text-sm text-red-600">{errorMsg}</div>
      ) : titulos.length === 0 ? (
        <div className="px-6 py-12 text-center text-sm text-gray-400">
          No hay títulos registrados aún.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-3">Nº Título</th>
                <th className="px-4 py-3">Oficina registral</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">WhatsApp</th>
                <th className="px-4 py-3">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {titulos.map((t) => (
                <TituloRow key={t.id} titulo={t} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
