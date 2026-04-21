export type PagoSunarp = {
  anioRecibo: string
  numeroRecibo: string
  montoTotalRecibo: string
  fechaOperacion: string
  inExoneracion?: string
  inExtorno?: string
  descriZonaRegistral?: string
}

export type DetalleCronologiaEntry = {
  desEstado: string
  etapa: string
  area: string
  fecha: string
  fechaNotificacion: string | null
  fechaResolucion: string | null
  fechaInfoOral: string | null
  fechaAcuseRecibo: string | null
  tieneAcuse?: boolean
  indicador1?: string
  secuencia: string
  responsable: string
  documento2: string
  tipoEsquela2: string
}

export type Titulo = {
  id: string
  oficina_registral: string
  anio_titulo: number
  numero_titulo: string
  nombre_cliente: string
  email_cliente: string
  whatsapp_cliente: string
  proyecto: string | null
  asunto: string | null
  registro: string | null
  abogado: string | null
  notaria: string | null
  ultimo_estado: string | null
  ultima_consulta: string | null
  area_registral: string | null
  numero_partida: string | null
  estado_gestion?: string | null
  created_at: string
  // Campos de SUNARP (se llenan al consultar estado)
  fecha_presentacion?: string | null
  fecha_vencimiento?: string | null
  lugar_presentacion?: string | null
  nombre_presentante?: string | null
  tipo_registro?: string | null
  monto_devolucion?: string | null
  indi_prorroga?: string | null
  indi_suspension?: string | null
  pagos?: PagoSunarp[] | null
  actos?: string[] | null
  last_state_change?: string | null
  // Campos computados server-side (no existen en la tabla)
  fecha_ultimo_calificacion?: string | null
  es_reingreso?: boolean
}

export type TituloFormState = {
  error?: string
  success?: boolean
}

export type HistorialEstado = {
  id: string
  titulo_id: string
  estado_anterior: string
  estado_nuevo: string
  detectado_en: string
}

export type CronResumen = {
  total: number
  exitosos: number
  conCambios: number
  errores: number
  detalle: CronDetalleTitulo[]
}

export type CronDetalleTitulo = {
  id: string
  numero_titulo: string
  oficina_registral: string
  estado?: string
  cambio?: boolean
  error?: string
}
