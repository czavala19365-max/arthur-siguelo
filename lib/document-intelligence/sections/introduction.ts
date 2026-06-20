import type { Accionista, DatosJGA } from '../types'
import { LEGAL_PHRASES } from '../constants'
import { formatMonto, nombreTipoSocietario, pluralAcciones, simboloMoneda } from '../utils'

function formatAccionistaNatural(a: Accionista): string {
  const moneda = simboloMoneda(a.moneda)
  return `${a.nombre_completo}, identificado con DNI N° ${a.dni}, titular de ${a.num_acciones.toLocaleString('es-PE')} ${pluralAcciones(a.num_acciones)} de ${moneda} ${a.valor_nominal.toFixed(2)} de valor nominal cada una, ${LEGAL_PHRASES.shares}`
}

function formatAccionistaJuridica(a: Accionista): string {
  const moneda = simboloMoneda(a.moneda)
  const reps = a.representantes ?? []
  const repText =
    reps.length > 0
      ? reps
          .map(r => {
            const ref =
              r.referencia_poder ??
              a.poderes_referencia ??
              'Partida Electrónica N° [●] del Registro de Personas Jurídicas de Lima'
            const tipoRef =
              r.tipo_poder === 'exhibido'
                ? 'según poderes exhibidos'
                : r.tipo_poder === 'otorgado'
                  ? 'según poderes otorgados en la presente Junta'
                  : `según poderes inscritos en la ${ref}`
            return `${r.nombre_completo}, identificado con DNI N° ${r.dni}${r.cargo ? `, en su calidad de ${r.cargo}` : ''}, ${tipoRef}`
          })
          .join('; y ')
      : `${a.nombre_completo}, identificado con DNI N° ${a.dni}`

  return `${a.razon_social ?? a.nombre_completo}, identificada con RUC N° ${a.ruc ?? a.dni}, representada por ${repText}, titular de ${a.num_acciones.toLocaleString('es-PE')} ${pluralAcciones(a.num_acciones)} de ${moneda} ${a.valor_nominal.toFixed(2)} de valor nominal cada una, ${LEGAL_PHRASES.shares}`
}

export function generarIntroduccion(datos: DatosJGA): string {
  const ciudad = datos.ciudad ?? 'Lima'
  const { sociedad, accionistas } = datos
  const totalAcciones = accionistas.reduce((s, a) => s + a.num_acciones, 0)
  const valorNominal = sociedad.valor_nominal_accion || 1
  const moneda = simboloMoneda(sociedad.moneda_capital)

  const listaAccionistas = accionistas
    .map(a => (a.tipo === 'persona_juridica' ? formatAccionistaJuridica(a) : formatAccionistaNatural(a)))
    .map((t, i) => `${i === accionistas.length - 1 && accionistas.length > 1 ? 'y ' : ''}${t}`)
    .join('; ')

  const direccionCompleta = datos.lugar || `${sociedad.domicilio}, distrito de ${sociedad.distrito}, provincia de ${sociedad.provincia}, departamento de ${sociedad.departamento}`

  const tipoNombre = nombreTipoSocietario(sociedad.tipo_societario)

  return `En la ciudad de ${ciudad}, siendo las ${datos.hora_inicio} horas del ${datos.fecha}, en ${direccionCompleta}, los accionistas de ${sociedad.razon_social}, ${tipoNombre}, identificada con RUC N° ${sociedad.ruc}, se reunieron en Junta General de Accionistas.

Se dejó constancia de la asistencia de los siguientes accionistas: ${listaAccionistas}.

En conjunto, los accionistas presentes representan ${totalAcciones.toLocaleString('es-PE')} ${pluralAcciones(totalAcciones)} de ${moneda} ${valorNominal.toFixed(2)} de valor nominal cada una, ${LEGAL_PHRASES.shares}, representativas del 100% del Capital Social de la Sociedad.`
}
