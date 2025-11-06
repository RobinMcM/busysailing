import { useRef, useEffect } from 'react';
import defaultAvatarImage from '@assets/generated_images/Video_call_tax_advisor_3ce91073.png';
import { Volume2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface AvatarWelcomeProps {
  isSpeaking?: boolean;
  isDisabled?: boolean;
  isDimmed?: boolean;
  avatarId?: string;
  label?: string;
  avatarImage?: string;
  videoSrc?: string | null;
  onVideoEnded?: () => void;
}

export function AvatarWelcome({ 
  isSpeaking = false, 
  isDisabled = false, 
  isDimmed = false,
  avatarId = 'primary',
  label,
  avatarImage = defaultAvatarImage,
  videoSrc = null,
  onVideoEnded
}: AvatarWelcomeProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const getOpacity = () => {
    if (isDisabled) return 'opacity-40';
    if (isDimmed) return 'opacity-50';
    return 'opacity-100';
  };

  // Handle video playback
  useEffect(() => {
    if (videoRef.current && videoSrc) {
      console.log(`[Avatar ${avatarId}] Loading video, speaking=${isSpeaking}`);
      videoRef.current.src = videoSrc;
      
      if (isSpeaking) {
        // Play video when speaking starts
        videoRef.current.play().catch(err => {
          console.error(`[Avatar ${avatarId}] Video play error:`, err);
        });
      }
    }
  }, [videoSrc, isSpeaking, avatarId]);

  // Stop video when speaking stops
  useEffect(() => {
    if (videoRef.current && !isSpeaking) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, [isSpeaking]);

  const handleVideoEnded = () => {
    console.log(`[Avatar ${avatarId}] Video ended`);
    if (onVideoEnded) {
      onVideoEnded();
    }
  };

  // Determine what to show: video or static image
  const showVideo = videoSrc && isSpeaking;

  return (
    <div className="flex flex-col items-center justify-center mb-8" data-testid={`avatar-${avatarId}`}>
      <div className="relative mb-4">
        <div className={`absolute inset-0 rounded-lg bg-primary/10 blur-2xl ${isDisabled ? 'opacity-30' : isDimmed ? 'opacity-20' : ''}`}></div>
        <div className={`relative w-80 h-80 max-w-[90vw] rounded-lg overflow-hidden border-2 border-border shadow-2xl bg-card transition-opacity duration-300 ${getOpacity()}`}>
          {showVideo ? (
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              data-testid={`avatar-video-${avatarId}`}
              onEnded={handleVideoEnded}
              loop={false}
              muted={false}
              playsInline
            />
          ) : (
            <img
              src={avatarImage}
              alt={label || "UK Tax Advisor AI Assistant"}
              className="w-full h-full object-cover"
              data-testid={`avatar-image-${avatarId}`}
            />
          )}
          {isSpeaking && !isDisabled && (
            <div className="absolute bottom-3 left-3">
              <Badge 
                variant="default" 
                className="gap-1.5 animate-pulse"
                data-testid={`speaking-indicator-${avatarId}`}
              >
                <Volume2 className="h-3 w-3" />
                Speaking
              </Badge>
            </div>
          )}
        </div>
      </div>
      {label && (
        <p className="text-xs text-muted-foreground text-center mt-2">{label}</p>
      )}
    </div>
  );
}
