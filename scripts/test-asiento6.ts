import CryptoJS from 'crypto-js'

const IBM_CLIENT_ID = '30a3fd982c6f85a3a70b44fa1f302488'
const AES_KEY       = 'sV2zUWiuNo@3uv8nu9ir4'
const SIGUELO_URL   = 'https://siguelo.sunarp.gob.pe/siguelo/'

const encrypt = (d: string) => CryptoJS.AES.encrypt(d, AES_KEY).toString()
const decrypt = (d: string) => { try { return CryptoJS.AES.decrypt(d, AES_KEY).toString(CryptoJS.enc.Utf8) } catch { return '' } }

const HEADERS = {
  'Content-Type': 'application/json', 'X-IBM-Client-Id': IBM_CLIENT_ID,
  Origin: 'https://siguelo.sunarp.gob.pe', Referer: SIGUELO_URL,
}

async function post(url: string, body: unknown) {
  const res = await fetch(url, { method: 'POST', headers: HEADERS, body: JSON.stringify(body) })
  const ct = res.headers.get('content-type') ?? ''
  const text = await res.text()
  if (ct.includes('pdf') || ct.includes('octet')) return `[BINARY ${text.length}B]`
  try {
    const json = JSON.parse(text) as Record<string, string>
    const valid = json.dglwbw ? decrypt(json.dglwbw) : '-'
    const raw   = json.cmVzcG9uc2U ? decrypt(json.cmVzcG9uc2U) : text
    return `valid=${valid} | ${raw.slice(0, 200)}`
  } catch { return text.slice(0, 200) }
}

const base = { codigoZona:'01', codigoOficina:'01', anioTitulo:'2025',
  numeroTitulo:'02416207', idAreaRegistro:'22000', ip:'181.65.25.93',
  status:'A', idioma:'es', userApp:'sigue+', userCrea:'sigue+' }

async function main() {
  const urls = [
    'https://api-gateway.sunarp.gob.pe:9443/sunarp/siguelo/asientoinscripcion/listarAsientos',
    'https://api-gateway.sunarp.gob.pe:9443/sunarp/siguelo/asiento-inscripcion/listarAsientos',
    'https://api-gateway.sunarp.gob.pe:9443/sunarp/siguelo/asientoinscripcion/listarAsiento',
    'https://api-gateway.sunarp.gob.pe:9443/sunarp/siguelo/asientoinscripcion/obtenerAsiento',
    'https://api-gateway.sunarp.gob.pe:9443/sunarp/siguelo/asientoinscripcion/descargarAsiento',
  ]

  console.log('═══ Probando URLs alternativas (plain JSON) ═══')
  for (const url of urls) {
    const r = await post(url, base).catch(e => `ERROR: ${e.message}`)
    console.log(`[${url.split('/').slice(-2).join('/')}] ${r.slice(0, 120)}`)
  }

  console.log('\n═══ Probando número sin pad (2416207) ═══')
  const base2 = { ...base, numeroTitulo: '2416207' }
  const r1 = await post(urls[0], { dmFsdWU: encrypt(JSON.stringify(base2)) })
  console.log('[sin pad AES]', r1.slice(0, 150))

  console.log('\n═══ Probando sin idAreaRegistro ═══')
  const { idAreaRegistro, ...base3 } = base
  const r2 = await post(urls[0], { dmFsdWU: encrypt(JSON.stringify(base3)) })
  console.log('[sin idArea AES]', r2.slice(0, 150))

  console.log('\n═══ Probando plain JSON (sin AES) ═══')
  const r3 = await post(urls[0], base)
  console.log('[plain JSON]', r3.slice(0, 150))

  console.log('\n═══ Probando año 2026 ═══')
  const r4 = await post(urls[0], { dmFsdWU: encrypt(JSON.stringify({ ...base, anioTitulo: '2026' })) })
  console.log('[2026 AES]', r4.slice(0, 150))
}
main()
