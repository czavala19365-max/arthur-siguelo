export type ChecklistItem = {
  description: string
  details?: string
  responsible: string
  timeline: string
  status: string
  notes: string
}

export type ChecklistSection = {
  title: string
  items: ChecklistItem[]
}

export type ChecklistData = {
  sections: ChecklistSection[]
}

export type ChecklistTypeInfo = {
  value: string
  label: string
  description: string
}

export const CHECKLIST_STATUSES = [
  'Pendiente',
  'En progreso',
  'Completo',
  'N/A',
] as const

export const CHECKLIST_TYPES: ChecklistTypeInfo[] = [
  {
    value: 'constitucion_empresa',
    label: 'Constitución de empresas',
    description: 'S.A.C., S.A., S.R.L. — reserva de nombre, minuta, escritura pública, SUNARP, SUNAT y libros societarios.',
  },
  {
    value: 'sg_fondo',
    label: 'Sociedad gestora + Fondo de inversión',
    description: 'Constitución de sociedad gestora y fondo de inversión privado — reglamento, RUC, libros y cuentas bancarias.',
  },
  {
    value: 'sucursal_extranjera',
    label: 'Sucursal extranjera',
    description: 'Establecimiento de sucursal de sociedad extranjera en Perú — apostilla, escritura pública, SUNARP y SUNAT.',
  },
  {
    value: 'fusion',
    label: 'Fusión',
    description: 'Fusión por absorción o por constitución — proyecto, JGA, avisos, oposición y escritura pública.',
  },
  {
    value: 'escision',
    label: 'Escisión',
    description: 'Escisión total o parcial — proyecto, JGA, bloques patrimoniales, avisos y escritura pública.',
  },
  {
    value: 'disolucion',
    label: 'Disolución, liquidación y extinción',
    description: 'Proceso completo de cierre de sociedad — disolución, liquidador, balance final, baja RUC y extinción.',
  },
]

export function getChecklistTemplate(type: string): ChecklistData {
  const templates: Record<string, ChecklistData> = {
    constitucion_empresa: TEMPLATE_CONSTITUCION,
    sg_fondo: TEMPLATE_SG_FONDO,
    sucursal_extranjera: TEMPLATE_SUCURSAL,
    fusion: TEMPLATE_FUSION,
    escision: TEMPLATE_ESCISION,
    disolucion: TEMPLATE_DISOLUCION,
  }
  return templates[type] ?? { sections: [] }
}

const item = (
  description: string,
  responsible: string,
  timeline: string,
  details?: string,
): ChecklistItem => ({
  description,
  details,
  responsible,
  timeline,
  status: 'Pendiente',
  notes: '',
})

