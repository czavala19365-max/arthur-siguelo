import { descargarAsiento } from '@/lib/scraper'
import { writeFileSync } from 'fs'

descargarAsiento({
  oficina_registral: 'LIMA',
  anio_titulo: 2025,
  numero_titulo: '2416207',
  area_registral: '23000',
})
  .then(({ pdf, numeroPartida }) => {
    writeFileSync('asiento-final.pdf', Buffer.from(pdf, 'base64'))
    console.log(`✅ numeroPartida: ${numeroPartida}`)
    console.log(`✅ PDF: ${Math.round(pdf.length * 3/4 / 1024)} KB → asiento-final.pdf`)
  })
  .catch((e: Error) => console.error('❌', e.message))
