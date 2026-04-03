import CryptoJS from 'crypto-js'

const ESQUELA_API   = 'https://api-gateway.sunarp.gob.pe:9443/sunarp/siguelo/siguelo-esquela/listarEsquela'
const IBM_CLIENT_ID = '30a3fd982c6f85a3a70b44fa1f302488'

const base = {
  codigoZona: '01', codigoOficina: '01',
  anioTitulo: '2026', numeroTitulo: '00431663',
  idAreaRegistro: '22000', idioma: 'es',
  ip: '0.0.0.0', status: 'A', tipoConsulta: 'E',
  userApp: 'extranet', userCrea: 'Siguelo',
}

async function consultar(tipoEsquela: string) {
  const res = await fetch(ESQUELA_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-IBM-Client-Id': IBM_CLIENT_ID,
      Origin: 'https://siguelo.sunarp.gob.pe', Referer: 'https://siguelo.sunarp.gob.pe/siguelo/' },
    body: JSON.stringify({ ...base, tipoEsquela }),
  })
  const data = await res.json() as {
    codigoRespuesta: string
    descripcionRespuesta: string
    lstEsquela?: Array<Record<string, unknown>>
  }

  console.log(`\n═══ tipoEsquela="${tipoEsquela}" ═══════════════════════`)
  console.log('codigoRespuesta:', data.codigoRespuesta)
  console.log('descripcionRespuesta:', data.descripcionRespuesta)
  if (data.lstEsquela) {
    console.log('lstEsquela.length:', data.lstEsquela.length)
    data.lstEsquela.forEach((item, i) => {
      const keys = Object.keys(item)
      const sinEsquela = { ...item }
      if (sinEsquela.esquela) sinEsquela.esquela = `<base64 ${Math.round((sinEsquela.esquela as string).length * 3/4 / 1024)}KB>`
      console.log(`\n  [${i}] campos:`, keys)
      console.log(`  [${i}] valores (sin PDF):`, JSON.stringify(sinEsquela, null, 4))
    })
  }
}

async function main() {
  await consultar('O') // Observación
  await consultar('L') // Liquidación
  await consultar('T') // Tacha
  await consultar('I') // Inscripción
}
main()
