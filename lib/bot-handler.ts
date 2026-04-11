import Anthropic from '@anthropic-ai/sdk';
import getDb from './db';
import { consultarTituloSUNARP } from './sunarp-scraper';
import { scrapeCEJ } from './cej-scraper';
import { chatWithProvider, type ChatMsg } from './llm-providers';

const anthropic = new Anthropic();
const MODEL = 'claude-sonnet-4-20250514';

// System prompt for legal Q&A — reuses same provider infrastructure as dashboard/chat
const SUNARP_BOT_SYSTEM = `Eres Arthur, asistente legal peruano especializado en SUNARP y procesos judiciales.
Responde en español, de forma directa y concisa (máximo 200 palabras).
Cita la base legal relevante (artículo, norma, directiva) cuando aplique.
Sugiere siempre el siguiente paso práctico.
Al final incluye: "⚠ Esta información es orientativa. Consulta con un abogado colegiado antes de actuar."`;

// ── Interfaces ───────────────────────────────────────────────────────────────

export interface BotMessage {
  plataforma: 'telegram' | 'whatsapp';
  userId: string;
  nombre: string | null;
  texto: string;
}

export interface BotResponse {
  texto: string;
  opciones?: string[];
  esError?: boolean;
}

export type Intencion =
  | 'SEGUIMIENTO_TITULO'
  | 'ESTADO_EXPEDIENTE'
  | 'VIGENCIA_PODER'
  | 'PUBLICIDAD_REGISTRAL'
  | 'COPIA_LITERAL'
  | 'MIS_TITULOS'
  | 'MIS_CASOS'
  | 'CONSULTA_LEGAL'
  | 'AYUDA'
  | 'SALUDO'
  | 'OTRO';

export interface DeteccionIntencion {
  intencion: Intencion;
  parametros: Record<string, string>;
  confianza: number;
}

// ── Internal types ───────────────────────────────────────────────────────────

type EstadoSesion =
  | 'idle'
  | 'esperando_numero_titulo'
  | 'esperando_anio_titulo'
  | 'esperando_oficina_titulo'
  | 'esperando_expediente'
  | 'esperando_distrito'   // legacy — redirects to esperando_expediente flow
  | 'esperando_parte'
  | 'esperando_numero_partida';

interface ContextoSesion {
  flujo?: string;
  numero_titulo?: string;
  anio?: string;
  oficina?: string;
  expediente?: string;
  [key: string]: string | undefined;
}

interface BotUser {
  id: number;
  telegram_id: string | null;
  whatsapp_number: string | null;
  nombre: string | null;
  verificado: number;
}

interface BotSesion {
  id: number;
  bot_user_id: number;
  plataforma: string;
  estado: string;
  contexto: string;
}

// ── 1. detectarIntencion ─────────────────────────────────────────────────────

export async function detectarIntencion(texto: string): Promise<DeteccionIntencion> {
  const prompt = `Eres un asistente legal peruano. Analiza el siguiente mensaje en español y detecta la intención del usuario.

Mensaje: "${texto}"

Intenciones posibles:
- SEGUIMIENTO_TITULO: quiere saber el estado de un título SUNARP
- ESTADO_EXPEDIENTE: quiere saber el estado de un expediente judicial
- VIGENCIA_PODER: quiere consultar la vigencia de un poder notarial
- PUBLICIDAD_REGISTRAL: quiere solicitar publicidad registral SUNARP
- COPIA_LITERAL: quiere solicitar copia literal de partida registral
- MIS_TITULOS: quiere ver sus títulos registrados en el sistema
- MIS_CASOS: quiere ver sus casos judiciales registrados
- CONSULTA_LEGAL: hace una pregunta legal sobre leyes, normativas, procesos, plazos o trámites (sin número de expediente ni título específico)
- AYUDA: pide ayuda sobre cómo usar el asistente o qué puede hacer
- SALUDO: saludo o presentación
- OTRO: cualquier otro mensaje que no encaja en las anteriores

Responde SOLO con JSON válido sin markdown ni explicaciones:
{
  "intencion": "NOMBRE_INTENCION",
  "parametros": {},
  "confianza": 0.95
}

Extrae parámetros si están presentes en el mensaje:
numero_titulo, anio, oficina, expediente, distrito, parte, numero_partida.`;

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    });
    const block = response.content[0];
    if (block.type !== 'text') throw new Error('No text response');
    const clean = block.text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean) as DeteccionIntencion;
  } catch {
    return { intencion: 'OTRO', parametros: {}, confianza: 0 };
  }
}

