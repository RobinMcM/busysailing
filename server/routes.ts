import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateFinancialResponse, generateTTSAudio } from "./openai";
import { chatRateLimiter } from "./rateLimiter";
import { trackChatRequest, trackTTSRequest, estimateTokenCount } from "./analytics";
import { generateTalkingAvatar, getCacheStats } from "./replicate-service";
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
      const model = process.env.GROQ_API_KEY ? "llama-3.3-70b-versatile" : "gpt-4o";
      
      trackChatRequest(clientIp, inputTokens, outputTokens, model, duration).catch((err: any) => {
        console.error('Failed to track chat request:', err);
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

  // TTS endpoint
  const ttsRequestSchema = z.object({
    text: z.string().min(1).max(4096),
    voice: z.enum(['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']).default('nova'),
    speed: z.number().min(0.25).max(4.0).default(1.0),
  });

  app.post("/api/tts", async (req, res) => {
    console.log('[API] Received TTS request');
    const startTime = Date.now();
    try {
      const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
      const validatedData = ttsRequestSchema.parse(req.body);
      console.log('[API] Generating TTS audio...');
      
      const audioBuffer = await generateTTSAudio(
        validatedData.text,
        validatedData.voice,
        validatedData.speed
      );

      const duration = Date.now() - startTime;
      console.log('[API] TTS audio generated, sending to client');
      
      trackTTSRequest(clientIp, validatedData.text.length, 'tts-1', duration).catch((err: any) => {
        console.error('Failed to track TTS request:', err);
      });
      
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', audioBuffer.length);
      res.send(Buffer.from(audioBuffer));
    } catch (error: any) {
      console.error('TTS endpoint error:', error);
      
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          error: 'Invalid request format',
          success: false 
        });
      }

      // Handle TTS not available gracefully - let frontend fall back to Web Speech API
      if (error.message === 'TTS_NOT_AVAILABLE') {
        return res.status(503).json({ 
          error: 'TTS service not configured',
          message: 'OpenAI TTS is unavailable. Please use Web Speech API fallback.',
          ttsAvailable: false,
          success: false 
        });
      }

      res.status(500).json({ 
        error: error.message || 'Failed to generate audio',
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

  // Generate talking avatar video endpoint (TTS + SadTalker combined)
  const avatarRequestSchema = z.object({
    text: z.string().min(1).max(4096),
    avatarType: z.enum(['consultant', 'partner']).default('consultant'),
    voice: z.enum(['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']).default('nova'),
  });

  app.post("/api/generate-avatar", async (req, res) => {
    console.log('[API] Received avatar generation request');
    const startTime = Date.now();
    try {
      const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
      const validatedData = avatarRequestSchema.parse(req.body);
      
      console.log('[API] Step 1: Generating TTS audio...');
      const audioBuffer = await generateTTSAudio(
        validatedData.text,
        validatedData.voice,
        1.0
      );

      console.log('[API] Step 2: Generating talking avatar with Replicate...');
      const result = await generateTalkingAvatar(
        audioBuffer,
        validatedData.avatarType,
        {
          enhancer: 'gfpgan',
          preprocess: 'full',
          expression_scale: 1.0,
          still: true,
        }
      );

      const duration = Date.now() - startTime;
      console.log('[API] Avatar generated successfully in', duration, 'ms');
      
      // Track analytics
      trackTTSRequest(clientIp, validatedData.text.length, 'tts-1', duration).catch(console.error);
      
      res.json({
        videoUrl: result.video_url,
        cached: result.cost === 0,
        duration: result.duration,
        cost: result.cost,
        success: true
      });
    } catch (error: any) {
      console.error('Avatar generation error:', error);
      
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          error: 'Invalid request format',
          success: false 
        });
      }

      res.status(500).json({ 
        error: error.message || 'Failed to generate avatar video',
        success: false 
      });
    }
  });

  // Get avatar cache stats endpoint
  app.get("/api/avatar-cache-stats", async (req, res) => {
    try {
      const stats = getCacheStats();
      res.json({
        ...stats,
        success: true
      });
    } catch (error: any) {
      console.error('Cache stats error:', error);
      res.status(500).json({ 
        error: error.message || 'Failed to get cache stats',
        success: false 
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
