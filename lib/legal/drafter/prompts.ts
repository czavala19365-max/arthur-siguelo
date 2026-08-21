import type { DocumentTypeId } from './form-schemas'
import { documentTypeLabel } from './form-schemas'

// Estilo y formulismos calibrados sobre una biblioteca de contratos peruanos
// reales (Rabobank, COFIDE, BICSA, Santander, agroexportadoras, inmobiliarias).
// Los patrones son los que aparecen sistemáticamente en la práctica peruana
// notarial y contractual, no un ideal genérico.
export const DRAFTER_SYSTEM = `Eres un abogado redactor peruano senior, con práctica notarial y contractual. Redactas contratos y documentos completos, listos para revisión de un abogado, EN ESPAÑOL y bajo la legislación de la República del Perú vigente a la fecha.

Marco legal:
- Aplica SIEMPRE el Código Civil peruano (Decreto Legislativo N° 295) y las normas especiales vigentes que correspondan al tipo de documento.
- Cita los artículos y normas pertinentes dentro de las cláusulas cuando aporte precisión (p. ej. "de conformidad con el numeral 1 del artículo 1333 del Código Civil, [la parte] incurrirá en mora automática").
- No inventes normas, artículos ni jurisprudencia. Si no estás seguro de una cita, describe la institución sin citar un número de artículo.

Formato del documento (elige según formalidad requerida):
- MINUTA para escritura pública (contratos que requieren o suelen elevarse a escritura pública: compraventa e hipoteca de inmuebles, mutuo con garantías reales, garantía mobiliaria, fideicomiso, usufructo, permuta de inmuebles, poderes de disposición): inicia con "SEÑOR NOTARIO:" seguido de "Sírvase usted extender en su Registro de Escrituras Públicas una en la que conste el CONTRATO DE [TIPO] (en adelante, el 'Contrato') que celebran:". Cierra con "Agregue usted, señor Notario, [lo demás que fuera de ley / las cláusulas y los insertos de ley,] y sírvase [cursar/pasar] los partes al Registro [de Predios / de Personas Jurídicas / Mobiliario de Contratos / correspondiente] de la Oficina Registral de [ciudad]." seguido de "Lima, [fecha]" y firmas.
- DOCUMENTO PRIVADO CON FIRMAS LEGALIZADAS (mutuos simples, pagarés, acuerdos de llenado, arrendamientos sin escritura, comodatos): inicia con "Conste por el presente documento con firmas legalizadas, el Contrato de [TIPO] (en adelante, el 'Contrato') que celebran:". Cierra con lugar, fecha y firmas.

Comparecencia (obligatoria y con formato peruano estándar):
- Introduce cada parte con un guión, indicando: nombre / denominación social, tipo y número de documento (DNI para personas naturales, RUC para personas jurídicas peruanas, CE o Pasaporte para extranjeros), estado civil si es persona natural con vínculos patrimoniales, y "con domicilio para estos efectos en [dirección], distrito de [X], provincia y departamento de [X]".
- Para personas jurídicas: "debidamente representada por [nombre], identificado con DNI N° [X], según poderes inscritos en la Partida Electrónica N° [X] del Registro de Personas Jurídicas de la Oficina Registral de [ciudad]". Si son poderes recién otorgados en junta, "según poderes otorgados mediante junta general de accionistas de fecha [X]".
- Cierra cada parte con "(en adelante, el/la '[Rol]')" — el rol debe ser el término técnico correspondiente al tipo de contrato (Mutuante/Mutuatario, Vendedor/Comprador, Arrendador/Arrendatario, Constituyente/Acreedor Garantizado, Fideicomitente/Fiduciario/Fideicomisario, etc.).
- Después de las partes, agrega: "El [Rol A] y el [Rol B] serán denominados en adelante y en conjunto como las 'Partes'."
- Sigue con: "El Contrato se celebra en los siguientes términos y condiciones, dejando constancia que: (i) los títulos consignados en las cláusulas del presente documento son meramente enunciativos, primando sobre éstos el texto de las mismas; y (ii) los términos utilizados en el Contrato deben ser entendidos en cualquier género o número."

Cláusulas (formato peruano estándar):
- Numeradas con ordinales en mayúscula y punto o guion: "PRIMERA:", "SEGUNDA:", ..., "DÉCIMO PRIMERA:", "DÉCIMO SEGUNDA:" (usa la forma "sétima" o "séptima" indistintamente, ambas se usan en Perú).
- El título de cada cláusula va en MAYÚSCULAS después del ordinal. Nombres típicos: ANTECEDENTES, OBJETO DEL CONTRATO, PRECIO / CONTRAPRESTACIÓN, PLAZO, DECLARACIONES Y ASEVERACIONES, OBLIGACIONES DE LAS PARTES, GASTOS Y COSTOS, RESOLUCIÓN, CESIÓN DE POSICIÓN CONTRACTUAL, DOMICILIOS / NOTIFICACIONES, LEY APLICABLE, SOLUCIÓN DE CONTROVERSIAS / JURISDICCIÓN.
- Cuando la cláusula tenga varios apartados, usa subincisos numerados "1.1", "1.2" o "1.", "2." dentro de la cláusula.

Formulismos peruanos habituales — úsalos cuando correspondan al tipo:
- Domicilio: "con domicilio para estos efectos en [dirección], distrito de [X], provincia y departamento de [X]".
- Mora automática: "de conformidad con lo dispuesto en el numeral 1 del artículo 1333 del Código Civil, [la parte deudora] incurrirá en mora automática, sin necesidad de intimación o requerimiento".
- Cálculo de intereses: "sobre la base de un (1) año de trescientos sesenta (360) días" o "un (1) mes de treinta (30) días".
- Pago en moneda extranjera: pactar en contra del segundo párrafo del artículo 1237 del Código Civil cuando el pago deba realizarse necesariamente en la moneda pactada (típicamente Dólares).
- Cesión de posición contractual: si el mutuatario/deudor no puede ceder sin consentimiento, cita el artículo 1210 del Código Civil; si el acreedor sí puede ceder con consentimiento anticipado, cita el artículo 1435 del Código Civil.
- Resolución de pleno derecho: "de conformidad con el artículo 1430 del Código Civil, la resolución se producirá de pleno derecho cuando [la parte] comunique vía carta notarial a la otra que quiere valerse de esta cláusula, bastando para ello indicar la obligación incumplida".
- Comunicaciones y cambio de domicilio: "mediante carta notarial enviada con no menos de cinco (5) días calendario de anticipación".
- Ley aplicable (fórmula estándar): "Para todo lo no previsto expresamente por las Partes en el Contrato se aplicarán supletoriamente las normas contenidas en: (i) el Código Civil Peruano; y, (ii) demás legislación aplicable en el ordenamiento jurídico peruano."
- Jurisdicción (fórmula judicial): "las Partes se someten a los jueces y tribunales del Distrito Judicial del Cercado de Lima, renunciando al fuero de sus domicilios". Para arbitraje: "arbitraje de derecho ante un Tribunal Arbitral ad hoc de tres (3) árbitros conforme al Reglamento del Centro de Arbitraje de la Cámara de Comercio de Lima, cuyas normas y administración son aceptadas por las Partes", con referencia al Decreto Legislativo N° 1071 (Ley de Arbitraje).
- Montos: siempre en números y en letras, ejemplos: "US$ 100,000.00 (Cien Mil y 00/100 Dólares de los Estados Unidos de América)" o "S/ 50,000.00 (Cincuenta Mil y 00/100 Soles)".

Si falta información concreta, usa marcadores entre corchetes como "[POR COMPLETAR]", "[●]" (más habitual en la práctica peruana) o "[PENDIENTE DE DATOS]". Nunca dejes una cláusula vacía ni referida a algo que no aplica: omítela por completo.

Responde SOLO con un objeto JSON (sin fences de markdown, sin comentarios fuera del JSON) con esta forma exacta:
{
  "sections": [
    { "titulo": "PRIMERA.- OBJETO", "contenido": "texto completo de la cláusula..." }
  ]
}
Cada sección es un bloque lógico o una cláusula numerada (p. ej. encabezado "SEÑOR NOTARIO:" + comparecencia, antecedentes, cláusulas operativas, cierre para notario, suscripción). "titulo" es opcional para el bloque de encabezado/comparecencia y el bloque de cierre.`

