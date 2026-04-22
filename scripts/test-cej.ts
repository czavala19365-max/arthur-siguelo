import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })
// Visible browser + DevTools for local CEJ runs (headless: false). Desactiva con CEJ_DEBUG=0 en .env o en la shell.
if (process.env.CEJ_DEBUG === undefined) process.env.CEJ_DEBUG = 'true'

async function main() {
  const expediente = process.argv[2] || '01600-2022-0-0701-JR-CI-06'
  const parte = process.argv[3] || 'MARCOBRE'
  console.log('Testing CEJ scraper with:', expediente, parte ? `(parte: ${parte})` : '(no parte)')
  console.log('CAPSOLVER_API_KEY present:', !!process.env.CAPSOLVER_API_KEY)
  console.log('TWOCAPTCHA_API_KEY present:', !!process.env.TWOCAPTCHA_API_KEY)
  console.log('CHROME_EXECUTABLE_PATH:', process.env.CHROME_EXECUTABLE_PATH)

  try {
    const { scrapeCEJ } = await import('../lib/cej-scraper')
    const result = await scrapeCEJ(expediente, parte)
    console.log('\n=== RESULT ===')
    console.log(JSON.stringify(result, null, 2))
  } catch (error: unknown) {
    const e = error as Error
    console.error('Error:', e.message)
    console.error(e.stack)
  }
}

main()
