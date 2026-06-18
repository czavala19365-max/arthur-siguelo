import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL_JUDICIAL)
console.log('SERVICE:', !!process.env.SUPABASE_SERVICE_ROLE_KEY_JUDICIAL)


import { getJudicialSupabase } from '@/lib/supabase-judicial'
import { getMovimientosByCaso } from '@/lib/judicial-db'
import { extraerYGuardarAudienciasDeMovimientos } from '@/lib/judicial-documento-extractor'


async function testExtractionPipeline(casoId: number) {
  console.log(`\n🧪 TEST: Extrayendo audiencias para caso ${casoId}...\n`)

  try {
    // 1. Obtener movimientos
    console.log('[TEST] 1️⃣ Obteniendo movimientos...')
    const movimientos = await getMovimientosByCaso(casoId)
    console.log(`[TEST] ✅ Se encontraron ${movimientos.length} movimientos`)
    
    // 2. Filtrar con documentos
    const conDoc = movimientos.filter(m => m.tiene_documento === true)
    console.log(`[TEST] 📄 ${conDoc.length} movimientos TIENEN documentos`)
    
    if (conDoc.length === 0) {
      console.warn('[TEST] ⚠️ No hay movimientos con documentos. Detalles:')
      console.table(movimientos.map(m => ({
        id: m.id,
        acto: m.acto?.substring(0, 30),
        tiene_documento: m.tiene_documento,
        documento_url: m.documento_url?.substring(0, 30)
      })))
      return
    }

    // 3. Mostrar URLs de documentos
    console.log('[TEST] 🔗 URLs de documentos:')
    conDoc.forEach((m, i) => {
      console.log(`  ${i + 1}. ${m.documento_url}`)
    })

    // 4. Ejecutar extracción
    console.log('\n[TEST] 2️⃣ Ejecutando extracción...')
    const resultado = await extraerYGuardarAudienciasDeMovimientos(casoId, movimientos)
    console.log(`[TEST] ✅ Resultado: ${resultado} audiencias creadas`)

    // 5. Verificar en BD
    console.log('\n[TEST] 3️⃣ Verificando audiencias en BD...')
    const supabase = getJudicialSupabase()
    const { data: audiencias, error } = await supabase
      .from('audiencias')
      .select('*')
      .eq('caso_id', casoId)
    
    if (error) {
      console.error('[TEST] ❌ Error:', error)
      return
    }

    console.log(`[TEST] ✅ Audiencias en BD: ${audiencias?.length || 0}`)
    if (audiencias && audiencias.length > 0) {
      console.table(audiencias.map(a => ({
        id: a.id,
        descripcion: a.descripcion,
        fecha: a.fecha,
        tipo: a.tipo
      })))
    }

  } catch (err) {
    console.error('[TEST] ❌ Error fatal:', err)
  }
}

// Ejecutar
const CASO_ID = 58 // Cambia esto por tu ID de caso
testExtractionPipeline(CASO_ID)