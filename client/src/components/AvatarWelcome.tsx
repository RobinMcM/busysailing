import { useRef, useEffect, useState } from 'react';
import welcomeVideo from '@assets/videos/welcome.mp4';
import fallbackImage from '@assets/generated_images/Video_call_tax_advisor_3ce91073.png';

export function AvatarWelcome() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasPlayedWelcome, setHasPlayedWelcome] = useState(false);
  const [showVideo, setShowVideo] = useState(true);

  // Auto-play welcome video on mount
  useEffect(() => {
    if (videoRef.current && !hasPlayedWelcome) {
      console.log('[AvatarWelcome] Auto-playing welcome video');
      
      // Try to play with sound first
      videoRef.current.muted = false;
      videoRef.current.play()
        .then(() => {
          console.log('[AvatarWelcome] Welcome video playing with audio');
        })
        .catch((error) => {
          // If audio autoplay fails, try muted
          console.log('[AvatarWelcome] Audio autoplay blocked, trying muted');
          if (videoRef.current) {
            videoRef.current.muted = true;
            videoRef.current.play()
              .then(() => {
                console.log('[AvatarWelcome] Welcome video playing muted');
              })
              .catch((err) => {
                // If both attempts fail, show fallback image
                console.warn('[AvatarWelcome] Autoplay completely blocked, showing fallback image:', err);
                setHasPlayedWelcome(true);
                setShowVideo(false);
              });
          } else {
            // Video ref lost, show fallback
            setHasPlayedWelcome(true);
            setShowVideo(false);
          }
        });
    }
  }, [hasPlayedWelcome]);

  const handleVideoEnded = () => {
    console.log('[AvatarWelcome] Welcome video ended, showing fallback image');
    setHasPlayedWelcome(true);
    setShowVideo(false);
  };

  return (
    <div className="flex flex-col items-center justify-center mb-8" data-testid="avatar-welcome">
      <div className="relative mb-4">
        <div className="absolute inset-0 rounded-lg bg-primary/10 blur-2xl"></div>
        <div className="relative w-80 h-80 max-w-[90vw] rounded-lg overflow-hidden border-2 border-border shadow-2xl bg-card">
          {showVideo && !hasPlayedWelcome ? (
            <video
              ref={videoRef}
              src={welcomeVideo}
              className="w-full h-full object-cover"
              data-testid="avatar-welcome-video"
              onEnded={handleVideoEnded}
              loop={false}
              playsInline
            />
          ) : (
            <img
              src={fallbackImage}
              alt="UK Tax Advisor AI Assistant"
              className="w-full h-full object-cover"
              data-testid="avatar-welcome-image"
            />
          )}
        </div>
      </div>
    </div>
  );
}
