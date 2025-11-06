import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { chatRequestSchema } from "@shared/schema";
import { generateFinancialResponse, generateTTSAudio } from "./openai";
import { chatRateLimiter } from "./rateLimiter";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/chat", async (req, res) => {
    console.log('[API] Received chat request');
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
      console.log('[API] Request validated, calling OpenAI...');
      
      const response = await generateFinancialResponse(
        validatedData.message,
        validatedData.conversationHistory || []
      );

      console.log('[API] Got response from OpenAI, sending to client');
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
    try {
      const validatedData = ttsRequestSchema.parse(req.body);
      console.log('[API] Generating TTS audio...');
      
      const audioBuffer = await generateTTSAudio(
        validatedData.text,
        validatedData.voice,
        validatedData.speed
      );

      console.log('[API] TTS audio generated, sending to client');
      
      // Send audio as MP3
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

  const httpServer = createServer(app);

  return httpServer;
}
