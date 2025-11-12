import { useState } from 'react';

export type AvatarType = 'european_woman' | 'old_european_woman';
export type EmotionType = 'happy' | 'neutral' | 'angry';

interface UseAvatarTalkReturn {
  generateVideo: (text: string, avatar: AvatarType, emotion?: EmotionType) => Promise<string>;
  isGenerating: boolean;
  error: string | null;
}

export function useAvatarTalk(): UseAvatarTalkReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateVideo = async (
    text: string,
    avatar: AvatarType,
    emotion: EmotionType = 'neutral'
  ): Promise<string> => {
    setIsGenerating(true);
    setError(null);

    try {
      console.log(`[AvatarTalk] Generating video for ${avatar}: ${text.substring(0, 50)}...`);
      
      const response = await fetch('/api/avatartalk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          avatar,
          emotion,
          language: 'en'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      // Get the video blob
      const videoBlob = await response.blob();
      
      console.log(`[AvatarTalk] Blob received - Size: ${videoBlob.size} bytes, Type: ${videoBlob.type}`);
      
      // Verify blob is not empty
      if (videoBlob.size === 0) {
        throw new Error('Received empty video blob from API');
      }
      
      // Ensure correct MIME type for video
      const videoType = videoBlob.type || 'video/mp4';
      const typedBlob = new Blob([videoBlob], { type: videoType });
      
      // Create object URL for the video
      const videoUrl = URL.createObjectURL(typedBlob);
      
      console.log(`[AvatarTalk] Video URL created: ${videoUrl}`);
      
      return videoUrl;
    } catch (err: any) {
      console.error('[AvatarTalk] Error generating video:', err);
      setError(err.message || 'Failed to generate video');
      throw err;
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    generateVideo,
    isGenerating,
    error,
  };
}