// ── 2. getOrCreateUser ───────────────────────────────────────────────────────

export function getOrCreateUser(
  plataforma: 'telegram' | 'whatsapp',
  userId: string,
  nombre: string | null
): BotUser {
  const db = getDb();
  const field = plataforma === 'telegram' ? 'telegram_id' : 'whatsapp_number';

  let user = db
    .prepare(`SELECT * FROM bot_users WHERE ${field} = ?`)
    .get(userId) as BotUser | undefined;

  if (!user) {
    const result = db
      .prepare(`INSERT INTO bot_users (${field}, nombre) VALUES (?, ?)`)
      .run(userId, nombre);
    user = db
      .prepare('SELECT * FROM bot_users WHERE id = ?')
      .get(result.lastInsertRowid) as BotUser;
  } else if (nombre && !user.nombre) {
    db.prepare('UPDATE bot_users SET nombre = ? WHERE id = ?').run(nombre, user.id);
    user = db.prepare('SELECT * FROM bot_users WHERE id = ?').get(user.id) as BotUser;
  }

  return user!;
}

// ── 3. getSession / updateSession ────────────────────────────────────────────

export function getSession(botUserId: number, plataforma: string): BotSesion | null {
  return (
    getDb()
      .prepare('SELECT * FROM bot_sesiones WHERE bot_user_id = ? AND plataforma = ?')
      .get(botUserId, plataforma) as BotSesion | null
  );
}

export function updateSession(
  botUserId: number,
  plataforma: string,
  estado: EstadoSesion,
  contexto: ContextoSesion
) {
  const db = getDb();
  const existing = getSession(botUserId, plataforma);
  if (existing) {
    db.prepare(
      `UPDATE bot_sesiones SET estado = ?, contexto = ?, updated_at = datetime('now')
       WHERE bot_user_id = ? AND plataforma = ?`
    ).run(estado, JSON.stringify(contexto), botUserId, plataforma);
  } else {
    db.prepare(
      `INSERT INTO bot_sesiones (bot_user_id, plataforma, estado, contexto) VALUES (?, ?, ?, ?)`
    ).run(botUserId, plataforma, estado, JSON.stringify(contexto));
  }
}

// ── 4. generarLinkPago ───────────────────────────────────────────────────────

export function generarLinkPago(
  botUserId: number,
  tipo: string,
  referencia: string,
  montoSoles: number
): string {
  const db = getDb();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://arthur-siguelo.vercel.app';

  const result = db
    .prepare(
      `INSERT INTO bot_pagos (bot_user_id, tipo, referencia, monto_soles, estado)
       VALUES (?, ?, ?, ?, 'pendiente')`
    )
    .run(botUserId, tipo, referencia, montoSoles);

  const pagoId = result.lastInsertRowid as number;
  const paymentLink = `${appUrl}/pagar/${pagoId}?ref=${encodeURIComponent(referencia)}&monto=${montoSoles}`;

  db.prepare('UPDATE bot_pagos SET payment_link = ? WHERE id = ?').run(paymentLink, pagoId);

  return paymentLink;
}

// ── 5. logMessage (internal) ─────────────────────────────────────────────────

function logMessage(
  botUserId: number,
  plataforma: string,
  direccion: 'in' | 'out',
  contenido: string
) {
  getDb()
    .prepare(
      `INSERT INTO bot_mensajes (bot_user_id, plataforma, direccion, contenido) VALUES (?, ?, ?, ?)`
    )
    .run(botUserId, plataforma, direccion, contenido);
}

// ── 6. Scraper helpers ────────────────────────────────────────────────────────

/**
 * Calls the existing SUNARP scraper (lib/sunarp-scraper.ts) and formats the result.
 * Reuses the same consultarTituloSUNARP used by the web dashboard.
 */
