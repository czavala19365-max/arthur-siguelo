/**
 * Test directo del scraper.
 *
 * Uso:
 *   npx tsx --env-file=.env.local scripts/test-consulta.ts
 */

import { consultarTitulo } from '../lib/scraper'

const SEP = '════════════════════════════════════════════════════════'

async function main() {
  const params = {
    oficina_registral: 'LIMA',
    anio_titulo: 2026,
    numero_titulo: '961411',
  }

  console.log(`\n${SEP}`)
  console.log('  Test scraper — consultarTitulo')
  console.log(SEP)
  console.log(`  Oficina:  ${params.oficina_registral}`)
  console.log(`  Año:      ${params.anio_titulo}`)
  console.log(`  Número:   ${params.numero_titulo}`)
  console.log(`  padStart: ${params.numero_titulo.padStart(8, '0')}`)
  console.log(`\n  Iniciando consulta...\n`)

  try {
    const resultado = await consultarTitulo(params)
    console.log(`\n${SEP}`)
    console.log('  RESULTADO FINAL:')
    console.log(SEP)
    console.log('  Estado:       ', resultado.estado)
    console.log('  Detalle:      ', resultado.detalle)
    console.log('  Área registral:', resultado.areaRegistral)
    console.log('  Nº Partida:   ', resultado.numeroPartida)
    console.log('\n  Raw response completo:')
    console.log(JSON.stringify(resultado.rawResponse, null, 2))
  } catch (err) {
    console.error(`\n  ✗ Error:`, err instanceof Error ? err.message : err)
  }

  console.log(`\n${SEP}\n`)
}

main()
