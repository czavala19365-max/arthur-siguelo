import type { AccessoryDocumentRule, DocumentTypeSchema } from './types'

/**
 * Registro declarativo de tipos documentales — redactor de contratos bajo
 * legislación peruana (Código Civil, D.L. 295, y normas especiales vigentes).
 * Agregar un tipo nuevo = agregar un objeto acá, sin tocar componentes de UI
 * (DynamicDrafterForm los renderiza a partir de `fields`).
 */

// El mutuo genera automáticamente un pagaré con los datos derivados del contrato.
const MUTUO_ACCESSORY_RULES: AccessoryDocumentRule[] = [
  {
    id: 'pagare',
    condition: () => true,
    deriveFields: f => ({
      emitente: f.mutuatario ?? '',
      beneficiario: f.mutuante ?? '',
      monto: f.monto ?? '',
      interes: f.interes ?? '',
      vencimiento: f.plazo ?? '',
      lugar_pago: f.lugar_pago ?? '',
    }),
  },
]

export const DOCUMENT_SCHEMAS: Record<string, DocumentTypeSchema> = {
  mutuo: {
    id: 'mutuo',
    label: 'Contrato de mutuo (préstamo)',
    supportedJurisdictions: ['peru'],
    role: 'primary',
    accessoryDocuments: MUTUO_ACCESSORY_RULES,
    fields: [
      { id: 'mutuante', label: 'Mutuante / prestamista (nombre, DNI o RUC, domicilio)', type: 'textarea', rows: 2, required: true },
      { id: 'mutuatario', label: 'Mutuatario / prestatario (nombre, DNI o RUC, domicilio)', type: 'textarea', rows: 2, required: true },
      { id: 'monto', label: 'Monto del préstamo y moneda', type: 'textarea', rows: 2, required: true },
      { id: 'interes', label: 'Interés (tasa compensatoria y moratoria — TEA)', type: 'textarea', rows: 2 },
      { id: 'plazo', label: 'Plazo y cronograma de pagos', type: 'textarea', rows: 3 },
      { id: 'forma_desembolso', label: 'Forma y fecha de desembolso', type: 'textarea', rows: 2 },
      { id: 'lugar_pago', label: 'Lugar y forma de pago', type: 'textarea', rows: 2 },
      { id: 'garantias', label: 'Garantías otorgadas (si las hubiera)', type: 'textarea', rows: 2 },
      { id: 'clausulas_especiales', label: 'Cláusulas especiales adicionales', type: 'textarea', rows: 3 },
    ],
  },
  compraventa: {
    id: 'compraventa',
    label: 'Contrato de compraventa',
    supportedJurisdictions: ['peru'],
    role: 'primary',
    fields: [
      {
        id: 'tipo_bien',
        label: 'Tipo de bien',
        type: 'select',
        required: true,
        options: [
          { value: 'mueble', label: 'Bien mueble' },
          { value: 'inmueble', label: 'Bien inmueble' },
        ],
      },
      { id: 'vendedor', label: 'Vendedor (nombre, DNI o RUC, estado civil, domicilio)', type: 'textarea', rows: 2, required: true },
      { id: 'comprador', label: 'Comprador (nombre, DNI o RUC, estado civil, domicilio)', type: 'textarea', rows: 2, required: true },
      { id: 'bien', label: 'Descripción del bien (si es inmueble: partida registral, área, linderos y medidas perimétricas)', type: 'textarea', rows: 3, required: true },
      { id: 'precio', label: 'Precio pactado y moneda', type: 'textarea', rows: 2, required: true },
      { id: 'forma_pago', label: 'Forma y oportunidad de pago', type: 'textarea', rows: 2 },
      { id: 'entrega', label: 'Entrega del bien (lugar y oportunidad)', type: 'textarea', rows: 2 },
      { id: 'saneamiento', label: 'Saneamiento (evicción, vicios ocultos, hecho propio)', type: 'textarea', rows: 2 },
      { id: 'gastos_tributos', label: 'Gastos y tributos (notariales, registrales, alcabala)', type: 'textarea', rows: 2 },
      { id: 'clausulas_especiales', label: 'Cláusulas especiales adicionales', type: 'textarea', rows: 3 },
    ],
  },
  comodato: {
    id: 'comodato',
    label: 'Contrato de comodato',
    supportedJurisdictions: ['peru'],
    role: 'primary',
    fields: [
      { id: 'comodante', label: 'Comodante (nombre, DNI o RUC, domicilio)', type: 'textarea', rows: 2, required: true },
      { id: 'comodatario', label: 'Comodatario (nombre, DNI o RUC, domicilio)', type: 'textarea', rows: 2, required: true },
      { id: 'bien', label: 'Descripción del bien entregado', type: 'textarea', rows: 3, required: true },
      { id: 'destino', label: 'Uso o destino permitido del bien', type: 'textarea', rows: 2 },
      { id: 'plazo', label: 'Plazo del comodato', type: 'textarea', rows: 2 },
      { id: 'devolucion', label: 'Condiciones de devolución', type: 'textarea', rows: 2 },
      { id: 'gastos_conservacion', label: 'Gastos de conservación y mantenimiento', type: 'textarea', rows: 2 },
      { id: 'clausulas_especiales', label: 'Cláusulas especiales adicionales', type: 'textarea', rows: 3 },
    ],
  },
  permuta: {
    id: 'permuta',
    label: 'Contrato de permuta',
    supportedJurisdictions: ['peru'],
    role: 'primary',
    fields: [
      { id: 'permutante_uno', label: 'Primer permutante (nombre, DNI o RUC, domicilio)', type: 'textarea', rows: 2, required: true },
      { id: 'permutante_dos', label: 'Segundo permutante (nombre, DNI o RUC, domicilio)', type: 'textarea', rows: 2, required: true },
      { id: 'bien_uno', label: 'Bien que entrega el primer permutante', type: 'textarea', rows: 3, required: true },
      { id: 'bien_dos', label: 'Bien que entrega el segundo permutante', type: 'textarea', rows: 3, required: true },
      { id: 'compensacion', label: 'Compensación en dinero por diferencia de valor (si la hubiera)', type: 'textarea', rows: 2 },
      { id: 'entrega', label: 'Entrega de los bienes (lugar y oportunidad)', type: 'textarea', rows: 2 },
      { id: 'saneamiento', label: 'Saneamiento (evicción y vicios ocultos)', type: 'textarea', rows: 2 },
      { id: 'clausulas_especiales', label: 'Cláusulas especiales adicionales', type: 'textarea', rows: 3 },
    ],
  },
  mandato: {
    id: 'mandato',
    label: 'Contrato de mandato',
    supportedJurisdictions: ['peru'],
    role: 'primary',
    fields: [
      { id: 'mandante', label: 'Mandante (nombre, DNI o RUC, domicilio)', type: 'textarea', rows: 2, required: true },
      { id: 'mandatario', label: 'Mandatario (nombre, DNI o RUC, domicilio)', type: 'textarea', rows: 2, required: true },
      {
        id: 'modalidad',
        label: 'Modalidad',
        type: 'select',
        options: [
          { value: 'con_representacion', label: 'Con representación' },
          { value: 'sin_representacion', label: 'Sin representación' },
        ],
      },
      { id: 'objeto', label: 'Objeto del mandato (actos y gestiones encargadas)', type: 'textarea', rows: 3, required: true },
      { id: 'retribucion', label: 'Retribución del mandatario (si es oneroso)', type: 'textarea', rows: 2 },
      { id: 'plazo', label: 'Plazo del mandato', type: 'textarea', rows: 2 },
      { id: 'obligaciones', label: 'Obligaciones específicas del mandatario (rendición de cuentas, etc.)', type: 'textarea', rows: 2 },
      { id: 'clausulas_especiales', label: 'Cláusulas especiales adicionales', type: 'textarea', rows: 3 },
    ],
  },
  poder: {
    id: 'poder',
    label: 'Poder',
    supportedJurisdictions: ['peru'],
    role: 'primary',
    fields: [
      {
        id: 'tipo_poder',
        label: 'Tipo de poder',
        type: 'select',
        required: true,
        options: [
          { value: 'general', label: 'Poder general (actos de administración)' },
          { value: 'especifico', label: 'Poder específico (acto o negocio determinado)' },
        ],
      },
      { id: 'poderdante', label: 'Poderdante (nombre, DNI o RUC, estado civil, domicilio)', type: 'textarea', rows: 2, required: true },
      { id: 'apoderado', label: 'Apoderado (nombre, DNI, domicilio)', type: 'textarea', rows: 2, required: true },
      { id: 'facultades', label: 'Facultades otorgadas (detalle de los actos que podrá realizar)', type: 'textarea', rows: 4, required: true },
      { id: 'vigencia', label: 'Vigencia o plazo del poder', type: 'textarea', rows: 2 },
      { id: 'sustitucion', label: 'Facultad de delegar o sustituir el poder', type: 'textarea', rows: 2 },
      { id: 'formalidad', label: 'Formalidad (escritura pública, carta poder con firma legalizada, etc.)', type: 'textarea', rows: 2 },
      { id: 'clausulas_especiales', label: 'Cláusulas especiales adicionales', type: 'textarea', rows: 3 },
    ],
  },
  arrendamiento: {
    id: 'arrendamiento',
    label: 'Contrato de arrendamiento',
    supportedJurisdictions: ['peru'],
    role: 'primary',
    fields: [
      { id: 'arrendador', label: 'Arrendador (nombre, DNI o RUC, domicilio)', type: 'textarea', rows: 2, required: true },
      { id: 'arrendatario', label: 'Arrendatario (nombre, DNI o RUC, domicilio)', type: 'textarea', rows: 2, required: true },
      { id: 'bien', label: 'Bien arrendado (si es inmueble: dirección, partida registral)', type: 'textarea', rows: 3, required: true },
      { id: 'destino', label: 'Uso o destino del bien', type: 'textarea', rows: 2 },
      { id: 'renta', label: 'Renta / merced conductiva (monto, moneda y periodicidad)', type: 'textarea', rows: 2, required: true },
      { id: 'plazo', label: 'Plazo del arrendamiento', type: 'textarea', rows: 2 },
      { id: 'garantia', label: 'Garantía (depósito, fiador solidario, etc.)', type: 'textarea', rows: 2 },
      { id: 'servicios_gastos', label: 'Servicios, mantenimiento y tributos (a cargo de quién)', type: 'textarea', rows: 2 },
      { id: 'clausulas_especiales', label: 'Cláusulas especiales adicionales', type: 'textarea', rows: 3 },
    ],
  },
  garantia: {
    id: 'garantia',
    label: 'Contrato de garantía',
    supportedJurisdictions: ['peru'],
    role: 'primary',
    fields: [
      {
        id: 'tipo_garantia',
        label: 'Tipo de garantía',
        type: 'select',
        required: true,
        options: [
          { value: 'hipoteca', label: 'Hipoteca' },
          { value: 'garantia_mobiliaria', label: 'Garantía mobiliaria' },
          { value: 'fianza_solidaria', label: 'Fianza solidaria' },
        ],
      },
      { id: 'garante', label: 'Garante / constituyente / fiador (nombre, DNI o RUC, domicilio)', type: 'textarea', rows: 2, required: true },
      { id: 'acreedor', label: 'Acreedor garantizado (nombre, DNI o RUC, domicilio)', type: 'textarea', rows: 2, required: true },
      { id: 'deudor', label: 'Deudor de la obligación principal (si es distinto del garante)', type: 'textarea', rows: 2 },
      { id: 'obligacion_garantizada', label: 'Obligación garantizada (origen, monto y plazo)', type: 'textarea', rows: 3, required: true },
      { id: 'bien_gravado', label: 'Bien afectado (hipoteca: inmueble y partida registral; mobiliaria: bien mueble y descripción). No aplica a la fianza.', type: 'textarea', rows: 3 },
      { id: 'monto_gravamen', label: 'Monto del gravamen / responsabilidad', type: 'textarea', rows: 2 },
      { id: 'ejecucion', label: 'Pacto de ejecución y valorización', type: 'textarea', rows: 2 },
      { id: 'clausulas_especiales', label: 'Cláusulas especiales adicionales', type: 'textarea', rows: 3 },
    ],
  },
  fideicomiso: {
    id: 'fideicomiso',
    label: 'Contrato de fideicomiso',
    supportedJurisdictions: ['peru'],
    role: 'primary',
    fields: [
      { id: 'fideicomitente', label: 'Fideicomitente (nombre, DNI o RUC, domicilio)', type: 'textarea', rows: 2, required: true },
      { id: 'fiduciario', label: 'Fiduciario (empresa autorizada y supervisada por la SBS)', type: 'textarea', rows: 2, required: true },
      { id: 'fideicomisario', label: 'Fideicomisario / beneficiario', type: 'textarea', rows: 2, required: true },
      { id: 'patrimonio', label: 'Bienes que integran el patrimonio fideicometido', type: 'textarea', rows: 3, required: true },
      { id: 'finalidad', label: 'Finalidad del fideicomiso', type: 'textarea', rows: 3, required: true },
      { id: 'plazo', label: 'Plazo (máximo 30 años, salvo excepciones de ley)', type: 'textarea', rows: 2 },
      { id: 'facultades_obligaciones', label: 'Facultades y obligaciones del fiduciario', type: 'textarea', rows: 3 },
      { id: 'factor_fiduciario', label: 'Factor fiduciario y comisión del fiduciario', type: 'textarea', rows: 2 },
      { id: 'clausulas_especiales', label: 'Cláusulas especiales adicionales', type: 'textarea', rows: 3 },
    ],
  },
  usufructo: {
    id: 'usufructo',
    label: 'Contrato de usufructo',
    supportedJurisdictions: ['peru'],
    role: 'primary',
    fields: [
      { id: 'nudo_propietario', label: 'Nudo propietario / constituyente (nombre, DNI o RUC, domicilio)', type: 'textarea', rows: 2, required: true },
      { id: 'usufructuario', label: 'Usufructuario (nombre, DNI o RUC, domicilio)', type: 'textarea', rows: 2, required: true },
      { id: 'bien', label: 'Bien sobre el que se constituye el usufructo', type: 'textarea', rows: 3, required: true },
      { id: 'plazo', label: 'Plazo (máx. 30 años si el usufructuario es persona jurídica; vitalicio si es persona natural)', type: 'textarea', rows: 2 },
      { id: 'alcance_disfrute', label: 'Alcance del uso y disfrute (frutos, mejoras)', type: 'textarea', rows: 2 },
      { id: 'obligaciones', label: 'Obligaciones del usufructuario (inventario, conservación, garantía)', type: 'textarea', rows: 2 },
      { id: 'retribucion', label: 'Retribución o contraprestación (si es oneroso)', type: 'textarea', rows: 2 },
      { id: 'clausulas_especiales', label: 'Cláusulas especiales adicionales', type: 'textarea', rows: 3 },
    ],
  },
  pagare: {
    id: 'pagare',
    label: 'Pagaré',
    supportedJurisdictions: ['peru'],
    role: 'primary',
    fields: [
      { id: 'emitente', label: 'Emitente / girador (nombre, DNI o RUC, domicilio)', type: 'textarea', rows: 2, required: true },
      { id: 'beneficiario', label: 'Beneficiario / tomador (nombre, DNI o RUC, domicilio)', type: 'textarea', rows: 2, required: true },
      { id: 'monto', label: 'Importe y moneda (en números y letras)', type: 'textarea', rows: 2, required: true },
      { id: 'interes', label: 'Interés (tasa compensatoria y moratoria)', type: 'textarea', rows: 2 },
      { id: 'vencimiento', label: 'Forma y fecha de vencimiento', type: 'textarea', rows: 2, required: true },
      { id: 'lugar_pago', label: 'Lugar de pago', type: 'textarea', rows: 2 },
      { id: 'garantias', label: 'Garantías del pagaré (si las hubiera)', type: 'textarea', rows: 2 },
      { id: 'clausulas_especiales', label: 'Cláusulas o pactos adicionales (prórroga, aval, etc.)', type: 'textarea', rows: 3 },
    ],
  },
}

export const DOCUMENT_TYPE_IDS = Object.keys(DOCUMENT_SCHEMAS)

/** Ids elegibles en el selector de "Tipo de documento" — excluye los accesorios que solo se generan derivados de un primario. */
export const PRIMARY_DOCUMENT_TYPE_IDS = DOCUMENT_TYPE_IDS.filter(id => DOCUMENT_SCHEMAS[id].role !== 'accessory')

export function getDocumentSchema(id: string): DocumentTypeSchema {
  return DOCUMENT_SCHEMAS[id] ?? DOCUMENT_SCHEMAS.mutuo
}
