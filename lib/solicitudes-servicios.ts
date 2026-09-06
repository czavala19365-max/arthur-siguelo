import { getAuthServerClient } from '@/lib/supabase-auth-server'

export type VigenciaPoderData = {
  oficinaRegistral: string
  solicitarPor: 'partida' | 'ficha' | 'tomo_folio'
  numeroPartida: string
  numeroAsiento: string
  cargoApoderado: string
  representante: 'natural' | 'juridico'
  apellidoPaterno: string
  apellidoMaterno: string
  nombres: string
  razonSocial: string
  datosAdicionales: string
}

export async function createVigenciaPoderSolicitud(data: VigenciaPoderData) {
  const supabase = await getAuthServerClient()
  const { data: authData, error: authError } = await supabase.auth.getUser()

  if (authError || !authData.user) {
    throw new Error('Debes iniciar sesión para enviar esta solicitud.')
  }

  const { data: solicitud, error } = await supabase
    .from('solicitudes_servicios')
    .insert({
      user_id: authData.user.id,
      tipo_servicio: 'vigencia_poder',
      datos: {
        oficina_registral: data.oficinaRegistral,
        solicitar_por: data.solicitarPor,
        numero_partida: data.numeroPartida,
        numero_asiento: data.numeroAsiento,
        cargo_apoderado: data.cargoApoderado,
        representante_tipo: data.representante,
        razon_social: data.razonSocial,
        apellido_paterno: data.apellidoPaterno,
        apellido_materno: data.apellidoMaterno,
        nombres: data.nombres,
        datos_adicionales: data.datosAdicionales,
      },
    })
    .select('id, estado, created_at')
    .single()

  if (error) throw new Error(error.message)
  return {
    ...solicitud,
    usuario: {
      full_name: typeof authData.user.user_metadata.full_name === 'string'
        ? authData.user.user_metadata.full_name
        : '',
      email: authData.user.email ?? '',
    },
  }
}
