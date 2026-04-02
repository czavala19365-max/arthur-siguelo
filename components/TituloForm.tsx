'use client'

import { useActionState, useEffect, useRef } from 'react'
import { agregarTitulo } from '@/app/actions'
import { OFICINAS_SUNARP } from '@/lib/oficinas'
import type { TituloFormState } from '@/types'

const initialState: TituloFormState = {}

export default function TituloForm() {
  const [state, action, pending] = useActionState(agregarTitulo, initialState)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.success) formRef.current?.reset()
  }, [state.success])

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-5">
        Agregar título registral
      </h2>

      {state.error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}
      {state.success && (
        <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          Título registrado correctamente.
        </div>
      )}

      <form ref={formRef} action={action} className="space-y-4">
        {/* Oficina registral */}
        <div>
          <label htmlFor="oficina_registral" className="block text-sm font-medium text-gray-700 mb-1">
            Oficina registral
          </label>
          <select
            id="oficina_registral"
            name="oficina_registral"
            required
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Seleccionar oficina…</option>
            {OFICINAS_SUNARP.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>

        {/* Año y número en fila */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="anio_titulo" className="block text-sm font-medium text-gray-700 mb-1">
              Año del título
            </label>
            <input
              id="anio_titulo"
              name="anio_titulo"
              type="number"
              min={1900}
              max={new Date().getFullYear() + 1}
              placeholder={String(new Date().getFullYear())}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="numero_titulo" className="block text-sm font-medium text-gray-700 mb-1">
              Número del título
            </label>
            <input
              id="numero_titulo"
              name="numero_titulo"
              type="text"
              placeholder="Ej. 431663"
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Nombre cliente */}
        <div>
          <label htmlFor="nombre_cliente" className="block text-sm font-medium text-gray-700 mb-1">
            Nombre del cliente
          </label>
          <input
            id="nombre_cliente"
            name="nombre_cliente"
            type="text"
            placeholder="Nombre completo"
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Email y WhatsApp en fila */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="email_cliente" className="block text-sm font-medium text-gray-700 mb-1">
              Email del cliente
            </label>
            <input
              id="email_cliente"
              name="email_cliente"
              type="email"
              placeholder="correo@ejemplo.com"
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="whatsapp_cliente" className="block text-sm font-medium text-gray-700 mb-1">
              WhatsApp del cliente
            </label>
            <input
              id="whatsapp_cliente"
              name="whatsapp_cliente"
              type="tel"
              placeholder="+51 999 999 999"
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {pending ? 'Guardando…' : 'Agregar título'}
        </button>
      </form>
    </div>
  )
}