const TEMPLATE_CONSTITUCION: ChecklistData = {
  sections: [
    {
      title: 'Fase I — Temas previos a la constitución',
      items: [
        item(
          'Reserva de denominación social ante SUNARP',
          'Asesor legal',
          '7 días hábiles',
          'Presentar solicitud con 3 opciones de denominación por orden de preferencia. La denominación social es distinta a la marca/nombre comercial (INDECOPI).',
        ),
        item(
          'Elaboración de minuta de constitución y estatuto social',
          'Asesor legal',
          '3-5 días hábiles',
          'Incluye régimen de poderes, objeto social, capital social (no existe mínimo legal, habitualmente US$ 300), identidad del gerente general.',
        ),
      ],
    },
    {
      title: 'Fase II — Constitución de la sociedad',
      items: [
        item(
          'Apertura de cuenta bancaria para depósito de capital social',
          'Cliente / Asesor legal',
          '1-5 días hábiles',
          'No hay monto mínimo de capital social pero bancos suelen solicitar mínimo S/ 1,000.00.',
        ),
        item(
          'Permiso especial de Migraciones (si hay accionistas extranjeros)',
          'Asesor legal',
          '1 día hábil',
          'Solo aplica si los firmantes son extranjeros que necesitan permiso para firmar contratos en Perú.',
        ),
        item(
          'Otorgamiento y firma de escritura pública de constitución',
          'Asesor legal / Notaría',
          '2 días hábiles',
          'Coordinar con notaría y representantes. Se requiere la minuta firmada y el certificado de depósito bancario.',
        ),
        item(
          'Presentación de solicitud de inscripción en SUNARP',
          'Asesor legal',
          '1 día hábil',
        ),
        item(
          'Inscripción en el Registro de Personas Jurídicas (SUNARP)',
          'SUNARP',
          '7 días hábiles',
          'Sujeto a calificación registral. Puede extenderse si hay observaciones (+5 días hábiles).',
        ),
      ],
    },
    {
      title: 'Fase III — Temas posteriores a la constitución',
      items: [
        item(
          'Inscripción en RUC (SUNAT) y solicitud de Clave SOL',
          'Asesor legal',
          '2 días hábiles',
          'Presentar testimonio de escritura pública, copia certificada de inscripción, formularios del representante legal.',
        ),
        item(
          'Legalización de libros societarios ante notario público',
          'Asesor legal',
          '1-2 días hábiles',
          'Libro de Actas de JGA y Libro de Matrícula de Acciones.',
        ),
        item(
          'Regularización de cuenta bancaria',
          'Asesor legal',
          '1 día hábil',
          'Presentar documentos adicionales de Registros Públicos al banco (partida electrónica, ficha RUC).',
        ),
        item(
          'Constancias de creación y emisión de acciones',
          'Asesor legal',
          '1 día hábil',
          'Registrar en Libro de Matrícula de Acciones: constancia de creación, emisión y (si aplica) transferencia de acciones.',
        ),
        item(
          'Emisión de certificados físicos de acciones',
          'Asesor legal',
          '1 día hábil',
        ),
      ],
    },
  ],
}

const TEMPLATE_SG_FONDO: ChecklistData = {
  sections: [
    {
      title: 'Fase I — Constitución de la sociedad gestora',
      items: [
        item(
          'Reserva de denominación social ante SUNARP',
          'Asesor legal',
          '7 días hábiles',
        ),
        item(
          'Elaboración de minuta de constitución y estatuto de la sociedad gestora',
          'Asesor legal',
          '3-5 días hábiles',
          'El objeto social debe incluir la administración de fondos de inversión.',
        ),
        item(
          'Otorgamiento de escritura pública e inscripción registral',
          'Asesor legal / Notaría',
          '7-10 días hábiles',
        ),
        item(
          'Inscripción en RUC de la sociedad gestora (SUNAT)',
          'Asesor legal',
          '2 días hábiles',
        ),
        item(
          'Apertura de cuenta bancaria de la sociedad gestora',
          'Asesor legal / Cliente',
          '5 días hábiles',
          'Documentos: testimonio de constitución, copia literal actualizada, DNI del representante, ficha RUC, formularios del banco.',
        ),
        item(
          'Legalización de libros societarios de la sociedad gestora',
          'Asesor legal',
          '1-2 días hábiles',
          'Libro de Actas de JGA y Libro de Matrícula de Acciones. Documentos para legalización: solicitud firmada, vigencia de poder (max. 30 días), copia de RUC, copia DNI del representante.',
        ),
      ],
    },
    {
      title: 'Fase II — Constitución del fondo de inversión privado',
      items: [
        item(
          'Elaboración del reglamento de participación',
          'Asesor legal / Cliente',
          'Variable',
          'Documento que regula las condiciones del fondo, política de inversiones, comisiones, plazos, etc.',
        ),
        item(
          'Acta de JGA de la sociedad gestora',
          'Asesor legal',
          '2 días hábiles',
          'Debe aprobar la constitución del nuevo fondo y la designación de apoderados. Nota: norma vigente establece que ningún acto de fondos de inversión se inscribe en SUNARP; evaluar uso del art. 3 del Reglamento de Registro de Sociedades.',
        ),
        item(
          'Inscripción de apoderados o del fondo en SUNARP',
          'Asesor legal',
          '7-10 días hábiles',
          'Normalmente se inscribe en Mandatos y Poderes en la partida de la sociedad gestora.',
        ),
        item(
          'Trámite del RUC del fondo de inversión (SUNAT)',
          'Asesor legal',
          '2-3 días hábiles',
          'Documentos: acta de constitución legalizada por notario, testimonio de constitución de la SG, reglamento de participación, recibo de servicios (domicilio fiscal), DNI del representante. Base legal: numeral 9 del art. 1 del TUPA de SUNAT.',
        ),
        item(
          'Legalización de libros del fondo',
          'Asesor legal',
          '1-2 días hábiles',
          'Asamblea de Partícipes, Registro de Partícipes, Comité de Inversiones.',
        ),
        item(
          'Apertura de cuentas bancarias del fondo',
          'Asesor legal / Cliente',
          '5 días hábiles',
          'Documentos: copia legalizada del testimonio, copia literal actualizada (max. 30 días), ficha RUC, DNI de representantes, formularios del banco, pago por estudio de poderes.',
        ),
        item(
          'Libro de reclamaciones',
          'Asesor legal',
          '1 día hábil',
          'Comprar libro con aviso de reclamaciones.',
        ),
      ],
    },
  ],
}

