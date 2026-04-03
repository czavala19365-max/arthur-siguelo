/**
 * Script de investigación del endpoint de esquelas SUNARP.
 * Prueba: plain JSON, AES encriptado, y variantes de tipoEsquela.
 * Uso: npx tsx --env-file=.env.local scripts/test-esquela.ts
 */
import CryptoJS from 'crypto-js'

const ESQUELA_API  = 'https://api-gateway.sunarp.gob.pe:9443/sunarp/siguelo/siguelo-esquela/listarEsquela'
const IBM_CLIENT_ID = '30a3fd982c6f85a3a70b44fa1f302488'
const AES_KEY       = 'sV2zUWiuNo@3uv8nu9ir4'

const encrypt = (data: string) => CryptoJS.AES.encrypt(data, AES_KEY).toString()
const decrypt = (data: string) => {
  const bytes = CryptoJS.AES.decrypt(data, AES_KEY)
  return bytes.toString(CryptoJS.enc.Utf8)
}

// Payload base (conocido, del ejemplo dado por el usuario)
const basePayload = {
  codigoZona:     '01',
  codigoOficina:  '01',
  anioTitulo:     '2026',
  numeroTitulo:   '00431663',
  idAreaRegistro: '22000',
  idioma:         'es',
  ip:             '181.65.25.93',
  status:         'A',
  tipoConsulta:   'E',
  userApp:        'extranet',
  userCrea:       'Siguelo',
}

async function probar(descripcion: string, body: unknown, headers: Record<string, string> = {}) {
  console.log(`\n── ${descripcion} ─────────────────────────`)
  console.log('Body enviado:', JSON.stringify(body).slice(0, 120))
  try {
    const res = await fetch(ESQUELA_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-IBM-Client-Id': IBM_CLIENT_ID,
        Origin:  'https://siguelo.sunarp.gob.pe',
        Referer: 'https://siguelo.sunarp.gob.pe/siguelo/',
        ...headers,
      },
      body: JSON.stringify(body),
    })
    console.log('HTTP status:', res.status)
    const contentType = res.headers.get('content-type') ?? ''
    console.log('Content-Type:', contentType)

    if (contentType.includes('application/pdf') || contentType.includes('octet-stream')) {
      const buf = await res.arrayBuffer()
      console.log('✅ Respuesta binaria (PDF probable), tamaño:', buf.byteLength, 'bytes')
      const b64 = Buffer.from(buf).toString('base64').slice(0, 60)
      console.log('Base64 preview:', b64 + '…')
      return
    }

    const text = await res.text()
    console.log('Body (primeros 300 chars):', text.slice(0, 300))

    // Intentar desencriptar si parece respuesta AES
    try {
      const json = JSON.parse(text)
      if (json.cmVzcG9uc2U) {
        const decrypted = decrypt(json.cmVzcG9uc2U)
        console.log('🔓 Desencriptado (cmVzcG9uc2U):', decrypted.slice(0, 400))
      }
      if (json.dglwbw) {
        console.log('🔓 dglwbw (valid flag):', decrypt(json.dglwbw))
      }
    } catch { /* no es JSON */ }

  } catch (err) {
    console.error('❌ Error de red:', (err as Error).message)
  }
}

async function main() {
  console.log('════════════════════════════════════════════')
  console.log('  Investigación endpoint esquelas SUNARP')
  console.log('════════════════════════════════════════════')

  // ── Test 1: Plain JSON, tipoEsquela O (Observación)
  await probar('Plain JSON — tipoEsquela O', { ...basePayload, tipoEsquela: 'O' })

  // ── Test 2: Plain JSON, tipoEsquela L (Liquidación)
  await probar('Plain JSON — tipoEsquela L', { ...basePayload, tipoEsquela: 'L' })

  // ── Test 3: AES encriptado (mismo patrón que consultaTitulo)
  const encryptedBody = { dmFsdWU: encrypt(JSON.stringify({ ...basePayload, tipoEsquela: 'O' })) }
  await probar('AES encriptado — tipoEsquela O', encryptedBody)

  // ── Test 4: Plain JSON sin tipoEsquela (para ver si es campo requerido)
  await probar('Plain JSON — sin tipoEsquela', basePayload)

  console.log('\n════════════════════════════════════════════')
}

main()
