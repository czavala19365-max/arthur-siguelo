import { GoogleGenerativeAI } from '@google/generative-ai';
import * as fs from 'fs';
import * as path from 'path';

// Leer .env.local manualmente
const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) process.env[match[1].trim()] = match[2].trim();
  }
}

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error('ERROR: GEMINI_API_KEY no encontrada en .env.local');
  process.exit(1);
}

console.log(`GEMINI_API_KEY: ${apiKey.slice(0, 8)}...${apiKey.slice(-4)} (${apiKey.length} chars)`);

async function listModels() {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
  );
  const data = await res.json() as { models?: Array<{ name: string; supportedGenerationMethods?: string[] }> };
  const chat = (data.models || []).filter(m =>
    m.supportedGenerationMethods?.includes('generateContent')
  );
  console.log('\nModelos disponibles para generateContent:');
  chat.forEach(m => console.log(' -', m.name));
  return chat[0]?.name?.replace('models/', '') || null;
}

async function main() {
  const availableModel = 'gemini-2.5-flash';

  if (!availableModel) {
    console.error('\nNo hay modelos disponibles para esta API key.');
    process.exit(1);
  }

  console.log(`\nUsando modelo: ${availableModel}`);

  try {
    const genAI = new GoogleGenerativeAI(apiKey!);
    const model = genAI.getGenerativeModel({ model: availableModel });

    const result = await model.generateContent('Hola, responde solo OK');
    const text = result.response.text();
    console.log('\nRespuesta:', text);
    console.log('\nGemini funciona correctamente con:', availableModel);
  } catch (error) {
    console.error('\nERROR al llamar a Gemini:');
    if (error instanceof Error) {
      console.error('  Mensaje:', error.message);
    } else {
      console.error('  Error:', JSON.stringify(error, null, 2));
    }
    process.exit(1);
  }
}

main();
