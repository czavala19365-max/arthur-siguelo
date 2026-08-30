import { NextResponse } from 'next/server'
import { createVigenciaPoderSolicitud, type VigenciaPoderData } from '@/lib/solicitudes-servicios'
import { enviarWhatsAppPublicidadRegistral } from '@/lib/channels/whatsapp-channel'

function isValidBody(body: Partial<VigenciaPoderData>) {
  return Boolean(
    body.oficinaRegistral?.trim() &&
    body.solicitarPor &&
    body.numeroPartida?.trim() &&
    body.cargoApoderado?.trim() &&
    body.representante &&
    (body.representante === 'juridico'
      ? body.razonSocial?.trim()
      : body.apellidoPaterno?.trim() && body.nombres?.trim()),
  )
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as Partial<VigenciaPoderData>

    if (!isValidBody(body)) {
      return NextResponse.json(
        { error: 'Completa los campos obligatorios antes de enviar la solicitud.' },
        { status: 400 },
      )
    }

    const solicitud = await createVigenciaPoderSolicitud({
      oficinaRegistral: body.oficinaRegistral!.trim().toUpperCase(),
      solicitarPor: body.solicitarPor!,
      numeroPartida: body.numeroPartida!.trim().toUpperCase(),
      numeroAsiento: body.numeroAsiento?.trim().toUpperCase() ?? '',
      cargoApoderado: body.cargoApoderado!.trim().toUpperCase(),
      representante: body.representante!,
      apellidoPaterno: body.apellidoPaterno?.trim().toUpperCase() ?? '',
      apellidoMaterno: body.apellidoMaterno?.trim().toUpperCase() ?? '',
      nombres: body.nombres?.trim().toUpperCase() ?? '',
      razonSocial: body.razonSocial?.trim().toUpperCase() ?? '',
      datosAdicionales: body.datosAdicionales?.trim().toUpperCase() ?? '',
    })

    // ==========================================
    // ALERTA WHATSAPP
    // ==========================================

    const whatsappDestino = process.env.PUBLICIDAD_REGISTRAL_WHATSAPP_TO

    if (whatsappDestino) {
      const whatsappEnviado = await enviarWhatsAppPublicidadRegistral(
        whatsappDestino,
        {
          numeroPartida: body.numeroPartida!.trim().toUpperCase(),
          oficinaRegistral: body.oficinaRegistral!.trim().toUpperCase(),
          cargoApoderado: body.cargoApoderado!.trim().toUpperCase(),
          representante: body.representante!,
          razonSocial: body.razonSocial?.trim().toUpperCase() ?? '',
          apellidoPaterno: body.apellidoPaterno?.trim().toUpperCase() ?? '',
          apellidoMaterno: body.apellidoMaterno?.trim().toUpperCase() ?? '',
          nombres: body.nombres?.trim().toUpperCase() ?? '',
          solicitarPor: body.solicitarPor,
          numeroAsiento: body.numeroAsiento?.trim().toUpperCase() ?? '',
          datosAdicionales: body.datosAdicionales?.trim().toUpperCase() ?? '',
          cliente: solicitud.usuario?.full_name || solicitud.usuario?.email || 'Usuario sin identificar',
        },
      )

      console.log(
        `[WhatsApp PR] Alerta ${whatsappEnviado ? 'enviada' : 'NO enviada'}`
      )
    } else {
      console.warn(
        '[WhatsApp PR] PUBLICIDAD_REGISTRAL_WHATSAPP_TO no configurado'
      )
    }


    return NextResponse.json({ solicitud }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo guardar la solicitud.'
    const status = message.includes('iniciar sesión') ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
