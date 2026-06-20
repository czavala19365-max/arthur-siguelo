import type { DatosJGA } from '../types'

export function generarAgenda(datos: DatosJGA): string {
  if (datos.agenda.length === 0) {
    return 'Sin puntos de agenda registrados.'
  }
  return datos.agenda.map(p => `${p.numero}. ${p.titulo}`).join('\n')
}
