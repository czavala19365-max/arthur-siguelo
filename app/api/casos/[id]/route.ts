import {
  getCasoById,
  getMovimientosByCaso,
  getAudienciasByCaso,
  getNotificacionesJudicialesByCaso,
  getEscritosByCaso,
  softDeleteCaso,
  updateCaso
} from '@/lib/judicial-db'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const casoId = Number.parseInt(id, 10)
    if (!Number.isFinite(casoId)) {
      return Response.json({ error: 'ID no válido' }, { status: 400 })
    }

    const caso = await getCasoById(casoId)
    if (!caso) {
      return Response.json({ error: 'Caso no encontrado' }, { status: 404 })
    }

    const movimientos = await getMovimientosByCaso(casoId)
    const audiencias = await getAudienciasByCaso(casoId)
    const notifications = await getNotificacionesJudicialesByCaso(casoId, 5)
    const escritos = await getEscritosByCaso(casoId)

    return Response.json({ ...caso, movimientos, audiencias, notifications, escritos })
  } catch (error) {
    console.error('[API] GET /casos/[id] error:', error)
    return Response.json({ error: 'Error al obtener caso' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const casoId = Number.parseInt(id, 10)
    const body = await request.json() as Record<string, unknown>

    const allowed = ['alias', 'prioridad', 'whatsapp_number', 'email', 'polling_frequency_hours', 'parte_procesal']
    const updates: Record<string, unknown> = {}
    for (const key of allowed) {
      if (key in body) updates[key] = body[key]
    }

    await updateCaso(casoId, updates as Parameters<typeof updateCaso>[1])
    const updated = await getCasoById(casoId)
    return Response.json(updated)
  } catch (error) {
    console.error('[API] PUT /casos/[id] error:', error)
    return Response.json({ error: 'Error al actualizar caso' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const casoId = Number.parseInt(id, 10)
    await softDeleteCaso(casoId)
    return Response.json({ success: true })
  } catch (error) {
    console.error('[API] DELETE /casos/[id] error:', error)
    return Response.json({ error: 'Error al desactivar caso' }, { status: 500 })
  }
}
