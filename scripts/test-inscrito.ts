import { consultarTitulo } from '@/lib/scraper'

consultarTitulo({ oficina_registral: 'LIMA', anio_titulo: 2025, numero_titulo: '2416207' })
  .then(r => {
    console.log('\n═══ ScraperResult ═══')
    console.log('estado:', r.estado)
    console.log('areaRegistral:', r.areaRegistral)
    console.log('numeroPartida:', r.numeroPartida)
    console.log('\n═══ rawResponse completo ═══')
    console.log(JSON.stringify(r.rawResponse, null, 2))
  })
  .catch(e => console.error('Error:', e.message))