const TEMPLATE_SUCURSAL: ChecklistData = {
  sections: [
    {
      title: 'Fase I — Documentación del país de origen (apostillada)',
      items: [
        item(
          'Certificado de vigencia de la sociedad extranjera',
          'Sociedad extranjera',
          'Variable',
          'Emitido por autoridad competente, con constancia de que su pacto social o estatuto no le impide establecer sucursales en el extranjero. Debe estar apostillado.',
        ),
        item(
          'Copia del pacto social y estatuto de la sociedad extranjera',
          'Sociedad extranjera',
          'Variable',
          'O instrumentos equivalentes del país de origen. Debe estar apostillado.',
        ),
        item(
          'Declaración jurada del representante legal',
          'Asesor legal / Sociedad extranjera',
          'Variable',
          'O certificado de autoridad competente, indicando que el órgano que acuerda establecer la sucursal y otorgar poderes está debidamente facultado. Debe estar apostillado.',
        ),
        item(
          'Acuerdo de establecimiento de la sucursal en Perú',
          'Sociedad extranjera / Asesor legal',
          'Variable',
          'Adoptado por el órgano competente. Debe indicar: (i) capital asignado a la sucursal (no se requiere acreditar ingreso); (ii) actividades dentro del objeto social; (iii) domicilio (basta la ciudad); (iv) representante legal permanente con facultades para obligar a la sociedad y representación procesal; (v) sometimiento a leyes peruanas para obligaciones de la sucursal.',
        ),
      ],
    },
    {
      title: 'Fase II — Trámites notariales y registrales en Perú',
      items: [
        item(
          'Presentación de documentos ante notario público',
          'Asesor legal',
          '1 día hábil',
          'Para elevar a escritura pública.',
        ),
        item(
          'Suscripción de escritura pública de establecimiento',
          'Asesor legal / Notaría',
          '1-2 días hábiles',
        ),
        item(
          'Inscripción del establecimiento en Registros Públicos (SUNARP)',
          'Asesor legal / SUNARP',
          '10-15 días hábiles',
          'Sujeto a calificación registral.',
        ),
      ],
    },
    {
      title: 'Fase III — Trámites tributarios y administrativos',
      items: [
        item(
          'Inscripción en RUC ante SUNAT',
          'Asesor legal',
          '1 día hábil',
          'Presentar testimonio de escritura pública, copia certificada de inscripción, formularios firmados por el representante legal permanente.',
        ),
        item(
          'Apertura de cuenta bancaria',
          'Asesor legal / Representante legal',
          '5 días hábiles',
        ),
        item(
          'Legalización de libros societarios',
          'Asesor legal',
          '1-2 días hábiles',
        ),
      ],
    },
  ],
}