async function consultarTituloYResponder(
  numero: string,
  anio: string,
  oficina: string
): Promise<BotResponse> {
  try {
    // consultarTituloSUNARP(oficina, anio, numero) — parameter order matches sunarp-scraper.ts
    const result = await consultarTituloSUNARP(oficina, anio, numero);

    if (result.portalDown) {
      return {
        texto: 'No pude conectarme a SUNARP en este momento. Reintentaré pronto.',
        esError: true,
      };
    }

    let txt = `📋 *Título ${numero}/${anio}*\n`;
    txt += `Oficina: ${oficina}\n`;
    txt += `Estado: *${result.estado}*\n`;
    if (result.detalle) txt += `Detalle: ${result.detalle}\n`;
    if (result.areaRegistral) txt += `Área registral: ${result.areaRegistral}\n`;
    if (result.numeroPartida) txt += `N° de partida: ${result.numeroPartida}\n`;
    txt += `\n_Consultado: ${new Date(result.scrapedAt).toLocaleString('es-PE')}_`;

    return { texto: txt };
  } catch (err) {
    console.error('[bot] consultarTituloSUNARP error:', err instanceof Error ? err.message : err);
    return {
      texto: 'No pude conectarme a SUNARP en este momento. Reintentaré pronto.',
      esError: true,
    };
  }
}

/**
 * Calls the existing CEJ scraper (lib/cej-scraper.ts) and formats the result.
 * Reuses the same scrapeCEJ used by the judicial dashboard.
 */
async function consultarExpedienteYResponder(expediente: string): Promise<BotResponse> {
  try {
    const result = await scrapeCEJ(expediente);

    if (result.portalDown) {
      const nota = result.error ? `\n_${result.error}_` : '';
      return {
        texto: `No pude conectarme al CEJ en este momento. Reintentaré pronto.${nota}`,
        esError: true,
      };
    }

    const ultimaActuacion = result.actuaciones[0] ?? null;

    let txt = `⚖️ *Expediente ${expediente}*\n`;
    if (result.organoJurisdiccional) txt += `Órgano: ${result.organoJurisdiccional}\n`;
    if (result.distritoJudicial) txt += `Distrito: ${result.distritoJudicial}\n`;
    if (result.proceso) txt += `Proceso: ${result.proceso}\n`;
    if (result.etapa) txt += `Etapa: ${result.etapa}\n`;
    if (result.estadoProceso) txt += `Estado: *${result.estadoProceso}*\n`;

    if (ultimaActuacion) {
      txt += `\n*Última actuación:*\n`;
      txt += `• ${ultimaActuacion.fecha} — ${ultimaActuacion.acto}\n`;
      if (ultimaActuacion.sumilla) txt += `  ${ultimaActuacion.sumilla}\n`;
    }

    if (result.totalActuaciones > 0) {
      txt += `\n_Total actuaciones: ${result.totalActuaciones}_`;
    }
    txt += `\n_Consultado: ${new Date(result.scrapedAt).toLocaleString('es-PE')}_`;

    return { texto: txt };
  } catch (err) {
    console.error('[bot] scrapeCEJ error:', err instanceof Error ? err.message : err);
    return {
      texto: 'No pude conectarme al CEJ en este momento. Reintentaré pronto.',
      esError: true,
    };
  }
}

// ── 7. Session flow handlers ─────────────────────────────────────────────────

/**
 * Handles multi-step SUNARP title lookup.
 * Step order: numero_titulo → anio → oficina → calls consultarTituloSUNARP.
 */
async function manejarTitulo(
  estado: EstadoSesion,
  contexto: ContextoSesion,
  texto: string,
  botUser: BotUser,
  plataforma: 'telegram' | 'whatsapp'
): Promise<BotResponse> {
  const trimmed = texto.trim();

  if (estado === 'esperando_numero_titulo') {
    updateSession(botUser.id, plataforma, 'esperando_anio_titulo', {
      ...contexto,
      numero_titulo: trimmed,
    });
    return { texto: '¿En qué *año* se presentó el título? (ej: 2024)' };
  }

  if (estado === 'esperando_anio_titulo') {
    updateSession(botUser.id, plataforma, 'esperando_oficina_titulo', {
      ...contexto,
      anio: trimmed,
    });
    return {
      texto: '¿En qué *oficina registral*? (ej: LIMA, AREQUIPA, CUSCO o código como 0101)',
    };
  }

  if (estado === 'esperando_oficina_titulo') {
    const nuevoCont = { ...contexto, oficina: trimmed.toUpperCase() };
    updateSession(botUser.id, plataforma, 'idle', {});
    return await consultarTituloYResponder(
      nuevoCont.numero_titulo ?? '',
      nuevoCont.anio ?? '',
      nuevoCont.oficina ?? ''
    );
  }

  return { texto: 'Por favor escribe el número de título.' };
}

/**
 * Handles CEJ expediente lookup.
 * Calls scrapeCEJ directly — no need to ask for district.
 */
