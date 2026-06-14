import { getJudicialSupabase } from '@/lib/supabase-judicial'
import type {
  Accionista,
  DatosJGA,
  DatosSociedad,
  DocDocumentoRow,
  DocSociedadRow,
  SeccionActa,
} from './types'

export function getDocDb() {
  return getJudicialSupabase()
}

export function mapSociedadToDatos(row: DocSociedadRow): DatosSociedad {
  return {
    razon_social: row.razon_social,
    tipo_societario: row.tipo_societario,
    ruc: row.ruc ?? '',
    domicilio: row.domicilio ?? '',
    distrito: row.distrito ?? '',
    provincia: row.provincia ?? 'Lima',
    departamento: row.departamento ?? 'Lima',
    capital_social: Number(row.capital_social ?? 0),
    moneda_capital: (row.moneda_capital as 'PEN' | 'USD') ?? 'PEN',
    total_acciones: Number(row.total_acciones ?? 0),
    valor_nominal_accion: Number(row.valor_nominal_accion ?? 1),
    partida_electronica: row.partida_electronica ?? undefined,
    gerente_general: row.gerente_general ?? {
      nombre_completo: '',
      dni: '',
    },
  }
}

export function mapAccionistaRow(row: Record<string, unknown>): Accionista {
  return {
    tipo: row.tipo as Accionista['tipo'],
    razon_social: row.razon_social != null ? String(row.razon_social) : undefined,
    ruc: row.ruc != null ? String(row.ruc) : undefined,
    nombre_completo: String(row.nombre_completo ?? ''),
    dni: String(row.dni ?? ''),
    num_acciones: Number(row.num_acciones ?? 0),
    valor_nominal: Number(row.valor_nominal ?? 1),
    moneda: (row.moneda as 'PEN' | 'USD') ?? 'PEN',
    porcentaje: row.porcentaje != null ? Number(row.porcentaje) : undefined,
    representantes: (row.representantes as Accionista['representantes']) ?? [],
    poderes_referencia: row.poderes_referencia != null ? String(row.poderes_referencia) : undefined,
  }
}

export async function loadSociedadCompleta(
  sociedadId: string,
  userId: string,
): Promise<{ sociedad: DatosSociedad; accionistas: Accionista[] } | null> {
  const db = getDocDb()
  const { data: socRow, error } = await db
    .from('doc_sociedades')
    .select('*')
    .eq('id', sociedadId)
    .eq('user_id', userId)
    .maybeSingle()
  if (error || !socRow) return null

  const { data: accRows } = await db
    .from('doc_accionistas')
    .select('*')
    .eq('sociedad_id', sociedadId)
    .eq('activo', true)

  return {
    sociedad: mapSociedadToDatos(socRow as DocSociedadRow),
    accionistas: (accRows ?? []).map(r => mapAccionistaRow(r as Record<string, unknown>)),
  }
}

export async function saveDocumentoGenerado(params: {
  userId: string
  sociedadId?: string
  precedenteId?: string
  nombre: string
  datos: DatosJGA
  secciones: SeccionActa[]
  estado?: DocDocumentoRow['estado']
}): Promise<DocDocumentoRow> {
  const db = getDocDb()
  const { data, error } = await db
    .from('doc_documentos')
    .insert({
      user_id: params.userId,
      sociedad_id: params.sociedadId ?? null,
      precedente_id: params.precedenteId ?? null,
      nombre: params.nombre,
      datos_entrada: params.datos,
      contenido_generado: params.secciones,
      estado: params.estado ?? 'borrador',
    })
    .select('*')
    .single()
  if (error) throw new Error(`saveDocumentoGenerado: ${error.message}`)
  return data as DocDocumentoRow
}
