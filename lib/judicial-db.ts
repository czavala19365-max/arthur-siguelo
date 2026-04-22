import { getJudicialSupabase } from './supabase-judicial'
import type { AlertaConfig } from './alert-service'

export interface Caso {
  id: number
  numero_expediente: string
  distrito_judicial: string
  organo_jurisdiccional: string | null
  juez: string | null
  tipo_proceso: string | null
  especialidad: string | null
  etapa_procesal: string | null
  partes: string | null
  cliente: string | null
  alias: string | null
  monto: string | null
  prioridad: 'alta' | 'media' | 'baja'
  estado: 'activo' | 'concluido' | 'archivado'
  ultimo_movimiento: string | null
  ultimo_movimiento_fecha: string | null
  proximo_evento: string | null
  proximo_evento_fecha: string | null
  estado_hash: string | null
  polling_frequency_hours: number
  whatsapp_number: string | null
  email: string | null
  activo: number
  last_checked: string | null
  created_at: string
  archived_at: string | null
  deleted_at: string | null
  parte_procesal?: string | null
}

export interface MovimientoJudicial {
  id: number
  caso_id: number
  numero: string | null
  fecha: string | null
  acto: string | null
  folio: string | null
  sumilla: string | null
  tiene_documento: number
  documento_url: string | null
  tiene_resolucion: number
  es_nuevo: number
  urgencia: 'alta' | 'normal' | 'info'
  ai_sugerencia: string | null
  ai_analisis: string | null
  scraped_at: string
}

export interface AudienciaJudicial {
  id: number
  caso_id: number
  descripcion: string
  fecha: string
  tipo: string | null
  completado: number
  google_calendar_link: string | null
  outlook_link: string | null
  created_at: string
}

export interface EscritoJudicial {
  id: number
  caso_id: number
  tipo: string
  contenido: string
  created_at: string
}

export interface NotificacionJudicial {
  id: number
  caso_id: number | null
  canal: string
  movimiento_descripcion: string | null
  urgencia: string | null
  ai_sugerencia: string | null
  enviado_at: string
  success: number
}

type CasoRow = Record<string, unknown>
type MovRow = Record<string, unknown>

function boolToInt(b: boolean | null | undefined): number {
  return b ? 1 : 0
}

function asBool(v: unknown): boolean {
  return v === true || v === 1
}

function iso(v: unknown): string | null {
  if (v == null) return null
  if (typeof v === 'string') return v
  if (v instanceof Date) return v.toISOString()
  return String(v)
}

function isoReq(v: unknown): string {
  const s = iso(v)
  return s ?? ''
}

function mapCaso(row: CasoRow): Caso {
  return {
    id: Number(row.id),
    numero_expediente: String(row.numero_expediente ?? ''),
    distrito_judicial: String(row.distrito_judicial ?? ''),
    organo_jurisdiccional: row.organo_jurisdiccional != null ? String(row.organo_jurisdiccional) : null,
    juez: row.juez != null ? String(row.juez) : null,
    tipo_proceso: row.tipo_proceso != null ? String(row.tipo_proceso) : null,
    especialidad: row.especialidad != null ? String(row.especialidad) : null,
    etapa_procesal: row.etapa_procesal != null ? String(row.etapa_procesal) : null,
    partes: row.partes != null ? String(row.partes) : null,
    cliente: row.cliente != null ? String(row.cliente) : null,
    alias: row.alias != null ? String(row.alias) : null,
    monto: row.monto != null ? String(row.monto) : null,
    prioridad: (row.prioridad as Caso['prioridad']) || 'baja',
    estado: (row.estado as Caso['estado']) || 'activo',
    ultimo_movimiento: row.ultimo_movimiento != null ? String(row.ultimo_movimiento) : null,
    ultimo_movimiento_fecha: row.ultimo_movimiento_fecha != null ? String(row.ultimo_movimiento_fecha) : null,
    proximo_evento: row.proximo_evento != null ? String(row.proximo_evento) : null,
    proximo_evento_fecha: row.proximo_evento_fecha != null ? String(row.proximo_evento_fecha) : null,
    estado_hash: row.estado_hash != null ? String(row.estado_hash) : null,
    polling_frequency_hours: Number(row.polling_frequency_hours ?? 4),
    whatsapp_number: row.whatsapp_number != null ? String(row.whatsapp_number) : null,
    email: row.email != null ? String(row.email) : null,
    activo: boolToInt(row.activo as boolean | undefined),
    last_checked: iso(row.last_checked),
    created_at: isoReq(row.created_at),
    archived_at: iso(row.archived_at),
    deleted_at: iso(row.deleted_at),
    parte_procesal: row.parte_procesal != null ? String(row.parte_procesal) : null,
  }
}

