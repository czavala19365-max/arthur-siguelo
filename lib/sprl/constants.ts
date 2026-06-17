/**
 * Oficinas registrales SUNARP disponibles en SPRL.
 * Lista real del dropdown de https://sprl.sunarp.gob.pe
 */
export const OFICINAS_REGISTRALES_SPRL = [
  { value: 'IX - LIMA', label: 'Lima' },
  { value: 'I - PIURA', label: 'Piura' },
  { value: 'II - CHICLAYO', label: 'Chiclayo' },
  { value: 'III - MOYOBAMBA', label: 'Moyobamba' },
  { value: 'IV - IQUITOS', label: 'Iquitos' },
  { value: 'V - TRUJILLO', label: 'Trujillo' },
  { value: 'VI - PUCALLPA', label: 'Pucallpa' },
  { value: 'VII - HUANCAYO', label: 'Huancayo' },
  { value: 'VIII - HUARAZ', label: 'Huaraz' },
  { value: 'X - CUSCO', label: 'Cusco' },
  { value: 'XI - AREQUIPA', label: 'Arequipa' },
  { value: 'XII - TACNA', label: 'Tacna' },
  { value: 'XIII - ICA', label: 'Ica' },
  { value: 'XIV - AYACUCHO', label: 'Ayacucho' },
] as const

/** URL base del portal SPRL (para referencia; el scraper corre en Railway) */
export const SPRL_BASE_URL = 'https://sprl.sunarp.gob.pe'
export const SPRL_LOGIN_URL = 'https://sprl.sunarp.gob.pe/sprl/ingreso'