/**
 * Base legal y estructura de cláusulas típicas por tipo de documento.
 * Calibrado sobre una biblioteca de contratos peruanos reales revisada en
 * julio de 2026 (Rabobank, COFIDE, BICSA, Santander, agroexportadoras,
 * inmobiliarias). Los puntos que no son obvios y que suelen desactualizarse:
 * - La garantía mobiliaria se rige por el D.L. N° 1400 (vigente 03/03/2025,
 *   derogó la Ley N° 28677) y su Reglamento D.S. N° 243-2019-EF, operando
 *   por el SIGM de SUNARP.
 * - El fideicomiso bancario se rige por la Ley N° 26702 (arts. 241+); el de
 *   titulización, adicionalmente por la Ley del Mercado de Valores (D.L. 861).
 * - El desalojo notarial se rige por la Ley N° 30933 y complementa la
 *   cláusula de allanamiento futuro (Ley N° 30201, tercer párrafo art. 594 CPC).
 */
const LEGAL_BASIS: Record<string, string> = {
  mutuo: [
    'Contrato de mutuo regulado por los artículos 1648 a 1665 del Código Civil.',
    'Estructura típica peruana: (i) ANTECEDENTES (relación entre las partes, propósito del préstamo); (ii) OBJETO DEL CONTRATO (entrega del monto en calidad de mutuo, forma y condiciones de desembolso, obligación de devolución en la misma moneda); (iii) PAGO DE PRINCIPAL E INTERESES (plazo, tasa nominal anual de interés compensatorio, tasa de interés moratorio con referencia al numeral 1 del art. 1333 CC sobre mora automática, base de cálculo de 360 días); (iv) GASTOS Y COSTOS DEL CONTRATO (típicamente a cargo del mutuatario); (v) CESIÓN A TERCEROS (restricciones al mutuatario conforme al art. 1210 CC; autorización anticipada al mutuante conforme al art. 1435 CC si aplica); (vi) COMUNICACIONES (domicilios y carta notarial con 5 días de anticipación para cambios); (vii) LEY APLICABLE Y JURISDICCIÓN (Código Civil peruano y jueces del Cercado de Lima).',
    'Referencia a intereses: art. 1242 y siguientes del Código Civil, con las tasas máximas del BCRP para operaciones entre no supervisados por la SBS.',
    'Si el pago es en moneda extranjera y debe realizarse necesariamente en esa moneda, pacta expresamente en contra del segundo párrafo del art. 1237 CC.',
  ].join(' '),

  compraventa: [
    'Compraventa regulada por los artículos 1529 a 1601 del Código Civil.',
    'Para bien INMUEBLE: usa formato MINUTA para escritura pública. Estructura típica: (i) ANTECEDENTES (propiedad del vendedor con partida electrónica del Registro de Predios, área, linderos y medidas perimétricas; contrato de arras o de opción previo si lo hubiera); (ii) EFECTOS DE LA COMPRAVENTA (transferencia según art. 949 CC, "la transferencia de propiedad del Inmueble se producirá a la firma de la minuta"); (iii) DEL PRECIO DE VENTA Y FORMA DE PAGO; (iv) ENTREGA DE POSESIÓN DEL INMUEBLE; (v) DECLARACIONES Y ASEVERACIONES del vendedor (no cargas, no gravámenes, al día en tributos, indemnidad tributaria); (vi) CARGAS Y GRAVÁMENES; (vii) SANEAMIENTO por evicción, vicios ocultos y hecho propio (arts. 1484 y siguientes); (viii) TRIBUTOS (impuesto predial y arbitrios hasta la fecha de transferencia son del vendedor; Alcabala del comprador según D. Leg. N° 776 - Ley de Tributación Municipal); (ix) GASTOS notariales y registrales (habitualmente del comprador); (x) FIRMA DE LA ESCRITURA PÚBLICA (plazo desde bloqueo registral); (xi) ESTIPULACIONES COMPLEMENTARIAS (renuncia a hipoteca legal art. 1120 CC, integridad del acuerdo, indemnidad); (xii) RESOLUCIÓN de pleno derecho (art. 1430 CC); (xiii) CESIÓN DE POSICIÓN CONTRACTUAL; (xiv) DOMICILIOS; (xv) LEY APLICABLE Y SOLUCIÓN DE CONTROVERSIAS (arbitraje CCL o judicial). Cierra con "Agregue usted, señor Notario, lo demás que fuese de ley y cuide de realizar los insertos correspondientes".',
    'Para bien MUEBLE: la transferencia se perfecciona con la tradición (art. 947 CC). Si el bien mueble es registrable (vehículo, maquinaria en el Registro Mobiliario), incluye inscripción; sino, solo tradición y saneamiento.',
  ].join(' '),

  comodato: [
    'Comodato (préstamo de uso gratuito) regulado por los artículos 1728 a 1752 del Código Civil.',
    'Es esencialmente GRATUITO — si se pacta contraprestación deja de ser comodato y se transforma en arrendamiento. El comodatario debe conservar y devolver el mismo bien.',
    'Estructura típica: Antecedentes; Objeto (entrega en préstamo de uso, gratuito); Uso o destino permitido; Plazo (definido o para uso específico); Condiciones de devolución; Gastos de conservación y mantenimiento a cargo del comodatario; Responsabilidad por deterioro; Domicilios; Ley aplicable y jurisdicción.',
  ].join(' '),

  permuta: [
    'Permuta regulada por los artículos 1602 y 1603 del Código Civil, aplicándosele supletoriamente las reglas de la compraventa.',
    'Estructura típica peruana: Antecedentes (titularidad de cada bien); Objeto (Transferencia 1 del primer permutante y Transferencia 2 del segundo permutante, con valorizaciones); Extensión de la permuta; Cargas y gravámenes; Tributos (Alcabala aplicable, salvo excepción del art. 27 de la Ley de Tributación Municipal — p. ej. transferencias entre alícuotas entre condóminos originarios); Gastos y costos (habitualmente asumidos conjuntamente); Domicilios; Ley aplicable; Jurisdicción.',
    'Si hay diferencia de valor compensada en dinero, precisa el monto y su tratamiento tributario.',
  ].join(' '),

  mandato: [
    'Mandato regulado por los artículos 1790 a 1813 del Código Civil.',
    'Distingue el mandato CON representación (arts. 1806 y siguientes, remite a las reglas de representación arts. 145 a 167) del mandato SIN representación (arts. 1809 y siguientes, el mandatario actúa en nombre propio).',
    'Incluye siempre: objeto (actos y gestiones encargados con la mayor precisión posible); retribución si es oneroso; plazo; obligaciones específicas del mandatario (rendición de cuentas conforme al art. 1793 CC, entrega de lo recibido); causales de extinción.',
  ].join(' '),

  poder: [
    'Poder regulado por las reglas de representación de los artículos 145 a 167 del Código Civil.',
    'El poder GENERAL solo comprende actos de administración (art. 155 CC). Para disponer de la propiedad del representado o gravar sus bienes se requiere PODER ESPECÍFICO otorgado por escritura pública (art. 156 CC, bajo sanción de nulidad).',
    'Facultades procesales: si el poder incluye litigar, distingue las facultades generales del art. 74 CPC de las especiales del art. 75 CPC (que requieren mención expresa).',
    'Formalidad: la carta poder con firma legalizada notarialmente basta para actos administrativos simples; para actos de disposición o gravamen se requiere escritura pública inscrita en el Registro de Personas Jurídicas (para PJ) o Registro de Mandatos y Poderes (para PN).',
  ].join(' '),

  arrendamiento: [
    'Arrendamiento regulado por los artículos 1666 a 1712 del Código Civil.',
    'Plazo máximo: 10 años (art. 1688 CC). El arrendatario tiene obligaciones específicas de conservación (art. 1682 CC).',
    'Estructura típica peruana: Antecedentes; Objeto (bien y destino/uso); Plazo (forzoso y obligatorio para el arrendatario, con condiciones de renovación); Contraprestación (Renta con actualización según IPC de Lima Metropolitana publicado por el INEI, detracción SUNAT si aplica); Entrega; Mantenimiento e inspección; Régimen de mejoras y cambios; Otras obligaciones (servicios, impuestos, licencias); Prohibición de cesión y sub-arrendamiento (salvo consentimiento previo y escrito); Resolución de pleno derecho (art. 1430 CC) por incumplimiento de renta, uso indebido, no permitir inspecciones, mejoras sin autorización, sub-arriendo indebido; Culminación anticipada (con penalidad por lucro cesante); Cláusula penal por no desocupación; CLÁUSULA ESPECIAL DE ALLANAMIENTO FUTURO al desalojo (tercer párrafo del art. 594 CPC modificado por Ley N° 30201); DESALOJO NOTARIAL (sometimiento expreso a la Ley N° 30933 sobre desalojo con intervención notarial ante incumplimiento de pago o vencimiento del plazo); Costos y gastos; Notificaciones; Ley aplicable y solución de controversias.',
    'Si es de inmueble destinado a vivienda, puede acogerse opcionalmente al régimen del D. Leg. N° 1177.',
  ].join(' '),

  garantia: [
    'Marco por tipo de garantía:',
    '(a) HIPOTECA (arts. 1097 a 1122 del Código Civil): sobre inmueble, con inscripción en el Registro de Predios de SUNARP. Formato MINUTA. Estructura típica: Antecedentes con individualización del inmueble por partida registral y obligación garantizada; Constitución de primera y preferente hipoteca hasta por suma determinada, plazo indefinido; Extensión a partes integrantes, accesorios, edificaciones futuras y justiprecio en caso de expropiación; Cobertura (principal, intereses, gastos judiciales y extrajudiciales), valorización del inmueble para remate (las 2/3 partes servirán de base para el remate de ley), procedimiento del Código Procesal Civil; Derecho de cobro con el producto de la venta; Obligaciones del constituyente (mantener el bien, no gravar, no perjudicar); Renuncia expresa a los beneficios de los arts. 1115 y 1116 CC; Cancelación al pago total; Gastos a cargo del constituyente; Ley aplicable y jurisdicción. Cierre pidiendo pasar los partes al Registro de Predios de la Oficina Registral correspondiente.',
    '(b) GARANTÍA MOBILIARIA regida por el Decreto Legislativo N° 1400 (vigente desde el 03/03/2025, que derogó la Ley N° 28677) y su Reglamento (D.S. N° 243-2019-EF), con inscripción en el Sistema Informativo de Garantías Mobiliarias (SIGM) de la SUNARP. NO cites la derogada Ley 28677 ni el Registro Mobiliario de Contratos anterior. Estructura típica (heredada de la práctica larga): DEFINICIONES E INTERPRETACIÓN (extensa, incluye Acreedor Garantizado, Bien Garantizado, Obligaciones Garantizadas, Día Hábil, Ley Aplicable, Monto Garantizado, Representante); Antecedentes; Objeto (constitución de primer y preferente rango sobre el bien mueble, hasta por el Monto Garantizado); Extensión de la Garantía Mobiliaria; Indivisibilidad; Obligaciones del Constituyente (perfeccionamiento, no gravar, defensa); Declaraciones y garantías; Ejercicio de derechos económicos y políticos; Eventos de Incumplimiento; Ejecución de la Garantía Mobiliaria (extrajudicial y/o adjudicación al Acreedor Garantizado, con valor de realización y procedimiento de reducción sucesiva); Producto de la ejecución (prelación de gastos, obligaciones garantizadas y remanente al constituyente); Notificaciones; Ley aplicable; Jurisdicción; Gastos; Disposiciones generales (mora automática art. 1333 CC, cesión); Cancelación al pago total; Del Representante (poder irrevocable para la ejecución y sustitución si aplica).',
    '(c) FIANZA SOLIDARIA (arts. 1868 a 1905 del Código Civil): usa la fórmula estándar "fianza solidaria, irrevocable, incondicional, sin beneficio de excusión ni división, de realización automática, al primer requerimiento". Renuncia expresa al beneficio de excusión (art. 1883 CC). Estructura: Antecedentes (obligación garantizada y su origen); Objeto (constitución de la fianza hasta por el monto máximo, vigencia); Pago al primer requerimiento (forma, moneda pactándose en contra del art. 1237 segundo párrafo si aplica, intereses moratorios si el fiador retrasa el pago); Subrogación (art. 1889 CC — el fiador que paga se subroga de pleno derecho en los derechos del acreedor); Comisión de la fianza si aplica; Gastos; Comunicaciones; Ley aplicable y jurisdicción.',
  ].join(' '),

  fideicomiso: [
    'Fideicomiso regulado por la Ley N° 26702 (Ley General del Sistema Financiero, del Sistema de Seguros y Orgánica de la SBS), artículos 241 y siguientes.',
    'El fiduciario debe ser una empresa autorizada y supervisada por la SBS. El patrimonio fideicometido es autónomo. Plazo máximo de 30 años, salvo excepciones legales (fideicomiso vitalicio, testamentario o filantrópico).',
    'Si es FIDEICOMISO DE TITULIZACIÓN, se rige adicionalmente por la Ley del Mercado de Valores (D. Leg. N° 861) y su Reglamento, y usualmente involucra la emisión de valores mobiliarios respaldados por el patrimonio fideicometido.',
    'Es un contrato extenso (típicamente 40-50 cláusulas). Estructura peruana típica que debes seguir en orden: Introducción/Partes (fideicomitente/originador, fiduciario, fideicomisario/beneficiario); Interpretación; Definiciones (bloque extenso con términos técnicos); Antecedentes; Objeto y finalidad; Declaraciones del Originador; Declaraciones del Fiduciario; Transferencia fiduciaria de los bienes fideicometidos; Administración del Patrimonio Fideicometido; Obligaciones del Originador respecto a los bienes; Cuentas del Patrimonio Fideicometido; Costos y gastos asumidos por el Patrimonio; Plazo de vigencia; Eventos de Incumplimiento; Funciones del Fiduciario; Sustitución, renuncia, retribución y responsabilidad limitada del Fiduciario; Factor Fiduciario; Asambleas (si emite valores); Ejecución del Patrimonio Fideicometido; Aplicación de recursos; Insolvencia; Disolución y liquidación del Patrimonio; Procedimiento de liquidación; Modificación del Contrato; Legislación y jurisdicción; Indemnidad; Domicilio y notificaciones; Defensa del Patrimonio Fideicometido; Datos personales; Renuncia o demora en el ejercicio de derechos.',
    'Formato MINUTA obligatorio: se eleva a escritura pública e inscribe según el tipo de bienes (predios, garantías mobiliarias, etc.).',
  ].join(' '),

  usufructo: [
    'Usufructo regulado por los artículos 999 a 1025 del Código Civil.',
    'El usufructo constituido a favor de persona jurídica no puede exceder de 30 años (art. 1001 CC); a favor de persona natural puede ser vitalicio.',
    'Obligaciones del usufructuario: practicar inventario y prestar garantía (arts. 1006 y siguientes CC); conservar el bien; explotarlo como lo haría un buen padre de familia.',
    'Estructura típica: Antecedentes (titularidad del nudo propietario, partida registral si es inmueble); Objeto (constitución del derecho de usufructo sobre el bien); Alcance del uso y disfrute (frutos, mejoras, restricciones); Plazo; Retribución si es oneroso; Obligaciones del usufructuario (inventario, garantía, conservación); Causales de extinción; Domicilios; Ley aplicable y jurisdicción.',
    'Formato MINUTA para inmuebles, con inscripción en el Registro de Predios.',
  ].join(' '),

  pagare: [
    'Pagaré regulado por la Ley de Títulos Valores, Ley N° 27287, artículos 158 a 162.',
    'Requisitos formales esenciales del art. 158 LTV: denominación "Pagaré" en el texto; indicación de lugar y fecha de emisión; promesa incondicional de pagar una cantidad determinada; nombre del beneficiario/tomador; indicación del vencimiento y lugar de pago; nombre, número de documento oficial de identidad y firma del emitente. Si es persona jurídica, el nombre y firma de sus representantes con facultades.',
    'Fórmulas y pactos habituales en la práctica peruana: (i) tasas de interés compensatorio y moratorio, con cálculo sobre base de 360 días; (ii) autorización de prórroga sin nueva suscripción (art. 49 LTV); (iii) cláusula sin protesto por falta de pago (art. 52 LTV — "no requerirá ser protestado"); (iv) pacto en contrario al art. 1233 CC (las obligaciones no se extinguen si por culpa del acreedor se perjudica el pagaré); (v) autorización de cargo en cuentas; (vi) si el pago es en moneda extranjera obligatoria, pacto contra el segundo párrafo del art. 1237 CC; (vii) sometimiento a la jurisdicción del Distrito Judicial del Cercado de Lima.',
    'Si es PAGARÉ INCOMPLETO ("en blanco"), debe acompañarse de un ACUERDO DE LLENADO al amparo del art. 10 de la Ley N° 27287 que fije las condiciones para completarlo (monto, fecha de vencimiento, criterios de liquidación).',
    'Emisión: usualmente como documento privado con firmas — no requiere escritura pública. La formalidad es más simple que un contrato: encabezado con "PAGARÉ", número, importe y vencimiento en la parte superior, seguido del texto obligacional en primera persona plural ("Nosotros, ..., debemos y nos obligamos a pagar incondicionalmente a la orden de ...").',
  ].join(' '),
}

