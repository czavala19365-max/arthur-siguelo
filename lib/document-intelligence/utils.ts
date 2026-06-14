import { TIPO_SOCIETARIO_NOMBRE } from './constants'
import type { DatosSociedad } from './types'

export function nombreTipoSocietario(tipo: DatosSociedad['tipo_societario']): string {
  return TIPO_SOCIETARIO_NOMBRE[tipo] ?? tipo
}

export function formatMonto(monto: number, moneda: 'PEN' | 'USD'): string {
  const formatted = monto.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return moneda === 'USD' ? `US$ ${formatted.replace(/,/g, "'")}` : `S/ ${formatted}`
}

export function simboloMoneda(moneda: 'PEN' | 'USD'): string {
  return moneda === 'USD' ? 'US$' : 'S/'
}

export function valorTexto(val: unknown, fallback = '[●]'): string {
  if (val == null || val === '') return fallback
  return String(val)
}

export function pluralAcciones(n: number): string {
  return n === 1 ? 'acción' : 'acciones'
}
