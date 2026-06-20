import { LEGAL_PHRASES } from '../constants'

export const CLAUSULAS_PREDEFINIDAS = {
  quorum_universal: LEGAL_PHRASES.quorum_universal,
  acuerdo_unanimidad: LEGAL_PHRASES.agreement_intro,
  poderes_amplios: `${LEGAL_PHRASES.powers_individual}, ${LEGAL_PHRASES.powers_broad}`,
  formalizacion: LEGAL_PHRASES.formalization,
  subsanacion: LEGAL_PHRASES.subsanacion,
  cierre: LEGAL_PHRASES.closing,
  certificacion: LEGAL_PHRASES.certification_ds,
} as const

export function interpolarClausula(contenido: string, variables: Record<string, string>): string {
  let out = contenido
  for (const [k, v] of Object.entries(variables)) {
    out = out.replace(new RegExp(`\\{${k}\\}`, 'g'), v)
  }
  return out
}