function subtypeGuidance(documentType: DocumentTypeId, fields: Record<string, string>): string {
  if (documentType === 'compraventa' && fields.tipo_bien) {
    return fields.tipo_bien === 'inmueble'
      ? 'El bien es INMUEBLE: usa formato MINUTA ("SEÑOR NOTARIO:"), redacta cláusulas de individualización registral, saneamiento, obligación de otorgar escritura pública, inscripción en SUNARP y alcabala a cargo del comprador (D. Leg. N° 776). Incluye renuncia a hipoteca legal (art. 1120 CC).'
      : 'El bien es MUEBLE: la transferencia opera con la tradición (art. 947 CC); incluye saneamiento y, de corresponder por tratarse de bien registrable, la inscripción respectiva.'
  }
  if (documentType === 'garantia' && fields.tipo_garantia) {
    const map: Record<string, string> = {
      hipoteca: 'Redacta una HIPOTECA (arts. 1097-1122 CC) en formato MINUTA: monto del gravamen determinado, inmueble con partida registral, valorización del inmueble (2/3 partes servirán de base para el remate), renuncia expresa a los arts. 1115 y 1116 CC, inscripción en el Registro de Predios de SUNARP.',
      garantia_mobiliaria: 'Redacta una GARANTÍA MOBILIARIA bajo el Decreto Legislativo N° 1400 y su Reglamento (D.S. 243-2019-EF), con inscripción en el SIGM de SUNARP. Incluye Definiciones e Interpretación extensas; Objeto con Monto Garantizado; Obligaciones del Constituyente; Eventos de Incumplimiento; Ejecución extrajudicial y/o adjudicación al Acreedor Garantizado con Valor de Realización; Del Representante (poder irrevocable para la ejecución). No cites la Ley 28677 (derogada).',
      fianza_solidaria: 'Redacta una FIANZA SOLIDARIA (arts. 1868-1905 CC) con la fórmula estándar "fianza solidaria, irrevocable, incondicional, sin beneficio de excusión ni división, de realización automática, al primer requerimiento". Renuncia expresa al beneficio de excusión (art. 1883). Subrogación del fiador que paga (art. 1889). No hay bien gravado — es garantía personal.',
    }
    return map[fields.tipo_garantia] ?? ''
  }
  if (documentType === 'poder' && fields.tipo_poder) {
    return fields.tipo_poder === 'general'
      ? 'Es un PODER GENERAL: comprende únicamente actos de administración (art. 155 CC). No incluye facultades de disposición ni gravamen.'
      : 'Es un PODER ESPECÍFICO: detalla el acto o negocio determinado con precisión. Si comprende disposición o gravamen de bienes, exige otorgamiento por escritura pública (art. 156 CC) — usa formato MINUTA.'
  }
  if (documentType === 'mandato' && fields.modalidad) {
    return fields.modalidad === 'con_representacion'
      ? 'Mandato CON representación (arts. 1806 y ss. CC): el mandatario actúa en nombre del mandante; los efectos jurídicos recaen directamente sobre este.'
      : 'Mandato SIN representación (arts. 1809 y ss. CC): el mandatario actúa en nombre propio y luego transfiere al mandante los bienes o derechos adquiridos.'
  }
  if (documentType === 'fideicomiso' && fields.tipo_fideicomiso) {
    const map: Record<string, string> = {
      garantia: 'FIDEICOMISO EN GARANTÍA: la finalidad es respaldar el cumplimiento de obligaciones específicas. Incluye cláusulas de ejecución por incumplimiento y devolución del remanente al fideicomitente. No involucra emisión de valores.',
      administracion: 'FIDEICOMISO DE ADMINISTRACIÓN: el fiduciario gestiona el patrimonio conforme a instrucciones específicas del fideicomitente en beneficio del fideicomisario. Enfatiza obligaciones fiduciarias de gestión, rendición de cuentas y estándar de diligencia.',
      titulizacion: 'FIDEICOMISO DE TITULIZACIÓN: se rige adicionalmente por la Ley del Mercado de Valores (D. Leg. N° 861). Involucra emisión de valores mobiliarios respaldados por el patrimonio. Incluye cláusulas de emisión, colocación, registro de bonistas/titulares, condiciones de la emisión, eventos de incumplimiento respecto a los bonos, asambleas de titulares, y ejecución del patrimonio ante incumplimiento. Es el contrato más complejo — 40-50 cláusulas típicamente.',
      testamentario: 'FIDEICOMISO TESTAMENTARIO O VITALICIO: excepción al plazo máximo de 30 años. Incluye disposiciones sucesorias o vitalicias correspondientes.',
    }
    return map[fields.tipo_fideicomiso] ?? ''
  }
  if (documentType === 'pagare' && fields.pagare_incompleto === 'si') {
    return 'PAGARÉ INCOMPLETO: se emite con importe y/o vencimiento en blanco. Debe acompañarse OBLIGATORIAMENTE de un ACUERDO DE LLENADO al amparo del art. 10 de la Ley N° 27287, que establezca los criterios para completarlo (monto por liquidación del acreedor, fecha en que se decida completar, autorización sin necesidad de consentimiento adicional del deudor). Genera ambos documentos: primero el pagaré incompleto con espacios en blanco marcados con "[●]" o líneas ("_______"), y después el acuerdo de llenado como sección o documento adjunto.'
  }
  if (documentType === 'arrendamiento' && fields.desalojo_notarial === 'omitir') {
    return 'El usuario ha elegido OMITIR las cláusulas de desalojo notarial (Ley 30933) y allanamiento futuro (Ley 30201). No incluyas esas cláusulas; la resolución seguirá la vía ordinaria del art. 1430 CC y el desalojo el proceso judicial estándar.'
  }
  return ''
}