function mapMovimiento(row: MovRow): MovimientoJudicial {
  return {
    id: Number(row.id),
    caso_id: Number(row.caso_id),
    numero: row.numero != null ? String(row.numero) : null,
    fecha: row.fecha != null ? String(row.fecha) : null,
    acto: row.acto != null ? String(row.acto) : null,
    folio: row.folio != null ? String(row.folio) : null,
    sumilla: row.sumilla != null ? String(row.sumilla) : null,
    tiene_documento: boolToInt(row.tiene_documento as boolean | undefined),
    documento_url: row.documento_url != null ? String(row.documento_url) : null,
    tiene_resolucion: boolToInt(row.tiene_resolucion as boolean | undefined),
    es_nuevo: boolToInt(row.es_nuevo as boolean | undefined),
    urgencia: (row.urgencia as MovimientoJudicial['urgencia']) || 'info',
    ai_sugerencia: row.ai_sugerencia != null ? String(row.ai_sugerencia) : null,
    ai_analisis: row.ai_analisis != null ? String(row.ai_analisis) : null,
    scraped_at: isoReq(row.scraped_at),
  }
}

function mapAudiencia(row: CasoRow): AudienciaJudicial {
  return {
    id: Number(row.id),
    caso_id: Number(row.caso_id),
    descripcion: String(row.descripcion ?? ''),
    fecha: String(row.fecha ?? ''),
    tipo: row.tipo != null ? String(row.tipo) : null,
    completado: boolToInt(row.completado as boolean | undefined),
    google_calendar_link: row.google_calendar_link != null ? String(row.google_calendar_link) : null,
    outlook_link: row.outlook_link != null ? String(row.outlook_link) : null,
    created_at: isoReq(row.created_at),
  }
}

function mapEscrito(row: CasoRow): EscritoJudicial {
  return {
    id: Number(row.id),
    caso_id: Number(row.caso_id),
    tipo: String(row.tipo ?? ''),
    contenido: String(row.contenido ?? ''),
    created_at: isoReq(row.created_at),
  }
}

function mapNotif(row: CasoRow): NotificacionJudicial {
  return {
    id: Number(row.id),
    caso_id: row.caso_id != null ? Number(row.caso_id) : null,
    canal: String(row.canal ?? ''),
    movimiento_descripcion: row.movimiento_descripcion != null ? String(row.movimiento_descripcion) : null,
    urgencia: row.urgencia != null ? String(row.urgencia) : null,
    ai_sugerencia: row.ai_sugerencia != null ? String(row.ai_sugerencia) : null,
    enviado_at: isoReq(row.enviado_at),
    success: boolToInt(row.success as boolean | undefined),
  }
}

function casoToInsertPayload(data: Partial<Caso>): Record<string, unknown> {
  const activo = data.activo !== undefined ? asBool(data.activo) : true
  return {
    numero_expediente: data.numero_expediente,
    distrito_judicial: data.distrito_judicial,
    organo_jurisdiccional: data.organo_jurisdiccional ?? null,
    juez: data.juez ?? null,
    tipo_proceso: data.tipo_proceso ?? null,
    especialidad: data.especialidad ?? null,
    etapa_procesal: data.etapa_procesal ?? null,
    partes: data.partes ?? null,
    cliente: data.cliente ?? null,
    alias: data.alias ?? null,
    monto: data.monto ?? null,
    prioridad: data.prioridad ?? 'baja',
    estado: data.estado ?? 'activo',
    ultimo_movimiento: data.ultimo_movimiento ?? null,
    ultimo_movimiento_fecha: data.ultimo_movimiento_fecha ?? null,
    proximo_evento: data.proximo_evento ?? null,
    proximo_evento_fecha: data.proximo_evento_fecha ?? null,
    estado_hash: data.estado_hash ?? null,
    polling_frequency_hours: data.polling_frequency_hours ?? 4,
    whatsapp_number: data.whatsapp_number ?? null,
    email: data.email ?? null,
    activo,
    last_checked: data.last_checked ?? null,
    parte_procesal: data.parte_procesal ?? null,
  }
}

