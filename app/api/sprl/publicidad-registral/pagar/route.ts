import { NextRequest, NextResponse } from 'next/server'
import { getAuthServerClient } from '@/lib/supabase-auth-server'
import { getDecryptedCredentials } from '@/lib/sprl/db'

export const runtime = 'nodejs'

const SOAP_URL_INS = 'https://sprl.sunarp.gob.pe/SunarpSoap3/SunarpInsSoapImplService'
const SOAP_URL_LST = 'https://sprl.sunarp.gob.pe/SunarpSoap2/SunarpLstSoapImplService'
const SOAP_NS = 'http://ws.sunarp.gob.pe/'

type CertificateConfig = {
  certificadoID: number
  codGrupoLibroArea: number
  nombreCertificado: string
  desGrupoLibroArea: string
  tpoCertificado: string
}

type PagarBody = {
  certificate: CertificateConfig
  flowKey?: string
  redirectPath?: string
  partida?: string
  asiento?: string
  cargoApoderado?: string
  apellidoPaterno?: string
  apellidoMaterno?: string
  nombres?: string
  refNumPart?: string
  razSocCert?: string
  costoServicio?: string
  costoTotal?: string
  sunarpSesionId?: string
  sunarpCookieHeader?: string
}

type PaymentFlowContext = {
  certificate: CertificateConfig
  sessionId: string
  cookieHeader?: string
  username: string
  partida: string
  asiento: string
  cargoApoderado: string
  apellidoPaterno: string
  apellidoMaterno: string
  nombres: string
  refNumPart: string
  razSocCert: string
  costoServicio: string
  costoTotal: string
}

type ApplicantData = {
  apellidoPaterno: string
  apellidoMaterno: string
  nombres: string
  numeroDocumento: string
}

type PaymentFlowResult = {
  applicant: ApplicantData
}

type PaymentFlowDefinition = {
  key: string
  redirectPath: string
  run: (ctx: PaymentFlowContext) => Promise<PaymentFlowResult>
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

function pickFirst(xml: string, tags: string[]) {
  for (const tag of tags) {
    const value = textMatch(xml, tag)
    if (value) return value
  }
  return ''
}

function parseApplicantFromXml(xml: string): ApplicantData {
  return {
    apellidoPaterno: pickFirst(xml, ['apePaterno', 'apellidoPaterno', 'coApePaterno', 'apePat']),
    apellidoMaterno: pickFirst(xml, ['apeMaterno', 'apellidoMaterno', 'coApeMaterno', 'apeMat']),
    nombres: pickFirst(xml, ['nombres', 'coNombre', 'nombre']),
    numeroDocumento: pickFirst(xml, ['numDocumento', 'numeroDocumento', 'nroDocumento', 'nroDoc']),
  }
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

async function callSoapToUrl(url: string, operation: string, sessionId: string, innerXml: string, cookieHeader?: string) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      Accept: 'text/xml, application/xml, */*',
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      Referer: 'https://sprl.sunarp.gob.pe/sprl/main/sp-certificada',
    },
    body: buildEnvelope(operation, sessionId, innerXml),
  })

  const xml = await response.text()
  return { response, xml }
}

async function callLstSoap(operation: string, sessionId: string, innerXml: string, cookieHeader?: string) {
  return callSoapToUrl(SOAP_URL_LST, operation, sessionId, innerXml, cookieHeader)
}

async function callInsSoap(operation: string, sessionId: string, innerXml: string, cookieHeader?: string) {
  return callSoapToUrl(SOAP_URL_INS, operation, sessionId, innerXml, cookieHeader)
}

async function callRequiredLst(operation: string, sessionId: string, innerXml: string, cookieHeader?: string) {
  const result = await callLstSoap(operation, sessionId, innerXml, cookieHeader)
  if (!result.response.ok) {
    throw new Error(`SUNARP respondió HTTP ${result.response.status} en ${operation}.`)
  }
  return result.xml
}

