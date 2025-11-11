import { Volume2, Video, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ChatMessageProps {
  content: string;
  role: 'user' | 'assistant';
  timestamp?: string;
  onReplay?: () => void;
  onGenerateVideo?: () => void;
  videoUrl?: string | null;
  isGeneratingVideo?: boolean;
  videoError?: string | null;
}

export default function ChatMessage({ 
  content, 
  role, 
  timestamp, 
  onReplay,
  onGenerateVideo,
  videoUrl,
  isGeneratingVideo,
  videoError
}: ChatMessageProps) {
  const isUser = role === 'user';

  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} mb-6`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-primary text-primary-foreground ml-auto'
            : 'bg-card text-card-foreground border border-card-border mr-auto'
        }`}
        data-testid={`message-${role}`}
      >
        <div className="text-base leading-relaxed whitespace-pre-wrap">{content}</div>
        
        {!isUser && (
          <>
            {/* Video Player */}
            {videoUrl && (
              <div className="mt-3 rounded-lg overflow-hidden border border-card-border" data-testid="video-player">
                <video
                  src={videoUrl}
                  controls
                  className="w-full max-w-sm"
                  data-testid="video-element"
                >
                  Your browser does not support the video tag.
                </video>
              </div>
            )}

            {/* Video Error */}
            {videoError && (
              <div className="mt-3 p-2 bg-destructive/10 border border-destructive/20 rounded-md flex items-start gap-2" data-testid="video-error">
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                <div className="text-xs text-destructive">{videoError}</div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 mt-2">
              {onReplay && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onReplay}
                  className="h-7 text-xs gap-1"
                  data-testid="button-replay-message"
                >
                  <Volume2 className="h-3 w-3" />
                  Replay
                </Button>
              )}
              
              {onGenerateVideo && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onGenerateVideo}
                  disabled={isGeneratingVideo}
                  className="h-7 text-xs gap-1"
                  data-testid="button-generate-video"
                >
                  {isGeneratingVideo ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Video className="h-3 w-3" />
                      Generate Video
                    </>
                  )}
                </Button>
              )}
            </div>
          </>
        )}
      </div>
      {timestamp && (
        <div className={`text-xs text-muted-foreground mt-1 ${isUser ? 'mr-2' : 'ml-2'}`}>
          {timestamp}
        </div>
      )}
    </div>
  );
}
