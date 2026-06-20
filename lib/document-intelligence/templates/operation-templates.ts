import type { DatosSociedad, TipoOperacionJGA } from '../types'
import { LEGAL_PHRASES } from '../constants'
import { formatMonto, nombreTipoSocietario, valorTexto } from '../utils'

export interface CampoRequerido {
  nombre: string
  label: string
  tipo: 'text' | 'number' | 'currency' | 'date' | 'select' | 'persona'
  requerido: boolean
  opciones?: string[]
  placeholder?: string
  ayuda?: string
}

export interface OperationTemplate {
  tipo: TipoOperacionJGA
  campos_requeridos: CampoRequerido[]
  generarDesarrollo: (datos: Record<string, unknown>, sociedad: DatosSociedad) => string
  generarAcuerdo: (datos: Record<string, unknown>, sociedad: DatosSociedad) => string
}

function m(d: Record<string, unknown>, k: string) {
  return valorTexto(d[k])
}

function mon(d: Record<string, unknown>, sociedad: DatosSociedad): 'PEN' | 'USD' {
  return (d.moneda as 'PEN' | 'USD') ?? sociedad.moneda_capital ?? 'PEN'
}

function amt(d: Record<string, unknown>, k: string, sociedad: DatosSociedad) {
  const n = Number(d[k] ?? 0)
  return formatMonto(n, mon(d, sociedad))
}

const baseCampos = {
  monto: (label = 'Monto'): CampoRequerido => ({
    nombre: 'monto',
    label,
    tipo: 'currency',
    requerido: true,
  }),
  moneda: (): CampoRequerido => ({
    nombre: 'moneda',
    label: 'Moneda',
    tipo: 'select',
    requerido: true,
    opciones: ['PEN', 'USD'],
  }),
}

function tpl(
  tipo: TipoOperacionJGA,
  campos: CampoRequerido[],
  desarrollo: (d: Record<string, unknown>, s: DatosSociedad) => string,
  acuerdo: (d: Record<string, unknown>, s: DatosSociedad) => string,
): OperationTemplate {
  return { tipo, campos_requeridos: campos, generarDesarrollo: desarrollo, generarAcuerdo: acuerdo }
}