function buildRegistrarSolicitudXml(params: {
  certificate: CertificateConfig
  partida: string
  asiento: string
  refNumPart: string
  razSocCert: string
  cargoApoderado: string
  apellidoPaterno: string
  apellidoMaterno: string
  nombres: string
  costoServicio: string
  costoTotal: string
}) {
  const cert = params.certificate
  return `<datoSolicitudBean><partida>${escapeXml(params.partida)}</partida><ficha></ficha><tomo></tomo><folio></folio><formaEnvio>V</formaEnvio><desTpoDoc>09</desTpoDoc><desTpoPers>N</desTpoPers><placa></placa><matricula></matricula><cantidad>1</cantidad><numeroCertificados>1</numeroCertificados><poderdante></poderdante><apoderando></apoderando><coServRgst>1</coServRgst><coTipoRgst>002</coTipoRgst><coTipoServ>002</coTipoServ><ipRemote>172.19.10.144</ipRemote><oficinaOrigen>01|01</oficinaOrigen><codArea>22000</codArea><codGrupo>${cert.codGrupoLibroArea}</codGrupo><oficRegId>01</oficRegId><regPubId>01</regPubId><codCerti>${cert.certificadoID}</codCerti><desCerti>${escapeXml(cert.nombreCertificado)}</desCerti><desGrupo>${escapeXml(cert.desGrupoLibroArea)}</desGrupo><tpoCerti>${escapeXml(cert.tpoCertificado)}</tpoCerti><certificado>${cert.certificadoID}:${cert.codGrupoLibroArea}:${escapeXml(cert.tpoCertificado)}:${escapeXml(cert.nombreCertificado)}:${escapeXml(cert.desGrupoLibroArea)}</certificado><asiento>${escapeXml(params.asiento)}</asiento><codLibro>009</codLibro><objetoSolicitudBean><coPropietario/><cnombApoderando>${escapeXml(params.cargoApoderado)}</cnombApoderando><Libro>009</Libro></objetoSolicitudBean><tpoPersona>N</tpoPersona><refNumPart>${escapeXml(params.refNumPart)}</refNumPart><costoTotal>${escapeXml(params.costoTotal)}</costoTotal><costoServicio>${escapeXml(params.costoServicio)}</costoServicio><razSocCert>${escapeXml(params.razSocCert)}</razSocCert><descripcion>Usted ha solicitado un: &quot;${escapeXml(cert.nombreCertificado)}&quot; de la Partida: ${escapeXml(params.partida)} , Razon Social: ${escapeXml(params.razSocCert)}</descripcion><coApeMaterno>${escapeXml(params.apellidoMaterno)}</coApeMaterno><coApePaterno>${escapeXml(params.apellidoPaterno)}</coApePaterno><coNombre>${escapeXml(params.nombres)}</coNombre></datoSolicitudBean>`
}

async function runCertificadoFlow(ctx: PaymentFlowContext): Promise<PaymentFlowResult> {
  await callRequiredLst(
    'obtenerPublicidadPendiente',
    ctx.sessionId,
    `<codCerti>${ctx.certificate.certificadoID}</codCerti><numPartida>${escapeXml(ctx.partida)}</numPartida>`,
    ctx.cookieHeader,
  )

  const userDataXml = await callRequiredLst(
    'buscarDatosUsuarioPer',
    ctx.sessionId,
    `<usuarioId>${escapeXml(ctx.username)}</usuarioId>`,
    ctx.cookieHeader,
  )

  const applicant = parseApplicantFromXml(userDataXml)

  await callRequiredLst('listarTipoDocumentos2', ctx.sessionId, '', ctx.cookieHeader)
  await callRequiredLst('buscarBanco', ctx.sessionId, '', ctx.cookieHeader)

  const solicitudXml = buildRegistrarSolicitudXml({
    certificate: ctx.certificate,
    partida: ctx.partida,
    asiento: ctx.asiento,
    refNumPart: ctx.refNumPart,
    razSocCert: ctx.razSocCert,
    cargoApoderado: ctx.cargoApoderado,
    apellidoPaterno: ctx.apellidoPaterno,
    apellidoMaterno: ctx.apellidoMaterno,
    nombres: ctx.nombres,
    costoServicio: ctx.costoServicio,
    costoTotal: ctx.costoTotal,
  })

  const registrar = await callInsSoap(
    'RegistrarSolicitudCertificado2',
    ctx.sessionId,
    solicitudXml,
    ctx.cookieHeader,
  )

  if (!registrar.response.ok) {
    throw new Error(`SUNARP respondió HTTP ${registrar.response.status} al registrar la solicitud para pago.`)
  }

  const codigo = textMatch(registrar.xml, 'codigo')
  const mensaje = textMatch(registrar.xml, 'mensaje')
  if (codigo && codigo !== '000') {
    throw new Error(mensaje || `SUNARP devolvió código ${codigo} al preparar el pago.`)
  }

  return { applicant }
}

