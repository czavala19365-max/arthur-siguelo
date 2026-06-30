import type { DatosJGA } from '../types'
import { LEGAL_PHRASES } from '../constants'

export function generarQuorum(datos: DatosJGA): string {
  const presidencia = `Actuó como Presidente de la Junta ${datos.presidente}, designado por unanimidad entre los presentes. Actuó como Secretario ${datos.secretario}, igualmente designado por unanimidad entre los presentes.`

  const quorum =
    datos.tipo_convocatoria === 'universal'
      ? LEGAL_PHRASES.quorum_universal
      : `Conforme a la convocatoria previamente cursada a los accionistas, y encontrándose presentes accionistas que representan el quórum legal requerido conforme al estatuto social y la Ley General de Sociedades – Ley N° 26887, se declaró válidamente instalada la junta general de accionistas (en adelante, la "Junta") y abierta la sesión.`

  return `${presidencia}\n\n${quorum}`
}
