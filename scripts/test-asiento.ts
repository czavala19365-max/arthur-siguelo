import CryptoJS from 'crypto-js'

const ASIENTO_API   = 'https://api-gateway.sunarp.gob.pe:9443/sunarp/siguelo/asientoinscripcion/listarAsientos'
const IBM_CLIENT_ID = '30a3fd982c6f85a3a70b44fa1f302488'
const AES_KEY       = 'sV2zUWiuNo@3uv8nu9ir4'

const encrypt = (data: string) => CryptoJS.AES.encrypt(data, AES_KEY).toString()
const decrypt = (data: string) => {
  const bytes = CryptoJS.AES.decrypt(data, AES_KEY)
  return bytes.toString(CryptoJS.enc.Utf8)
}

// Título de prueba — OBSERVADO (para ver qué devuelve cuando no está INSCRITO)
const payload = {
  codigoZona:     '01',
  codigoOficina:  '01',
  anioTitulo:     '2026',
  numeroTitulo:   '00431663',
  idAreaRegistro: '22000',
  idioma:         'es',
  ip:             '0.0.0.0',
  status:         'A',
  userApp:        'sigue+',
  userCrea:       'sigue+',
}

async function probar(descripcion: string, body: unknown) {
  console.log(`\n═══ ${descripcion} ═══`)
  const res = await fetch(ASIENTO_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-IBM-Client-Id': IBM_CLIENT_ID,
      Origin:  'https://siguelo.sunarp.gob.pe',
      Referer: 'https://siguelo.sunarp.gob.pe/siguelo/',
    },
    body: JSON.stringify(body),
  })
  console.log('HTTP:', res.status, res.headers.get('content-type'))
  const text = await res.text()
  console.log('Raw (300 chars):', text.slice(0, 300))

  try {
    const json = JSON.parse(text)
    if (json.cmVzcG9uc2U) {
      const dec = decrypt(json.cmVzcG9uc2U)
      console.log('🔓 Decrypted (500 chars):', dec.slice(0, 500))
      try {
        const parsed = JSON.parse(dec)
        console.log('Keys:', Object.keys(parsed))
        if (Array.isArray(parsed.lstAsientos)) {
          console.log('lstAsientos.length:', parsed.lstAsientos.length)
          if (parsed.lstAsientos[0]) {
            const item = { ...parsed.lstAsientos[0] }
            if (item.asiento) item.asiento = `<base64 ${Math.round((item.asiento as string).length * 3/4 / 1024)}KB>`
            console.log('lstAsientos[0] fields:', Object.keys(item))
            console.log('lstAsientos[0]:', JSON.stringify(item, null, 2))
          }
        }
      } catch { /* not JSON */ }
    }
    if (json.dglwbw) console.log('dglwbw (valid):', decrypt(json.dglwbw))
    if (json.codigoRespuesta) {
      console.log('codigoRespuesta:', json.codigoRespuesta)
      console.log('descripcion:', json.descripcionRespuesta)
    }
  } catch { /* not JSON */ }
}

async function main() {
  // Test 1: AES encriptado (como indica el usuario)
  await probar('AES encriptado', { dmFsdWU: encrypt(JSON.stringify(payload)) })

  // Test 2: Plain JSON (por si acaso)
  await probar('Plain JSON', payload)
}
main()
