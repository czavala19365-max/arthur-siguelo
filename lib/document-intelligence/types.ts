export type TipoOperacionJGA =
  | 'financiamiento'
  | 'emision_bonos'
  | 'fideicomiso'
  | 'aumento_capital_aportes'
  | 'aumento_capital_capitalizacion'
  | 'modificacion_estatuto'
  | 'nombramiento_gg'
  | 'garantia_mobiliaria'
  | 'hipoteca'
  | 'cesion_derechos'
  | 'fianza_solidaria'
  | 'dacion_en_pago'
  | 'compraventa_acciones'
  | 'compraventa_inmueble'
  | 'transaccion_extrajudicial'
  | 'poderes_especiales'
  | 'otro'

export interface Representante {
  nombre_completo: string
  dni: string
  cargo?: string
  tipo_poder: 'inscrito' | 'exhibido' | 'otorgado'
  referencia_poder?: string
}

export interface Accionista {
  tipo: 'persona_natural' | 'persona_juridica'
  razon_social?: string
  ruc?: string
  nombre_completo: string
  dni: string
  num_acciones: number
  valor_nominal: number
  moneda: 'PEN' | 'USD'
  porcentaje?: number
  representantes?: Representante[]
  poderes_referencia?: string
}

export interface DatosSociedad {
  razon_social: string
  tipo_societario: 'S.A.' | 'S.A.C.' | 'S.R.L.' | 'S.A.A.'
  ruc: string
  domicilio: string
  distrito: string
  provincia: string
  departamento: string
  capital_social: number
  moneda_capital: 'PEN' | 'USD'
  total_acciones: number
  valor_nominal_accion: number
  partida_electronica?: string
  gerente_general: {
    nombre_completo: string
    dni: string
    partida_electronica_nombramiento?: string
  }
}

export interface PuntoAgenda {
  numero: number
  titulo: string
  tipo_operacion: TipoOperacionJGA
  datos_operacion: Record<string, unknown>
}

export interface DatosJGA {
  sociedad: DatosSociedad
  accionistas: Accionista[]
  fecha: string
  hora_inicio: string
  hora_fin: string
  lugar: string
  presidente: string
  secretario: string
  agenda: PuntoAgenda[]
  apoderado_formalizacion: {
    nombre_completo: string
    dni: string
  }
  tipo_convocatoria: 'universal' | 'con_convocatoria'
  ciudad?: string
  moneda_operacion?: 'PEN' | 'USD'
}

export interface ActaPrecedente {
  id: string
  sociedad_id: string
  fecha_acta: string
  tipo_operaciones: TipoOperacionJGA[]
  datos_jga: DatosJGA
  documento_generado?: string
  secciones_generadas?: SeccionActa[]
  created_at: string
  updated_at: string
  user_id: string
  nombre_referencia: string
}

export interface CambiosPrecedente {
  fecha?: string
  hora_inicio?: string
  hora_fin?: string
  lugar?: string
  presidente?: string
  secretario?: string
  montos?: Record<string, number>
  contrapartes?: Record<string, string>
  acuerdos_especificos?: Record<string, unknown>
  accionistas_actualizados?: Accionista[]
}

export interface SeccionActa {
  titulo?: string
  contenido: string
  tipo:
    | 'encabezado'
    | 'introduccion'
    | 'quorum'
    | 'agenda'
    | 'desarrollo'
    | 'acuerdo'
    | 'cierre'
    | 'firmas'
    | 'certificacion'
}

export interface DocSociedadRow {
  id: string
  user_id: string
  razon_social: string
  tipo_societario: DatosSociedad['tipo_societario']
  ruc: string | null
  domicilio: string | null
  distrito: string | null
  provincia: string | null
  departamento: string | null
  capital_social: number | null
  moneda_capital: string | null
  total_acciones: number | null
  valor_nominal_accion: number | null
  partida_electronica: string | null
  gerente_general: DatosSociedad['gerente_general'] | null
  created_at: string
  updated_at: string
}

export interface DocDocumentoRow {
  id: string
  user_id: string
  sociedad_id: string | null
  precedente_id: string | null
  tipo_documento: string
  nombre: string
  datos_entrada: DatosJGA
  contenido_generado: SeccionActa[] | null
  docx_storage_path: string | null
  estado: 'borrador' | 'revision' | 'finalizado'
  version: number
  created_at: string
  updated_at: string
}
