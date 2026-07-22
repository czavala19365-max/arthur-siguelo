import type { DocumentTypeId } from './form-schemas'
import { documentTypeLabel } from './form-schemas'

export const DRAFTER_SYSTEM = `Eres un abogado redactor peruano senior, con práctica notarial y contractual. Redactas contratos y documentos completos, listos para revisión de un abogado, EN ESPAÑOL y bajo la legislación de la República del Perú vigente a la fecha.

Marco legal:
- Aplica SIEMPRE el Código Civil peruano (Decreto Legislativo N° 295) y las normas especiales vigentes que correspondan al tipo de documento.
- Cita los artículos y normas pertinentes dentro de las cláusulas cuando aporte precisión (p. ej. "de conformidad con el artículo 1648 del Código Civil").
- No inventes normas, artículos ni jurisprudencia. Si no estás seguro de una cita, describe la institución sin citar un número de artículo.

Estilo de redacción (formato notarial peruano):
- Encabezado / comparecencia: "Conste por el presente documento el [tipo de contrato] que celebran, de una parte, [parte con sus generales de ley: nombre, documento de identidad, estado civil y domicilio]; y de la otra parte, [contraparte con sus generales de ley]; en los términos y condiciones siguientes:".
- Cuando aporte contexto, incluye una sección de ANTECEDENTES antes de las cláusulas.
- Cláusulas numeradas con ordinales en mayúscula y guion: "PRIMERA.-", "SEGUNDA.-", "TERCERA.-", etc. Cada cláusula trata un solo asunto (objeto, precio/contraprestación, plazo, obligaciones, garantías, resolución, domicilio, competencia, etc.).
- Cierre: cláusula de conformidad y suscripción, con indicación de lugar y fecha y espacio para las firmas de las partes.
- Lenguaje jurídico peruano, preciso y formal. Montos importantes en números y en letras.

Si falta información, usa marcadores entre corchetes como [POR COMPLETAR] o [PENDIENTE DE DATOS]. Nunca dejes una cláusula vacía ni referida a algo que no aplica: omítela por completo.

Responde SOLO con un objeto JSON (sin fences de markdown, sin comentarios fuera del JSON) con esta forma exacta:
{
  "sections": [
    { "titulo": "PRIMERA.- OBJETO", "contenido": "texto completo de la cláusula..." }
  ]
}
Cada sección es un bloque lógico o una cláusula numerada (p. ej. comparecencia/encabezado, antecedentes, cláusulas operativas, competencia, suscripción). "titulo" es opcional para el bloque de encabezado/comparecencia.`

/**
 * Base legal vigente por tipo de documento. Verificado contra la legislación
 * peruana aplicable (Código Civil D.L. 295 y normas especiales). Puntos que no
 * son obvios: la garantía mobiliaria se rige por el Decreto Legislativo N° 1400
 * (vigente desde el 03/03/2025, que derogó la Ley N° 28677) y su Reglamento
 * (D.S. N° 243-2019-EF), operando a través del Sistema Informativo de Garantías
 * Mobiliarias (SIGM) de la SUNARP; el fideicomiso se rige por la Ley N° 26702.
 */