function casoToUpdatePayload(data: Partial<Caso>): Record<string, unknown> {
  const payload: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(data)) {
    if (k === 'id' || v === undefined) continue
    if (k === 'activo') payload[k] = asBool(v as number)
    else if (k === 'created_at') continue
    else payload[k] = v
  }
  return payload
}

async function purgeJudicialCasosPapelera(): Promise<void> {
  const supabase = getJudicialSupabase()
  const cutoff = new Date()
  cutoff.setUTCDate(cutoff.getUTCDate() - 30)
  const { error } = await supabase
    .from('casos')
    .delete()
    .not('deleted_at', 'is', null)
    .lte('deleted_at', cutoff.toISOString())
  if (error) console.error('[Judicial DB] purge papelera:', error.message)
}

export async function getAllCasosActivos(): Promise<Caso[]> {
  await purgeJudicialCasosPapelera()
  const supabase = getJudicialSupabase()
  const { data, error } = await supabase
    .from('casos')
    .select('*')
    .eq('activo', true)
    .is('archived_at', null)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  if (error) throw new Error(`getAllCasosActivos: ${error.message}`)
  return (data ?? []).map(r => mapCaso(r as CasoRow))
}

export async function getCasosArchivados(): Promise<Caso[]> {
  await purgeJudicialCasosPapelera()
  const supabase = getJudicialSupabase()
  const { data, error } = await supabase
    .from('casos')
    .select('*')
    .not('archived_at', 'is', null)
    .is('deleted_at', null)
    .order('archived_at', { ascending: false })
  if (error) throw new Error(`getCasosArchivados: ${error.message}`)
  return (data ?? []).map(r => mapCaso(r as CasoRow))
}

export async function getCasosPapelera(): Promise<Caso[]> {
  await purgeJudicialCasosPapelera()
  const supabase = getJudicialSupabase()
  const { data, error } = await supabase
    .from('casos')
    .select('*')
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false })
  if (error) throw new Error(`getCasosPapelera: ${error.message}`)
  return (data ?? []).map(r => mapCaso(r as CasoRow))
}

export async function getCasoById(id: number): Promise<Caso | null> {
  const supabase = getJudicialSupabase()
  const { data, error } = await supabase.from('casos').select('*').eq('id', id).maybeSingle()
  if (error) throw new Error(`getCasoById: ${error.message}`)
  if (!data) return null
  return mapCaso(data as CasoRow)
}

export async function createCaso(data: Partial<Caso>): Promise<Caso> {
  const supabase = getJudicialSupabase()
  const payload = casoToInsertPayload({
    ...data,
    numero_expediente: data.numero_expediente ?? '',
    distrito_judicial: data.distrito_judicial ?? 'Lima',
  })
  const { data: row, error } = await supabase.from('casos').insert(payload).select('*').single()
  if (error) throw new Error(`createCaso: ${error.message}`)
  return mapCaso(row as CasoRow)
}

export async function updateCaso(id: number, data: Partial<Caso>): Promise<void> {
  const supabase = getJudicialSupabase()
  const payload = casoToUpdatePayload(data)
  if (Object.keys(payload).length === 0) return
  const { error } = await supabase.from('casos').update(payload).eq('id', id)
  if (error) throw new Error(`updateCaso: ${error.message}`)
}

export async function moveCasoToPapelera(id: number): Promise<void> {
  const supabase = getJudicialSupabase()
  const { error } = await supabase
    .from('casos')
    .update({
      activo: false,
      deleted_at: new Date().toISOString(),
      archived_at: null,
    })
    .eq('id', id)
  if (error) throw new Error(`moveCasoToPapelera: ${error.message}`)
}

