/**
 * Test del scraper de SIGUELO con datos reales.
 *
 * Uso:
 *   npx tsx --env-file=.env.local scripts/test-scraper.ts
 *
 * Parámetros opcionales por línea de comandos:
 *   npx tsx --env-file=.env.local scripts/test-scraper.ts \
 *     "Zona Registral II - Sede Lima" 2024 00123
 */

import { Solver } from '@2captcha/captcha-solver'
import { consultarTitulo } from '../lib/scraper'

// ── Datos de prueba ──────────────────────────────────────────────────────────
// Edita estos valores o pásalos como argumentos: oficina año número
const [, , argOficina, argAnio, argNumero] = process.argv

const OFICINA   = argOficina ?? 'Zona Registral II - Sede Lima'
const ANIO      = Number(argAnio ?? 2024)
const NUMERO    = argNumero   ?? '00123'

// ── Helpers de formato ───────────────────────────────────────────────────────
const SEP  = '─'.repeat(56)
const SEP2 = '═'.repeat(56)

function log(label: string, value: unknown) {
  const val = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)
  console.log(`  ${label.padEnd(20)} ${val}`)
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n' + SEP2)
  console.log('  Arthur Síguelo — Test de scraper')
  console.log(SEP2)

  // Validar API key antes de gastar créditos
  const apiKey = process.env.TWOCAPTCHA_API_KEY
  if (!apiKey) {
    console.error('\n  ✗ TWOCAPTCHA_API_KEY no encontrada en .env.local')
    process.exit(1)
  }

  // Balance inicial
  const solver = new Solver(apiKey)
  let balanceInicial = 0
  try {
    balanceInicial = await solver.balance()
    console.log(`\n  Saldo inicial 2captcha:  $${balanceInicial.toFixed(4)}`)
  } catch {
    console.warn('  ⚠ No se pudo obtener el saldo de 2captcha.')
  }

  // Parámetros de la consulta
  console.log('\n' + SEP)
  console.log('  Parámetros de consulta')
  console.log(SEP)
  log('Oficina:', OFICINA)
  log('Año:', ANIO)
  log('Número de título:', NUMERO)

  const inicio = Date.now()

  console.log('\n' + SEP)
  console.log('  Ejecutando scraper…')
  console.log(SEP)
  console.log('  [1/3] Lanzando Chromium y obteniendo cookies de SIGUELO…')

  let resultado
  try {
    resultado = await consultarTitulo({
      oficina_registral: OFICINA,
      anio_titulo: ANIO,
      numero_titulo: NUMERO,
    })
  } catch (err) {
    console.error('\n  ✗ Error durante la consulta:')
    console.error(' ', err instanceof Error ? err.message : err)
    process.exit(1)
  }

  const duracionMs = Date.now() - inicio
  const duracionSeg = (duracionMs / 1000).toFixed(1)

  // Balance final y costo del captcha
  let costoStr = 'N/A'
  try {
    const balanceFinal = await solver.balance()
    const costo = balanceInicial - balanceFinal
    costoStr = `$${costo.toFixed(4)}  (saldo restante: $${balanceFinal.toFixed(4)})`
  } catch {
    // No crítico
  }

  // Resultado
  console.log('\n' + SEP2)
  console.log('  Resultado')
  console.log(SEP2)
  log('Estado:', resultado.estado)
  log('Detalle:', resultado.detalle ?? '—')
  log('Consultado en:', resultado.consultadoEn)
  log('Duración total:', `${duracionSeg}s (${duracionMs}ms)`)
  log('Costo captcha:', costoStr)

  console.log('\n' + SEP)
  console.log('  Respuesta completa de la API (rawResponse)')
  console.log(SEP)
  console.log(JSON.stringify(resultado.rawResponse, null, 2)
    .split('\n')
    .map(l => '  ' + l)
    .join('\n'))

  console.log('\n' + SEP2 + '\n')
}

main()