const TEMPLATE_FUSION: ChecklistData = {
  sections: [
    {
      title: 'Fase I — Actos preparatorios',
      items: [
        item(
          'Aprobación del proyecto de fusión por directores o administradores',
          'Directores / Gerente general',
          'Variable',
          'El gerente general o la mayoría absoluta de administradores aprueban el texto del proyecto de fusión conforme al art. 347 LGS. El proyecto se extingue si no es aprobado dentro de los plazos previstos, en todo caso a los 3 meses.',
        ),
        item(
          'Junta General de Accionistas de cada sociedad participante',
          'Asesor legal / Cada sociedad',
          'Variable',
          'El acta aprueba el proyecto de fusión. Debe aprobar modificaciones al pacto social y estatuto de la sociedad absorbente y fijar fecha común de entrada en vigencia. La fusión se acuerda con los requisitos de ley y estatuto para modificación del pacto social.',
        ),
        item(
          'Informe sobre variación significativa del patrimonio',
          'Directores / Gerente general',
          'Previo a JGA',
          'Directores y/o gerente general deben informar a la JGA sobre cualquier variación significativa del patrimonio desde la fecha de la relación de canje.',
        ),
        item(
          'Balance de fusión',
          'Contadores / Área financiera',
          '30 días desde vigencia',
          'Las sociedades participantes cierran su balance al día anterior a la fecha de vigencia (art. 379 LGS). Plazo máximo: 30 días desde la fecha de vigencia.',
        ),
      ],
    },
    {
      title: 'Fase II — Publicidad y derecho de oposición',
      items: [
        item(
          'Publicación de avisos',
          'Asesor legal',
          '15 días aprox.',
          'Se publica por 3 veces, con 5 días de intervalo entre cada aviso, en El Peruano y diario de mayor circulación. Las sociedades pueden publicar independiente o conjuntamente.',
        ),
        item(
          'Plazo de oposición de acreedores',
          'Asesor legal',
          '30 días desde último aviso',
          'Los acreedores pueden oponerse dentro de los 30 días desde la última publicación.',
        ),
        item(
          'Constancia del gerente general de cada sociedad',
          'Gerente general',
          'Para escritura pública',
          'Constancia de que la sociedad no ha sido emplazada judicialmente por acreedores oponiéndose a la fusión. Debe incluirse en la escritura pública.',
        ),
      ],
    },
    {
      title: 'Fase III — Formalización e inscripción',
      items: [
        item(
          'Escritura pública de fusión',
          'Asesor legal / Notaría',
          '2-3 días hábiles',
          'Se otorga una vez vencido el plazo de 30 días desde la última publicación. Si hay oposición notificada, se otorga una vez levantada la suspensión o declarada infundada la oposición. Fusión supeditada a inscripción.',
        ),
        item(
          'Inscripción en Registros Públicos (SUNARP)',
          'Asesor legal / SUNARP',
          '7-15 días hábiles',
          'La fusión entra en vigencia en la fecha fijada en el acuerdo.',
        ),
        item(
          'Comunicaciones a SUNAT',
          'Asesor legal',
          '5 días hábiles desde inscripción',
          'Actualización de datos, baja de RUC de sociedades extinguidas, formularios correspondientes.',
        ),
        item(
          'Comunicaciones a otras entidades',
          'Asesor legal / Sociedad absorbente',
          'Variable',
          'Instituciones financieras, registros administrativos, clientes, proveedores, entidades regulatorias.',
        ),
      ],
    },
  ],
}

