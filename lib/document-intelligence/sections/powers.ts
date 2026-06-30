import { LEGAL_PHRASES } from '../constants'
import type { DatosJGA } from '../types'

export type TipoPoder =
  | 'financiamiento'
  | 'contratos_generales'
  | 'garantias'
  | 'fideicomisos'
  | 'representacion_judicial'
  | 'formalizacion_registral'
  | 'actos_corporativos'
  | 'titulos_valores'
  | 'cuentas_bancarias'

export interface DatosPoder {
  tipo: TipoPoder
  apoderado_nombre: string
  apoderado_dni: string
  firma: 'individual' | 'conjunta'
  co_apoderado?: { nombre: string; dni: string }
  limite_monto?: { monto: number; moneda: 'PEN' | 'USD' }
  operacion_especifica?: string
}

export function generarFacultades(tipo: TipoPoder, contexto: Record<string, unknown>): string[] {
  const op = contexto.operacion_especifica ? String(contexto.operacion_especifica) : 'la operación aprobada en la presente Junta'

  const map: Record<TipoPoder, string[]> = {
    financiamiento: [
      `Negociar, fijar términos y condiciones, suscribir, modificar, novar, ejecutar y dar por cumplidos todos los documentos relacionados con ${op}, incluyendo contratos de mutuo, líneas de crédito, pagarés, cartas de crácter irrevocable y demás instrumentos del financiamiento.`,
      'Negociar, girar, emitir, aceptar, endosar, ceder, cancelar y disponer de títulos valores en respaldo del financiamiento, incluyendo pagarés, letras de cambio y warrants.',
      'Constituir, modificar y cancelar garantías reales y personales en respaldo del financiamiento, incluyendo hipotecas, garantías mobiliarias, fideicomisos en garantía y fianzas solidarias.',
      'Abrir, operar y cerrar cuentas bancarias y de inversión en entidades financieras del país y del exterior.',
      'Solicitar y otorgar dispensas, renuncias, waivers y modificaciones a los documentos del financiamiento.',
      'Celebrar cualquier documento público o privado necesario o conveniente para la obtención, desembolso, garantía, administración y repago del financiamiento.',
    ],
    contratos_generales: [
      'Negociar, suscribir, modificar, novar, resolver y dar por cumplidos contratos de cualquier naturaleza relacionados con la actividad de la Sociedad.',
      'Designar contrapartes, fijar precios, plazos, condiciones y demás términos contractuales.',
      'Otorgar y recibir finiquitos, cartas de conformidad y documentos de extinción de obligaciones.',
    ],
    garantias: [
      'Constituir garantías mobiliarias sobre activos, derechos, créditos y/o acciones de la Sociedad, conforme a la Ley N° 28677.',
      'Constituir hipotecas de primer y/o segundo grado sobre bienes inmuebles, derechos mineros y demás bienes registrables.',
      'Otorgar fianzas solidarias y avales a favor de acreedores, entidades financieras y terceros.',
      'Suscribir pagarés, letras de cambio y demás títulos valores en respaldo de las garantías constituidas.',
      'Inscribir, modificar y cancelar las garantías ante los registros públicos correspondientes.',
    ],
    fideicomisos: [
      'Negociar, suscribir y modificar contratos de fideicomiso en garantía y fideicomisos de administración.',
      'Designar fiduciarios, fijar patrimonio fideicomitido, condiciones de administración y eventos de realización.',
      'Constituir y aportar bienes, derechos y/o acciones al patrimonio fideicomitido.',
      'Suscribir los documentos de formalización e inscripción del fideicomiso ante notario y registros públicos.',
    ],
    representacion_judicial: [
      'Representar a la Sociedad ante juzgados, tribunales, arbitrajes y demás instancias administrativas y judiciales.',
      'Interponer demandas, contestaciones, recursos, incidentes, medidas cautelares y demás actos procesales.',
      'Desistir, transigir, conciliar y someter controversias a arbitraje.',
      'Recibir notificaciones, consignar y retirar sumas de dinero en procesos judiciales.',
    ],
    formalizacion_registral: [
      LEGAL_PHRASES.formalization + '.',
      LEGAL_PHRASES.subsanacion + '.',
      'Presentar minutas, escrituras públicas y demás documentos ante notarios y registros públicos.',
      'Inscribir, rectificar y cancelar inscripciones en el Registro de Personas Jurídicas de Lima y demás registros públicos.',
    ],
    actos_corporativos: [
      'Realizar todos los actos necesarios para implementar los acuerdos societarios adoptados en la presente Junta.',
      'Convocar y celebrar juntas de accionistas y directorio complementarias.',
      'Modificar el estatuto social y demás documentos constitutivos de la Sociedad.',
    ],
    titulos_valores: [
      'Emitir, suscribir, endosar, ceder, cancelar y disponer de bonos, pagarés, letras y demás títulos valores.',
      'Negociar términos de emisión, colocación, amortización y garantías de los títulos valores.',
      'Suscribir contratos de colocación, fideicomisos de garantía y documentos de formalización de la emisión.',
    ],
    cuentas_bancarias: [
      'Abrir, operar, modificar y cerrar cuentas corrientes, de ahorro y de inversión en entidades financieras.',
      'Firmar cheques, órdenes de pago, transferencias y demás instrumentos de disposición.',
      'Contratar productos financieros, líneas de crédito y servicios bancarios complementarios.',
    ],
  }

  return map[tipo] ?? map.contratos_generales
}

export function generarBloquePoder(datos: DatosPoder): string {
  const firmaText =
    datos.firma === 'individual'
      ? `${LEGAL_PHRASES.powers_individual}, ${LEGAL_PHRASES.powers_broad}`
      : `actuando de forma conjunta con ${datos.co_apoderado?.nombre ?? '[●]'}, identificado con DNI N° ${datos.co_apoderado?.dni ?? '[●]'}, en nombre y representación de la Sociedad`

  const facultades = generarFacultades(datos.tipo, {
    operacion_especifica: datos.operacion_especifica,
  })
  const limite = datos.limite_monto
    ? `\n\nLas facultades otorgadas tienen un límite de ${datos.limite_monto.moneda === 'USD' ? 'US$' : 'S/'} ${datos.limite_monto.monto.toLocaleString('es-PE')}.`
    : ''

  return `El Presidente propuso otorgar poderes especiales a favor de ${datos.apoderado_nombre}, identificado con DNI N° ${datos.apoderado_dni}, ${firmaText}, para los siguientes efectos:

${facultades.map((f, i) => `${i + 1}. ${f}`).join('\n\n')}${limite}

${LEGAL_PHRASES.agreement_intro} otorgar los poderes descritos a favor del apoderado designado, en los términos propuestos.`
}

export function generarPoderFormalizacion(datos: DatosJGA): string {
  return generarBloquePoder({
    tipo: 'formalizacion_registral',
    apoderado_nombre: datos.apoderado_formalizacion.nombre_completo,
    apoderado_dni: datos.apoderado_formalizacion.dni,
    firma: 'individual',
  })
}
