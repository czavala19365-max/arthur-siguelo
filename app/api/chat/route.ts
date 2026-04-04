import { chatWithProvider, listAvailableProviders, type ChatMsg, type Provider } from '@/lib/llm-providers';

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      messages: ChatMsg[];
      provider?: Provider;
    };

    const result = await chatWithProvider(body.messages, body.provider);
    return Response.json(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[API] POST /chat error inesperado:', msg);
    return Response.json(
      { error: 'Consulta Legal no disponible temporalmente. Por favor intenta más tarde.' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return Response.json({ providers: listAvailableProviders() });
}
