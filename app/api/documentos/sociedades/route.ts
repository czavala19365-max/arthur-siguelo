import { NextResponse } from 'next/server'
import { requireAuthUser } from '@/lib/judicial-caso-access'
import { getDocDb, mapAccionistaRow, mapSociedadToDatos } from '@/lib/document-intelligence/db'
import type { DatosSociedad, DocSociedadRow } from '@/lib/document-intelligence/types'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const auth = await requireAuthUser()
  if ('response' in auth) return auth.response

  const db = getDocDb()
  const { data, error } = await db
    .from('doc_sociedades')
    .select('*')
    .eq('user_id', auth.user.id)
    .order('razon_social')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ sociedades: data ?? [] })
}

export async function POST(req: Request) {
  const auth = await requireAuthUser()
  if ('response' in auth) return auth.response

  const body = (await req.json()) as DatosSociedad & { accionistas?: unknown[] }
  const db = getDocDb()

  const { data: sociedad, error } = await db
    .from('doc_sociedades')
    .insert({
      user_id: auth.user.id,
      razon_social: body.razon_social,
      tipo_societario: body.tipo_societario,
      ruc: body.ruc,
      domicilio: body.domicilio,
      distrito: body.distrito,
      provincia: body.provincia,
      departamento: body.departamento,
      capital_social: body.capital_social,
      moneda_capital: body.moneda_capital,
      total_acciones: body.total_acciones,
      valor_nominal_accion: body.valor_nominal_accion,
      partida_electronica: body.partida_electronica,
      gerente_general: body.gerente_general,
    })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const accionistas = body.accionistas ?? []
  if (accionistas.length > 0) {
    const rows = accionistas.map(a => {
      const acc = a as Record<string, unknown>
      return {
        sociedad_id: (sociedad as DocSociedadRow).id,
        tipo: acc.tipo,
        razon_social: acc.razon_social,
        ruc: acc.ruc,
        nombre_completo: acc.nombre_completo,
        dni: acc.dni,
        num_acciones: acc.num_acciones,
        valor_nominal: acc.valor_nominal ?? 1,
        moneda: acc.moneda ?? 'PEN',
        porcentaje: acc.porcentaje,
        representantes: acc.representantes ?? [],
        poderes_referencia: acc.poderes_referencia,
      }
    })
    await db.from('doc_accionistas').insert(rows)
  }

  return NextResponse.json({ sociedad })
}
