import { enviarTelegram } from './channels/telegram-channel'
import { enviarWhatsApp } from './channels/whatsapp-channel'
import { enviarEmail } from './channels/email-channel'

export type NivelUrgencia = 'alta' | 'media' | 'baja'

export interface MovimientoJudicialAlerta {
  expedienteId: string
  numeroExpediente: string
  descripcion: string
  nivelUrgencia: NivelUrgencia
  sugerenciaIA: string
  plazosDias?: number
  casoNombre?: string
}

export interface AlertaConfig {
  usuarioId: string
  email?: string
  telefonoCelular?: string
  telegramChatId?: string
  canalesActivos: {
    email: boolean
    whatsapp: boolean
    telegram: boolean
  }
  canalPorNivel?: {
    alta: ('email' | 'whatsapp' | 'telegram')[]
    media: ('email' | 'whatsapp' | 'telegram')[]
    baja: ('email' | 'whatsapp' | 'telegram')[]
  }
}

const CANALES_DEFAULT: Record<NivelUrgencia, ('email' | 'whatsapp' | 'telegram')[]> = {
  alta: ['email', 'whatsapp', 'telegram'],
  media: ['email', 'telegram'],
  baja: ['email'],
}

export async function enviarAlertaMovimiento(
  movimiento: MovimientoJudicialAlerta,
  config: AlertaConfig
): Promise<{ enviado: boolean; canalesExitosos: string[] }> {
  const canales =
    config.canalPorNivel?.[movimiento.nivelUrgencia] ??
    CANALES_DEFAULT[movimiento.nivelUrgencia]

  type CanalKey = 'email' | 'whatsapp' | 'telegram'
  const tareas: { canal: CanalKey; promise: Promise<boolean> }[] = []

  for (const canal of canales) {
    if (!config.canalesActivos[canal]) continue

    if (canal === 'email' && config.email) {
      tareas.push({ canal, promise: enviarEmail(config.email, movimiento) })
    } else if (canal === 'whatsapp' && config.telefonoCelular) {
      tareas.push({ canal, promise: enviarWhatsApp(config.telefonoCelular, movimiento) })
    } else if (canal === 'telegram' && config.telegramChatId) {
      tareas.push({ canal, promise: enviarTelegram(config.telegramChatId, movimiento) })
    }
  }

  if (tareas.length === 0) {
    console.log('[AlertService] Sin canales disponibles para enviar alerta')
    return { enviado: false, canalesExitosos: [] }
  }

  const results = await Promise.allSettled(tareas.map(t => t.promise))
  const canalesExitosos: string[] = []

  results.forEach((result, i) => {
    const { canal } = tareas[i]
    if (result.status === 'fulfilled' && result.value) {
      canalesExitosos.push(canal)
    } else {
      const reason =
        result.status === 'rejected'
          ? result.reason instanceof Error
            ? result.reason.message
            : String(result.reason)
          : 'returned false'
      console.error(`[AlertService] Fallo en canal ${canal}: ${reason}`)
    }
  })

  console.log(
    `[AlertService] Alerta exp=${movimiento.numeroExpediente} urgencia=${movimiento.nivelUrgencia} ` +
      `canales=${canalesExitosos.join(',') || 'ninguno'}`
  )

  return { enviado: canalesExitosos.length > 0, canalesExitosos }
}
