import { procesarMensaje } from '@/lib/bot-handler';

export const runtime = 'nodejs';

// ── Telegram types ────────────────────────────────────────────────────────────

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
}

interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: { id: number };
  text?: string;
}

interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

// ── Telegram API helper ──────────────────────────────────────────────────────

async function sendTelegramMessage(
  chatId: number,
  text: string,
  opciones?: string[]
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;

  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: 'Markdown',
  };

  if (opciones && opciones.length > 0) {
    const rows: Array<Array<{ text: string; callback_data: string }>> = [];
    for (let i = 0; i < opciones.length; i += 2) {
      rows.push(
        opciones.slice(i, i + 2).map((opt) => ({
          text: opt,
          callback_data: opt.toLowerCase().replace(/\s+/g, '_'),
        }))
      );
    }
    body.reply_markup = { inline_keyboard: rows };
  }

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function answerCallbackQuery(callbackQueryId: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQueryId }),
  });
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: Request): Promise<Response> {
  // Verify webhook secret
  const secret = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
  if (
    process.env.TELEGRAM_WEBHOOK_SECRET &&
    secret !== process.env.TELEGRAM_WEBHOOK_SECRET
  ) {
    return new Response('Unauthorized', { status: 401 });
  }

  let update: TelegramUpdate;
  try {
    update = (await request.json()) as TelegramUpdate;
  } catch {
    return new Response('Bad Request', { status: 400 });
  }

  // Determine the source: message or callback_query
  let chatId: number;
  let userId: string;
  let nombre: string | null;
  let texto: string;

  if (update.callback_query) {
    const cq = update.callback_query;
    chatId = cq.message?.chat.id ?? cq.from.id;
    userId = String(cq.from.id);
    nombre = [cq.from.first_name, cq.from.last_name].filter(Boolean).join(' ') || null;
    texto = cq.data ?? '';
    // Acknowledge the callback immediately
    await answerCallbackQuery(cq.id);
  } else if (update.message) {
    const message = update.message;
    chatId = message.chat.id;
    userId = message.from ? String(message.from.id) : String(chatId);
    nombre = message.from
      ? [message.from.first_name, message.from.last_name].filter(Boolean).join(' ') || null
      : null;
    texto = message.text ?? '';
  } else {
    // Unsupported update type — acknowledge silently
    return Response.json({ ok: true });
  }

  if (!texto.trim()) {
    return Response.json({ ok: true });
  }

  try {
    const respuesta = await procesarMensaje({
      plataforma: 'telegram',
      userId,
      nombre,
      texto,
    });

    await sendTelegramMessage(chatId, respuesta.texto, respuesta.opciones);
  } catch (err) {
    console.error('[Telegram webhook]', err);
    await sendTelegramMessage(
      chatId,
      '⚠️ Ocurrió un error al procesar tu consulta. Intenta nuevamente.'
    );
  }

  return Response.json({ ok: true });
}