export async function archiveCaso(id: number): Promise<void> {
  const supabase = getJudicialSupabase()
  const { error } = await supabase
    .from('casos')
    .update({
      activo: false,
      archived_at: new Date().toISOString(),
      deleted_at: null,
    })
    .eq('id', id)
  if (error) throw new Error(`archiveCaso: ${error.message}`)
}

export async function restoreCasoFromArchive(id: number): Promise<void> {
  const supabase = getJudicialSupabase()
  const { error } = await supabase
    .from('casos')
    .update({ activo: true, archived_at: null })
    .eq('id', id)
    .not('archived_at', 'is', null)
    .is('deleted_at', null)
  if (error) throw new Error(`restoreCasoFromArchive: ${error.message}`)
}

export async function restoreCasoFromPapelera(id: number): Promise<void> {
  const supabase = getJudicialSupabase()
  const { error } = await supabase
    .from('casos')
    .update({ activo: true, deleted_at: null })
    .eq('id', id)
    .not('deleted_at', 'is', null)
  if (error) throw new Error(`restoreCasoFromPapelera: ${error.message}`)
}

/** @deprecated Usar moveCasoToPapelera */
export async function softDeleteCaso(id: number): Promise<void> {
  await moveCasoToPapelera(id)
}

export async function getMovimientosByCaso(casoId: number): Promise<MovimientoJudicial[]> {
  const supabase = getJudicialSupabase()
  const { data, error } = await supabase
    .from('movimientos_judiciales')
    .select('*')
    .eq('caso_id', casoId)
    .order('scraped_at', { ascending: false })
    .order('id', { ascending: false })
  if (error) throw new Error(`getMovimientosByCaso: ${error.message}`)
  return (data ?? []).map(r => mapMovimiento(r as MovRow))
}

export async function addMovimientoJudicial(
  casoId: number,
  data: {
    numero?: string | null
    fecha?: string | null
    acto?: string | null
    folio?: string | null
    sumilla?: string | null
    tiene_documento?: boolean
    documento_url?: string | null
    tiene_resolucion?: boolean
    es_nuevo?: boolean
    urgencia?: 'alta' | 'normal' | 'info'
    ai_sugerencia?: string | null
    ai_analisis?: string | null
  },
): Promise<number> {
  const supabase = getJudicialSupabase()
  const payload = {
    caso_id: casoId,
    numero: data.numero ?? null,
    fecha: data.fecha ?? null,
    acto: data.acto ?? null,
    folio: data.folio ?? null,
    sumilla: data.sumilla ?? null,
    tiene_documento: !!data.tiene_documento,
    documento_url: data.documento_url ?? null,
    tiene_resolucion: !!data.tiene_resolucion,
    es_nuevo: data.es_nuevo === false ? false : true,
    urgencia: data.urgencia ?? 'info',
    ai_sugerencia: data.ai_sugerencia ?? null,
    ai_analisis: data.ai_analisis ?? null,
  }
  const { data: row, error } = await supabase.from('movimientos_judiciales').insert(payload).select('id').single()
  if (error) throw new Error(`addMovimientoJudicial: ${error.message}`)
  return Number((row as { id: number }).id)
}

export async function updateMovimientoJudicial(
  id: number,
  data: Partial<Pick<MovimientoJudicial, 'urgencia' | 'ai_sugerencia' | 'ai_analisis'>>,
): Promise<void> {
  const supabase = getJudicialSupabase()
  const payload: Record<string, unknown> = {}
  if (data.urgencia !== undefined) payload.urgencia = data.urgencia
  if (data.ai_sugerencia !== undefined) payload.ai_sugerencia = data.ai_sugerencia
  if (data.ai_analisis !== undefined) payload.ai_analisis = data.ai_analisis
  if (Object.keys(payload).length === 0) return
  const { error } = await supabase.from('movimientos_judiciales').update(payload).eq('id', id)
  if (error) throw new Error(`updateMovimientoJudicial: ${error.message}`)
}

export async function getAudienciasByCaso(casoId: number): Promise<AudienciaJudicial[]> {
  const supabase = getJudicialSupabase()
  const { data, error } = await supabase
    .from('audiencias')
    .select('*')
    .eq('caso_id', casoId)
    .order('fecha', { ascending: true })
  if (error) throw new Error(`getAudienciasByCaso: ${error.message}`)
  return (data ?? []).map(r => mapAudiencia(r as CasoRow))
}

