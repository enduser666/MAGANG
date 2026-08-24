import { GeminiProvider } from './gemini';
import { OpenAIProvider } from './openai';

import { config } from '@/backend/lib/config';

export interface AIProvider {
  generateResponse(prompt: string, systemInstruction?: string): Promise<string>;
}

export function getAIProvider(providerName?: string): AIProvider {
  const provider = providerName || config.aiProvider;
  if (provider === 'openai') {
    return new OpenAIProvider();
  }
  return new GeminiProvider();
}
