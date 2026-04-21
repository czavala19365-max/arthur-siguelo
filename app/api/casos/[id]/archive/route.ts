import { archiveCaso, getCasoById } from '@/lib/judicial-db'

export const runtime = 'nodejs'

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const casoId = Number.parseInt(id, 10)
    if (!Number.isFinite(casoId)) {
      return Response.json({ error: 'ID no válido' }, { status: 400 })
    }
    const caso = await getCasoById(casoId)
    if (!caso) return Response.json({ error: 'Caso no encontrado' }, { status: 404 })
    await archiveCaso(casoId)
    return Response.json({ success: true, caso: await getCasoById(casoId) })
  } catch (error) {
    console.error('[API] POST /casos/[id]/archive error:', error)
    return Response.json({ error: 'Error al archivar' }, { status: 500 })
  }
}
