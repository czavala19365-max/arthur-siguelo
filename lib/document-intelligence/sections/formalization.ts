import type { DatosJGA } from '../types'
import { LEGAL_PHRASES } from '../constants'

export function generarCierre(datos: DatosJGA): string {
  const closing = LEGAL_PHRASES.closing.replace('{hora}', datos.hora_fin)
  const formalizacion = `Asimismo, la Junta acordó designar a ${datos.apoderado_formalizacion.nombre_completo}, identificado con DNI N° ${datos.apoderado_formalizacion.dni}, como apoderado de la Sociedad a efectos de ${LEGAL_PHRASES.formalization}, así como para ${LEGAL_PHRASES.subsanacion}.`
  return `${closing}\n\n${formalizacion}`
}