async function manejarExpediente(
  estado: EstadoSesion,
  contexto: ContextoSesion,
  texto: string,
  botUser: BotUser,
  plataforma: 'telegram' | 'whatsapp'
): Promise<BotResponse> {
  const trimmed = texto.trim();

  if (estado === 'esperando_expediente') {
    updateSession(botUser.id, plataforma, 'idle', {});
    return await consultarExpedienteYResponder(trimmed);
  }

  // Legacy state: the user had already provided the expediente number in a prior step.
  if (estado === 'esperando_distrito') {
    updateSession(botUser.id, plataforma, 'idle', {});
    const expediente = contexto.expediente || trimmed;
    return await consultarExpedienteYResponder(expediente);
  }

  return { texto: 'Por favor escribe el número de expediente.' };
}

function manejarParte(
  estado: EstadoSesion,
  contexto: ContextoSesion,
  texto: string,
  botUser: BotUser,
  plataforma: 'telegram' | 'whatsapp'
): BotResponse {
  void contexto;
  const trimmed = texto.trim();

  if (estado === 'esperando_parte') {
    updateSession(botUser.id, plataforma, 'idle', {});
    const link = generarLinkPago(botUser.id, 'VIGENCIA_PODER', trimmed, 35.0);
    return {
      texto: `🔍 *Vigencia de Poder Notarial*\n\nNombre: *${trimmed}*\n\nCosto del servicio: *S/ 35.00*\n\nRealiza el pago aquí:\n${link}\n\nUna vez confirmado el pago, procesaremos tu consulta.`,
    };
  }

  return { texto: 'Por favor escribe el nombre completo de la persona o empresa.' };
}

function manejarPartida(
  estado: EstadoSesion,
  contexto: ContextoSesion,
  texto: string,
  botUser: BotUser,
  plataforma: 'telegram' | 'whatsapp'
): BotResponse {
  const trimmed = texto.trim();

  if (estado === 'esperando_numero_partida') {
    updateSession(botUser.id, plataforma, 'idle', {});
    const esCopia = contexto.flujo === 'COPIA_LITERAL';
    const tipo = esCopia ? 'COPIA_LITERAL' : 'PUBLICIDAD_REGISTRAL';
    const label = esCopia ? 'Copia Literal' : 'Publicidad Registral';
    const monto = esCopia ? 45.0 : 30.0;
    const link = generarLinkPago(botUser.id, tipo, trimmed, monto);
    return {
      texto: `📄 *${label}*\n\nPartida N°: *${trimmed}*\n\nCosto: *S/ ${monto.toFixed(2)}*\n\nRealiza el pago aquí:\n${link}\n\nUna vez confirmado el pago, procesaremos tu solicitud.`,
    };
  }

  return { texto: 'Por favor escribe el número de partida registral.' };
}

// ── 8. procesarMensaje ───────────────────────────────────────────────────────

