import { NextResponse } from 'next/server'
import { createVigenciaPoderSolicitud, type VigenciaPoderData } from '@/lib/solicitudes-servicios'

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

    return NextResponse.json({ solicitud }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo guardar la solicitud.'
    const status = message.includes('iniciar sesión') ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
