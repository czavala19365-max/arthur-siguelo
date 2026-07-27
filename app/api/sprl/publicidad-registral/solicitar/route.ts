import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

const SOAP_URL = 'https://sprl.sunarp.gob.pe/SunarpSoap3/SunarpInsSoapImplService'
const SOAP_URL_LOOKUP = 'https://sprl.sunarp.gob.pe/SunarpSoap2/SunarpLstSoapImplService'
const SOAP_NS = 'http://ws.sunarp.gob.pe/'

type CertificateConfig = {
  certificadoID: number
  codGrupoLibroArea: number
  nombreCertificado: string
  desGrupoLibroArea: string
  tpoCertificado: string
}

type SolicitudBody = {
  certificate: CertificateConfig
  oficinaRegistral?: string
  partida?: string
  asiento?: string
  cargoApoderado?: string
  apellidoPaterno?: string
  apellidoMaterno?: string
  nombres?: string
  sunarpSesionId?: string
  sunarpCookieHeader?: string
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function textMatch(xml: string, tag: string) {
  const match = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i'))
  return match?.[1]?.trim() ?? ''
}

function extractRefNumPart(xml: string) {
  return (
    textMatch(xml, 'refNumPart') ||
    textMatch(xml, 'numeroReferencia') ||
    textMatch(xml, 'numeroPartida') ||
    textMatch(xml, 'refnumpart')
  )
}

function buildEnvelope(operation: string, sessionId: string, innerXml: string) {
  return `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ws="${SOAP_NS}">
  <soapenv:Header>
    <ws:sunarp-sesion-id>${escapeXml(sessionId)}</ws:sunarp-sesion-id>
  </soapenv:Header>
  <soapenv:Body>
    <ws:${operation}>
      ${innerXml}
    </ws:${operation}>
  </soapenv:Body>
</soapenv:Envelope>`
}

async function callSoapToUrl(url: string, operation: string, sessionId: string, innerXml: string, accessToken?: string, cookieHeader?: string) {

  console.log("===== SOAP REQUEST =====");
  console.log("URL:", url);
  console.log("Operation:", operation);
  console.log("Session:", sessionId);

  const envelope = buildEnvelope(operation, sessionId, innerXml);

  console.log(envelope);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      Accept: 'text/xml, application/xml, */*',
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      Referer: 'https://sprl.sunarp.gob.pe/sprl/main/sp-certificada',
    },
    body: envelope,
  })

  console.log("STATUS:", response.status);

  const xml = await response.text();

  console.log("===== SOAP RESPONSE =====");
  console.log(xml);
  return { response, xml }
}

async function callSoap(operation: string, sessionId: string, innerXml: string, accessToken?: string, cookieHeader?: string) {
  return callSoapToUrl(SOAP_URL, operation, sessionId, innerXml, accessToken, cookieHeader)
}

async function callLookupSoap(operation: string, sessionId: string, innerXml: string, accessToken?: string, cookieHeader?: string) {
  return callSoapToUrl(SOAP_URL_LOOKUP, operation, sessionId, innerXml, accessToken, cookieHeader)
}

