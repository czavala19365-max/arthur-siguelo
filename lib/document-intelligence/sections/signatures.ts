import type { DatosJGA } from '../types'

export function generarFirmas(datos: DatosJGA): string {
  const firmantes: Array<{ nombre: string; cargo: string }> = []

  for (const a of datos.accionistas) {
    if (a.tipo === 'persona_juridica' && a.representantes?.length) {
      for (const r of a.representantes) {
        firmantes.push({
          nombre: r.nombre_completo,
          cargo: `Representante de ${a.razon_social ?? a.nombre_completo}`,
        })
      }
    } else {
      firmantes.push({ nombre: a.nombre_completo, cargo: 'Accionista' })
    }
  }

  firmantes.push({ nombre: datos.presidente, cargo: 'Presidente de la Junta' })
  firmantes.push({ nombre: datos.secretario, cargo: 'Secretario de la Junta' })

  return firmantes.map(f => `${f.nombre}\n${f.cargo}`).join('\n\n')
}

export function getFirmantesTabla(datos: DatosJGA): Array<{ nombre: string; cargo: string }> {
  const lines = generarFirmas(datos).split('\n\n')
  return lines.map(block => {
    const [nombre, cargo] = block.split('\n')
    return { nombre: nombre ?? '', cargo: cargo ?? '' }
  })
}
