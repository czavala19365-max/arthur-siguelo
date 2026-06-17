import { NextResponse } from 'next/server'
import { getAllServicios } from '@/lib/sprl/db'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const servicios = await getAllServicios()
    return NextResponse.json({ servicios })
  } catch (err) {
    console.error('[SPRL servicios GET]', err)
    return NextResponse.json({ error: 'Error al obtener servicios' }, { status: 500 })
  }
}