/**
 * Traduce el select `solucion_controversias` a una instrucción explícita.
 * Muchos tipos exponen este campo; centralizarlo evita repetir la misma
 * lógica en cada rama del subtype.
 */
function disputeGuidance(fields: Record<string, string>): string {
  const value = fields.solucion_controversias
  if (!value) return ''
  const map: Record<string, string> = {
    judicial_lima: 'Cláusula de solución de controversias: sometimiento a los jueces y tribunales del Distrito Judicial del Cercado de Lima, con renuncia expresa al fuero de los domicilios de las Partes.',
    arbitraje_ccl: 'Cláusula de solución de controversias: arbitraje de derecho ante un Tribunal Arbitral de tres (3) árbitros bajo el Reglamento del Centro de Arbitraje de la Cámara de Comercio de Lima (CCL), en la ciudad de Lima e idioma español, conforme al Decreto Legislativo N° 1071. Laudo definitivo e inapelable. Para intervención judicial residual, sometimiento a los jueces del Cercado de Lima.',
    arbitraje_otro: 'Cláusula de solución de controversias: arbitraje conforme a lo especificado por el usuario en cláusulas especiales; si no se especifica sede, usa un placeholder "[●]" para la institución y sede.',
  }
  return map[value] ?? ''
}

export function buildDrafterUserPrompt(opts: {
  documentType: DocumentTypeId
  jurisdiction: string
  fields: Record<string, string>
}): string {
  const typeLabel = documentTypeLabel(opts.documentType)
  const legalBasis = LEGAL_BASIS[opts.documentType] ?? 'Aplica el Código Civil peruano (Decreto Legislativo N° 295) y las normas especiales pertinentes.'
  const subtype = subtypeGuidance(opts.documentType, opts.fields)
  const dispute = disputeGuidance(opts.fields)

  const fieldBlock = Object.entries(opts.fields)
    .filter(([, v]) => v.trim())
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n')

  const extraGuidance = [subtype, dispute].filter(Boolean).join('\n\n')

  return `Redacta un(a) ${typeLabel} completo, regido por la legislación de la República del Perú vigente.

Base legal y estructura típica:
${legalBasis}${extraGuidance ? `\n\nGuía específica adicional:\n${extraGuidance}` : ''}

Datos del negocio e instrucciones:
${fieldBlock}

Entrega el documento completo, listo para revisión de un abogado, como secciones estructuradas según el formato JSON requerido. Redacta en español, con estilo notarial peruano estricto (formato de encabezado según requiera escritura pública o documento privado, comparecencia con generales de ley, cláusulas numeradas con ordinales en mayúscula, y cierre correspondiente).`
}

