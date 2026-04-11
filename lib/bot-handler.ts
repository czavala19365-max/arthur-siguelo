import Anthropic from '@anthropic-ai/sdk';
import getDb from './db';

const anthropic = new Anthropic();
const MODEL = 'claude-sonnet-4-20250514';

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
  | 'esperando_distrito'
  | 'esperando_parte'
  | 'esperando_numero_partida';

interface ContextoSesion {
  flujo?: string;
  numero_titulo?: string;
  anio?: string;
  oficina?: string;
  expediente?: string;
  distrito?: string;
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
- AYUDA: pide ayuda o información sobre el servicio
- SALUDO: saludo o presentación
- OTRO: cualquier otro mensaje

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
      .prepare(
        `INSERT INTO bot_users (${field}, nombre) VALUES (?, ?)`
      )
      .run(userId, nombre);
    user = db
      .prepare('SELECT * FROM bot_users WHERE id = ?')
      .get(result.lastInsertRowid) as BotUser;
  } else if (nombre && !user.nombre) {
    db.prepare('UPDATE bot_users SET nombre = ? WHERE id = ?').run(nombre, user.id);
    user = db
      .prepare('SELECT * FROM bot_users WHERE id = ?')
      .get(user.id) as BotUser;
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
      `INSERT INTO bot_sesiones (bot_user_id, plataforma, estado, contexto)
       VALUES (?, ?, ?, ?)`
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
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL || 'https://arthur-siguelo.vercel.app';

  const result = db
    .prepare(
      `INSERT INTO bot_pagos (bot_user_id, tipo, referencia, monto_soles, estado)
       VALUES (?, ?, ?, ?, 'pendiente')`
    )
    .run(botUserId, tipo, referencia, montoSoles);

  const pagoId = result.lastInsertRowid as number;
  const paymentLink = `${appUrl}/pagar/${pagoId}?ref=${encodeURIComponent(referencia)}&monto=${montoSoles}`;

  db.prepare('UPDATE bot_pagos SET payment_link = ? WHERE id = ?').run(
    paymentLink,
    pagoId
  );

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
      `INSERT INTO bot_mensajes (bot_user_id, plataforma, direccion, contenido)
       VALUES (?, ?, ?, ?)`
    )
    .run(botUserId, plataforma, direccion, contenido);
}

// ── 6. Session flow handlers ─────────────────────────────────────────────────

function manejarTitulo(
  estado: EstadoSesion,
  contexto: ContextoSesion,
  texto: string,
  botUser: BotUser,
  plataforma: 'telegram' | 'whatsapp'
): BotResponse {
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
      texto: '¿En qué *oficina registral*? (ej: LIMA, AREQUIPA, CUSCO)',
    };
  }

  if (estado === 'esperando_oficina_titulo') {
    const nuevoCont = { ...contexto, oficina: trimmed.toUpperCase() };
    updateSession(botUser.id, plataforma, 'idle', {});

    const db = getDb();
    const titulo = db
      .prepare(
        `SELECT * FROM tramites
         WHERE numero_titulo = ? AND anio = ? AND oficina_registral = ?
         AND deleted_at IS NULL LIMIT 1`
      )
      .get(
        nuevoCont.numero_titulo,
        nuevoCont.anio,
        nuevoCont.oficina
      ) as {
        estado_actual: string;
        alias: string;
        observacion_texto: string | null;
        last_checked: string | null;
      } | undefined;

    if (titulo) {
      let msg = `📋 *Título ${nuevoCont.numero_titulo ?? ''}/${nuevoCont.anio ?? ''}*\n`;
      msg += `Oficina: ${nuevoCont.oficina ?? ''}\n`;
      msg += `Estado: *${titulo.estado_actual}*\n`;
      if (titulo.observacion_texto) msg += `Observación: ${titulo.observacion_texto}\n`;
      if (titulo.last_checked) msg += `\n_Última consulta: ${titulo.last_checked}_`;
      return { texto: msg };
    }

    return {
      texto: `No encontré el título *${nuevoCont.numero_titulo ?? ''}/${nuevoCont.anio ?? ''}* en la oficina *${nuevoCont.oficina ?? ''}*.\n\nIntenta de nuevo o escribe *ayuda*.`,
    };
  }

  return { texto: 'Por favor escribe el número de título.' };
}

