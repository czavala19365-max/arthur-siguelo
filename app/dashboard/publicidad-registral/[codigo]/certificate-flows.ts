export type CertificateFlowKey = 'vigencia_poder_personas_juridicas'

export type CertificateFlowConfig = {
  key: CertificateFlowKey
  certificadoID: number
  codGrupoLibroArea: number
  nombreCertificado: string
  desGrupoLibroArea: string
  tpoCertificado: string
}

export const CERTIFICATE_FLOW_BY_ID: Record<number, CertificateFlowConfig> = {
  76: {
    key: 'vigencia_poder_personas_juridicas',
    certificadoID: 76,
    codGrupoLibroArea: 3,
    nombreCertificado: 'Certificado de Vigencia de Poder de Personas Jurídicas',
    desGrupoLibroArea: 'Personas Juridicas',
    tpoCertificado: 'G',
  },
}

export function getCertificateFlow(certificadoID: number | null | undefined): CertificateFlowConfig | null {
  if (!certificadoID) return null
  return CERTIFICATE_FLOW_BY_ID[certificadoID] ?? null
}
