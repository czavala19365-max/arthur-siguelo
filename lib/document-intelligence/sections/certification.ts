import type { DatosJGA } from '../types'
import { LEGAL_PHRASES } from '../constants'

export function generarCertificacion(datos: DatosJGA): string {
  const gg = datos.sociedad.gerente_general
  const ciudad = datos.ciudad ?? 'Lima'
  const certText = LEGAL_PHRASES.certification_ds.replace('{fecha}', datos.fecha)

  return `${certText}.

Lugar: ${ciudad}
Fecha: ${datos.fecha}

_______________________________
${gg.nombre_completo}
Gerente General
DNI N° ${gg.dni}`
}
