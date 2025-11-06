import { Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ChatMessageProps {
  content: string;
  role: 'user' | 'assistant';
  timestamp?: string;
  onReplay?: () => void;
}

export default function ChatMessage({ content, role, timestamp, onReplay }: ChatMessageProps) {
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
        {!isUser && onReplay && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReplay}
            className="mt-2 h-7 text-xs gap-1"
            data-testid="button-replay-message"
          >
            <Volume2 className="h-3 w-3" />
            Replay
          </Button>
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
