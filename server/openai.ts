import OpenAI from "openai";

// Lazy initialization - only create OpenAI client when actually used
// This allows the server to start even if OpenAI integration isn't configured
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    if (!process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || !process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
      throw new Error(
        'OpenAI integration is not configured. Please ensure AI_INTEGRATIONS_OPENAI_BASE_URL and AI_INTEGRATIONS_OPENAI_API_KEY are set in your deployment secrets.'
      );
    }
    
    // This is using Replit's AI Integrations service, which provides OpenAI-compatible API access without requiring your own OpenAI API key.
    // Referenced from blueprint: javascript_openai_ai_integrations
    openaiClient = new OpenAI({
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
    });
  }
  
  return openaiClient;
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export async function generateFinancialResponse(
  userMessage: string,
  conversationHistory: ChatMessage[] = []
): Promise<string> {
  if (!userMessage || userMessage.trim().length === 0) {
    throw new Error('Message cannot be empty');
  }

  if (userMessage.length > 10000) {
    throw new Error('Message is too long. Please keep messages under 10,000 characters.');
  }

  const systemPrompt = `You are a knowledgeable UK financial advisor AI assistant specializing in UK tax laws, HMRC regulations, UK accounting standards, and UK personal finance. Your role is to:

1. Provide accurate, helpful information about UK tax regulations, HMRC compliance, UK accounting principles, and UK financial planning
2. Reference UK-specific tax allowances, bands, National Insurance, VAT, Corporation Tax, Income Tax, Capital Gains Tax, and Inheritance Tax
3. Discuss UK pension schemes (including ISAs, SIPPs, workplace pensions), UK savings accounts, and UK investment vehicles
4. Explain UK financial concepts in clear, accessible language using British terminology
5. Offer general guidance while always recommending users consult UK-qualified professionals (chartered accountants, tax advisors, IFAs) for specific advice
6. Stay current with UK financial best practices, HMRC regulations, and UK tax year schedules
7. Be thorough but concise in your explanations

Important: Always provide information specific to the United Kingdom and HMRC regulations. Include appropriate disclaimers that your advice is for informational purposes only and users should consult UK-qualified professionals for their specific situations.`;

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory,
    { role: 'user', content: userMessage }
  ];

  try {
    const openai = getOpenAIClient();
    
    // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages,
      max_completion_tokens: 8192,
    });

    return response.choices[0]?.message?.content || "I apologize, but I couldn't generate a response. Please try again.";
  } catch (error: any) {
    console.error('OpenAI API Error:', error);
    
    // Provide helpful error message if integration isn't configured
    if (error.message && error.message.includes('not configured')) {
      throw error;
    }
    
    throw new Error('Failed to generate AI response. Please try again.');
  }
}

export async function generateTTSAudio(
  text: string,
  voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer' = 'nova',
  speed: number = 1.0
): Promise<Buffer> {
  if (!text || text.trim().length === 0) {
    throw new Error('Text cannot be empty');
  }

  if (text.length > 4096) {
    throw new Error('Text is too long. Please keep text under 4,096 characters.');
  }

  try {
    const openai = getOpenAIClient();
    
    const response = await openai.audio.speech.create({
      model: "tts-1",
      voice: voice,
      input: text,
      speed: speed,
    });

    // Convert response to buffer
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error: any) {
    console.error('OpenAI TTS API Error:', error);
    
    if (error.message && error.message.includes('not configured')) {
      throw error;
    }
    
    throw new Error('Failed to generate TTS audio. Please try again.');
  }
}
