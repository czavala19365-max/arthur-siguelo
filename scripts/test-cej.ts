import { config } from 'dotenv'

import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })



/** Casos de prueba conocidos — expediente + parte deben ir juntos. */

const CEJ_TEST_CASES = {

  virgo: {

    expediente: '07461-2024-0-18A5-JR-CI-23',

    parte: 'VIRGO CONSTRUCCIONES Y ACABADOS S.A.C.',

  },

  cicoce: {

    expediente: '02558-2014-0-1801-JR-CI-07',

    parte: 'CICOCE S.A.',

  },

} as const



type TestCaseKey = keyof typeof CEJ_TEST_CASES



function resolveTestInput(): { expediente: string; parte: string; isolated: boolean } {

  const isolated = process.env.CEJ_ISOLATED_TEST !== '0'

  const presetKey = (process.env.CEJ_TEST_CASE || '').trim().toLowerCase() as TestCaseKey

  const preset = presetKey && presetKey in CEJ_TEST_CASES ? CEJ_TEST_CASES[presetKey] : null



  const expediente =

    process.env.CEJ_ISOLATED_EXPEDIENTE?.trim() ||

    process.argv[2]?.trim() ||

    preset?.expediente ||

    (isolated ? CEJ_TEST_CASES.virgo.expediente : '01600-2022-0-0701-JR-CI-06')



  const parte =

    process.env.CEJ_ISOLATED_PARTE?.trim() ||

    process.argv[3]?.trim() ||

    preset?.parte ||

    (isolated ? CEJ_TEST_CASES.virgo.parte : 'MARCOBRE')



  return { expediente, parte, isolated }

}



async function main() {

  const { expediente, parte, isolated } = resolveTestInput()



  if (isolated) {

    process.env.CEJ_ISOLATED_TEST = '1'

    process.env.CEJ_FORCE_VISIBLE = '1'

    process.env.CEJ_DEBUG = 'true'

  }



  console.log('Testing CEJ scraper with:', expediente, `(parte: ${parte})`)

  console.log('Modo aislado:', isolated)

  if (process.env.CEJ_TEST_CASE) console.log('Preset CEJ_TEST_CASE:', process.env.CEJ_TEST_CASE)

  console.log('Navegador visible (headless=false):', process.env.CEJ_FORCE_VISIBLE === '1' || process.env.CEJ_DEBUG === 'true')

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

