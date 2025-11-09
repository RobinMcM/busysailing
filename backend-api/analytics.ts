import { storage } from "./storage";
import { type InsertAnalytics } from "./schema";

export const PRICING = {
  GROQ_LLAMA_3_3_70B: {
    input: 0.00000059,
    output: 0.00000079,
  },
  OPENAI_GPT_4O: {
    input: 0.000005,
    output: 0.000015,
  },
  OPENAI_TTS_1: {
    perCharacter: 0.000015,
  },
} as const;

export function calculateChatCost(
  inputTokens: number,
  outputTokens: number,
  model: string
): number {
  if (model.includes('llama') || model.includes('groq')) {
    return (
      inputTokens * PRICING.GROQ_LLAMA_3_3_70B.input +
      outputTokens * PRICING.GROQ_LLAMA_3_3_70B.output
    );
  }
  
  return (
    inputTokens * PRICING.OPENAI_GPT_4O.input +
    outputTokens * PRICING.OPENAI_GPT_4O.output
  );
}

export function calculateTTSCost(characters: number): number {
  return characters * PRICING.OPENAI_TTS_1.perCharacter;
}

export async function trackChatRequest(
  ipAddress: string,
  inputTokens: number,
  outputTokens: number,
  model: string,
  duration: number
): Promise<void> {
  const cost = calculateChatCost(inputTokens, outputTokens, model);
  
  const record: InsertAnalytics = {
    type: 'chat',
    ipAddress,
    inputTokens,
    outputTokens,
    characters: null,
    model,
    cost: cost.toString(),
    duration,
  };

  await storage.createAnalyticsRecord(record);
}

export async function trackTTSRequest(
  ipAddress: string,
  characters: number,
  model: string,
  duration: number
): Promise<void> {
  const cost = calculateTTSCost(characters);
  
  const record: InsertAnalytics = {
    type: 'tts',
    ipAddress,
    inputTokens: null,
    outputTokens: null,
    characters,
    model,
    cost: cost.toString(),
    duration,
  };

  await storage.createAnalyticsRecord(record);
}

export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}
