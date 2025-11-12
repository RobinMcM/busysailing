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

CRITICAL RESPONSE FORMAT:
Always structure your responses in this exact format:

**SYNOPSIS:** [Provide a brief, direct answer in 2-3 sentences that immediately answers the user's question]

---DETAILS---

[Provide additional context, examples, or detailed explanations only if necessary for understanding. Keep this section focused and relevant.]

Example:
User: "Can I claim my home office expenses?"
Response:
**SYNOPSIS:** Yes, if you work from home regularly you can claim a portion of your household costs such as heating, electricity, and internet. HMRC allows either simplified flat-rate expenses (£6/week for 25+ hours) or actual costs based on the proportion of your home used for business.

---DETAILS---

For the simplified method, you don't need receipts and can claim £6 per week if you work 25-49 hours per month at home, rising to £26 per week for 100+ hours. For actual costs, calculate the business use percentage (e.g., if your office is one room of a 5-room house = 20%) and apply this to relevant bills. You cannot claim for mortgage interest or council tax under the actual costs method. Keep records of your working pattern for HMRC.

Important: Always provide information specific to the United Kingdom and HMRC regulations. Include appropriate disclaimers that your advice is for informational purposes only and users should consult UK-qualified professionals for their specific situations.`;

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory,
    { role: 'user', content: userMessage }
  ];

  try {
    const groqApiKey = process.env.GROQ_API_KEY;
    
    if (!groqApiKey) {
      throw new Error(
        'GROQ_API_KEY is not configured. Please set it in your environment variables.'
      );
    }
    
    console.log('Using Groq API for chat');
    
    // Call Groq API directly
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages,
        max_completion_tokens: 8192,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Groq API Error:', errorData);
      throw new Error(`Groq API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || "I apologize, but I couldn't generate a response. Please try again.";
  } catch (error: any) {
    console.error('AI API Error:', error);
    
    if (error.message && error.message.includes('not configured')) {
      throw error;
    }
    
    throw new Error('Failed to generate AI response. Please try again.');
  }
}
