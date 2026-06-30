import { getDocDb } from '../db'
import type {
  ActaPrecedente,
  CambiosPrecedente,
  DatosJGA,
  SeccionActa,
  TipoOperacionJGA,
} from '../types'

export async function cargarPrecedente(id: string, userId: string): Promise<ActaPrecedente | null> {
  const db = getDocDb()
  const { data, error } = await db
    .from('doc_precedentes')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle()
  if (error || !data) return null

  const row = data as Record<string, unknown>
  return {
    id: String(row.id),
    sociedad_id: String(row.sociedad_id),
    fecha_acta: (row.datos_jga as DatosJGA)?.fecha ?? '',
    tipo_operaciones: (row.tipo_operaciones as TipoOperacionJGA[]) ?? [],
    datos_jga: row.datos_jga as DatosJGA,
    secciones_generadas: row.secciones_generadas as SeccionActa[] | undefined,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    user_id: String(row.user_id),
    nombre_referencia: String(row.nombre_referencia),
  }
}

export async function crearDesdePrecedente(
  precedenteId: string,
  cambios: CambiosPrecedente,
  userId: string,
): Promise<DatosJGA | null> {
  const precedente = await cargarPrecedente(precedenteId, userId)
  if (!precedente) return null

  const base = structuredClone(precedente.datos_jga)

  if (cambios.fecha) base.fecha = cambios.fecha
  if (cambios.hora_inicio) base.hora_inicio = cambios.hora_inicio
  if (cambios.hora_fin) base.hora_fin = cambios.hora_fin
  if (cambios.lugar) base.lugar = cambios.lugar
  if (cambios.presidente) base.presidente = cambios.presidente
  if (cambios.secretario) base.secretario = cambios.secretario
  if (cambios.accionistas_actualizados) base.accionistas = cambios.accionistas_actualizados

  if (cambios.montos || cambios.contrapartes || cambios.acuerdos_especificos) {
    base.agenda = base.agenda.map(p => {
      const datos = { ...p.datos_operacion }
      if (cambios.montos) {
        for (const [k, v] of Object.entries(cambios.montos)) {
          if (k in datos || k === 'monto' || k === 'monto_emision') datos[k] = v
        }
      }
      if (cambios.contrapartes) {
        for (const [k, v] of Object.entries(cambios.contrapartes)) {
          if (k in datos) datos[k] = v
        }
      }
      if (cambios.acuerdos_especificos?.[String(p.numero)]) {
        Object.assign(datos, cambios.acuerdos_especificos[String(p.numero)])
      }
      return { ...p, datos_operacion: datos }
    })
  }

  return base
}

export async function guardarComoPrecedente(
  datos: DatosJGA,
  nombre: string,
  userId: string,
  sociedadId: string,
  secciones?: SeccionActa[],
): Promise<ActaPrecedente> {
  const db = getDocDb()
  const tipo_operaciones = datos.agenda.map(a => a.tipo_operacion)

  const { data, error } = await db
    .from('doc_precedentes')
    .insert({
      user_id: userId,
      sociedad_id: sociedadId,
      nombre_referencia: nombre,
      tipo_operaciones,
      datos_jga: datos,
      secciones_generadas: secciones ?? null,
    })
    .select('*')
    .single()

  if (error) throw new Error(`guardarComoPrecedente: ${error.message}`)

  const row = data as Record<string, unknown>
  return {
    id: String(row.id),
    sociedad_id: String(row.sociedad_id),
    fecha_acta: datos.fecha,
    tipo_operaciones,
    datos_jga: datos,
    secciones_generadas: secciones,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    user_id: userId,
    nombre_referencia: nombre,
  }
}

export async function listarPrecedentes(userId: string, sociedadId?: string) {
  const db = getDocDb()
  let q = db.from('doc_precedentes').select('id, nombre_referencia, sociedad_id, tipo_operaciones, created_at').eq('user_id', userId)
  if (sociedadId) q = q.eq('sociedad_id', sociedadId)
  const { data, error } = await q.order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data ?? []
}
