import { NextResponse } from 'next/server'
import { isUserAdmin, requireAuthUser } from '@/lib/judicial-caso-access'

export async function GET() {
  const auth = await requireAuthUser()
  if ('response' in auth) return auth.response

  return NextResponse.json({ isAdmin: await isUserAdmin(auth.user.id) })
}