const TEMPLATE_ESCISION: ChecklistData = {
  sections: [
    {
      title: 'Fase I — Actos preparatorios',
      items: [
        item(
          'Aprobación del proyecto de escisión por directores o administradores',
          'Directores / Gerente general',
          'Variable',
          'Contenido conforme al art. 372 LGS. El proyecto se extingue a los 3 meses si no es aprobado.',
        ),
        item(
          'Junta General de Accionistas de cada sociedad participante',
          'Asesor legal / Cada sociedad',
          'Variable',
          'Aprueba el proyecto de escisión y fija fecha de vigencia (art. 376 LGS). Debe pronunciarse sobre pacto social y estatuto de sociedades que se constituyen y/o modificaciones a las que se escinden o absorben los bloques patrimoniales. Aprueba ampliación de capital, creación de nuevas clases de acciones, modificación de objeto social, etc.',
        ),
        item(
          'Informe sobre variación significativa del patrimonio',
          'Directores / Gerente general',
          'Previo a JGA',
          'Directores y/o administradores obligados a informar sobre variación significativa del patrimonio.',
        ),
        item(
          'Balance de escisión',
          'Contadores / Área financiera',
          '30 días desde vigencia',
          'Las sociedades participantes cierran su balance al día anterior a la fecha de vigencia (art. 379 LGS).',
        ),
        item(
          'Relación detallada y valorizada de activos y pasivos',
          'Contadores / Asesor legal',
          'Para escritura pública',
          'Relación de los elementos del activo y del pasivo de cada bloque patrimonial resultante de la escisión. Debe incluirse en la escritura pública.',
        ),
        item(
          'Relación de derechos especiales',
          'Asesor legal',
          'Para escritura pública',
          'Relación y contenido de los derechos especiales existentes en la sociedad que se escinde. Deben figurar inscritos en el Registro y no ser modificados ni ser materia de compensación.',
        ),
      ],
    },
    {
      title: 'Fase II — Publicidad y derecho de oposición',
      items: [
        item(
          'Publicación de avisos',
          'Asesor legal',
          '15 días aprox.',
          'Se publica por 3 veces, con 5 días de intervalo, en El Peruano y diario de mayor circulación. Las sociedades pueden publicar independiente o conjuntamente.',
        ),
        item(
          'Plazo de oposición de acreedores',
          'Asesor legal',
          '30 días desde último aviso',
          'El derecho de separación empieza a contarse desde el último aviso.',
        ),
        item(
          'Constancia del gerente general de cada sociedad',
          'Gerente general',
          'Para escritura pública',
          'Constancia de que la sociedad no ha sido emplazada judicialmente por acreedores oponiéndose a la escisión.',
        ),
      ],
    },
    {
      title: 'Fase III — Formalización e inscripción',
      items: [
        item(
          'Escritura pública de escisión',
          'Asesor legal / Notaría',
          '2-3 días hábiles',
          'Contenido conforme al art. 382 LGS. Se otorga vencido el plazo de 30 días desde la última publicación. Escisión supeditada a inscripción (art. 378 LGS).',
        ),
        item(
          'Inscripción en Registros Públicos (SUNARP)',
          'Asesor legal / SUNARP',
          '7-15 días hábiles',
          'La escisión entra en vigencia en la fecha fijada en el acuerdo.',
        ),
        item(
          'Comunicaciones a SUNAT',
          'Asesor legal',
          '5 días hábiles desde inscripción',
          'Actualización de datos de cada sociedad resultante, formularios correspondientes.',
        ),
        item(
          'Comunicaciones a otras entidades',
          'Asesor legal / Sociedades participantes',
          'Variable',
          'Instituciones financieras, registros administrativos, clientes, proveedores, entidades regulatorias.',
        ),
      ],
    },
  ],
}

