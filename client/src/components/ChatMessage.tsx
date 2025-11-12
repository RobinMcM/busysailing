import { Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

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
        {isUser ? (
          <div className="text-base leading-relaxed whitespace-pre-wrap">{content}</div>
        ) : (
          <div className="text-base leading-relaxed prose prose-sm max-w-none dark:prose-invert prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-1">
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
              components={{
                p: ({children}) => <p className="mb-2 last:mb-0">{children}</p>,
                ul: ({children}) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                ol: ({children}) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                li: ({children}) => <li className="ml-2">{children}</li>,
                code: ({className, children, ...props}) => {
                  const isInline = !className;
                  return isInline ? (
                    <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                      {children}
                    </code>
                  ) : (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                },
                pre: ({children}) => (
                  <pre className="bg-muted p-3 rounded-lg overflow-x-auto my-2 text-sm">
                    {children}
                  </pre>
                ),
                h1: ({children}) => <h1 className="text-xl font-bold mb-2 mt-3 first:mt-0">{children}</h1>,
                h2: ({children}) => <h2 className="text-lg font-bold mb-2 mt-3 first:mt-0">{children}</h2>,
                h3: ({children}) => <h3 className="text-base font-bold mb-1 mt-2 first:mt-0">{children}</h3>,
                blockquote: ({children}) => (
                  <blockquote className="border-l-4 border-primary pl-3 italic my-2">
                    {children}
                  </blockquote>
                ),
                table: ({children}) => (
                  <div className="overflow-x-auto my-2">
                    <table className="border-collapse border border-card-border w-full text-sm">
                      {children}
                    </table>
                  </div>
                ),
                th: ({children}) => (
                  <th className="border border-card-border px-3 py-2 bg-muted font-semibold text-left">
                    {children}
                  </th>
                ),
                td: ({children}) => (
                  <td className="border border-card-border px-3 py-2">
                    {children}
                  </td>
                ),
                a: ({children, href}) => (
                  <a href={href} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                    {children}
                  </a>
                ),
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        )}
        
        {!isUser && onReplay && (
          <div className="flex gap-2 mt-2">
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