export const OPERATION_TEMPLATES: Record<TipoOperacionJGA, OperationTemplate> = {
  financiamiento: tpl(
    'financiamiento',
    [
      { nombre: 'acreedor', label: 'Acreedor / prestamista', tipo: 'text', requerido: true },
      baseCampos.monto('Monto del financiamiento'),
      baseCampos.moneda(),
      { nombre: 'destino', label: 'Destino de los recursos', tipo: 'text', requerido: true },
      {
        nombre: 'tipo_credito',
        label: 'Tipo de crédito',
        tipo: 'select',
        requerido: true,
        opciones: ['mutuo', 'línea de crédito', 'préstamo puente'],
      },
      { nombre: 'plazo', label: 'Plazo', tipo: 'text', requerido: true },
      { nombre: 'tasa', label: 'Tasa de interés', tipo: 'text', requerido: false },
      { nombre: 'garantias', label: 'Garantías', tipo: 'text', requerido: false },
    ],
    (d, s) =>
      `El Presidente tomó el uso de la palabra e indicó que la Sociedad viene negociando la obtención de un financiamiento por parte de ${m(d, 'acreedor')} por la suma de ${amt(d, 'monto', s)}, con la finalidad de ${m(d, 'destino')}. Explicó que el financiamiento se structured como ${m(d, 'tipo_credito')} con un plazo de ${m(d, 'plazo')}${d.tasa ? ` y una tasa de interés de ${m(d, 'tasa')}` : ''}. ${d.garantias ? `Asimismo, se propuso otorgar las siguientes garantías: ${m(d, 'garantias')}.` : ''} En adelante, se denominará al referido financiamiento como el "Financiamiento".`,
    (d, s) =>
      `${LEGAL_PHRASES.agreement_intro} aprobar la obtención del Financiamiento por ${amt(d, 'monto', s)} a favor de ${m(d, 'acreedor')}; y, en consecuencia, aprobar la suscripción de los Documentos del Financiamiento, el otorgamiento de las garantías correspondientes y la designación de apoderados con facultades para negociar, suscribir y ejecutar los instrumentos del Financiamiento.`,
  ),

  emision_bonos: tpl(
    'emision_bonos',
    [
      { nombre: 'monto_emision', label: 'Monto de emisión', tipo: 'currency', requerido: true },
      baseCampos.moneda(),
      { nombre: 'plazo', label: 'Plazo de la emisión', tipo: 'text', requerido: true },
      { nombre: 'destino', label: 'Destino de fondos', tipo: 'text', requerido: true },
      { nombre: 'garantias', label: 'Garantías', tipo: 'text', requerido: false },
    ],
    (d, s) =>
      `El Presidente expuso que resulta necesario para la Sociedad emitir bonos por un monto agregado de ${amt(d, 'monto_emision', s)}, con un plazo de ${m(d, 'plazo')}, destinados a ${m(d, 'destino')}. ${d.garantias ? `Se propuso constituir las siguientes garantías en respaldo de la emisión: ${m(d, 'garantias')}.` : ''} En adelante, la emisión se denominará la "Emisión".`,
    (d, s) =>
      `${LEGAL_PHRASES.agreement_intro} aprobar la Emisión de bonos por ${amt(d, 'monto_emision', s)}, la suscripción de los documentos de emisión, colocación y garantía, y autorizar a los apoderados para ejecutar la Emisión.`,
  ),

  fideicomiso: tpl(
    'fideicomiso',
    [
      { nombre: 'fiduciario', label: 'Entidad fiduciaria', tipo: 'text', requerido: true },
      { nombre: 'patrimonio', label: 'Descripción del patrimonio fideicomitido', tipo: 'text', requerido: true },
      { nombre: 'finalidad', label: 'Finalidad del fideicomiso', tipo: 'text', requerido: true },
      baseCampos.monto('Monto o valor referencial'),
      baseCampos.moneda(),
    ],
    (d, s) =>
      `El Presidente informó sobre la necesidad de constituir un fideicomiso en garantía con ${m(d, 'fiduciario')}, afectando ${m(d, 'patrimonio')}, por un valor referencial de ${amt(d, 'monto', s)}, con la finalidad de ${m(d, 'finalidad')}. En adelante, el fideicomiso se denominará el "Fideicomiso".`,
    () =>
      `${LEGAL_PHRASES.agreement_intro} aprobar la constitución del Fideicomiso, la suscripción del contrato de fideicomiso y los documentos de formalización e inscripción correspondientes.`,
  ),

  aumento_capital_aportes: tpl(
    'aumento_capital_aportes',
    [
      baseCampos.monto('Monto del aumento'),
      baseCampos.moneda(),
      { nombre: 'nuevo_capital', label: 'Nuevo capital social', tipo: 'currency', requerido: true },
      { nombre: 'acciones_emitidas', label: 'Acciones a emitir', tipo: 'number', requerido: true },
      { nombre: 'metodo', label: 'Forma de aporte', tipo: 'text', requerido: true, placeholder: 'aporte dinerario' },
    ],
    (d, s) =>
      `El Presidente señaló que, con el fin de fortalecer la estructura patrimonial de la Sociedad, procede aumentar el capital social en ${amt(d, 'monto', s)} mediante ${m(d, 'metodo')}, elevando el capital social a ${formatMonto(Number(d.nuevo_capital ?? 0), mon(d, s))} mediante la emisión de ${m(d, 'acciones_emitidas')} acciones de pago.`,
    (d, s) =>
      `${LEGAL_PHRASES.agreement_intro} aprobar el aumento de capital social en ${amt(d, 'monto', s)}, la emisión de ${m(d, 'acciones_emitidas')} acciones y la modificación parcial del estatuto social en la parte pertinente.`,
  ),

  aumento_capital_capitalizacion: tpl(
    'aumento_capital_capitalizacion',
    [
      { nombre: 'acreedor', label: 'Acreedor capitalizante', tipo: 'text', requerido: true },
      baseCampos.monto('Monto a capitalizar'),
      baseCampos.moneda(),
      { nombre: 'credito_referencia', label: 'Referencia del crédito', tipo: 'text', requerido: true },
      { nombre: 'acciones_emitidas', label: 'Acciones a emitir', tipo: 'number', requerido: true },
    ],
    (d, s) =>
      `El Presidente expuso que ${m(d, 'acreedor')} mantiene un crédito contra la Sociedad por ${amt(d, 'monto', s)} (${m(d, 'credito_referencia')}), cuya capitalización resulta conveniente para la Sociedad, mediante la emisión de ${m(d, 'acciones_emitidas')} acciones.`,
    (d, s) =>
      `${LEGAL_PHRASES.agreement_intro} aprobar la capitalización del crédito por ${amt(d, 'monto', s)} a favor de ${m(d, 'acreedor')}, la emisión de ${m(d, 'acciones_emitidas')} acciones y la modificación estatutaria correspondiente.`,
  ),

  modificacion_estatuto: tpl(
    'modificacion_estatuto',
    [
      { nombre: 'articulo', label: 'Artículo a modificar', tipo: 'text', requerido: true },
      { nombre: 'texto_nuevo', label: 'Nuevo texto', tipo: 'text', requerido: true },
      { nombre: 'justificacion', label: 'Justificación', tipo: 'text', requerido: true },
    ],
    (d, s) =>
      `El Presidente sometió a consideración la modificación del ${m(d, 'articulo')} del estatuto social de la ${nombreTipoSocietario(s.tipo_societario)}, indicando que ${m(d, 'justificacion')}. Propuso sustituir el referido artículo por el siguiente texto: "${m(d, 'texto_nuevo')}".`,
    (d, s) =>
      `${LEGAL_PHRASES.agreement_intro} aprobar la modificación parcial del estatuto social de la ${nombreTipoSocietario(s.tipo_societario)} del ${m(d, 'articulo')}, conforme al texto propuesto.`,
  ),

  nombramiento_gg: tpl(
    'nombramiento_gg',
    [
      { nombre: 'cesante', label: 'Gerente General saliente', tipo: 'text', requerido: false },
      { nombre: 'nombrado', label: 'Nuevo Gerente General', tipo: 'persona', requerido: true },
      { nombre: 'dni', label: 'DNI del nombrado', tipo: 'text', requerido: true },
      { nombre: 'vigencia', label: 'Vigencia del cargo', tipo: 'text', requerido: false, placeholder: 'indefinida' },
    ],
    d =>
      `El Presidente informó${d.cesante ? ` que ${m(d, 'cesante')} cesa en el cargo de Gerente General y` : ' que'} propuso la designación de ${m(d, 'nombrado')}, identificado con DNI N° ${m(d, 'dni')}, como Gerente General de la Sociedad por un plazo ${m(d, 'vigencia')}.`,
    d =>
      `${LEGAL_PHRASES.agreement_intro}${d.cesante ? ` aceptar el cese de ${m(d, 'cesante')} y` : ''} designar a ${m(d, 'nombrado')}, identificado con DNI N° ${m(d, 'dni')}, como Gerente General de la Sociedad.`,
  ),

  garantia_mobiliaria: tpl(
    'garantia_mobiliaria',
    [
      { nombre: 'acreedor', label: 'Acreedor beneficiario', tipo: 'text', requerido: true },
      { nombre: 'bienes', label: 'Bienes gravados', tipo: 'text', requerido: true },
      baseCampos.monto('Monto garantizado'),
      baseCampos.moneda(),
    ],
    (d, s) =>
      `El Presidente expuso la necesidad de constituir garantía mobiliaria a favor de ${m(d, 'acreedor')} sobre ${m(d, 'bienes')}, en garantía de obligaciones por hasta ${amt(d, 'monto', s)}.`,
    (d, s) =>
      `${LEGAL_PHRASES.agreement_intro} aprobar la constitución de garantía mobiliaria sobre ${m(d, 'bienes')} a favor de ${m(d, 'acreedor')}, hasta por ${amt(d, 'monto', s)}, y autorizar la suscripción e inscripción de los documentos correspondientes.`,
  ),

  hipoteca: tpl(
    'hipoteca',
    [
      { nombre: 'acreedor', label: 'Acreedor hipotecario', tipo: 'text', requerido: true },
      { nombre: 'inmueble', label: 'Descripción del inmueble', tipo: 'text', requerido: true },
      { nombre: 'partida', label: 'Partida registral', tipo: 'text', requerido: false },
      baseCampos.monto('Monto garantizado'),
      baseCampos.moneda(),
    ],
    (d, s) =>
      `El Presidente indicó que, a fin de garantizar obligaciones a favor de ${m(d, 'acreedor')}, procede constituir hipoteca de primer grado sobre ${m(d, 'inmueble')}${d.partida ? ` inscrito en la Partida Electrónica N° ${m(d, 'partida')}` : ''}, hasta por ${amt(d, 'monto', s)}.`,
    (d, s) =>
      `${LEGAL_PHRASES.agreement_intro} aprobar la constitución de hipoteca sobre ${m(d, 'inmueble')} a favor de ${m(d, 'acreedor')}, hasta por ${amt(d, 'monto', s)}, y autorizar la formalización e inscripción registral.`,
  ),

  cesion_derechos: tpl(
    'cesion_derechos',
    [
      { nombre: 'cedente', label: 'Cedente', tipo: 'text', requerido: true },
      { nombre: 'cesionario', label: 'Cesionario', tipo: 'text', requerido: true },
      { nombre: 'derechos', label: 'Derechos cedidos', tipo: 'text', requerido: true },
      baseCampos.monto('Precio o contraprestación'),
      baseCampos.moneda(),
    ],
    (d, s) =>
      `El Presidente expuso que ${m(d, 'cedente')} propone ceder a ${m(d, 'cesionario')} los derechos ${m(d, 'derechos')}, por una contraprestación de ${amt(d, 'monto', s)}.`,
    d =>
      `${LEGAL_PHRASES.agreement_intro} aprobar la cesión de ${m(d, 'derechos')} de ${m(d, 'cedente')} a favor de ${m(d, 'cesionario')} en los términos propuestos.`,
  ),

  fianza_solidaria: tpl(
    'fianza_solidaria',
    [
      { nombre: 'beneficiario', label: 'Beneficiario de la fianza', tipo: 'text', requerido: true },
      { nombre: 'obligacion', label: 'Obligación garantizada', tipo: 'text', requerido: true },
      baseCampos.monto('Monto máximo de la fianza'),
      baseCampos.moneda(),
    ],
    (d, s) =>
      `El Presidente informó que resulta necesario otorgar fianza solidaria a favor de ${m(d, 'beneficiario')} en garantía de ${m(d, 'obligacion')}, hasta por ${amt(d, 'monto', s)}.`,
    (d, s) =>
      `${LEGAL_PHRASES.agreement_intro} otorgar fianza solidaria a favor de ${m(d, 'beneficiario')} hasta por ${amt(d, 'monto', s)} en garantía de ${m(d, 'obligacion')}.`,
  ),

  dacion_en_pago: tpl(
    'dacion_en_pago',
    [
      { nombre: 'acreedor', label: 'Acreedor', tipo: 'text', requerido: true },
      { nombre: 'bien', label: 'Bien objeto de dación', tipo: 'text', requerido: true },
      baseCampos.monto('Monto de la obligación'),
      baseCampos.moneda(),
    ],
    (d, s) =>
      `El Presidente expuso que, a fin de extinguir obligaciones por ${amt(d, 'monto', s)} a favor de ${m(d, 'acreedor')}, la Sociedad propone otorgar en dación en pago ${m(d, 'bien')}.`,
    (d, s) =>
      `${LEGAL_PHRASES.agreement_intro} aprobar la dación en pago de ${m(d, 'bien')} a favor de ${m(d, 'acreedor')} por ${amt(d, 'monto', s)}.`,
  ),

  compraventa_acciones: tpl(
    'compraventa_acciones',
    [
      { nombre: 'vendedor', label: 'Vendedor', tipo: 'text', requerido: true },
      { nombre: 'comprador', label: 'Comprador', tipo: 'text', requerido: true },
      { nombre: 'acciones', label: 'Número de acciones', tipo: 'number', requerido: true },
      baseCampos.monto('Precio de compraventa'),
      baseCampos.moneda(),
    ],
    (d, s) =>
      `El Presidente informó sobre la operación de compraventa de ${m(d, 'acciones')} acciones de ${m(d, 'vendedor')} a favor de ${m(d, 'comprador')}, por un precio de ${amt(d, 'monto', s)}.`,
    (d, s) =>
      `${LEGAL_PHRASES.agreement_intro} aprobar la compraventa de ${m(d, 'acciones')} acciones entre ${m(d, 'vendedor')} y ${m(d, 'comprador')} por ${amt(d, 'monto', s)} y autorizar la suscripción de los documentos de transferencia.`,
  ),

  compraventa_inmueble: tpl(
    'compraventa_inmueble',
    [
      { nombre: 'contraparte', label: 'Contraparte', tipo: 'text', requerido: true },
      { nombre: 'inmueble', label: 'Descripción del inmueble', tipo: 'text', requerido: true },
      { nombre: 'tipo_operacion', label: 'Tipo', tipo: 'select', requerido: true, opciones: ['compra', 'venta'] },
      baseCampos.monto('Precio'),
      baseCampos.moneda(),
    ],
    (d, s) =>
      `El Presidente expuso la ${m(d, 'tipo_operacion')} del inmueble ${m(d, 'inmueble')} ${d.tipo_operacion === 'compra' ? 'de' : 'a favor de'} ${m(d, 'contraparte')}, por un precio de ${amt(d, 'monto', s)}.`,
    (d, s) =>
      `${LEGAL_PHRASES.agreement_intro} aprobar la ${m(d, 'tipo_operacion')} del inmueble ${m(d, 'inmueble')} por ${amt(d, 'monto', s)} y autorizar la suscripción de la minuta y escritura pública correspondiente.`,
  ),

  transaccion_extrajudicial: tpl(
    'transaccion_extrajudicial',
    [
      { nombre: 'contraparte', label: 'Contraparte', tipo: 'text', requerido: true },
      { nombre: 'controversia', label: 'Controversia', tipo: 'text', requerido: true },
      { nombre: 'terminos', label: 'Términos de la transacción', tipo: 'text', requerido: true },
    ],
    d =>
      `El Presidente informó sobre la controversia ${m(d, 'controversia')} con ${m(d, 'contraparte')} y propuso suscribir una transacción extrajudicial en los siguientes términos: ${m(d, 'terminos')}.`,
    d =>
      `${LEGAL_PHRASES.agreement_intro} aprobar la transacción extrajudicial con ${m(d, 'contraparte')} en los términos propuestos.`,
  ),

  poderes_especiales: tpl(
    'poderes_especiales',
    [
      { nombre: 'apoderado', label: 'Apoderado', tipo: 'persona', requerido: true },
      { nombre: 'dni', label: 'DNI del apoderado', tipo: 'text', requerido: true },
      { nombre: 'finalidad', label: 'Finalidad de los poderes', tipo: 'text', requerido: true },
      { nombre: 'facultades', label: 'Facultades específicas', tipo: 'text', requerido: true },
    ],
    d =>
      `El Presidente propuso otorgar poderes especiales a favor de ${m(d, 'apoderado')}, identificado con DNI N° ${m(d, 'dni')}, ${LEGAL_PHRASES.powers_individual}, para ${m(d, 'finalidad')}, con las siguientes facultades: ${m(d, 'facultades')}.`,
    d =>
      `${LEGAL_PHRASES.agreement_intro} otorgar poderes especiales a favor de ${m(d, 'apoderado')}, identificado con DNI N° ${m(d, 'dni')}, ${LEGAL_PHRASES.powers_individual}, ${LEGAL_PHRASES.powers_broad}, en los términos propuestos.`,
  ),

  otro: tpl(
    'otro',
      [
        { nombre: 'titulo_custom', label: 'Título del punto', tipo: 'text', requerido: true },
        { nombre: 'desarrollo', label: 'Desarrollo / exposición', tipo: 'text', requerido: true },
        { nombre: 'acuerdo', label: 'Texto del acuerdo', tipo: 'text', requerido: true },
      ],
    d => String(d.desarrollo ?? d.desarrollo_custom ?? '[●]'),
    d => String(d.acuerdo ?? `${LEGAL_PHRASES.agreement_intro} lo propuesto en este punto.`),
  ),
}

