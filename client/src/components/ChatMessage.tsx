import { Volume2, Video, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VideoState {
  status: 'idle' | 'generating' | 'ready' | 'error';
  jobId?: string;
  url?: string;
  error?: string;
}

interface ChatMessageProps {
  content: string;
  role: 'user' | 'assistant';
  timestamp?: string;
  onReplay?: () => void;
  onGenerateVideo?: () => void;
  video?: VideoState;
}

export default function ChatMessage({ content, role, timestamp, onReplay, onGenerateVideo, video }: ChatMessageProps) {
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
        
        {!isUser && (onReplay || onGenerateVideo) && (
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
            {onGenerateVideo && video?.status !== 'ready' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onGenerateVideo}
                disabled={video?.status === 'generating'}
                className="h-7 text-xs gap-1"
                data-testid="button-generate-video"
              >
                {video?.status === 'generating' ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Video className="h-3 w-3" />
                    Generate Video (~30s, $0.10)
                  </>
                )}
              </Button>
            )}
          </div>
        )}

        {!isUser && video?.status === 'ready' && video.url && (
          <div className="mt-3">
            <video 
              src={video.url} 
              controls 
              className="w-full max-w-xs rounded-lg border border-card-border"
              data-testid="video-avatar"
              autoPlay
            />
            <p className="text-xs text-muted-foreground mt-1">
              Talking avatar video
            </p>
          </div>
        )}

        {!isUser && video?.status === 'error' && (
          <div className="mt-3 flex items-center gap-2 text-xs text-destructive">
            <AlertCircle className="h-3 w-3" />
            <span>Video generation failed: {video.error || 'Unknown error'}</span>
          </div>
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
