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

<<<<<<< HEAD
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
      { id: 'condiciones_precedentes', label: 'Condiciones precedentes al desembolso (opcional — fideicomiso, pagaré, bloqueo registral, etc.)', type: 'textarea', rows: 3 },
      {
        id: 'solucion_controversias',
        label: 'Solución de controversias',
        type: 'select',
        options: [
          { value: 'judicial_lima', label: 'Judicial — jueces del Cercado de Lima' },
          { value: 'arbitraje_ccl', label: 'Arbitraje CCL (Centro de Arbitraje de la Cámara de Comercio de Lima)' },
          { value: 'arbitraje_otro', label: 'Arbitraje en otra sede (especificar en cláusulas especiales)' },
        ],
      },
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
      { id: 'arras_opcion_previa', label: 'Arras o contrato de opción previo (opcional)', type: 'textarea', rows: 2 },
      {
        id: 'solucion_controversias',
        label: 'Solución de controversias',
        type: 'select',
        options: [
          { value: 'judicial_lima', label: 'Judicial — jueces del Cercado de Lima' },
          { value: 'arbitraje_ccl', label: 'Arbitraje CCL (Centro de Arbitraje de la Cámara de Comercio de Lima)' },
          { value: 'arbitraje_otro', label: 'Arbitraje en otra sede (especificar en cláusulas especiales)' },
        ],
      },
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
      { id: 'actualizacion_renta', label: 'Actualización de la renta (opcional — usualmente IPC de Lima Metropolitana del INEI)', type: 'textarea', rows: 2 },
      {
        id: 'desalojo_notarial',
        label: 'Desalojo notarial (Ley N° 30933) y allanamiento futuro (Ley N° 30201)',
        type: 'select',
        options: [
          { value: 'incluir', label: 'Incluir (recomendado)' },
          { value: 'omitir', label: 'Omitir' },
        ],
      },
      {
        id: 'solucion_controversias',
        label: 'Solución de controversias',
        type: 'select',
        options: [
          { value: 'judicial_lima', label: 'Judicial — jueces del Cercado de Lima' },
          { value: 'arbitraje_ccl', label: 'Arbitraje CCL (Centro de Arbitraje de la Cámara de Comercio de Lima)' },
          { value: 'arbitraje_otro', label: 'Arbitraje en otra sede (especificar en cláusulas especiales)' },
        ],
      },
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
      { id: 'representante', label: 'Representante para la ejecución (obligatorio en garantía mobiliaria bajo D.L. 1400)', type: 'textarea', rows: 2 },
      {
        id: 'solucion_controversias',
        label: 'Solución de controversias',
        type: 'select',
        options: [
          { value: 'judicial_lima', label: 'Judicial — jueces del Cercado de Lima' },
          { value: 'arbitraje_ccl', label: 'Arbitraje CCL (Centro de Arbitraje de la Cámara de Comercio de Lima)' },
          { value: 'arbitraje_otro', label: 'Arbitraje en otra sede (especificar en cláusulas especiales)' },
        ],
      },
      { id: 'clausulas_especiales', label: 'Cláusulas especiales adicionales', type: 'textarea', rows: 3 },
    ],
  },
  fideicomiso: {
    id: 'fideicomiso',
    label: 'Contrato de fideicomiso',
    supportedJurisdictions: ['peru'],
    role: 'primary',
    fields: [
      {
        id: 'tipo_fideicomiso',
        label: 'Tipo de fideicomiso',
        type: 'select',
        required: true,
        options: [
          { value: 'garantia', label: 'Fideicomiso en garantía' },
          { value: 'administracion', label: 'Fideicomiso de administración' },
          { value: 'titulizacion', label: 'Fideicomiso de titulización (emisión de valores — Ley del Mercado de Valores)' },
          { value: 'testamentario', label: 'Fideicomiso testamentario o vitalicio' },
        ],
      },
      { id: 'fideicomitente', label: 'Fideicomitente / originador (nombre, DNI o RUC, domicilio)', type: 'textarea', rows: 2, required: true },
      { id: 'fiduciario', label: 'Fiduciario (empresa autorizada y supervisada por la SBS)', type: 'textarea', rows: 2, required: true },
      { id: 'fideicomisario', label: 'Fideicomisario / beneficiario', type: 'textarea', rows: 2, required: true },
      { id: 'patrimonio', label: 'Bienes que integran el patrimonio fideicometido', type: 'textarea', rows: 3, required: true },
      { id: 'finalidad', label: 'Finalidad del fideicomiso', type: 'textarea', rows: 3, required: true },
      { id: 'plazo', label: 'Plazo (máximo 30 años, salvo excepciones de ley)', type: 'textarea', rows: 2 },
      { id: 'facultades_obligaciones', label: 'Facultades y obligaciones del fiduciario', type: 'textarea', rows: 3 },
      { id: 'factor_fiduciario', label: 'Factor fiduciario y comisión del fiduciario', type: 'textarea', rows: 2 },
      { id: 'condiciones_emision', label: 'Condiciones de emisión de valores (solo titulización)', type: 'textarea', rows: 3 },
      {
        id: 'solucion_controversias',
        label: 'Solución de controversias',
        type: 'select',
        options: [
          { value: 'judicial_lima', label: 'Judicial — jueces del Cercado de Lima' },
          { value: 'arbitraje_ccl', label: 'Arbitraje CCL (Centro de Arbitraje de la Cámara de Comercio de Lima)' },
          { value: 'arbitraje_otro', label: 'Arbitraje en otra sede (especificar en cláusulas especiales)' },
        ],
      },
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
=======
/**
 * Registro declarativo de tipos documentales. Agregar un tipo nuevo = agregar
 * un objeto acá, sin tocar componentes de UI (DynamicDrafterForm los renderiza
 * a partir de `fields`).
 */
export const DOCUMENT_SCHEMAS: Record<string, DocumentTypeSchema> = {
  loan_agreement: {
    id: 'loan_agreement',
    label: 'Contrato de préstamo',
    supportedJurisdictions: 'all',
    role: 'primary',
    accessoryDocuments: LOAN_ACCESSORY_RULES,
    fields: [
      { id: 'lender', label: 'Prestamista (nombre y datos)', type: 'textarea', rows: 2, required: true },
      { id: 'borrower', label: 'Prestatario (nombre y datos)', type: 'textarea', rows: 2, required: true },
      { id: 'principal', label: 'Monto principal y moneda', type: 'textarea', rows: 2, required: true },
      { id: 'interest', label: 'Tasa de interés y método de cálculo', type: 'textarea', rows: 2 },
      { id: 'term', label: 'Plazo y calendario de pagos', type: 'textarea', rows: 3 },
      { id: 'security', label: 'Garantías / colateral', type: 'textarea', rows: 3 },
      { id: 'covenants', label: 'Covenantes financieros y operativos', type: 'textarea', rows: 3 },
      { id: 'events_default', label: 'Eventos de incumplimiento', type: 'textarea', rows: 3 },
      { id: 'governing_law', label: 'Ley aplicable y jurisdicción (detalle)', type: 'textarea', rows: 2 },
      { id: 'disbursement_instructions', label: 'Instrucciones de desembolso (si requiere carta aparte)', type: 'textarea', rows: 2 },
      { id: 'special_terms', label: 'Términos especiales adicionales', type: 'textarea', rows: 3 },
>>>>>>> b18de3c87f15f1b14dc0f6da03a87062ff3bdd70
    ],
  },
  pagare: {
    id: 'pagare',
    label: 'Pagaré',
<<<<<<< HEAD
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
      {
        id: 'pagare_incompleto',
        label: 'Pagaré incompleto ("en blanco") con acuerdo de llenado',
        type: 'select',
        options: [
          { value: 'no', label: 'No — pagaré completo con importe y vencimiento fijos' },
          { value: 'si', label: 'Sí — pagaré incompleto, se genera acuerdo de llenado (art. 10 LTV)' },
        ],
      },
      { id: 'clausulas_especiales', label: 'Cláusulas o pactos adicionales (prórroga, aval, etc.)', type: 'textarea', rows: 3 },
=======
    supportedJurisdictions: 'all',
    role: 'accessory',
    fields: [
      { id: 'creditor', label: 'Acreedor', type: 'textarea', rows: 2 },
      { id: 'debtor', label: 'Deudor', type: 'textarea', rows: 2 },
      { id: 'amount', label: 'Monto y moneda', type: 'textarea', rows: 2 },
      { id: 'interest', label: 'Interés', type: 'textarea', rows: 2 },
      { id: 'maturity', label: 'Vencimiento', type: 'textarea', rows: 2 },
    ],
  },
  cronograma_pagos: {
    id: 'cronograma_pagos',
    label: 'Cronograma de pagos',
    supportedJurisdictions: 'all',
    role: 'accessory',
    fields: [
      { id: 'debtor', label: 'Deudor', type: 'textarea', rows: 2 },
      { id: 'amount', label: 'Monto y moneda', type: 'textarea', rows: 2 },
      { id: 'schedule', label: 'Plazo y calendario', type: 'textarea', rows: 3 },
    ],
  },
  reconocimiento_deuda: {
    id: 'reconocimiento_deuda',
    label: 'Reconocimiento de deuda',
    supportedJurisdictions: 'all',
    role: 'accessory',
    fields: [
      { id: 'creditor', label: 'Acreedor', type: 'textarea', rows: 2 },
      { id: 'debtor', label: 'Deudor', type: 'textarea', rows: 2 },
      { id: 'amount', label: 'Monto y moneda', type: 'textarea', rows: 2 },
      { id: 'interest', label: 'Interés', type: 'textarea', rows: 2 },
    ],
  },
  garantia: {
    id: 'garantia',
    label: 'Garantía',
    supportedJurisdictions: 'all',
    role: 'accessory',
    fields: [
      { id: 'creditor', label: 'Acreedor', type: 'textarea', rows: 2 },
      { id: 'debtor', label: 'Deudor', type: 'textarea', rows: 2 },
      { id: 'amount', label: 'Monto garantizado', type: 'textarea', rows: 2 },
      { id: 'security_description', label: 'Descripción de la garantía', type: 'textarea', rows: 3 },
    ],
  },
  carta_desembolso: {
    id: 'carta_desembolso',
    label: 'Carta de desembolso',
    supportedJurisdictions: 'all',
    role: 'accessory',
    fields: [
      { id: 'lender', label: 'Prestamista', type: 'textarea', rows: 2 },
      { id: 'borrower', label: 'Prestatario', type: 'textarea', rows: 2 },
      { id: 'amount', label: 'Monto y moneda', type: 'textarea', rows: 2 },
      { id: 'disbursement_instructions', label: 'Instrucciones de desembolso', type: 'textarea', rows: 3 },
    ],
  },
  share_purchase: {
    id: 'share_purchase',
    label: 'Contrato de compraventa de acciones',
    supportedJurisdictions: 'all',
    role: 'primary',
    fields: [
      { id: 'buyer', label: 'Comprador (nombre y datos)', type: 'textarea', rows: 2, required: true },
      { id: 'seller', label: 'Vendedor (nombre y datos)', type: 'textarea', rows: 2, required: true },
      { id: 'target', label: 'Sociedad objetivo / activos', type: 'textarea', rows: 2 },
      { id: 'purchase_price', label: 'Precio de compra y estructura', type: 'textarea', rows: 3, required: true },
      { id: 'closing_conditions', label: 'Condiciones de cierre', type: 'textarea', rows: 3 },
      { id: 'reps_warranties', label: 'Representaciones y garantías clave', type: 'textarea', rows: 4 },
      { id: 'indemnities', label: 'Indemnizaciones y límites', type: 'textarea', rows: 3 },
      { id: 'non_compete', label: 'No competencia / confidencialidad', type: 'textarea', rows: 2 },
      { id: 'governing_law', label: 'Ley aplicable y jurisdicción (detalle)', type: 'textarea', rows: 2 },
      { id: 'special_terms', label: 'Términos especiales adicionales', type: 'textarea', rows: 3 },
    ],
  },
  legal_memo: {
    id: 'legal_memo',
    label: 'Memorándum legal',
    supportedJurisdictions: 'all',
    role: 'primary',
    fields: [
      { id: 'to', label: 'Destinatario', type: 'text', required: true },
      { id: 'from', label: 'Remitente', type: 'text', required: true },
      { id: 're', label: 'Asunto / RE', type: 'text' },
      { id: 'background', label: 'Antecedentes', type: 'textarea', rows: 4 },
      { id: 'issues', label: 'Cuestiones jurídicas planteadas', type: 'textarea', rows: 4, required: true },
      { id: 'analysis', label: 'Análisis solicitado (puntos clave)', type: 'textarea', rows: 4 },
      { id: 'facts', label: 'Hechos relevantes', type: 'textarea', rows: 4 },
      { id: 'authorities', label: 'Normativa / precedentes a considerar', type: 'textarea', rows: 3 },
      { id: 'recommendation', label: 'Recomendación esperada', type: 'textarea', rows: 3 },
      { id: 'deadline', label: 'Urgencia / plazo', type: 'text' },
    ],
  },
  legal_letter: {
    id: 'legal_letter',
    label: 'Carta legal',
    supportedJurisdictions: 'all',
    role: 'primary',
    fields: [
      { id: 'sender', label: 'Remitente (nombre, cargo, dirección)', type: 'textarea', rows: 2, required: true },
      { id: 'recipient', label: 'Destinatario (nombre, cargo, dirección)', type: 'textarea', rows: 2, required: true },
      { id: 'date', label: 'Fecha de la carta', type: 'date' },
      { id: 'subject', label: 'Asunto', type: 'text' },
      { id: 'purpose', label: 'Propósito de la carta', type: 'textarea', rows: 3, required: true },
      { id: 'background', label: 'Antecedentes', type: 'textarea', rows: 3 },
      { id: 'demands', label: 'Solicitudes / exigencias', type: 'textarea', rows: 3 },
      { id: 'legal_basis', label: 'Fundamento legal', type: 'textarea', rows: 3 },
      { id: 'deadline', label: 'Plazo de respuesta', type: 'textarea', rows: 2 },
      {
        id: 'tone',
        label: 'Tono deseado',
        type: 'select',
        options: [
          { value: 'formal', label: 'Formal' },
          { value: 'firme', label: 'Firme' },
          { value: 'conciliador', label: 'Conciliador' },
        ],
      },
>>>>>>> b18de3c87f15f1b14dc0f6da03a87062ff3bdd70
    ],
  },
}

export const DOCUMENT_TYPE_IDS = Object.keys(DOCUMENT_SCHEMAS)

<<<<<<< HEAD
/** Ids elegibles en el selector de "Tipo de documento" — excluye los accesorios que solo se generan derivados de un primario. */
export const PRIMARY_DOCUMENT_TYPE_IDS = DOCUMENT_TYPE_IDS.filter(id => DOCUMENT_SCHEMAS[id].role !== 'accessory')

export function getDocumentSchema(id: string): DocumentTypeSchema {
  return DOCUMENT_SCHEMAS[id] ?? DOCUMENT_SCHEMAS.mutuo
=======
/** Ids elegibles en el selector de "Tipo de documento" — excluye los accesorios (pagaré, cronograma, etc.). */
export const PRIMARY_DOCUMENT_TYPE_IDS = DOCUMENT_TYPE_IDS.filter(id => DOCUMENT_SCHEMAS[id].role !== 'accessory')

export function getDocumentSchema(id: string): DocumentTypeSchema {
  return DOCUMENT_SCHEMAS[id] ?? DOCUMENT_SCHEMAS.loan_agreement
>>>>>>> b18de3c87f15f1b14dc0f6da03a87062ff3bdd70
}
