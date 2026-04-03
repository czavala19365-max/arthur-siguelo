import { descargarEsquela } from '@/lib/scraper'
import { writeFileSync } from 'fs'

descargarEsquela({
  oficina_registral: 'LIMA',
  anio_titulo: 2026,
  numero_titulo: '431663',
  area_registral: '22000',
  estado: 'OBSERVADO',
})
  .then(pdfBase64 => {
    writeFileSync('esquela-test.pdf', Buffer.from(pdfBase64, 'base64'))
    console.log(`✅ PDF descargado correctamente (${Math.round(pdfBase64.length * 3/4 / 1024)} KB)`)
    console.log('   Guardado en esquela-test.pdf')
  })
  .catch((err: Error) => console.error('❌ Error:', err.message))
