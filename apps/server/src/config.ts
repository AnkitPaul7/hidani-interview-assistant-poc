import dotenv from 'dotenv';
import path from 'path';

// Load .env from workspace root and local directory
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config();

export interface ServerConfig {
  port: number;
  nodeEnv: string;
  deepgramApiKey?: string;
  openaiApiKey?: string;
  groqApiKey?: string;
  deepgramModel: string;
  endpointingMs: number;
  utteranceEndMs: number;
}

export const config: ServerConfig = {
  port: Number(process.env.PORT) || 8080,
  nodeEnv: process.env.NODE_ENV || 'development',
  deepgramApiKey: process.env.DEEPGRAM_API_KEY && process.env.DEEPGRAM_API_KEY !== 'your_deepgram_api_key_here'
    ? process.env.DEEPGRAM_API_KEY
    : undefined,
  openaiApiKey: process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here'
    ? process.env.OPENAI_API_KEY
    : undefined,
  groqApiKey: process.env.GROQ_API_KEY,
  deepgramModel: process.env.DEEPGRAM_MODEL || 'nova-3',
  endpointingMs: Number(process.env.ENDPOINTING_MS) || 500,
  utteranceEndMs: Number(process.env.UTTERANCE_END_MS) || 1000,
};

export function logConfigStatus(): void {
  console.log('--------------------------------------------------');
  console.log(`[Config] Running on port: ${config.port} (${config.nodeEnv})`);
  console.log(`[Config] Deepgram STT: ${config.deepgramApiKey ? 'Configured (Live API)' : 'Not set (Mock/Simulation fallback ready)'}`);
  console.log(`[Config] OpenAI LLM:   ${config.openaiApiKey ? 'Configured (GPT-4o-mini)' : 'Not set (Mock/Simulation fallback ready)'}`);
  console.log('--------------------------------------------------');
}
