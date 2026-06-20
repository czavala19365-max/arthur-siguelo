import type { DatosJGA, SeccionActa } from './types'
import { generarIntroduccion } from './sections/introduction'
import { generarQuorum } from './sections/quorum'
import { generarAgenda } from './sections/agenda'
import { generarDesarrollo } from './sections/development'
import { generarCierre } from './sections/formalization'
import { generarFirmas } from './sections/signatures'
import { generarCertificacion } from './sections/certification'

export type { SeccionActa }

export async function generarActaJGA(datos: DatosJGA): Promise<SeccionActa[]> {
  const secciones: SeccionActa[] = []

  secciones.push({
    tipo: 'encabezado',
    contenido: `JUNTA GENERAL DE ACCIONISTAS DE\n${datos.sociedad.razon_social.toUpperCase()}`,
  })

  secciones.push({
    tipo: 'introduccion',
    contenido: generarIntroduccion(datos),
  })

  secciones.push({
    tipo: 'quorum',
    titulo: 'PRESIDENCIA Y SECRETARÍA',
    contenido: generarQuorum(datos),
  })

  secciones.push({
    tipo: 'agenda',
    titulo: 'AGENDA',
    contenido: generarAgenda(datos),
  })

  for (const punto of datos.agenda) {
    const { desarrollo, acuerdo } = await generarDesarrollo(punto, datos)
    secciones.push({
      tipo: 'desarrollo',
      titulo: punto.titulo.toUpperCase(),
      contenido: desarrollo,
    })
    secciones.push({
      tipo: 'acuerdo',
      titulo: 'ACUERDO',
      contenido: acuerdo,
    })
  }

  secciones.push({
    tipo: 'cierre',
    contenido: generarCierre(datos),
  })

  secciones.push({
    tipo: 'firmas',
    contenido: generarFirmas(datos),
  })

  secciones.push({
    tipo: 'certificacion',
    titulo: 'CERTIFICACIÓN',
    contenido: generarCertificacion(datos),
  })

  return secciones
}

export function seccionesToTexto(secciones: SeccionActa[]): string {
  return secciones
    .map(s => {
      const titulo = s.titulo ? `\n${s.titulo}\n\n` : '\n'
      return `${titulo}${s.contenido}`
    })
    .join('\n\n')
}