export const REFINE_SYSTEM = `Eres un abogado redactor peruano senior que revisa un documento legal existente redactado bajo la legislación del Perú.
Aplica ÚNICAMENTE el cambio solicitado — modifica la(s) sección(es) afectada(s) y deja el resto intacto. Nunca regeneres todo el documento desde cero. Mantén el estilo notarial peruano, los formulismos habituales ("con domicilio para estos efectos en...", "según poderes inscritos en la Partida Electrónica N° ...", "mora automática conforme al numeral 1 del art. 1333 CC", etc.) y las citas al Código Civil (D.L. 295) y normas vigentes.

Responde SOLO con un objeto JSON (sin fences de markdown, sin comentarios fuera del JSON) con esta forma exacta:
{
  "message": "explicación breve, en el mismo idioma de la instrucción del usuario",
  "sections": [ { "titulo": "PRIMERA.- OBJETO", "contenido": "texto completo y actualizado de CADA sección" } ],
  "cambios_realizados": [ { "seccion": "título de la sección", "tipo_cambio": "agregado|modificado|eliminado", "descripcion": "qué cambió" } ]
}
"sections" debe contener SIEMPRE el conjunto COMPLETO y actual de secciones (las no afectadas copiadas sin cambios) para que el cliente pueda renderizar todo el documento desde este único campo.`
