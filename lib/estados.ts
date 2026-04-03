export const ESTADO_STYLES: Record<string, { bg: string; text: string }> = {
  'EN CALIFICACIÓN': { bg: '#EDE9FE', text: '#7C3AED' },
  'PRESENTADO':      { bg: '#CCFBF1', text: '#0D9488' },
  'REINGRESADO':     { bg: '#DBEAFE', text: '#2563EB' },
  'APELADO':         { bg: '#FFEDD5', text: '#F97316' },
  'EN PROCESO':      { bg: '#F3F4F6', text: '#6B7280' },
  'DISTRIBUIDO':     { bg: '#FCE7F3', text: '#EC4899' },
  'LIQUIDADO':       { bg: '#BBF7D0', text: '#15803D' },
  'PRORROGADO':      { bg: '#E0F2FE', text: '#0EA5E9' },
  'OBSERVADO':       { bg: '#FEE2E2', text: '#DC2626' },
  'TACHADO':         { bg: '#F1F5F9', text: '#374151' },
  'INSCRITO':        { bg: '#DCFCE7', text: '#166534' },
}

export const ESTADOS_CON_ESQUELA = new Set(['OBSERVADO', 'LIQUIDADO', 'TACHADO', 'INSCRITO'])

export const LABEL_ESQUELA: Record<string, { singular: string; plural: string }> = {
  'OBSERVADO': { singular: 'Observación',  plural: 'Observaciones' },
  'LIQUIDADO': { singular: 'Liquidación',  plural: 'Liquidaciones' },
  'TACHADO':   { singular: 'Tacha',        plural: 'Tachas'        },
  'INSCRITO':  { singular: 'Inscripción',  plural: 'Inscripciones' },
}

export const STATE_ORDER = [
  'EN CALIFICACIÓN',
  'OBSERVADO',
  'REINGRESADO',
  'APELADO',
  'LIQUIDADO',
  'PRORROGADO',
  'DISTRIBUIDO',
  'INSCRITO',
  'TACHADO',
]