const LEGAL_BASIS: Record<string, string> = {
  mutuo:
    'Contrato de mutuo regulado por los artículos 1648 a 1665 del Código Civil. Precisa la naturaleza del interés (compensatorio y moratorio) conforme a los artículos 1242 y siguientes del Código Civil y las tasas máximas fijadas por el BCRP para operaciones entre no supervisados.',
  compraventa:
    'Compraventa regulada por los artículos 1529 a 1601 del Código Civil. Para bien INMUEBLE incluye la obligación de otorgar escritura pública e inscripción en SUNARP, individualización con partida registral, área, linderos y medidas perimétricas; el tributo de alcabala. Para bien MUEBLE, la transferencia se perfecciona con la tradición (art. 947). Desarrolla el saneamiento por evicción y por vicios ocultos (arts. 1484 y siguientes).',
  comodato:
    'Comodato (préstamo de uso gratuito) regulado por los artículos 1728 a 1752 del Código Civil. Es esencialmente gratuito; el comodatario debe conservar y devolver el mismo bien.',
  permuta:
    'Permuta regulada por los artículos 1602 y 1603 del Código Civil, aplicándosele supletoriamente las reglas de la compraventa. Si hay diferencia de valor compensada en dinero, precisa el monto.',
  mandato:
    'Mandato regulado por los artículos 1790 a 1813 del Código Civil. Distingue el mandato con representación (arts. 1806 y siguientes, remite a las reglas de representación, arts. 145 a 167) del mandato sin representación (arts. 1809 y siguientes). Incluye rendición de cuentas.',
  poder:
    'Poder regulado por las reglas de representación de los artículos 145 a 167 del Código Civil. Recuerda que, conforme al artículo 156, para disponer de la propiedad del representado o gravar sus bienes se requiere PODER ESPECÍFICO otorgado por escritura pública, bajo sanción de nulidad. El poder general solo comprende actos de administración (art. 155).',
  arrendamiento:
    'Arrendamiento regulado por los artículos 1666 a 1712 del Código Civil (merced conductiva, plazo, obligaciones de las partes, conclusión). Si es de inmueble destinado a vivienda, puede acogerse opcionalmente al régimen del Decreto Legislativo N° 1177.',
  garantia:
    'Según el tipo elegido: (a) HIPOTECA, artículos 1097 a 1122 del Código Civil, sobre inmueble, con inscripción en SUNARP y monto del gravamen determinado; (b) GARANTÍA MOBILIARIA, regida por el Decreto Legislativo N° 1400 (vigente desde el 03/03/2025, que derogó la Ley N° 28677) y su Reglamento (D.S. N° 243-2019-EF), con inscripción en el Sistema Informativo de Garantías Mobiliarias (SIGM) de la SUNARP; NO cites la derogada Ley 28677; (c) FIANZA SOLIDARIA, artículos 1868 a 1905 del Código Civil, con renuncia expresa al beneficio de excusión (art. 1883) por tratarse de fianza solidaria.',
  fideicomiso:
    'Fideicomiso regulado por la Ley N° 26702 (Ley General del Sistema Financiero y del Sistema de Seguros y Orgánica de la SBS), artículos 241 y siguientes. El fiduciario debe ser una empresa autorizada y supervisada por la SBS. El patrimonio fideicometido es autónomo. Plazo máximo de 30 años, salvo las excepciones legales (fideicomiso vitalicio o filantrópico). Si se tratara de fideicomiso de titulización, se rige además por la Ley del Mercado de Valores (D.L. N° 861).',
  usufructo:
    'Usufructo regulado por los artículos 999 a 1025 del Código Civil. El usufructo constituido a favor de persona jurídica no puede exceder de 30 años (art. 1001). Incluye la obligación de practicar inventario y prestar garantía (art. 1006 y siguientes) y de conservar el bien.',
  pagare:
    'Pagaré regulado por la Ley de Títulos Valores, Ley N° 27287, artículos 158 a 162. Incluye los requisitos formales esenciales del artículo 158 (denominación "Pagaré", promesa incondicional de pago, nombre del beneficiario, importe, fecha y lugar de emisión, vencimiento, lugar de pago y firma del emitente).',
}

