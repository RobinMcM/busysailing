import { useState, useCallback } from 'react';

// Wav2Lip service URL - defaults to localhost for development
// Set VITE_WAV2LIP_SERVICE_URL environment variable for production deployment
const WAV2LIP_SERVICE_URL = import.meta.env.VITE_WAV2LIP_SERVICE_URL || '/api/wav2lip';

export interface Wav2LipOptions {
  voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  speed?: number;
}

interface GenerateVideoParams {
  text: string;
  avatarImage: string;
  options?: Wav2LipOptions;
}

export function useWav2Lip() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateLipSyncVideo = useCallback(async ({
    text,
    avatarImage,
    options = {}
  }: GenerateVideoParams): Promise<string | null> => {
    setIsGenerating(true);
    setError(null);

    try {
      // Step 1: Generate audio using OpenAI TTS
      console.log('[Wav2Lip] Generating audio with OpenAI TTS...');
      const ttsResponse = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voice: options.voice || 'nova', // Default to Nova (female voice)
          speed: options.speed || 1.0,
        }),
      });

      if (!ttsResponse.ok) {
        throw new Error(`TTS generation failed: ${ttsResponse.statusText}`);
      }

      const audioBlob = await ttsResponse.blob();
      console.log('[Wav2Lip] Audio generated, size:', audioBlob.size);

      // Step 2: Convert audio blob to base64
      const audioBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          // Remove data URL prefix (data:audio/mpeg;base64,)
          const base64Data = base64.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
      });

      // Step 3: Load avatar image and convert to base64
      console.log('[Wav2Lip] Loading avatar image...');
      const imageBase64 = await new Promise<string>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }
          ctx.drawImage(img, 0, 0);
          const base64 = canvas.toDataURL('image/png');
          // Remove data URL prefix
          const base64Data = base64.split(',')[1];
          resolve(base64Data);
        };
        img.onerror = () => reject(new Error('Failed to load avatar image'));
        img.src = avatarImage;
      });

      // Step 4: Call Wav2Lip API
      console.log(`[Wav2Lip] Calling Wav2Lip API at ${WAV2LIP_SERVICE_URL}...`);
      const wav2lipResponse = await fetch(`${WAV2LIP_SERVICE_URL}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: imageBase64,
          audio: audioBase64,
          fps: 25,
        }),
      });

      if (!wav2lipResponse.ok) {
        const errorData = await wav2lipResponse.json().catch(() => ({}));
        throw new Error(errorData.error || `Wav2Lip generation failed: ${wav2lipResponse.statusText}`);
      }

      const result = await wav2lipResponse.json();
      if (!result.success || !result.video) {
        throw new Error('Wav2Lip API returned unsuccessful response');
      }

      console.log('[Wav2Lip] Video generated successfully');
      
      // Step 5: Return video data URL (already includes data:video/mp4;base64, prefix from server)
      return result.video;

    } catch (err: any) {
      console.error('[Wav2Lip] Error:', err);
      setError(err.message || 'Failed to generate lip-sync video');
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  return {
    generateLipSyncVideo,
    isGenerating,
    error,
  };
}