export function getOperationTemplate(tipo: TipoOperacionJGA): OperationTemplate {
  return OPERATION_TEMPLATES[tipo] ?? OPERATION_TEMPLATES.otro
}

export function getTituloOperacion(tipo: TipoOperacionJGA): string {
  const labels: Record<TipoOperacionJGA, string> = {
    financiamiento: 'Aprobación de financiamiento',
    emision_bonos: 'Emisión de bonos',
    fideicomiso: 'Constitución de fideicomiso',
    aumento_capital_aportes: 'Aumento de capital por aportes',
    aumento_capital_capitalizacion: 'Capitalización de créditos',
    modificacion_estatuto: 'Modificación parcial del estatuto',
    nombramiento_gg: 'Nombramiento de Gerente General',
    garantia_mobiliaria: 'Constitución de garantía mobiliaria',
    hipoteca: 'Constitución de hipoteca',
    cesion_derechos: 'Cesión de derechos',
    fianza_solidaria: 'Otorgamiento de fianza solidaria',
    dacion_en_pago: 'Dación en pago',
    compraventa_acciones: 'Compraventa de acciones',
    compraventa_inmueble: 'Compraventa de inmueble',
    transaccion_extrajudicial: 'Transacción extrajudicial',
    poderes_especiales: 'Otorgamiento de poderes especiales',
    otro: 'Punto personalizado',
  }
  return labels[tipo]
}
