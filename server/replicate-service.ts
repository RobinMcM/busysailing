import Replicate from 'replicate';
import crypto from 'crypto';
import { readFile } from 'fs/promises';
import path from 'path';

interface SadTalkerInput {
  source_image: string;  // URL or data URI
  driven_audio: string;  // URL or data URI
  enhancer?: 'gfpgan' | 'RestoreFormer';
  preprocess?: 'crop' | 'resize' | 'full';
  expression_scale?: number;
  still?: boolean;
}

interface SadTalkerOutput {
  video_url: string;
  duration: number;
  cost: number;
}

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Cache for generated videos (in-memory for now)
const videoCache = new Map<string, { url: string; timestamp: number }>();
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

function generateCacheKey(audioBuffer: ArrayBuffer, avatarType: string): string {
  // Hash audio content + avatar type for cache key
  const audioHash = crypto.createHash('md5').update(Buffer.from(audioBuffer)).digest('hex');
  return `${avatarType}_${audioHash}`;
}

async function fileToDataURI(filePath: string, mimeType: string): Promise<string> {
  const buffer = await readFile(filePath);
  const base64 = buffer.toString('base64');
  return `data:${mimeType};base64,${base64}`;
}

async function bufferToDataURI(buffer: ArrayBuffer, mimeType: string): Promise<string> {
  const base64 = Buffer.from(buffer).toString('base64');
  return `data:${mimeType};base64,${base64}`;
}

export async function generateTalkingAvatar(
  audioBuffer: ArrayBuffer,
  avatarType: 'consultant' | 'partner' = 'consultant',
  options: Partial<SadTalkerInput> = {}
): Promise<SadTalkerOutput> {
  const startTime = Date.now();

  // Check cache first
  const cacheKey = generateCacheKey(audioBuffer, avatarType);
  const cached = videoCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < CACHE_DURATION_MS)) {
    console.log('[Replicate] Using cached video for:', cacheKey.substring(0, 16));
    return {
      video_url: cached.url,
      duration: Date.now() - startTime,
      cost: 0, // Cached, no cost
    };
  }

  console.log('[Replicate] Generating talking avatar video...');
  console.log('[Replicate] Avatar type:', avatarType);
  console.log('[Replicate] Audio size:', audioBuffer.byteLength, 'bytes');

  try {
    // Convert avatar image to data URI
    const imagePath = avatarType === 'consultant'
      ? path.join(process.cwd(), 'attached_assets', 'stock_images', 'professional_busines_35704b64.jpg')
      : path.join(process.cwd(), 'attached_assets', 'stock_images', 'professional_busines_db181492.jpg');
    
    const imageDataURI = await fileToDataURI(imagePath, 'image/jpeg');
    const audioDataURI = await bufferToDataURI(audioBuffer, 'audio/mpeg');

    const input: SadTalkerInput = {
      source_image: imageDataURI,
      driven_audio: audioDataURI,
      enhancer: options.enhancer || 'gfpgan',
      preprocess: options.preprocess || 'full',
      expression_scale: options.expression_scale || 1.0,
      still: options.still !== undefined ? options.still : true,
    };

    console.log('[Replicate] Calling SadTalker API...');

    const output = await replicate.run(
      "cjwbw/sadtalker:3aa3dac9353cc4d6bd62a8f95957bd844003b401ca4e4a9b33baa574c549d376",
      { input }
    );

    // Output is a URL string
    const videoUrl = typeof output === 'string' ? output : (output as any)[0];

    if (!videoUrl) {
      throw new Error('No video URL returned from Replicate');
    }

    // Cache the result
    videoCache.set(cacheKey, {
      url: videoUrl,
      timestamp: Date.now(),
    });

    const duration = Date.now() - startTime;
    const estimatedCost = 0.096; // ~$0.10 per generation

    console.log('[Replicate] ✓ Video generated in', duration, 'ms');
    console.log('[Replicate] Video URL:', videoUrl);

    return {
      video_url: videoUrl,
      duration,
      cost: estimatedCost,
    };
  } catch (error) {
    console.error('[Replicate] Error generating video:', error);
    throw new Error(`Failed to generate talking avatar: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function clearVideoCache() {
  videoCache.clear();
  console.log('[Replicate] Video cache cleared');
}

export function getCacheStats() {
  return {
    size: videoCache.size,
    entries: Array.from(videoCache.entries()).map(([key, value]) => ({
      key: key.substring(0, 8),
      age: Date.now() - value.timestamp,
      url: value.url,
    })),
  };
}
