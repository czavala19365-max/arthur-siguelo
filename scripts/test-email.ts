/**
 * Prueba de envío de email de alerta con Resend.
 *
 * Simula el cambio de estado del título Lima/2026/431663:
 *   EN CALIFICACIÓN → OBSERVADO
 *
 * Uso:
 *   npx tsx --env-file=.env.local scripts/test-email.ts
 */

import { enviarAlertaEmail } from '../lib/alertas'
import type { Titulo } from '../types'

const SEP = '════════════════════════════════════════════════════════'

const titulo: Titulo = {
  id: 'test-001',
  oficina_registral: 'LIMA',
  anio_titulo: 2026,
  numero_titulo: '00431663',
  nombre_cliente: 'Carlos Zavala',
  email_cliente: 'czavala19365@gmail.com',
  whatsapp_cliente: '+51999999999',
  proyecto: null,
  asunto: null,
  registro: null,
  abogado: null,
  notaria: null,
  ultimo_estado: 'EN CALIFICACION',
  ultima_consulta: null,
  area_registral: null,
  numero_partida: null,
  created_at: new Date().toISOString(),
}

const alerta = {
  titulo,
  estadoAnterior: 'EN CALIFICACIÓN',
  estadoNuevo:    'OBSERVADO',
  detalle:        'OTORGAMIENTO DE PODER',
  detectadoEn:    new Date().toISOString(),
}

async function main() {
  console.log(`\n${SEP}`)
  console.log('  Arthur Síguelo — Test de alerta por email')
  console.log(SEP)
  console.log(`  Destinatario:     ${titulo.email_cliente}`)
  console.log(`  Remitente:        ${process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'}`)
  console.log(`  Título:           LIMA / ${titulo.anio_titulo} / ${titulo.numero_titulo}`)
  console.log(`  Estado anterior:  ${alerta.estadoAnterior}`)
  console.log(`  Estado nuevo:     ${alerta.estadoNuevo}`)
  console.log(`  Detalle:          ${alerta.detalle}`)
  console.log(`\n  Enviando email...`)

  if (!process.env.RESEND_API_KEY) {
    console.error('\n  ✗ RESEND_API_KEY no encontrada en .env.local')
    process.exit(1)
  }

  const inicio = Date.now()

  try {
    await enviarAlertaEmail(alerta)
    const ms = Date.now() - inicio
    console.log(`\n  ✓ Email enviado exitosamente (${ms}ms)`)
    console.log(`  → Revisa la bandeja de czavala19365@gmail.com`)
  } catch (err) {
    console.error('\n  ✗ Error al enviar email:')
    console.error(' ', err instanceof Error ? err.message : err)
    process.exit(1)
  }

  console.log(`\n${SEP}\n`)
}

main()