function subtypeGuidance(documentType: DocumentTypeId, fields: Record<string, string>): string {
  if (documentType === 'compraventa' && fields.tipo_bien) {
    return fields.tipo_bien === 'inmueble'
      ? 'El bien es INMUEBLE: redacta cláusulas de individualización registral, saneamiento, obligación de otorgar escritura pública, inscripción en SUNARP y alcabala.'
      : 'El bien es MUEBLE: la transferencia opera con la tradición; incluye saneamiento y, de corresponder, inscripción del bien registrable.'
  }
  if (documentType === 'garantia' && fields.tipo_garantia) {
    const map: Record<string, string> = {
      hipoteca: 'Redacta una HIPOTECA (arts. 1097-1122 CC): monto del gravamen, inmueble con partida registral, e inscripción en SUNARP.',
      garantia_mobiliaria: 'Redacta una GARANTÍA MOBILIARIA bajo el Decreto Legislativo N° 1400 y su Reglamento (D.S. 243-2019-EF), con inscripción en el SIGM de SUNARP. No cites la Ley 28677 (derogada).',
      fianza_solidaria: 'Redacta una FIANZA SOLIDARIA (arts. 1868-1905 CC) con renuncia expresa al beneficio de excusión (art. 1883). No hay bien gravado.',
    }
    return map[fields.tipo_garantia] ?? ''
  }
  if (documentType === 'poder' && fields.tipo_poder) {
    return fields.tipo_poder === 'general'
      ? 'Es un PODER GENERAL: comprende únicamente actos de administración (art. 155 CC).'
      : 'Es un PODER ESPECÍFICO: detalla el acto o negocio determinado. Si comprende disposición o gravamen de bienes, exige otorgamiento por escritura pública (art. 156 CC).'
  }
  if (documentType === 'mandato' && fields.modalidad) {
    return fields.modalidad === 'con_representacion'
      ? 'Mandato CON representación (arts. 1806 y ss. CC): el mandatario actúa en nombre del mandante.'
      : 'Mandato SIN representación (arts. 1809 y ss. CC): el mandatario actúa en nombre propio.'
  }
  return ''
}

export function buildDrafterUserPrompt(opts: {
  documentType: DocumentTypeId
  jurisdiction: string
  fields: Record<string, string>
}): string {
  const typeLabel = documentTypeLabel(opts.documentType)
  const legalBasis = LEGAL_BASIS[opts.documentType] ?? 'Aplica el Código Civil peruano (Decreto Legislativo N° 295) y las normas especiales pertinentes.'
  const subtype = subtypeGuidance(opts.documentType, opts.fields)

  const fieldBlock = Object.entries(opts.fields)
    .filter(([, v]) => v.trim())
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n')

  return `Redacta un(a) ${typeLabel} completo, regido por la legislación de la República del Perú vigente.

Base legal aplicable:
${legalBasis}${subtype ? `\n${subtype}` : ''}

Datos del negocio e instrucciones:
${fieldBlock}

Entrega el documento completo, listo para revisión de un abogado, como secciones estructuradas según el formato JSON requerido. Redacta en español, con estilo notarial peruano y cláusulas numeradas con ordinales (PRIMERA.-, SEGUNDA.-, ...).`
}

export const REFINE_SYSTEM = `Eres un abogado redactor peruano senior que revisa un documento legal existente redactado bajo la legislación del Perú.
Aplica ÚNICAMENTE el cambio solicitado — modifica la(s) sección(es) afectada(s) y deja el resto intacto. Nunca regeneres todo el documento desde cero. Mantén el estilo notarial peruano y las citas al Código Civil (D.L. 295) y normas vigentes.

Responde SOLO con un objeto JSON (sin fences de markdown, sin comentarios fuera del JSON) con esta forma exacta:
{
  "message": "explicación breve, en el mismo idioma de la instrucción del usuario",
  "sections": [ { "titulo": "PRIMERA.- OBJETO", "contenido": "texto completo y actualizado de CADA sección" } ],
  "cambios_realizados": [ { "seccion": "título de la sección", "tipo_cambio": "agregado|modificado|eliminado", "descripcion": "qué cambió" } ]
}
"sections" debe contener SIEMPRE el conjunto COMPLETO y actual de secciones (las no afectadas copiadas sin cambios) para que el cliente pueda renderizar todo el documento desde este único campo.`