export async function procesarMensaje(msg: BotMessage): Promise<BotResponse> {
  const botUser = getOrCreateUser(msg.plataforma, msg.userId, msg.nombre);
  logMessage(botUser.id, msg.plataforma, 'in', msg.texto);

  const sesion = getSession(botUser.id, msg.plataforma);
  const estado = (sesion?.estado ?? 'idle') as EstadoSesion;
  const contexto: ContextoSesion = sesion?.contexto
    ? (JSON.parse(sesion.contexto) as ContextoSesion)
    : {};

  // ── Ongoing session flows ────────────────────────────────────────────────

  if (
    estado === 'esperando_numero_titulo' ||
    estado === 'esperando_anio_titulo' ||
    estado === 'esperando_oficina_titulo'
  ) {
    const resp = await manejarTitulo(estado, contexto, msg.texto, botUser, msg.plataforma);
    logMessage(botUser.id, msg.plataforma, 'out', resp.texto);
    return resp;
  }

  if (estado === 'esperando_expediente' || estado === 'esperando_distrito') {
    const resp = await manejarExpediente(estado, contexto, msg.texto, botUser, msg.plataforma);
    logMessage(botUser.id, msg.plataforma, 'out', resp.texto);
    return resp;
  }

  if (estado === 'esperando_parte') {
    const resp = manejarParte(estado, contexto, msg.texto, botUser, msg.plataforma);
    logMessage(botUser.id, msg.plataforma, 'out', resp.texto);
    return resp;
  }

  if (estado === 'esperando_numero_partida') {
    const resp = manejarPartida(estado, contexto, msg.texto, botUser, msg.plataforma);
    logMessage(botUser.id, msg.plataforma, 'out', resp.texto);
    return resp;
  }

  // ── Intent detection ─────────────────────────────────────────────────────

  const { intencion, parametros } = await detectarIntencion(msg.texto);
  let respuesta: BotResponse;

  switch (intencion) {
    // ── Greeting ───────────────────────────────────────────────────────────
    case 'SALUDO': {
      const nombre = botUser.nombre ? `, ${botUser.nombre}` : '';
      respuesta = {
        texto: `👋 ¡Hola${nombre}! Soy *Arthur*, tu asistente legal.\n\n¿En qué puedo ayudarte hoy?`,
        opciones: [
          'Mis Títulos',
          'Mis Casos',
          'Seguimiento Título',
          'Estado Expediente',
          'Consulta Legal',
          'Ayuda',
        ],
      };
      break;
    }

    // ── Help menu ──────────────────────────────────────────────────────────
    case 'AYUDA': {
      respuesta = {
        texto: `🤖 *Arthur - Asistente Legal*\n\nPuedo ayudarte con:\n\n• 📋 *Seguimiento de títulos* SUNARP\n• ⚖️ *Estado de expedientes* judiciales\n• 🔍 *Vigencia de poderes* notariales\n• 📄 *Publicidad registral* y copias literales\n• 💬 *Consultas legales* sobre derecho registral/procesal\n• 📁 *Mis títulos* y casos registrados\n\n¿Qué deseas consultar?`,
        opciones: [
          'Seguimiento Título',
          'Estado Expediente',
          'Vigencia Poder',
          'Publicidad Registral',
          'Copia Literal',
          'Consulta Legal',
        ],
      };
      break;
    }

    // ── TASK 1 & 4 — SUNARP title tracking (reuses consultarTituloSUNARP) ──
    case 'SEGUIMIENTO_TITULO': {
      const { numero_titulo, anio, oficina } = parametros;

      if (numero_titulo && anio && oficina) {
        // All params present — call scraper immediately, no questions asked
        respuesta = await consultarTituloYResponder(numero_titulo, anio, oficina.toUpperCase());
        break;
      }

      if (numero_titulo && anio) {
        // Have numero + anio — ask only for oficina
        updateSession(botUser.id, msg.plataforma, 'esperando_oficina_titulo', { numero_titulo, anio });
        respuesta = {
          texto: `📋 ¿En qué *oficina registral* es el título *${numero_titulo}/${anio}*?\n(ej: LIMA, AREQUIPA, CUSCO o código como 0101)`,
        };
        break;
      }

      if (numero_titulo) {
        // Have numero — ask only for anio
        updateSession(botUser.id, msg.plataforma, 'esperando_anio_titulo', { numero_titulo });
        respuesta = {
          texto: `📋 ¿En qué *año* es el título *${numero_titulo}*? (ej: 2024)`,
        };
        break;
      }

      // Nothing known — start full flow
      updateSession(botUser.id, msg.plataforma, 'esperando_numero_titulo', {});
      respuesta = {
        texto: '📋 *Seguimiento de Título SUNARP*\n\n¿Cuál es el *número de título*? (ej: 12345)',
      };
      break;
    }

    // ── TASK 3 & 4 — CEJ expediente (reuses scrapeCEJ) ────────────────────
    case 'ESTADO_EXPEDIENTE': {
      const { expediente } = parametros;

      if (expediente) {
        // Expediente number present — call scraper immediately
        respuesta = await consultarExpedienteYResponder(expediente);
        break;
      }

      // Ask for expediente
      updateSession(botUser.id, msg.plataforma, 'esperando_expediente', {});
      respuesta = {
        texto: '⚖️ *Estado de Expediente Judicial*\n\n¿Cuál es el *número de expediente*?\n(ej: 00123-2024-0-1801-JR-CI-01)',
      };
      break;
    }

    // ── Vigencia de poder ──────────────────────────────────────────────────
    case 'VIGENCIA_PODER': {
      updateSession(botUser.id, msg.plataforma, 'esperando_parte', {});
      respuesta = {
        texto: '🔍 *Vigencia de Poder Notarial*\n\n¿A nombre de quién es el poder?\nEscribe el *nombre completo* de la persona o empresa.',
      };
      break;
    }

    // ── Publicidad registral ───────────────────────────────────────────────
    case 'PUBLICIDAD_REGISTRAL': {
      updateSession(botUser.id, msg.plataforma, 'esperando_numero_partida', {
        flujo: 'PUBLICIDAD_REGISTRAL',
      });
      respuesta = {
        texto: '🏛️ *Publicidad Registral*\n\n¿Cuál es el *número de partida registral*?',
      };
      break;
    }

    // ── Copia literal ──────────────────────────────────────────────────────
    case 'COPIA_LITERAL': {
      updateSession(botUser.id, msg.plataforma, 'esperando_numero_partida', {
        flujo: 'COPIA_LITERAL',
      });
      respuesta = {
        texto: '📄 *Copia Literal de Partida*\n\n¿Cuál es el *número de partida registral*?',
      };
      break;
    }

    // ── TASK 1 — Legal consultation (reuses chatWithProvider from llm-providers) ──
    case 'CONSULTA_LEGAL': {
      try {
        const msgs: ChatMsg[] = [{ role: 'user', content: msg.texto }];
        const result = await chatWithProvider(msgs, 'anthropic', SUNARP_BOT_SYSTEM);
        respuesta = { texto: result.text };
      } catch (err) {
        console.error('[bot] chatWithProvider error:', err instanceof Error ? err.message : err);
        respuesta = {
          texto: 'No pude procesar tu consulta legal en este momento. Intenta nuevamente.',
          esError: true,
        };
      }
      break;
    }

    // ── Mis títulos ────────────────────────────────────────────────────────
    case 'MIS_TITULOS': {
      const db = getDb();
      const lookup = msg.plataforma === 'whatsapp' ? msg.userId : '';
      const tramites = db
        .prepare(
          `SELECT * FROM tramites
           WHERE whatsapp_number = ? AND deleted_at IS NULL AND activo = 1
           LIMIT 5`
        )
        .all(lookup) as Array<{
          numero_titulo: string;
          anio: string;
          oficina_registral: string;
          estado_actual: string;
          alias: string;
        }>;

      if (tramites.length === 0) {
        respuesta = {
          texto: '📁 No tienes títulos registrados en el sistema.\n\nEscribe *seguimiento título* para consultar uno.',
          opciones: ['Seguimiento Título', 'Ayuda'],
        };
      } else {
        let txt = '📁 *Tus Títulos SUNARP:*\n\n';
        tramites.forEach((t, i) => {
          txt += `${i + 1}. *${t.numero_titulo}/${t.anio}* — ${t.oficina_registral}\n`;
          txt += `   Estado: ${t.estado_actual}\n`;
          if (t.alias) txt += `   ${t.alias}\n`;
          txt += '\n';
        });
        respuesta = { texto: txt };
      }
      break;
    }

    // ── Mis casos ──────────────────────────────────────────────────────────
    case 'MIS_CASOS': {
      const db = getDb();
      const lookup = msg.plataforma === 'whatsapp' ? msg.userId : '';
      const casos = db
        .prepare(
          `SELECT * FROM casos
           WHERE whatsapp_number = ? AND activo = 1
           LIMIT 5`
        )
        .all(lookup) as Array<{
          numero_expediente: string;
          tipo_proceso: string | null;
          estado: string;
          alias: string | null;
          ultimo_movimiento: string | null;
        }>;

      if (casos.length === 0) {
        respuesta = {
          texto: '📁 No tienes casos judiciales registrados en el sistema.\n\nEscribe *estado expediente* para consultar uno.',
          opciones: ['Estado Expediente', 'Ayuda'],
        };
      } else {
        let txt = '⚖️ *Tus Casos Judiciales:*\n\n';
        casos.forEach((c, i) => {
          txt += `${i + 1}. *${c.numero_expediente}*\n`;
          if (c.tipo_proceso) txt += `   ${c.tipo_proceso} — `;
          txt += `${c.estado}\n`;
          if (c.alias) txt += `   ${c.alias}\n`;
          if (c.ultimo_movimiento) txt += `   Último: ${c.ultimo_movimiento}\n`;
          txt += '\n';
        });
        respuesta = { texto: txt };
      }
      break;
    }

    // ── Fallback ───────────────────────────────────────────────────────────
    default: {
      respuesta = {
        texto: 'No entendí tu consulta. Puedo ayudarte con:\n\n• *Seguimiento de títulos* SUNARP\n• *Estado de expedientes* judiciales\n• *Vigencia de poderes*\n• *Publicidad registral*\n• *Consultas legales*\n\n¿Qué deseas?',
        opciones: ['Mis Títulos', 'Mis Casos', 'Seguimiento Título', 'Consulta Legal', 'Ayuda'],
      };
    }
  }

  logMessage(botUser.id, msg.plataforma, 'out', respuesta.texto);
  return respuesta;
}