function buildSolicitudXml(params: {
  certificate: CertificateConfig
  partida: string
  asiento: string
  razSocCert: string
  refNumPart: string
  cargoApoderado: string
  apellidoPaterno: string
  apellidoMaterno: string
  nombres: string
}) {
  const cert = params.certificate
  return `<datoSolicitudBean>
  <partida>${escapeXml(params.partida)}</partida>
  <ficha></ficha>
  <tomo></tomo>
  <folio></folio>
  <formaEnvio>V</formaEnvio>
  <desTpoDoc>09</desTpoDoc>
  <desTpoPers>N</desTpoPers>
  <placa></placa>
  <matricula></matricula>
  <cantidad>1</cantidad>
  <numeroCertificados>1</numeroCertificados>
  <poderdante></poderdante>
  <apoderando></apoderando>
  <coServRgst>1</coServRgst>
  <coTipoRgst>002</coTipoRgst>
  <coTipoServ>002</coTipoServ>
  <ipRemote>172.19.10.144</ipRemote>
  <oficinaOrigen>01|01</oficinaOrigen>
  <codArea>22000</codArea>
  <codGrupo>${cert.codGrupoLibroArea}</codGrupo>
  <oficRegId>01</oficRegId>
  <regPubId>01</regPubId>
  <codCerti>${cert.certificadoID}</codCerti>
  <desCerti>${escapeXml(cert.nombreCertificado)}</desCerti>
  <desGrupo>${escapeXml(cert.desGrupoLibroArea)}</desGrupo>
  <tpoCerti>${escapeXml(cert.tpoCertificado)}</tpoCerti>
  <certificado>${cert.certificadoID}:${cert.codGrupoLibroArea}:${escapeXml(cert.tpoCertificado)}:${escapeXml(cert.nombreCertificado)}:${escapeXml(cert.desGrupoLibroArea)}</certificado>
  <asiento>${escapeXml(params.asiento)}</asiento>
  <codLibro>009</codLibro>
  <objetoSolicitudBean><coPropietario/><cnombApoderando>${escapeXml(params.cargoApoderado)}</cnombApoderando><Libro>009</Libro></objetoSolicitudBean>
  <tpoPersona>N</tpoPersona>
  <refNumPart>${escapeXml(params.refNumPart)}</refNumPart>
  <costoTotal>33</costoTotal>
  <costoServicio>33</costoServicio>
  <razSocCert>${escapeXml(params.razSocCert)}</razSocCert>
  <descripcion>Usted ha solicitado un: &quot;${escapeXml(cert.nombreCertificado)}&quot; de la Partida: ${escapeXml(params.partida)} , Razon Social: ${escapeXml(params.razSocCert)}</descripcion>
  <coApeMaterno>${escapeXml(params.apellidoMaterno)}</coApeMaterno>
  <coApePaterno>${escapeXml(params.apellidoPaterno)}</coApePaterno>
  <coNombre>${escapeXml(params.nombres)}</coNombre>
</datoSolicitudBean>`
}

async function resolveRazonSocial(sessionId: string, payload: SolicitudBody, accessToken?: string, cookieHeader?: string) {
  const refNumPart = String(payload.partida || '').trim()
  const lookupXml = `<refNumPart>${escapeXml(refNumPart)}</refNumPart>`

  const lookup = await callLookupSoap('buscarRazonSocialCertificadoPJ', sessionId, lookupXml, accessToken, cookieHeader)

  if (!lookup.response.ok) {
    throw new Error(`SUNARP respondió HTTP ${lookup.response.status} al buscar la razón social.`)
  }

  const razSocCert =
    textMatch(lookup.xml, 'razon_social') ||
    textMatch(lookup.xml, 'razSocCert') ||
    textMatch(lookup.xml, 'razonSocial') ||
    textMatch(lookup.xml, 'razSoc')
  const resolvedRefNumPart = textMatch(lookup.xml, 'refNumPart') || textMatch(lookup.xml, 'numeroPartida') || refNumPart

  if (!razSocCert) {
    throw new Error('No se pudo obtener la razón social desde SUNARP.')
  }

  return { razSocCert, refNumPart: resolvedRefNumPart }
}

async function obtenerRefNumPart(sessionId: string, numeroPartida: string, accessToken?: string, cookieHeader?: string) {
  const lookup = await callLookupSoap(
    'buscarRefNumPart',
    sessionId,
    `<numPartida>${escapeXml(numeroPartida)}</numPartida><oficRegId>01</oficRegId><regPubId>01</regPubId><codArea>22000</codArea>`,
    accessToken,
    cookieHeader,
  )

  if (!lookup.response.ok) {
    throw new Error(`SUNARP respondió HTTP ${lookup.response.status} al buscar el número de referencia.`)
  }

  const refNumPart = textMatch(lookup.xml, 'refNumPart') || textMatch(lookup.xml, 'numeroReferencia') || textMatch(lookup.xml, 'numeroPartida')
  if (!refNumPart) {
    throw new Error('No se pudo obtener el número de referencia de SUNARP.')
  }

  return refNumPart
}

async function obtenerTarifa(sessionId: string, cert: CertificateConfig, accessToken?: string, cookieHeader?: string) {
  const tariff = await callLookupSoap(
    'buscarTarifa',
    sessionId,
    `<codGrupoLibro>${cert.codGrupoLibroArea}</codGrupoLibro><idServico>${cert.certificadoID}</idServico>`,
    accessToken,
    cookieHeader,
  )

  if (!tariff.response.ok) {
    throw new Error(`SUNARP respondió HTTP ${tariff.response.status} al buscar la tarifa.`)
  }

  return {
    costoServicio: textMatch(tariff.xml, 'costoServicio') || textMatch(tariff.xml, 'costo') || '33',
    costoTotal: textMatch(tariff.xml, 'costoTotal') || textMatch(tariff.xml, 'total') || '33',
    raw: tariff.xml,
  }
}