const TEMPLATE_DISOLUCION: ChecklistData = {
  sections: [
    {
      title: 'Fase I — Disolución',
      items: [
        item(
          'Revisión preliminar de información societaria',
          'Asesor legal / La sociedad',
          '2-3 días',
          'Documentos requeridos: estatutos y partida registral actualizada; libros de accionistas y matrícula de acciones; estados financieros actualizados (balance de inicio de liquidación); contratos con compromisos pendientes; registro ante entidades del Estado; saldos con SUNAT; vigencias de poder actualizadas.',
        ),
        item(
          'Acta de JGA de disolución y designación de liquidador',
          'Asesor legal / La sociedad',
          '2 días',
          'La JGA acuerda: (i) la disolución y posterior liquidación; (ii) la designación del liquidador. Una vez acordada, gerentes y representantes cesan en sus cargos. El liquidador reemplaza a los representantes. La denominación cambia a "[nombre] en Liquidación".',
        ),
        item(
          'Publicación de aviso de disolución',
          'Asesor legal',
          '10 días calendario',
          'Publicar por 3 veces consecutivas en El Peruano y diario de mayor circulación dentro de los 10 días siguientes a la JGA que aprobó la disolución.',
        ),
        item(
          'Inscripción de disolución en Registros Públicos (SUNARP)',
          'Asesor legal / SUNARP',
          '~20 días calendario',
          'Presentar acta de disolución/liquidación dentro de los 10 días posteriores a la última publicación. La denominación cambia a "[nombre] en Liquidación". Calificación: 7 días hábiles + 5 días hábiles adicionales si hay observaciones.',
        ),
        item(
          'Comunicaciones a SUNAT',
          'Asesor legal',
          '5 días hábiles desde inscripción',
          'Dentro de los 5 días hábiles de inscrito el acuerdo: (i) cambio de denominación "en Liquidación" (Form. 2127); (ii) baja de representantes (Form. 2054); (iii) alta del liquidador (Form. 2054). Requiere copia certificada del asiento de inscripción.',
        ),
      ],
    },
    {
      title: 'Fase II — Liquidación',
      items: [
        item(
          'Preparación de inventario, estados financieros y cuentas',
          'Liquidador / La sociedad',
          'Variable',
          'El liquidador prepara inventario detallado, estados financieros y todas las cuentas requeridas. Depende de la situación particular de la sociedad.',
        ),
        item(
          'JGA para aprobación de memoria y balance final de liquidación',
          'Liquidador / La sociedad',
          '3 días',
          'Convocar a JGA para presentar: memoria de liquidación, balance final, estado de ganancias y pérdidas y demás cuentas. Si la junta no se celebra en primera o segunda convocatoria, los documentos se consideran aprobados. Si la sociedad no puede pagar sus deudas, el liquidador solicita declaración de quiebra.',
        ),
        item(
          'Publicación del balance final de liquidación',
          'Liquidador',
          '3 días',
          'Publicar una sola vez en El Peruano y diario de mayor circulación. El balance debe presentarse a SUNAT dentro de los 3 meses siguientes.',
        ),
        item(
          'Distribución de activos remanentes entre accionistas',
          'Liquidador',
          '2 días',
          'Solo procede si se pagaron todas las deudas de la sociedad.',
        ),
      ],
    },
    {
      title: 'Fase III — Extinción',
      items: [
        item(
          'Inscripción de extinción en Registros Públicos (SUNARP)',
          'Asesor legal / SUNARP',
          '~20 días calendario',
          'El liquidador indica nombre y dirección de la persona designada para custodia de libros y documentos de la sociedad.',
        ),
        item(
          'Baja del RUC ante SUNAT',
          'Asesor legal',
          '45 días hábiles',
          'Formulario 2135 (baja de inscripción) y Formulario 825 (baja de comprobantes de pago no emitidos). SUNAT emite resolución de baja en 45 días hábiles. SUNAT puede iniciar fiscalización tributaria (prescripción de 4 años).',
        ),
        item(
          'Comunicaciones adicionales',
          'Asesor legal / Liquidador',
          'Variable',
          'Agentes gubernamentales y clientes; instituciones financieras (transferir fondos, cerrar cuentas); otros registros administrativos.',
        ),
      ],
    },
  ],
}
