import twilio from 'twilio';
import { procesarMensaje } from '@/lib/bot-handler';
import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';

// ── Twilio client (lazy) ──────────────────────────────────────────────────────

function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) {
    throw new Error('TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be set');
  }
  return twilio(accountSid, authToken);
}

// ── GET — Twilio webhook verification ────────────────────────────────────────

export async function GET(request: NextRequest): Promise<Response> {
  // Twilio may perform a HEAD/GET request when you save the webhook URL.
  // We simply return 200 so it can confirm the endpoint is reachable.
  const url = new URL(request.url);
  const challenge = url.searchParams.get('hub.challenge');
  if (challenge) {
    return new Response(challenge, { status: 200 });
  }
  return new Response('OK', { status: 200 });
}

// ── POST — Incoming WhatsApp message ─────────────────────────────────────────

export async function POST(request: Request): Promise<Response> {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return new Response('Bad Request', { status: 400 });
  }

  // Twilio sends: From (whatsapp:+51999...), Body, ProfileName
  const from = (formData.get('From') as string | null) ?? '';
  const body = (formData.get('Body') as string | null) ?? '';
  const profileName = (formData.get('ProfileName') as string | null) ?? null;

  if (!from || !body.trim()) {
    return new Response('OK', { status: 200 });
  }

  // Strip "whatsapp:" prefix for userId storage, keep it for sending
  const userId = from.replace(/^whatsapp:/i, '');

  try {
    const respuesta = await procesarMensaje({
      plataforma: 'whatsapp',
      userId,
      nombre: profileName,
      texto: body,
    });

    const client = getTwilioClient();
    const twilioNumber = process.env.TWILIO_WHATSAPP_NUMBER ?? '';

    // Send the main text response
    await client.messages.create({
      from: `whatsapp:${twilioNumber}`,
      to: from,
      body: respuesta.texto,
    });

    // If there are quick-reply options, append them as a numbered list
    if (respuesta.opciones && respuesta.opciones.length > 0) {
      const opcionesTxt = respuesta.opciones
        .map((opt, i) => `${i + 1}. ${opt}`)
        .join('\n');
      await client.messages.create({
        from: `whatsapp:${twilioNumber}`,
        to: from,
        body: `Opciones:\n${opcionesTxt}`,
      });
    }
  } catch (err) {
    console.error('[WhatsApp webhook]', err);
    // Attempt to send error message back
    try {
      const client = getTwilioClient();
      await client.messages.create({
        from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER ?? ''}`,
        to: from,
        body: '⚠️ Ocurrió un error al procesar tu consulta. Intenta nuevamente.',
      });
    } catch {
      // Suppress secondary error
    }
  }

  return new Response('OK', { status: 200 });
}
