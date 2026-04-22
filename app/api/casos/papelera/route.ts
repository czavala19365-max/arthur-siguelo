import { getCasosPapelera } from '@/lib/judicial-db'

export const runtime = 'nodejs'

export async function GET() {
  try {
    return Response.json(await getCasosPapelera())
  } catch (error) {
    console.error('[API] GET /casos/papelera error:', error)
    return Response.json({ error: 'Error al obtener la papelera' }, { status: 500 })
  }
}
