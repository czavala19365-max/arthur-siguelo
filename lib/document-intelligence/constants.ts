import type { DatosSociedad } from './types'

export const TIPO_SOCIETARIO_NOMBRE: Record<DatosSociedad['tipo_societario'], string> = {
  'S.A.': 'Sociedad Anónima',
  'S.A.C.': 'Sociedad Anónima Cerrada',
  'S.R.L.': 'Sociedad Comercial de Responsabilidad Limitada',
  'S.A.A.': 'Sociedad Anónima Abierta',
}

export const LEGAL_PHRASES = {
  shares: 'íntegramente suscritas y totalmente pagadas',
  quorum_universal:
    'Encontrándose presentes todos los accionistas y representadas la totalidad de las acciones suscritas con derecho a voto de la Sociedad, y estando todos de acuerdo en sesionar, en seguida y sin necesidad de convocatoria previa, al amparo de lo dispuesto en el artículo 120° de la Ley General de Sociedades – Ley N° 26887, se declaró válidamente instalada la junta general de accionistas (en adelante, la "Junta") y abierta la sesión',
  agreement_intro: 'Luego de una breve deliberación, la Junta acordó por unanimidad',
  powers_individual:
    'actuando de forma individual y a sola firma, en nombre y representación de la Sociedad',
  powers_broad: 'sin reserva ni limitación alguna',
  formalization:
    'elaborar, otorgar y suscribir los documentos públicos y/o privados para la formalización e inscripción de los acuerdos adoptados en la presente Junta en los registros públicos, incluyendo las minutas, escrituras públicas y demás documentos necesarios para dichos efectos',
  subsanacion:
    'elaborar, remitir y/o presentar ante los registros públicos escritos de subsanación y demás documentos a efectos de lograr la inscripción de los acuerdos adoptados en la presente Junta en el Registro de Personas Jurídicas de Lima',
  closing:
    'No habiendo más asuntos que tratar, se levantó la sesión siendo las {hora}, no sin antes haberse redactado, leído, aprobado y firmado la presente acta por los accionistas concurrentes, en señal de conformidad',
  certification_ds:
    'de acuerdo con lo dispuesto por el Decreto Supremo No. 006-2013-JUS, certifico en calidad de declaración jurada y bajo responsabilidad que los accionistas y/o los representantes de los accionistas que aparecen mencionados en la introducción del acta de Junta General de Accionistas de fecha {fecha}, son efectivamente tales, y que las firmas allí consignadas corresponden a los mismos',
} as const
