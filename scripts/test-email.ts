/**
 * Prueba de envío de email con Resend.
 *
 * Uso:
 *   npx tsx --env-file=.env.local scripts/test-email.ts
 */

import { enviarAlertaEmail } from '../lib/alertas'
import type { Titulo } from '../types'

const tituloFake: Titulo = {
  id: 'test-001',
  oficina_registral: 'LIMA',
  anio_titulo: 2026,
  numero_titulo: '00431663',
  nombre_cliente: 'Carlos Zavala',
  email_cliente: 'czavala19365@gmail.com',
  whatsapp_cliente: '+51999999999',
  created_at: new Date().toISOString(),
}

async function main() {
  console.log('\n════════════════════════════════════════════════════════')
  console.log('  Arthur Síguelo — Test de email (Resend)')
  console.log('════════════════════════════════════════════════════════')
  console.log(`  Destinatario:  ${tituloFake.email_cliente}`)
  console.log(`  Remitente:     ${process.env.RESEND_FROM_EMAIL}`)
  console.log('  Enviando...\n')

  if (!process.env.RESEND_API_KEY) {
    console.error('  ✗ RESEND_API_KEY no encontrada en .env.local')
    process.exit(1)
  }

  try {
    await enviarAlertaEmail({
      titulo: tituloFake,
      estadoAnterior: 'EN CALIFICACION',
      estadoNuevo: 'OBSERVADO',
      detectadoEn: new Date().toISOString(),
    })
    console.log('  ✓ Email enviado correctamente.')
    console.log('  Revisa la bandeja de entrada de czavala19365@gmail.com')
  } catch (err) {
    console.error('  ✗ Error al enviar email:')
    console.error(' ', err instanceof Error ? err.message : err)
    process.exit(1)
  }

  console.log('\n════════════════════════════════════════════════════════\n')
}

main()
