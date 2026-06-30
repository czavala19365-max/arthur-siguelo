import type { DatosJGA, PuntoAgenda } from '../types'
import { getOperationTemplate } from '../templates/operation-templates'
import { generarBloquePoder, type DatosPoder, type TipoPoder } from './powers'

export async function generarDesarrollo(
  punto: PuntoAgenda,
  datos: DatosJGA,
): Promise<{ desarrollo: string; acuerdo: string }> {
  const template = getOperationTemplate(punto.tipo_operacion)
  const opDatos = punto.datos_operacion ?? {}

  let desarrollo = template.generarDesarrollo(opDatos, datos.sociedad)
  if (opDatos.desarrollo_ia && typeof opDatos.desarrollo_ia === 'string') {
    desarrollo = opDatos.desarrollo_ia
  } else if (opDatos.desarrollo_custom && typeof opDatos.desarrollo_custom === 'string') {
    desarrollo = opDatos.desarrollo_custom
  }

  let acuerdo = template.generarAcuerdo(opDatos, datos.sociedad)
  if (opDatos.acuerdo_custom && typeof opDatos.acuerdo_custom === 'string') {
    acuerdo = opDatos.acuerdo_custom
  }

  if (opDatos.incluir_poderes && opDatos.apoderado_nombre) {
    const tipoPoder = (opDatos.tipo_poder as TipoPoder) ?? mapOperacionToPoder(punto.tipo_operacion)
    const bloquePoder = generarBloquePoder({
      tipo: tipoPoder,
      apoderado_nombre: String(opDatos.apoderado_nombre),
      apoderado_dni: String(opDatos.apoderado_dni ?? '[●]'),
      firma: (opDatos.firma_individual === false ? 'conjunta' : 'individual') as 'individual' | 'conjunta',
      operacion_especifica: punto.titulo,
    })
    desarrollo += `\n\n${bloquePoder.split(LEGAL_AGREEMENT_SPLIT)[0]}`
    acuerdo += `\n\n${bloquePoder.split(LEGAL_AGREEMENT_SPLIT)[1] ?? ''}`
  }

  return { desarrollo, acuerdo }
}

const LEGAL_AGREEMENT_SPLIT = 'Luego de una breve deliberación'

function mapOperacionToPoder(tipo: PuntoAgenda['tipo_operacion']): TipoPoder {
  const map: Partial<Record<PuntoAgenda['tipo_operacion'], TipoPoder>> = {
    financiamiento: 'financiamiento',
    emision_bonos: 'titulos_valores',
    fideicomiso: 'fideicomisos',
    garantia_mobiliaria: 'garantias',
    hipoteca: 'garantias',
    fianza_solidaria: 'garantias',
    poderes_especiales: 'contratos_generales',
  }
  return map[tipo] ?? 'contratos_generales'
}
