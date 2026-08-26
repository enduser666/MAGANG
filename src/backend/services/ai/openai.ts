import { config } from '@/backend/lib/config';
import { AIProvider } from './provider';

export class OpenAIProvider implements AIProvider {
  async generateResponse(prompt: string, systemInstruction?: string): Promise<string> {
    console.log('OpenAI Provider stub triggered. System Instruction:', systemInstruction);
    
    // Simulate a simple OpenAI API call structure
    try {
      const apiKey = config.openaiApiKey;
      if (!apiKey) {
        return 'Mock Response: OpenAI Provider is configured as stub. Please define OPENAI_API_KEY inside environment configuration to use live OpenAI.';
      }
      
      // Future actual implementation would call:
      // const response = await fetch('https://api.openai.com/v1/chat/completions', { ... });
      
      return `Respon simulasi dari OpenAI untuk prompt Anda: "${prompt.substring(0, 50)}..."`;
    } catch (e: any) {
      return `OpenAI Provider Error: ${e.message}`;
    }
  }
}
