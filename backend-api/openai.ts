import OpenAI from "openai";

// Lazy initialization - only create OpenAI clients when actually used
// This allows the server to start even if integrations aren't configured
let chatClient: OpenAI | null = null;
let ttsClient: OpenAI | null = null;

// Chat client - supports Groq (preferred), OpenAI, or Replit AI Integrations
function getOpenAIClient(): OpenAI {
  if (!chatClient) {
    // Support Groq, OpenAI, and Replit AI Integrations
    // Priority: GROQ_API_KEY > OPENAI_API_KEY > Replit AI Integrations
    const useGroq = process.env.GROQ_API_KEY;
    const useStandardOpenAI = process.env.OPENAI_API_KEY;
    const useReplitIntegration = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL && process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
    
    if (!useGroq && !useStandardOpenAI && !useReplitIntegration) {
      throw new Error(
        'AI service is not configured. Please set either GROQ_API_KEY (for Groq), OPENAI_API_KEY (for OpenAI), or AI_INTEGRATIONS_OPENAI_BASE_URL and AI_INTEGRATIONS_OPENAI_API_KEY (for Replit AI Integrations) in your environment variables.'
      );
    }
    
    if (useGroq) {
      // Using Groq API (preferred for production - faster and cheaper)
      console.log('Using Groq API for chat');
      chatClient = new OpenAI({
        baseURL: 'https://api.groq.com/openai/v1',
        apiKey: process.env.GROQ_API_KEY
      });
    } else if (useStandardOpenAI) {
      // Using standard OpenAI API
      console.log('Using standard OpenAI API for chat');
      chatClient = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    } else {
      // Fall back to Replit's AI Integrations service
      console.log('Using Replit AI Integrations for chat');
      chatClient = new OpenAI({
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
      });
    }
  }
  
  return chatClient;
}

// TTS client - ONLY uses OpenAI (Groq doesn't support TTS)
function getTTSClient(): OpenAI {
  if (!ttsClient) {
    // TTS requires OpenAI API (Groq doesn't support audio/speech endpoint)
    // Priority: OPENAI_API_KEY > Replit AI Integrations
    const useStandardOpenAI = process.env.OPENAI_API_KEY;
    const useReplitIntegration = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL && process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
    
    if (!useStandardOpenAI && !useReplitIntegration) {
      throw new Error(
        'OpenAI TTS is not configured. Please set either OPENAI_API_KEY or AI_INTEGRATIONS_OPENAI_BASE_URL and AI_INTEGRATIONS_OPENAI_API_KEY in your environment variables. Note: Groq does not support TTS, so OPENAI_API_KEY is required for voice generation.'
      );
    }
    
    if (useStandardOpenAI) {
      console.log('Using standard OpenAI API for TTS');
      ttsClient = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    } else {
      console.log('Using Replit AI Integrations for TTS');
      ttsClient = new OpenAI({
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
      });
    }
  }
  
  return ttsClient;
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
    
    // Use Groq's Llama 3.3 70B if GROQ_API_KEY is set, otherwise use OpenAI's GPT-5
    const model = process.env.GROQ_API_KEY ? "llama-3.3-70b-versatile" : "gpt-5";
    
    const response = await openai.chat.completions.create({
      model,
      messages,
      max_completion_tokens: 8192,
    });

    return response.choices[0]?.message?.content || "I apologize, but I couldn't generate a response. Please try again.";
  } catch (error: any) {
    console.error('AI API Error:', error);
    
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
    const openai = getTTSClient();
    
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
