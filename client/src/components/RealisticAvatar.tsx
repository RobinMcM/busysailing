import { useEffect, useRef, useState } from 'react';
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
      
      console.log('[Avatar] Loading video URL:', videoUrl);
      console.log('[Avatar] Video element ready, starting playback');
      
      // Reset cleanup flag when starting new playback
      isCleaningUpRef.current = false;
      
      // Set src directly (no <source> child to avoid conflicts)
      video.src = videoUrl;
      video.load();
      
      // Track that we've loaded this video
      setLoadedVideoUrl(videoUrl);
      
      // Play once loaded
      video.play()
        .then(() => {
          console.log(`[Avatar] Video playing (${isMuted ? 'muted' : 'with audio'})`);
        })
        .catch((error) => {
          // Only log error if not intentionally cleaning up
          if (!isCleaningUpRef.current) {
            console.error('[Avatar] Failed to play video:', error);
            console.error('[Avatar] Video element state:', {
              readyState: video.readyState,
              networkState: video.networkState,
              error: video.error,
              src: video.src,
              currentSrc: video.currentSrc
            });
            onError?.(error.message);
          }
        });
    } else if (!isSpeaking && loadedVideoUrl) {
      // Clear src when not speaking to prevent blob URL errors
      cleanupVideo();
    }
  }, [videoUrl, isActive, isSpeaking, loadedVideoUrl]);

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

  // Always show fallback when not speaking, overlay it on top of video if video exists
  const showFallbackOverlay = !isSpeaking || !isActive;

  return (
    <div className={`${className} relative w-full h-full`}>
      {videoUrl ? (
        <>
          {/* Video element - always rendered when URL exists so refs/effects work */}
          {/* src set via useEffect to avoid conflicts with <source> tag */}
          <video
            ref={activeVideoRef}
            className="w-full h-full object-cover rounded-lg"
            playsInline
            muted={isMuted}
            loop={false}
            data-testid={`video-avatar-${avatarType}`}
            preload="auto"
          />
          
          {/* Overlay fallback image when not actively speaking */}
          {showFallbackOverlay && (
            <div className="absolute inset-0 z-10">
              <ProfessionalAvatarFallback 
                avatarType={avatarType} 
                className="w-full h-full"
              />
            </div>
          )}
        </>
      ) : (
        /* No video available yet - show fallback */
        <ProfessionalAvatarFallback 
          avatarType={avatarType} 
          className={className}
        />
      )}
    </div>
  );
}