async function obtenerPartidaBase(sessionId: string, partida: string, cert: CertificateConfig, accessToken?: string, cookieHeader?: string) {
  const commonXml = `<numero>${escapeXml(partida)}</numero><oficRegId>01</oficRegId><regPubId>01</regPubId><libroArea>${cert.codGrupoLibroArea}</libroArea>`
  const cvp = await callLookupSoap('obtenerPartidaCVP', sessionId, commonXml, accessToken, cookieHeader)
  if (!cvp.response.ok) {
    throw new Error(`SUNARP respondió HTTP ${cvp.response.status} al obtener la partida CVP.`)
  }

  const cri = await callLookupSoap(
    'obtenerPartidaCRI',
    sessionId,
    `${commonXml}<tpoNumero>P</tpoNumero>`,
    accessToken,
    cookieHeader,
  )
  if (!cri.response.ok) {
    throw new Error(`SUNARP respondió HTTP ${cri.response.status} al obtener la partida CRI.`)
  }

  return { cvp: cvp.xml, cri: cri.xml }
}

async function obtenerPartidaRefNum(sessionId: string, partida: string, partidaBaseXml: string, accessToken?: string, cookieHeader?: string) {
  const refNumPart = extractRefNumPart(partidaBaseXml)
  if (!refNumPart) {
    throw new Error('SUNARP no devolvió refNumPart en la partida CVP.')
  }

  const validation = await callLookupSoap(
    'buscarRefNumPart',
    sessionId,
    `<numPartida>${escapeXml(partida)}</numPartida><oficRegId>01</oficRegId><regPubId>01</regPubId><codArea>22000</codArea>`,
    accessToken,
    cookieHeader,
  )

  if (!validation.response.ok) {
    throw new Error(`SUNARP respondió HTTP ${validation.response.status} al buscar el número de referencia.`)
  }

  return extractRefNumPart(validation.xml) || refNumPart
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SolicitudBody
    const sessionId = String(body.sunarpSesionId || request.cookies.get('sprl_access_token')?.value || '').trim()
    const remoteCookieHeader = String(body.sunarpCookieHeader || request.cookies.get('sprl_remote_cookie')?.value || '').trim()

    if (!sessionId) {
      return NextResponse.json({ ok: false, error: 'No hay sunarp-sesion-id activo.' }, { status: 401 })
    }

    const partida = String(body.partida || '').trim()
    const asiento = String(body.asiento || '').trim().toUpperCase()
    const cargoApoderado = String(body.cargoApoderado || '').trim().toUpperCase()
    const apellidoPaterno = String(body.apellidoPaterno || '').trim().toUpperCase()
    const apellidoMaterno = String(body.apellidoMaterno || '').trim().toUpperCase()
    const nombres = String(body.nombres || '').trim().toUpperCase()

    if (!body.certificate || !partida || !cargoApoderado || !apellidoPaterno || !nombres) {
      return NextResponse.json({ ok: false, error: 'Faltan datos obligatorios para registrar la solicitud.' }, { status: 400 })
    }

    const partidaBase = await obtenerPartidaBase(sessionId, partida, body.certificate, undefined, remoteCookieHeader || undefined)

    const refNumPart = await obtenerPartidaRefNum(sessionId, partida, partidaBase.cvp, undefined, remoteCookieHeader || undefined)
    const lookup = await resolveRazonSocial(sessionId, { ...body, partida: refNumPart, asiento }, undefined, remoteCookieHeader || undefined)
    const tariff = await obtenerTarifa(sessionId, body.certificate, undefined, remoteCookieHeader || undefined)

    return NextResponse.json({
      ok: true,
      summary: {
        partida,
        razSocCert: lookup.razSocCert,
        refNumPart,
        asiento,
        cargoApoderado,
        apellidoPaterno,
        apellidoMaterno,
        nombres,
        certificate: body.certificate,
        costoServicio: tariff.costoServicio,
        costoTotal: tariff.costoTotal,
      },
      message: 'SUNARP dejó la solicitud lista para el siguiente paso.',
      nextStep: 'pagar',
      capture: {
        partidaBase,
        tarifa: tariff.raw.substring(0, 4000),
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al registrar la solicitud'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}