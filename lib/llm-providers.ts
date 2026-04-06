import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

export type Provider = 'anthropic' | 'openai' | 'gemini';

export interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
}

interface ProviderResponse {
  text: string;
  provider: Provider;
}

const SYSTEM_PROMPT = `Eres Arthur, un asistente legal IA especializado en derecho peruano, con énfasis en:
- Derecho registral y trámites SUNARP
- Jurisprudencia del Tribunal Registral y Tribunal Constitucional
- Código Civil, Ley de Procedimiento Administrativo General, Reglamento General de los Registros Públicos
- Búsqueda y análisis de leyes, decretos y resoluciones peruanas

REGLAS:
1. Responde siempre en español
2. Cita artículos, leyes y resoluciones específicas cuando sea posible
3. Si no estás seguro de una norma exacta, indícalo claramente
4. Incluye siempre un disclaimer al final: "⚠ Esta información es orientativa. Consulta con un abogado colegiado antes de actuar."
5. Sé conciso pero completo
6. Si te piden jurisprudencia, menciona número de resolución, fecha y sumilla cuando los conozcas
7. Estructura tus respuestas con secciones claras cuando sean extensas`;

async function callAnthropic(messages: ChatMsg[], sysPrompt: string): Promise<string> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    system: sysPrompt,
    messages: messages.map(m => ({ role: m.role, content: m.content })),
  });
  const block = response.content[0];
  return block.type === 'text' ? block.text : '';
}

async function callOpenAI(messages: ChatMsg[], sysPrompt: string): Promise<string> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 2000,
    messages: [
      { role: 'system', content: sysPrompt },
      ...messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    ],
  });
  return response.choices[0]?.message?.content || '';
}

async function callGemini(messages: ChatMsg[], sysPrompt: string): Promise<string> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: sysPrompt,
  });
  const history = messages.slice(0, -1).map(m => ({
    role: m.role === 'assistant' ? 'model' as const : 'user' as const,
    parts: [{ text: m.content }],
  }));
  const chat = model.startChat({ history });
  const lastMsg = messages[messages.length - 1];
  const result = await chat.sendMessage(lastMsg.content);
  return result.response.text();
}

function getAvailableProviders(): Provider[] {
  const available: Provider[] = [];
  if (process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'placeholder') available.push('anthropic');
  if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'placeholder') available.push('openai');
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'placeholder') available.push('gemini');
  return available;
}

export function listAvailableProviders(): Provider[] {
  return getAvailableProviders();
}

export async function chatWithProvider(
  messages: ChatMsg[],
  preferredProvider?: Provider,
  systemPrompt?: string,
): Promise<ProviderResponse> {
  const available = getAvailableProviders();
  const sysPrompt = systemPrompt ?? SYSTEM_PROMPT;

  if (available.length === 0) {
    console.error('[LLM] No hay proveedores configurados. Define ANTHROPIC_API_KEY, GEMINI_API_KEY u OPENAI_API_KEY en las variables de entorno.');
    return {
      text: 'Consulta Legal no disponible temporalmente. Por favor intenta más tarde.',
      provider: 'gemini',
    };
  }

  // Preferred provider va primero; el resto en orden de disponibilidad
  const ordered: Provider[] = preferredProvider && available.includes(preferredProvider)
    ? [preferredProvider, ...available.filter(p => p !== preferredProvider)]
    : available;

  const callers: Record<Provider, (msgs: ChatMsg[], sys: string) => Promise<string>> = {
    anthropic: callAnthropic,
    openai: callOpenAI,
    gemini: callGemini,
  };

  const errors: string[] = [];

  for (const provider of ordered) {
    try {
      const text = await callers[provider](messages, sysPrompt);
      if (provider !== ordered[0]) {
        console.warn(`[LLM] Usando proveedor de respaldo: ${provider}`);
      }
      return { text, provider };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`[LLM] Proveedor "${provider}" falló: ${msg}`);
      errors.push(`${provider}: ${msg}`);
    }
  }

  console.error(`[LLM] Todos los proveedores fallaron. Detalle: ${errors.join(' | ')}`);
  return {
    text: 'Consulta Legal no disponible temporalmente. Por favor intenta más tarde.',
    provider: available[0],
  };
}
