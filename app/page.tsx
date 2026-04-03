import { Suspense } from 'react'
import TituloForm from '@/components/TituloForm'
import TitulosList from '@/components/TitulosList'
import MetricsCards from '@/components/MetricsCards'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header style={{ backgroundColor: '#1e3a5f' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-base font-bold text-white leading-none tracking-tight">
              Arthur Legal AI
            </h1>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.55)' }}>
              Monitor de títulos registrales SUNARP
            </p>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Métricas */}
        <Suspense fallback={
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 px-5 py-4 h-20 animate-pulse" />
            ))}
          </div>
        }>
          <MetricsCards />
        </Suspense>

        {/* Formulario */}
        <TituloForm />

        {/* Lista */}
        <Suspense
          fallback={
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-12 text-center text-sm text-gray-400">
              Cargando títulos…
            </div>
          }
        >
          <TitulosList />
        </Suspense>
      </main>
    </div>
  )
}
