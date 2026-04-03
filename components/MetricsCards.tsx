import { getTitulos } from '@/lib/supabase'

export default async function MetricsCards() {
  let titulos: Awaited<ReturnType<typeof getTitulos>> = []
  try {
    titulos = await getTitulos()
  } catch {
    return null
  }

  const total = titulos.length
  const observados = titulos.filter(t => t.ultimo_estado?.toUpperCase() === 'OBSERVADO').length
  const inscritos = titulos.filter(t => t.ultimo_estado?.toUpperCase() === 'INSCRITO').length
  const enProceso = titulos.filter(t => {
    const s = t.ultimo_estado?.toUpperCase()
    return s && !['INSCRITO', 'OBSERVADO', 'TACHADO', 'LIQUIDADO'].includes(s)
  }).length

  const cards = [
    {
      label: 'Total',
      value: total,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
      valueColor: 'text-gray-900',
    },
    {
      label: 'Observados',
      value: observados,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      iconBg: 'bg-red-50',
      iconColor: 'text-red-500',
      valueColor: 'text-red-600',
    },
    {
      label: 'Inscritos',
      value: inscritos,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      iconBg: 'bg-green-50',
      iconColor: 'text-green-600',
      valueColor: 'text-green-700',
    },
    {
      label: 'En proceso',
      value: enProceso,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-500',
      valueColor: 'text-amber-700',
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div key={card.label} className="bg-white rounded-2xl shadow-sm border border-gray-100 px-5 py-4 flex items-center gap-4">
          <div className={`${card.iconBg} ${card.iconColor} rounded-xl p-2.5 flex-shrink-0`}>
            {card.icon}
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">{card.label}</p>
            <p className={`text-2xl font-bold leading-tight ${card.valueColor}`}>{card.value}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