export async function getAllAudienciasPendientes(): Promise<
  Array<AudienciaJudicial & { alias: string | null; tipo_proceso: string | null }>
> {
  const supabase = getJudicialSupabase()
  const { data: auds, error } = await supabase.from('audiencias').select('*').eq('completado', false)
  if (error) throw new Error(`getAllAudienciasPendientes: ${error.message}`)
  const casoIds = [...new Set((auds ?? []).map(a => Number((a as { caso_id: number }).caso_id)))]
  const casoMeta = new Map<number, { alias: string | null; tipo_proceso: string | null }>()
  if (casoIds.length > 0) {
    const { data: casosRows, error: cErr } = await supabase
      .from('casos')
      .select('id, alias, tipo_proceso, activo, archived_at, deleted_at')
      .in('id', casoIds)
    if (cErr) throw new Error(`getAllAudienciasPendientes casos: ${cErr.message}`)
    for (const c of casosRows ?? []) {
      const row = c as CasoRow & { id: number; activo?: boolean }
      if (!row.activo || row.archived_at != null || row.deleted_at != null) continue
      casoMeta.set(Number(row.id), {
        alias: row.alias != null ? String(row.alias) : null,
        tipo_proceso: row.tipo_proceso != null ? String(row.tipo_proceso) : null,
      })
    }
  }
  const out: Array<AudienciaJudicial & { alias: string | null; tipo_proceso: string | null }> = []
  for (const raw of auds ?? []) {
    const aud = raw as CasoRow
    const cid = Number(aud.caso_id)
    const meta = casoMeta.get(cid)
    if (!meta) continue
    out.push({ ...mapAudiencia(aud), ...meta })
  }
  return out.sort((a, b) => a.fecha.localeCompare(b.fecha))
}

export async function addAudienciaJudicial(
  casoId: number,
  descripcion: string,
  fecha: string,
  tipo?: string,
): Promise<void> {
  const supabase = getJudicialSupabase()
  const { error } = await supabase.from('audiencias').insert({
    caso_id: casoId,
    descripcion,
    fecha,
    tipo: tipo ?? null,
  })
  if (error) throw new Error(`addAudienciaJudicial: ${error.message}`)
}