function manejarExpediente(
  estado: EstadoSesion,
  contexto: ContextoSesion,
  texto: string,
  botUser: BotUser,
  plataforma: 'telegram' | 'whatsapp'
): BotResponse {
  const trimmed = texto.trim();

  if (estado === 'esperando_expediente') {
    updateSession(botUser.id, plataforma, 'esperando_distrito', {
      ...contexto,
      expediente: trimmed,
    });
    return {
      texto: '¿En qué *distrito judicial*? (ej: LIMA, LIMA NORTE, CALLAO)',
    };
  }

  if (estado === 'esperando_distrito') {
    const nuevoCont = { ...contexto, distrito: trimmed.toUpperCase() };
    updateSession(botUser.id, plataforma, 'idle', {});

    const db = getDb();
    const caso = db
      .prepare(
        `SELECT * FROM casos
         WHERE numero_expediente = ? AND distrito_judicial = ?
         AND activo = 1 LIMIT 1`
      )
      .get(
        nuevoCont.expediente,
        nuevoCont.distrito
      ) as {
        estado: string;
        tipo_proceso: string | null;
        ultimo_movimiento: string | null;
        ultimo_movimiento_fecha: string | null;
        proximo_evento: string | null;
        proximo_evento_fecha: string | null;
      } | undefined;

    if (caso) {
      let msg = `⚖️ *Expediente ${nuevoCont.expediente ?? ''}*\n`;
      msg += `Distrito: ${nuevoCont.distrito ?? ''}\n`;
      if (caso.tipo_proceso) msg += `Proceso: ${caso.tipo_proceso}\n`;
      msg += `Estado: *${caso.estado}*\n`;
      if (caso.ultimo_movimiento) {
        msg += `Último movimiento: ${caso.ultimo_movimiento}`;
        if (caso.ultimo_movimiento_fecha)
          msg += ` _(${caso.ultimo_movimiento_fecha})_`;
        msg += '\n';
      }
      if (caso.proximo_evento) {
        msg += `Próximo evento: ${caso.proximo_evento}`;
        if (caso.proximo_evento_fecha) msg += ` - ${caso.proximo_evento_fecha}`;
      }
      return { texto: msg };
    }

    return {
      texto: `No encontré el expediente *${nuevoCont.expediente ?? ''}* en el distrito *${nuevoCont.distrito ?? ''}*.\n\nEscribe *mis casos* o *ayuda*.`,
    };
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
      texto: `🔍 *Vigencia de Poder Notarial*\n\nNombre: *${trimmed}*\n\nCosto del servicio: *S/ 35.00*\n\nRealiza el pago aquí:\n${link}\n\nUna vez confirmado, procesaremos tu consulta.`,
    };
  }

  return {
    texto: 'Por favor escribe el nombre completo de la persona o empresa.',
  };
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
      texto: `📄 *${label}*\n\nPartida N°: *${trimmed}*\n\nCosto: *S/ ${monto.toFixed(2)}*\n\nRealiza el pago aquí:\n${link}\n\nUna vez confirmado, procesaremos tu solicitud.`,
    };
  }

  return { texto: 'Por favor escribe el número de partida registral.' };
}

// ── 7. procesarMensaje ───────────────────────────────────────────────────────

