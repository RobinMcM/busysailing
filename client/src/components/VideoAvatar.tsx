import { useEffect, useRef, useState } from 'react';
import { ProfessionalAvatarFallback } from './ProfessionalAvatarFallback';
import { Loader2 } from 'lucide-react';

interface VideoAvatarProps {
  videoUrl?: string;
  isGenerating?: boolean;
  isActive: boolean;
  isSpeaking: boolean;
  avatarType?: 'consultant' | 'partner';
  className?: string;
}

export default function VideoAvatar({
  videoUrl,
  isGenerating = false,
  isActive,
  isSpeaking,
  avatarType = 'consultant',
  className = '',
}: VideoAvatarProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Play video when speaking starts
  useEffect(() => {
    if (videoRef.current && videoUrl) {
      if (isSpeaking) {
        videoRef.current.play().catch((err) => {
          console.warn('[VideoAvatar] Auto-play failed:', err);
        });
      } else {
        videoRef.current.pause();
        videoRef.current.currentTime = 0; // Reset to beginning
      }
    }
  }, [isSpeaking, videoUrl]);

  // Show fallback photo if no video or generating or error
  if (!videoUrl || isGenerating || hasError) {
    return (
      <div className="relative">
        <ProfessionalAvatarFallback
          avatarType={avatarType}
          className={className}
        />
        {isGenerating && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-white" />
              <p className="text-white text-sm font-medium">Generating avatar...</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`relative ${className}`}
      data-testid="video-avatar-container"
      style={{
        opacity: isActive ? 1 : 0.5,
        transition: 'opacity 0.3s ease',
      }}
    >
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full h-full rounded-lg object-cover"
        loop
        playsInline
        muted
        onLoadStart={() => setIsLoading(true)}
        onLoadedData={() => setIsLoading(false)}
        onError={(e) => {
          console.error('[VideoAvatar] Video load error:', e);
          setHasError(true);
        }}
        data-testid={`video-avatar-${avatarType}`}
      />
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-lg">
          <Loader2 className="w-8 h-8 animate-spin text-white" />
        </div>
      )}
    </div>
  );
}
