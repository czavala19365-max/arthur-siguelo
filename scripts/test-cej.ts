import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })

async function main() {
  const expediente = process.argv[2] || '2001-33088-0-1801-JR-CI-030'
  const parte = process.argv[3] || ''
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