export async function procesarMensaje(msg: BotMessage): Promise<BotResponse> {
  const botUser = getOrCreateUser(msg.plataforma, msg.userId, msg.nombre);
  logMessage(botUser.id, msg.plataforma, 'in', msg.texto);

  const sesion = getSession(botUser.id, msg.plataforma);
  const estado = (sesion?.estado ?? 'idle') as EstadoSesion;
  const contexto: ContextoSesion = sesion?.contexto
    ? (JSON.parse(sesion.contexto) as ContextoSesion)
    : {};

  // Ongoing flow dispatch
  if (
    estado === 'esperando_numero_titulo' ||
    estado === 'esperando_anio_titulo' ||
    estado === 'esperando_oficina_titulo'
  ) {
    const resp = manejarTitulo(estado, contexto, msg.texto, botUser, msg.plataforma);
    logMessage(botUser.id, msg.plataforma, 'out', resp.texto);
    return resp;
  }

  if (estado === 'esperando_expediente' || estado === 'esperando_distrito') {
    const resp = manejarExpediente(estado, contexto, msg.texto, botUser, msg.plataforma);
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

  // Detect intent
  const { intencion, parametros } = await detectarIntencion(msg.texto);
  let respuesta: BotResponse;

  switch (intencion) {
    case 'SALUDO': {
      const nombre = botUser.nombre ? `, ${botUser.nombre}` : '';
      respuesta = {
        texto: `👋 ¡Hola${nombre}! Soy *Arthur*, tu asistente legal.\n\n¿En qué puedo ayudarte?`,
        opciones: [
          'Mis Títulos',
          'Mis Casos',
          'Seguimiento Título',
          'Estado Expediente',
          'Ayuda',
        ],
      };
      break;
    }

    case 'AYUDA': {
      respuesta = {
        texto: `🤖 *Arthur - Asistente Legal*\n\nPuedo ayudarte con:\n\n• 📋 *Seguimiento de títulos* SUNARP\n• ⚖️ *Estado de expedientes* judiciales\n• 🔍 *Vigencia de poderes* notariales\n• 📄 *Publicidad registral* y copias literales\n• 📁 *Mis títulos* y *mis casos* registrados\n\n¿Qué deseas consultar?`,
        opciones: [
          'Seguimiento Título',
          'Estado Expediente',
          'Vigencia Poder',
          'Publicidad Registral',
          'Copia Literal',
          'Mis Títulos',
        ],
      };
      break;
    }

    case 'SEGUIMIENTO_TITULO': {
      if (parametros.numero_titulo && parametros.anio && parametros.oficina) {
        const db = getDb();
        const titulo = db
          .prepare(
            `SELECT * FROM tramites
             WHERE numero_titulo = ? AND anio = ? AND oficina_registral = ?
             AND deleted_at IS NULL LIMIT 1`
          )
          .get(
            parametros.numero_titulo,
            parametros.anio,
            parametros.oficina.toUpperCase()
          ) as {
            estado_actual: string;
            observacion_texto: string | null;
            last_checked: string | null;
          } | undefined;

        if (titulo) {
          let txt = `📋 *Título ${parametros.numero_titulo}/${parametros.anio}*\n`;
          txt += `Oficina: ${parametros.oficina.toUpperCase()}\n`;
          txt += `Estado: *${titulo.estado_actual}*\n`;
          if (titulo.observacion_texto)
            txt += `Observación: ${titulo.observacion_texto}\n`;
          if (titulo.last_checked)
            txt += `_Última consulta: ${titulo.last_checked}_`;
          respuesta = { texto: txt };
          break;
        }
      }
      updateSession(botUser.id, msg.plataforma, 'esperando_numero_titulo', {});
      respuesta = {
        texto: '📋 *Seguimiento de Título SUNARP*\n\n¿Cuál es el *número de título*? (ej: 12345)',
      };
      break;
    }

    case 'ESTADO_EXPEDIENTE': {
      if (parametros.expediente && parametros.distrito) {
        const db = getDb();
        const caso = db
          .prepare(
            `SELECT * FROM casos
             WHERE numero_expediente = ? AND distrito_judicial = ?
             AND activo = 1 LIMIT 1`
          )
          .get(
            parametros.expediente,
            parametros.distrito.toUpperCase()
          ) as {
            estado: string;
            tipo_proceso: string | null;
            ultimo_movimiento: string | null;
          } | undefined;

        if (caso) {
          let txt = `⚖️ *Expediente ${parametros.expediente}*\n`;
          if (caso.tipo_proceso) txt += `Proceso: ${caso.tipo_proceso}\n`;
          txt += `Estado: *${caso.estado}*\n`;
          if (caso.ultimo_movimiento)
            txt += `Último movimiento: ${caso.ultimo_movimiento}`;
          respuesta = { texto: txt };
          break;
        }
      }
      updateSession(botUser.id, msg.plataforma, 'esperando_expediente', {});
      respuesta = {
        texto: '⚖️ *Estado de Expediente Judicial*\n\n¿Cuál es el *número de expediente*?',
      };
      break;
    }

    case 'VIGENCIA_PODER': {
      updateSession(botUser.id, msg.plataforma, 'esperando_parte', {});
      respuesta = {
        texto: '🔍 *Vigencia de Poder Notarial*\n\n¿A nombre de quién es el poder?\nEscribe el *nombre completo* de la persona o empresa.',
      };
      break;
    }

    case 'PUBLICIDAD_REGISTRAL': {
      updateSession(botUser.id, msg.plataforma, 'esperando_numero_partida', {
        flujo: 'PUBLICIDAD_REGISTRAL',
      });
      respuesta = {
        texto: '🏛️ *Publicidad Registral*\n\n¿Cuál es el *número de partida registral*?',
      };
      break;
    }

    case 'COPIA_LITERAL': {
      updateSession(botUser.id, msg.plataforma, 'esperando_numero_partida', {
        flujo: 'COPIA_LITERAL',
      });
      respuesta = {
        texto: '📄 *Copia Literal de Partida*\n\n¿Cuál es el *número de partida registral*?',
      };
      break;
    }

    case 'MIS_TITULOS': {
      const db = getDb();
      const lookup =
        msg.plataforma === 'whatsapp' ? msg.userId : (botUser.nombre ?? '');
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

    case 'MIS_CASOS': {
      const db = getDb();
      const lookup =
        msg.plataforma === 'whatsapp' ? msg.userId : (botUser.nombre ?? '');
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
          if (c.ultimo_movimiento)
            txt += `   Último: ${c.ultimo_movimiento}\n`;
          txt += '\n';
        });
        respuesta = { texto: txt };
      }
      break;
    }

    default: {
      respuesta = {
        texto: 'No entendí tu consulta. Puedo ayudarte con:\n\n• *Seguimiento de títulos* SUNARP\n• *Estado de expedientes* judiciales\n• *Vigencia de poderes*\n• *Publicidad registral*\n\n¿Qué deseas consultar?',
        opciones: ['Mis Títulos', 'Mis Casos', 'Seguimiento Título', 'Ayuda'],
      };
    }
  }

  logMessage(botUser.id, msg.plataforma, 'out', respuesta.texto);
  return respuesta;
}
