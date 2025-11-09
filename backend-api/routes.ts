import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { chatRequestSchema } from "./schema";
import { generateFinancialResponse, generateTTSAudio } from "./openai";
import { chatRateLimiter } from "./rateLimiter";
import { trackChatRequest, trackTTSRequest, estimateTokenCount } from "./analytics";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
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

  // TTS endpoint for generating audio
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

      res.status(500).json({ 
        error: error.message || 'Failed to generate audio',
        success: false 
      });
    }
  });

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
