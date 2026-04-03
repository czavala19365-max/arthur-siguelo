import { descargarEsquela } from '@/lib/scraper'
import { writeFileSync } from 'fs'

descargarEsquela({
  oficina_registral: 'LIMA',
  anio_titulo: 2026,
  numero_titulo: '431663',
  area_registral: '22000',
  estado: 'OBSERVADO',
})
  .then(pdfs => {
    console.log(`✅ ${pdfs.length} esquela(s) descargadas`)
    pdfs.forEach((pdfBase64, i) => {
      writeFileSync(`esquela-test-${i + 1}.pdf`, Buffer.from(pdfBase64, 'base64'))
      console.log(`   [${i + 1}] ${Math.round(pdfBase64.length * 3/4 / 1024)} KB → esquela-test-${i + 1}.pdf`)
    })
  })
  .catch((err: Error) => console.error('❌ Error:', err.message))