export async function getEscritosByCaso(casoId: number): Promise<EscritoJudicial[]> {
  const supabase = getJudicialSupabase()
  const { data, error } = await supabase
    .from('escritos_judiciales')
    .select('*')
    .eq('caso_id', casoId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(`getEscritosByCaso: ${error.message}`)
  return (data ?? []).map(r => mapEscrito(r as CasoRow))
}

export async function saveEscritoJudicial(casoId: number, tipo: string, contenido: string): Promise<void> {
  const supabase = getJudicialSupabase()
  const { error } = await supabase.from('escritos_judiciales').insert({ caso_id: casoId, tipo, contenido })
  if (error) throw new Error(`saveEscritoJudicial: ${error.message}`)
}

export async function getNotificacionesJudicialesByCaso(
  casoId: number,
  limit = 5,
): Promise<NotificacionJudicial[]> {
  const supabase = getJudicialSupabase()
  const { data, error } = await supabase
    .from('notificaciones_judiciales')
    .select('*')
    .eq('caso_id', casoId)
    .order('enviado_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(`getNotificacionesJudicialesByCaso: ${error.message}`)
  return (data ?? []).map(r => mapNotif(r as CasoRow))
}

export async function logNotificacionJudicial(
  casoId: number,
  canal: string,
  movimientoDescripcion: string,
  urgencia: string,
  aiSugerencia: string,
  success: boolean,
): Promise<void> {
  const supabase = getJudicialSupabase()
  const { error } = await supabase.from('notificaciones_judiciales').insert({
    caso_id: casoId,
    canal,
    movimiento_descripcion: movimientoDescripcion,
    urgencia,
    ai_sugerencia: aiSugerencia,
    success,
  })
  if (error) throw new Error(`logNotificacionJudicial: ${error.message}`)
}

export async function getCasosStats(): Promise<{
  total: number
  activos: number
  conAlerta: number
  proximasAudiencias: number
}> {
  const supabase = getJudicialSupabase()
  const activeFilter = async () => {
    const { count, error } = await supabase
      .from('casos')
      .select('*', { count: 'exact', head: true })
      .eq('activo', true)
      .is('archived_at', null)
      .is('deleted_at', null)
    if (error) throw new Error(`getCasosStats total: ${error.message}`)
    return count ?? 0
  }

  const total = await activeFilter()

  const { data: movs, error: movErr } = await supabase
    .from('movimientos_judiciales')
    .select('caso_id')
    .eq('es_nuevo', true)
    .eq('urgencia', 'alta')
  if (movErr) throw new Error(`getCasosStats movimientos: ${movErr.message}`)
  const distinctIds = [...new Set((movs ?? []).map(m => Number((m as { caso_id: number }).caso_id)))]
  let conAlerta = 0
  if (distinctIds.length > 0) {
    const { count, error } = await supabase
      .from('casos')
      .select('*', { count: 'exact', head: true })
      .in('id', distinctIds)
      .eq('activo', true)
      .is('archived_at', null)
      .is('deleted_at', null)
    if (error) throw new Error(`getCasosStats conAlerta: ${error.message}`)
    conAlerta = count ?? 0
  }

  const today = new Date()
  const week = new Date(today)
  week.setUTCDate(week.getUTCDate() + 7)
  const d0 = today.toISOString().slice(0, 10)
  const d1 = week.toISOString().slice(0, 10)

  const { data: audSimple, error: audErr } = await supabase
    .from('audiencias')
    .select('id, fecha, caso_id')
    .eq('completado', false)
  if (audErr) throw new Error(`getCasosStats audiencias: ${audErr.message}`)
  const audCasoIds = [...new Set((audSimple ?? []).map(a => Number((a as { caso_id: number }).caso_id)))]
  let activeSet = new Set<number>()
  if (audCasoIds.length > 0) {
    const { data: activeCasos, error: acErr } = await supabase
      .from('casos')
      .select('id')
      .in('id', audCasoIds)
      .eq('activo', true)
      .is('archived_at', null)
      .is('deleted_at', null)
    if (acErr) throw new Error(`getCasosStats audiencias casos: ${acErr.message}`)
    activeSet = new Set((activeCasos ?? []).map(c => Number((c as { id: number }).id)))
  }
  let proximasAudiencias = 0
  for (const a of audSimple ?? []) {
    const row = a as { fecha: string; caso_id: number }
    if (!activeSet.has(row.caso_id)) continue
    const fd = (row.fecha || '').slice(0, 10)
    if (fd >= d0 && fd <= d1) proximasAudiencias++
  }

  return { total, activos: total, conAlerta, proximasAudiencias }
}

export async function getAlertaConfigParaCaso(casoId: number): Promise<AlertaConfig | null> {
  const supabase = getJudicialSupabase()
  const { data: caso, error: e1 } = await supabase
    .from('casos')
    .select('id, email, whatsapp_number')
    .eq('id', casoId)
    .maybeSingle()
  if (e1) throw new Error(`getAlertaConfigParaCaso caso: ${e1.message}`)
  if (!caso) return null

  const { data: cfgRaw } = await supabase
    .from('alertas_config')
    .select('telegram_chat_id, canal_por_nivel')
    .eq('caso_id', casoId)
    .maybeSingle()

  const row = caso as { id: number; email: string | null; whatsapp_number: string | null }
  const cfg = cfgRaw as { telegram_chat_id?: string | null; canal_por_nivel?: unknown } | null
  const telegramChatId = cfg?.telegram_chat_id != null ? String(cfg.telegram_chat_id) : undefined
  const canalPorNivel = cfg?.canal_por_nivel as AlertaConfig['canalPorNivel'] | undefined

  return {
    usuarioId: String(row.id),
    email: row.email || undefined,
    telefonoCelular: row.whatsapp_number || undefined,
    telegramChatId,
    canalesActivos: {
      email: !!row.email,
      whatsapp: !!row.whatsapp_number,
      telegram: !!telegramChatId,
    },
    canalPorNivel,
  }
}
