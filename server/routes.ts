import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateFinancialResponse } from "./chat";
import { chatRateLimiter } from "./rateLimiter";
import { trackChatRequest, estimateTokenCount } from "./analytics";
import { z } from "zod";

const chatRequestSchema = z.object({
  message: z.string().min(1).max(4000),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string()
  })).optional()
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Password verification endpoint
  app.post("/api/verify-password", async (req, res) => {
    console.log('[API] Received password verification request');
    try {
      const { password } = req.body;
      const CHAT_PASSWORD = process.env.CHAT_PASSWORD || "MKS2005";
      
      if (password === CHAT_PASSWORD) {
        res.json({ 
          success: true,
          verified: true 
        });
      } else {
        res.json({ 
          success: true,
          verified: false 
        });
      }
    } catch (error: any) {
      console.error('Password verification error:', error);
      res.status(500).json({ 
        error: error.message || 'Failed to verify password',
        success: false 
      });
    }
  });

  // Chat endpoint
  app.post("/api/chat", async (req, res) => {
    console.log('[API] Received chat request');
    const startTime = Date.now();
    try {
      const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
      const rateLimitResult = chatRateLimiter.checkLimit(clientIp);
      
      if (!rateLimitResult.allowed) {
        console.log('[API] Rate limit exceeded for', clientIp);
        const resetDate = new Date(rateLimitResult.resetTime!);
        return res.status(429).json({
          error: `Rate limit exceeded. Please try again after ${resetDate.toLocaleTimeString()}.`,
          success: false,
          retryAfter: rateLimitResult.resetTime
        });
      }

      const validatedData = chatRequestSchema.parse(req.body);
      console.log('[API] Request validated, calling AI...');
      
      const response = await generateFinancialResponse(
        validatedData.message,
        validatedData.conversationHistory || []
      );

      const duration = Date.now() - startTime;
      console.log('[API] Got response from AI, sending to client');
      
      const inputTokens = estimateTokenCount(validatedData.message);
      const outputTokens = estimateTokenCount(response);
      const model = "llama-3.3-70b-versatile";
      
      trackChatRequest(clientIp, inputTokens, outputTokens, model, duration).catch((err: any) => {
        console.error('Failed to track chat request:', err);
      });
      
      // Save conversation to database
      storage.saveConversation({
        userQuestion: validatedData.message,
        aiResponse: response,
        ipAddress: clientIp
      }).catch((err: any) => {
        console.error('Failed to save conversation:', err);
      });
      
      res.json({ 
        message: response,
        success: true 
      });
    } catch (error: any) {
      console.error('Chat endpoint error:', error);
      
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          error: 'Invalid request format',
          success: false 
        });
      }

      res.status(500).json({ 
        error: error.message || 'Failed to process your request',
        success: false 
      });
    }
  });

  // AvatarTalk.ai endpoint for talking avatar videos
  const avatarTalkRequestSchema = z.object({
    text: z.string().min(1).max(2000),
    avatar: z.enum(['european_woman', 'old_european_woman']),
    emotion: z.enum(['happy', 'neutral', 'angry']).default('neutral'),
    language: z.string().default('en')
  });

  app.post("/api/avatartalk", async (req, res) => {
    console.log('[API] Received AvatarTalk video generation request');
    const startTime = Date.now();
    try {
      const validatedData = avatarTalkRequestSchema.parse(req.body);
      const apiKey = process.env.AVATARTALK_API_KEY;
      
      if (!apiKey) {
        console.error('[API] AVATARTALK_API_KEY not configured');
        return res.status(500).json({
          error: 'AvatarTalk API key not configured',
          success: false
        });
      }

      console.log(`[API] Generating avatar video: ${validatedData.avatar}, ${validatedData.text.substring(0, 50)}...`);
      
      // Call AvatarTalk.ai API
      const response = await fetch('https://api.avatartalk.ai/inference', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: validatedData.text,
          avatar: validatedData.avatar,
          emotion: validatedData.emotion,
          language: validatedData.language
        }),
        signal: AbortSignal.timeout(60000) // 60 second timeout
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error('[API] AvatarTalk API error:', response.status, errorText);
        return res.status(response.status).json({
          error: `AvatarTalk API error: ${response.status}`,
          details: errorText,
          success: false
        });
      }

      // AvatarTalk returns video data directly
      const contentType = response.headers.get('content-type');
      const videoBuffer = await response.arrayBuffer();
      const duration = Date.now() - startTime;
      
      console.log(`[API] Avatar video generated successfully in ${duration}ms`);
      console.log(`[API] Video size: ${videoBuffer.byteLength} bytes, Content-Type: ${contentType}`);
      
      // Check if we actually got video data
      if (videoBuffer.byteLength === 0) {
        console.error('[API] Received empty video buffer from AvatarTalk');
        return res.status(500).json({
          error: 'Received empty video from AvatarTalk API',
          success: false
        });
      }
      
      // Return video with correct content type from AvatarTalk
      res.setHeader('Content-Type', contentType || 'video/mp4');
      res.setHeader('Content-Length', videoBuffer.byteLength);
      res.setHeader('Accept-Ranges', 'bytes');
      res.send(Buffer.from(videoBuffer));
    } catch (error: any) {
      console.error('[API] AvatarTalk endpoint error:', error);
      
      if (error.name === 'ZodError') {
        return res.status(400).json({
          error: 'Invalid request format',
          success: false
        });
      }

      if (error.name === 'AbortError') {
        return res.status(504).json({
          error: 'Video generation timed out',
          success: false
        });
      }

      res.status(500).json({
        error: error.message || 'Failed to generate avatar video',
        success: false
      });
    }
  });

  // Admin verification endpoint
  const adminPasswordSchema = z.object({
    password: z.string().min(1),
  });

  app.post("/api/admin/verify", async (req, res) => {
    console.log('[API] Received admin verification request');
    try {
      const validatedData = adminPasswordSchema.parse(req.body);
      const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "MKS2005";
      
      if (validatedData.password === ADMIN_PASSWORD) {
        res.json({ 
          success: true,
          verified: true 
        });
      } else {
        res.json({ 
          success: true,
          verified: false 
        });
      }
    } catch (error: any) {
      console.error('Admin verification error:', error);
      
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          error: 'Invalid request format',
          success: false 
        });
      }

      res.status(500).json({ 
        error: error.message || 'Failed to verify admin password',
        success: false 
      });
    }
  });

  // Wav2Lip proxy endpoint
  app.post("/api/wav2lip/generate", async (req, res) => {
    console.log('[API] Received Wav2Lip video generation request');
    try {
      // Get Wav2Lip service URL from environment or default to local Docker service
      const WAV2LIP_SERVICE_URL = process.env.WAV2LIP_SERVICE_URL || 'http://localhost:5001';
      
      // Forward request to Flask service
      const response = await fetch(`${WAV2LIP_SERVICE_URL}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(req.body),
        signal: AbortSignal.timeout(120000) // 2 minute timeout for video generation
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('[API] Wav2Lip service error:', errorData);
        return res.status(response.status).json({
          error: errorData.error || 'Wav2Lip service error',
          details: errorData.details,
          success: false
        });
      }

      const data = await response.json();
      console.log('[API] Wav2Lip video generated successfully');
      res.json({
        ...data,
        success: true
      });

    } catch (error: any) {
      console.error('[API] Wav2Lip proxy error:', error);
      
      if (error.name === 'AbortError') {
        return res.status(504).json({
          error: 'Video generation timeout',
          details: 'Request exceeded 2 minute limit',
          success: false
        });
      }

      res.status(500).json({
        error: 'Failed to generate video',
        details: error.message,
        success: false
      });
    }
  });

  // Wav2Lip health check proxy
  app.get("/api/wav2lip/health", async (req, res) => {
    try {
      const WAV2LIP_SERVICE_URL = process.env.WAV2LIP_SERVICE_URL || 'http://localhost:5001';
      
      const response = await fetch(`${WAV2LIP_SERVICE_URL}/health`, {
        signal: AbortSignal.timeout(5000)
      });

      const data = await response.json();
      res.status(response.status).json(data);

    } catch (error: any) {
      res.status(503).json({
        status: 'unavailable',
        models_available: false,
        error: error.message
      });
    }
  });

  // Analytics endpoint
  app.get("/api/analytics", async (req, res) => {
    console.log('[API] Received analytics request');
    try {
      const period = req.query.period as string || 'today';
      
      let startDate: Date;
      const endDate = new Date();
      
      switch (period) {
        case 'today':
          startDate = new Date();
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate = new Date();
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case 'all':
          startDate = new Date(0);
          break;
        default:
          startDate = new Date();
          startDate.setHours(0, 0, 0, 0);
      }
      
      const summary = await storage.getAnalyticsSummary(startDate, endDate);
      const records = await storage.getAllAnalytics(startDate, endDate);
      
      res.json({
        summary,
        records,
        success: true
      });
    } catch (error: any) {
      console.error('Analytics endpoint error:', error);
      res.status(500).json({ 
        error: error.message || 'Failed to fetch analytics',
        success: false 
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