const PAYMENT_FLOWS: Record<string, PaymentFlowDefinition> = {
  certificado: {
    key: 'certificado',
    redirectPath: '/sprl/main/sp-certificada',
    run: runCertificadoFlow,
  },
}

function resolveSunarpRedirectUrl(path?: string) {
  const base = 'https://sprl.sunarp.gob.pe'
  if (!path) return `${base}/sprl/main/sp-certificada`
  const clean = path.startsWith('/') ? path : `/${path}`
  return `${base}${clean}`
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as PagarBody

    const sessionId = String(
      body.sunarpSesionId ||
      request.cookies.get('sprl_access_token')?.value ||
      request.cookies.get('sunarp_sesion_id')?.value ||
      '',
    ).trim()

    const remoteCookieHeader = String(
      body.sunarpCookieHeader || request.cookies.get('sprl_remote_cookie')?.value || '',
    ).trim()

    if (!sessionId) {
      return NextResponse.json({ ok: false, error: 'No hay sunarp-sesion-id activo.' }, { status: 401 })
    }

    const certificate = body.certificate
    const partida = String(body.partida || '').trim()
    const asiento = String(body.asiento || '').trim().toUpperCase()
    const cargoApoderado = String(body.cargoApoderado || '').trim().toUpperCase()
    const apellidoPaterno = String(body.apellidoPaterno || '').trim().toUpperCase()
    const apellidoMaterno = String(body.apellidoMaterno || '').trim().toUpperCase()
    const nombres = String(body.nombres || '').trim().toUpperCase()
    const refNumPart = String(body.refNumPart || '').trim()
    const razSocCert = String(body.razSocCert || '').trim()
    const costoServicio = String(body.costoServicio || '33').trim()
    const costoTotal = String(body.costoTotal || '33').trim()

    if (!certificate || !partida || !asiento || !cargoApoderado || !apellidoPaterno || !nombres || !refNumPart || !razSocCert) {
      return NextResponse.json({ ok: false, error: 'Faltan datos para preparar el pago en SUNARP.' }, { status: 400 })
    }

    const authClient = await getAuthServerClient()
    const {
      data: { user },
    } = await authClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ ok: false, error: 'No autenticado.' }, { status: 401 })
    }

    const creds = await getDecryptedCredentials(user.id)
    if (!creds?.username) {
      return NextResponse.json({ ok: false, error: 'No se encontró usuario SPRL para completar el pago.' }, { status: 400 })
    }

    const flow = PAYMENT_FLOWS[body.flowKey || 'certificado']
    if (!flow) {
      return NextResponse.json({ ok: false, error: `Flujo de pago no soportado: ${body.flowKey}` }, { status: 400 })
    }

    const flowResult = await flow.run({
      certificate,
      sessionId,
      cookieHeader: remoteCookieHeader || undefined,
      username: creds.username,
      partida,
      asiento,
      cargoApoderado,
      apellidoPaterno,
      apellidoMaterno,
      nombres,
      refNumPart,
      razSocCert,
      costoServicio,
      costoTotal,
    })

    return NextResponse.json({
      ok: true,
      redirectUrl: resolveSunarpRedirectUrl(body.redirectPath || flow.redirectPath),
      redirectMode: 'same-url-stateful-view',
      flowKey: flow.key,
      applicant: flowResult.applicant,
      message: 'Solicitud enviada. SUNARP usa la misma URL y muestra la vista de pago según tu sesión.',
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al preparar el pago en SUNARP.'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
