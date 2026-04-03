import CryptoJS from 'crypto-js'

const ASIENTO_API   = 'https://api-gateway.sunarp.gob.pe:9443/sunarp/siguelo/asientoinscripcion/listarAsientos'
const IBM_CLIENT_ID = '30a3fd982c6f85a3a70b44fa1f302488'
const AES_KEY       = 'sV2zUWiuNo@3uv8nu9ir4'

const encrypt = (data: string) => CryptoJS.AES.encrypt(data, AES_KEY).toString()
const decrypt = (data: string) => CryptoJS.AES.decrypt(data, AES_KEY).toString(CryptoJS.enc.Utf8)

async function probar(descripcion: string, payload: object) {
  const res = await fetch(ASIENTO_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-IBM-Client-Id': IBM_CLIENT_ID,
      Origin: 'https://siguelo.sunarp.gob.pe', Referer: 'https://siguelo.sunarp.gob.pe/siguelo/' },
    body: JSON.stringify({ dmFsdWU: encrypt(JSON.stringify(payload)) }),
  })
  const json = await res.json() as Record<string, string>
  const dec = decrypt(json.cmVzcG9uc2U ?? '')
  const valid = decrypt(json.dglwbw ?? '')
  console.log(`[${descripcion}] valid=${valid} → ${dec.slice(0, 120)}`)
}

async function main() {
  const base = { codigoZona:'01', codigoOficina:'01', anioTitulo:'2026',
    numeroTitulo:'00431663', idAreaRegistro:'22000', idioma:'es',
    ip:'0.0.0.0', status:'A', userApp:'sigue+', userCrea:'sigue+' }

  // Variaciones con tipoConsulta diferente
  await probar('tipoConsulta=N', { ...base, tipoConsulta: 'N' })
  await probar('tipoConsulta=I', { ...base, tipoConsulta: 'I' })
  await probar('tipoConsulta=A', { ...base, tipoConsulta: 'A' })
  await probar('sin tipoConsulta', base)

  // Probar con userApp=extranet (como el endpoint de esquelas)
  await probar('userApp=extranet', { ...base, tipoConsulta: 'N', userApp: 'extranet', userCrea: 'Siguelo' })

  // Probar título diferente — buscar uno INSCRITO conocido (Trujillo, otro año)
  await probar('LIMA/2025/sin idArea', {
    codigoZona:'01', codigoOficina:'01', anioTitulo:'2025', numeroTitulo:'00100000',
    idioma:'es', ip:'0.0.0.0', status:'A', userApp:'sigue+', userCrea:'sigue+'
  })
}
main()
