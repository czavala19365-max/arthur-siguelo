import { NextResponse } from 'next/server'
import { scrapeCEJ } from '@/lib/cej-scraper'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const numero = searchParams.get('numero') || '10001-2022-0-1801-JR-CI-01'
  const parte = searchParams.get('parte') || ''
  const envOnly = searchParams.get('envOnly') === '1'

  try {
    const env = {
      hasTwoCaptcha: Boolean(process.env.TWOCAPTCHA_API_KEY),
      hasCapSolver: Boolean(process.env.CAPSOLVER_API_KEY),
    }

    if (envOnly) {
      return NextResponse.json({
        success: true,
        env,
        timestamp: new Date().toISOString(),
      })
    }

    const result = await scrapeCEJ(numero, parte)
    return NextResponse.json({
      success: true,
      input: { numero, parte },
      env,
      result,
      timestamp: new Date().toISOString(),
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
