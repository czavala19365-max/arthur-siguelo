import { getCasosArchivados } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET() {
  try {
    return Response.json(await getCasosArchivados())
  } catch (error) {
    console.error('[API] GET /casos/archivados error:', error)
    return Response.json({ error: 'Error al obtener procesos archivados' }, { status: 500 })
  }
}
