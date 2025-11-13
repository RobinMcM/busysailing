import { useEffect, useRef, useState } from 'react';
import idleAvatarImage from '@assets/FemaleAvatar_1763041095394.png';

interface RealisticAvatarProps {
  isActive: boolean;
  isSpeaking: boolean;
  avatarType?: 'consultant' | 'partner';
  className?: string;
  videoUrl?: string | null;
  videoRef?: React.RefObject<HTMLVideoElement>;
  onEnded?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
  onAutoplayReject?: (error: string) => void;
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
  onPlay,
  onPause,
  onAutoplayReject,
  onError,
  isGenerating = false,
  isMuted = true
}: RealisticAvatarProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const activeVideoRef = videoRef || localVideoRef;
  
  // Track currently loaded video URL to prevent re-loading same video
  const [loadedVideoUrl, setLoadedVideoUrl] = useState<string | null>(null);
  
  // Track cleanup state with ref (synchronous, no race conditions)
  const isCleaningUpRef = useRef(false);
  
  // Cleanup helper - clears video src synchronously
  const cleanupVideo = () => {
    const video = activeVideoRef.current;
    if (!video || !video.src || !video.src.startsWith('blob:')) return;
    
    console.log('[Avatar] Cleaning up video src');
    isCleaningUpRef.current = true;
    
    video.pause();
    video.src = '';
    video.load();
    setLoadedVideoUrl(null);
    
    // Reset cleanup flag after a brief delay
    setTimeout(() => {
      isCleaningUpRef.current = false;
    }, 100);
  };

  // Auto-play video when URL changes and avatar becomes active speaker
  useEffect(() => {
    if (videoUrl && activeVideoRef.current && isActive && isSpeaking) {
      const video = activeVideoRef.current;
      
      // Prevent re-loading the same video (fixes looping issue)
      if (loadedVideoUrl === videoUrl) {
        console.log('[Avatar] Video already loaded, skipping reload to prevent loop');
        return;
      }
      
      // If switching to a different video, cleanup old blob URL first
      if (loadedVideoUrl && loadedVideoUrl !== videoUrl) {
        console.log('[Avatar] Switching videos, cleaning up old blob URL');
        cleanupVideo();
      }
      
      console.log('[Avatar] Loading video URL:', videoUrl);
      console.log('[Avatar] Video element ready, starting playback');
      
      // Reset cleanup flag when starting new playback
      isCleaningUpRef.current = false;
      
      // Set src directly (no <source> child to avoid conflicts)
      // Ensure video element can handle MP4
      video.src = videoUrl;
      video.setAttribute('type', 'video/mp4');
      video.load();
      
      // Track that we've loaded this video
      setLoadedVideoUrl(videoUrl);
      
      // Play once loaded
      (async () => {
        try {
          await video.play();
          console.log(`[Avatar] Video playing (${isMuted ? 'muted' : 'with audio'})`);
          onPlay?.();
        } catch (error) {
          if (!isCleaningUpRef.current) {
            console.error('[Avatar] Failed to play video:', error);
            console.error('[Avatar] Video element state:', {
              readyState: video.readyState,
              networkState: video.networkState,
              error: video.error,
              src: video.src,
              currentSrc: video.currentSrc,
            });
            onAutoplayReject?.(error instanceof Error ? error.message : String(error));
            onError?.(error instanceof Error ? error.message : String(error));
          }
        }
      })();
    }
    // Note: Removed cleanupVideo on !isSpeaking to keep AvatarTalk stream visible when idle
  }, [videoUrl, isActive, isSpeaking, loadedVideoUrl]);

  // Handle video ended event
  useEffect(() => {
    const video = activeVideoRef.current;
    if (!video) return;

    const handleEnded = () => {
      console.log('[Avatar] Video ended, clearing to show idle state');
      
      // Clear the video src to show clean idle background (no frozen last frame)
      cleanupVideo();
      
      // Notify parent that video has ended
      onPause?.();
      onEnded?.();
    };

    video.addEventListener('ended', handleEnded);
    return () => video.removeEventListener('ended', handleEnded);
  }, [onEnded, onPause]);

  // Handle video pause event
  useEffect(() => {
    const video = activeVideoRef.current;
    if (!video) return;

    const handlePause = () => {
      if (video.ended) return;
      onPause?.();
    };

    video.addEventListener('pause', handlePause);
    return () => video.removeEventListener('pause', handlePause);
  }, [onPause]);

  return (
    <div className={`${className} relative w-full h-full`}>
      {/* Idle avatar image - shows when no video is playing */}
      <img 
        src={idleAvatarImage} 
        alt="Avatar"
        className="absolute inset-0 w-full h-full object-cover"
        data-testid="img-avatar-idle"
      />
      
      {/* Video element - overlays idle image when playing */}
      {/* src set via useEffect to avoid conflicts with <source> tag */}
      <video
        ref={activeVideoRef}
        className={`absolute inset-0 w-full h-full object-cover ${loadedVideoUrl ? 'opacity-100' : 'opacity-0'}`}
        playsInline
        muted={isMuted}
        loop={false}
        data-testid={`video-avatar-${avatarType}`}
        preload="auto"
      />
      
      {/* Loading indicator when generating video */}
      {isGenerating && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="text-white text-sm font-medium">Generating...</div>
        </div>
      )}
    </div>
  );
}
