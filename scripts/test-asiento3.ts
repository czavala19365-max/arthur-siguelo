import CryptoJS from 'crypto-js'

const ASIENTO_API   = 'https://api-gateway.sunarp.gob.pe:9443/sunarp/siguelo/asientoinscripcion/listarAsientos'
const CONSULTA_API  = 'https://api-gateway.sunarp.gob.pe:9443/sunarp/siguelo/siguelo-tracking/tracking/api/consultaTitulo'
const IBM_CLIENT_ID = '30a3fd982c6f85a3a70b44fa1f302488'
const AES_KEY       = 'sV2zUWiuNo@3uv8nu9ir4'

const encrypt = (d: string) => CryptoJS.AES.encrypt(d, AES_KEY).toString()
const decrypt = (d: string) => CryptoJS.AES.decrypt(d, AES_KEY).toString(CryptoJS.enc.Utf8)

async function call(url: string, payload: object) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-IBM-Client-Id': IBM_CLIENT_ID,
      Origin: 'https://siguelo.sunarp.gob.pe', Referer: 'https://siguelo.sunarp.gob.pe/siguelo/' },
    body: JSON.stringify({ dmFsdWU: encrypt(JSON.stringify(payload)) }),
  })
  const json = await res.json() as Record<string, string>
  const valid = decrypt(json.dglwbw ?? '')
  const raw   = decrypt(json.cmVzcG9uc2U ?? '')
  return { valid, raw, json }
}

async function main() {
  // Paso 1: consultar título para obtener areaRegistral real
  console.log('═══ 1. Consultando título para obtener areaRegistral ═══')
  const consulta = await call(CONSULTA_API, {
    codigoZona: '01', codigoOficina: '01',
    anioTitulo: '2026', numeroTitulo: '02416207',
    ip: '0.0.0.0', userApp: 'sigue+', userCrea: 'sigue+',
    status: 'A', idioma: 'es', tipoConsulta: 'N',
    dG9rZW4: 'dummy',
  })
  console.log('valid:', consulta.valid)
  try {
    const d = JSON.parse(consulta.raw) as Record<string, unknown>
    const lst = d.lstTitulo as Array<Record<string,string>> | undefined
    if (lst?.[0]) {
      console.log('estadoActual:', lst[0].estadoActual)
      console.log('areaRegistral:', lst[0].areaRegistral)
    } else {
      console.log('raw (500):', consulta.raw.slice(0, 500))
    }
  } catch { console.log('raw:', consulta.raw.slice(0, 300)) }

  // Paso 2: probar listarAsientos con variaciones de payload
  const basePayload = {
    codigoZona: '01', codigoOficina: '01',
    anioTitulo: '2026', numeroTitulo: '02416207',
    ip: '0.0.0.0', status: 'A', idioma: 'es', userApp: 'sigue+', userCrea: 'sigue+',
  }

  const variaciones: Array<[string, object]> = [
    ['sin idAreaRegistro', basePayload],
    ['idAreaRegistro=22000', { ...basePayload, idAreaRegistro: '22000' }],
    ['idAreaRegistro=11000', { ...basePayload, idAreaRegistro: '11000' }],
    ['idAreaRegistro=10000', { ...basePayload, idAreaRegistro: '10000' }],
    ['tipoConsulta=N', { ...basePayload, tipoConsulta: 'N' }],
    ['tipoConsulta=I + idArea22000', { ...basePayload, tipoConsulta: 'I', idAreaRegistro: '22000' }],
    ['userApp=extranet', { ...basePayload, userApp: 'extranet', userCrea: 'Siguelo' }],
    ['userApp=extranet+idArea22000', { ...basePayload, userApp: 'extranet', userCrea: 'Siguelo', idAreaRegistro: '22000' }],
  ]

  for (const [desc, payload] of variaciones) {
    const r = await call(ASIENTO_API, payload)
    let summary = r.raw.slice(0, 150)
    try {
      const d = JSON.parse(r.raw) as Record<string, unknown>
      if (d.lstAsientos) summary = `✅ lstAsientos.length=${(d.lstAsientos as unknown[]).length}`
      else summary = `keys=${Object.keys(d).join(',')} | ${JSON.stringify(d).slice(0, 120)}`
    } catch { /* */ }
    console.log(`[${desc}] valid=${r.valid} → ${summary}`)
  }
}
main()
