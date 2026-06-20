export type EncryptedField = {
  ciphertext: string
  iv: string
  authTag: string
}

export type SprlCredential = {
  id: string
  user_id: string
  username_enc: EncryptedField
  password_enc: EncryptedField
  display_username: string | null
  saldo_disponible: number | null
  ultimo_login: string | null
  estado: 'pendiente' | 'activo' | 'error' | 'desconectado'
  error_mensaje: string | null
  created_at: string
  updated_at: string
}

export type SprlServicio = {
  id: string
  codigo: string
  nombre: string
  descripcion: string | null
  registro_juridico: string | null
  tipo_servicio: string | null
  campos_requeridos: CampoRequerido[]
  costo_aproximado: number | null
  activo: boolean
  orden: number
  created_at: string
}

export type CampoRequerido = {
  campo: string
  tipo: 'text' | 'select' | 'radio' | 'textarea'
  requerido: boolean
  label: string
  opciones?: string[]
  maxLength?: number
}

export type SprlSolicitud = {
  id: string
  user_id: string
  credential_id: string
  servicio_id: string
  datos_solicitud: Record<string, unknown>
  estado: 'pendiente' | 'procesando' | 'completado' | 'error' | 'sin_saldo'
  resultado: Record<string, unknown> | null
  documento_url: string | null
  documento_nombre: string | null
  costo: number | null
  error_mensaje: string | null
  programada_id: string | null
  created_at: string
  updated_at: string
}

export type SprlSolicitudProgramada = {
  id: string
  user_id: string
  credential_id: string
  servicio_id: string
  nombre: string
  datos_solicitud: Record<string, unknown>
  frecuencia_dias: number
  proxima_ejecucion: string
  ultima_ejecucion: string | null
  estado: 'activo' | 'pausado' | 'cancelado'
  total_ejecutadas: number
  created_at: string
  updated_at: string
}

/** Estado de conexión para el UI */
export type SprlConnectionStatus =
  | { connected: false }
  | {
      connected: true
      credential: {
        id: string
        display_username: string | null
        saldo_disponible: number | null
        estado: SprlCredential['estado']
        ultimo_login: string | null
        error_mensaje: string | null
      }
    }
