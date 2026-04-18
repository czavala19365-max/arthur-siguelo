import { getAllCasosActivos, updateCaso } from '@/lib/db'

async function main() {
  const casos = await getAllCasosActivos()

  if (casos.length === 0) {
    console.log('No hay casos activos en la BD.')
    process.exit(0)
  }

  const caso = casos[0]
  console.log(`Caso a probar: ${caso.alias} (${caso.numero_expediente})`)
  console.log(`WhatsApp: ${caso.whatsapp_number || 'no configurado'}`)
  console.log(`Email: ${caso.email || 'no configurado'}`)

  // Forzar last_checked a null para que el scheduler lo procese inmediatamente
  await updateCaso(caso.id, { last_checked: null, estado_hash: '' })
  console.log('\nReset hecho. Ahora corre el scheduler manual:')
  console.log('npx tsx scripts/test-judicial-alert.ts')
  console.log('\nLuego arranca el servidor con npm run dev y revisa los logs.')
}

main().catch(console.error)
