import { NextResponse } from 'next/server'
import { requireAuthUser } from '@/lib/judicial-caso-access'
import { listarVersiones, restaurarVersion } from '@/lib/legal/drafter/precedents/precedent-service'

export const runtime = 'nodejs'

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAuthUser()
  if ('response' in auth) return auth.response

  const { id } = await ctx.params
  try {
    const versiones = await listarVersiones(id, auth.user.id)
    return NextResponse.json({ versiones })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAuthUser()
  if ('response' in auth) return auth.response

  const { id } = await ctx.params
  try {
    const body = (await req.json()) as { version: number }
    if (!body.version) return NextResponse.json({ error: 'version es requerido' }, { status: 400 })

    const result = await restaurarVersion({ precedenteId: id, userId: auth.user.id, version: body.version })
    return NextResponse.json(result)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
