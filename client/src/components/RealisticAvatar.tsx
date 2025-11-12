import { useEffect, useRef } from 'react';
import { ProfessionalAvatarFallback } from './ProfessionalAvatarFallback';

interface RealisticAvatarProps {
  isActive: boolean;
  isSpeaking: boolean;
  avatarType?: 'consultant' | 'partner';
  className?: string;
  videoUrl?: string | null;
  videoRef?: React.RefObject<HTMLVideoElement>;
  onEnded?: () => void;
  onError?: (error: string) => void;
  isGenerating?: boolean;
  isMuted?: boolean;
}

export default function RealisticAvatar({ 
  isActive, 
  isSpeaking, 
  avatarType = 'consultant',
  className = '',
  videoUrl,
  videoRef,
  onEnded,
  onError,
  isGenerating = false,
  isMuted = true
}: RealisticAvatarProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const activeVideoRef = videoRef || localVideoRef;

  // Auto-play video when URL changes
  useEffect(() => {
    if (videoUrl && activeVideoRef.current && isActive) {
      const video = activeVideoRef.current;
      video.src = videoUrl;
      
      video.play()
        .then(() => {
          console.log(`[Avatar] Video playing (${isMuted ? 'muted' : 'with audio'})`);
        })
        .catch((error) => {
          console.error('[Avatar] Failed to play video:', error);
          onError?.(error.message);
        });
    }
  }, [videoUrl, isActive]);

  // Handle video ended event
  useEffect(() => {
    const video = activeVideoRef.current;
    if (!video || !onEnded) return;

    const handleEnded = () => {
      console.log('[Avatar] Video ended');
      onEnded();
    };

    video.addEventListener('ended', handleEnded);
    return () => video.removeEventListener('ended', handleEnded);
  }, [onEnded]);

  // Show video if available and active, otherwise show fallback
  const showVideo = videoUrl && isActive;

  return (
    <div className={`${className} relative w-full h-full`}>
      {showVideo ? (
        <video
          ref={activeVideoRef}
          className="w-full h-full object-cover rounded-lg"
          playsInline
          muted={isMuted}
          data-testid={`video-avatar-${avatarType}`}
          style={{ opacity: isSpeaking ? 1 : 0.5 }}
        />
      ) : (
        <div style={{ opacity: isGenerating || isSpeaking ? 1 : 0.5 }}>
          <ProfessionalAvatarFallback avatarType={avatarType} className={className} />
        </div>
      )}
    </div>
  );
}
