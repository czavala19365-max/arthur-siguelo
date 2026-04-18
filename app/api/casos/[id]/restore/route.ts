import { getCasoById, restoreCasoFromArchive, restoreCasoFromPapelera } from '@/lib/db'

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

    if (caso.deleted_at) await restoreCasoFromPapelera(casoId)
    else if (caso.archived_at) await restoreCasoFromArchive(casoId)
    else {
      return Response.json({ error: 'El caso no está archivado ni en la papelera' }, { status: 400 })
    }

    return Response.json({ success: true, caso: await getCasoById(casoId) })
  } catch (error) {
    console.error('[API] POST /casos/[id]/restore error:', error)
    return Response.json({ error: 'Error al restaurar' }, { status: 500 })
  }
}
