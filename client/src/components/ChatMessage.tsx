import { Volume2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { useState, useMemo } from 'react';

interface ChatMessageProps {
  content: string;
  role: 'user' | 'assistant';
  timestamp?: string;
  onReplay?: () => void;
}

export default function ChatMessage({ content, role, timestamp, onReplay }: ChatMessageProps) {
  const isUser = role === 'user';
  const [showDetails, setShowDetails] = useState(false);

  // Parse AI response into synopsis and details
  const parsedContent = useMemo(() => {
    if (isUser) {
      return { synopsis: content, details: null };
    }

    // Look for SYNOPSIS and DETAILS markers
    // Allow flexible whitespace before ---DETAILS--- marker
    const synopsisMatch = content.match(/\*\*SYNOPSIS:\*\*\s*([\s\S]*?)(?:\s*---DETAILS---|$)/);
    const detailsMatch = content.match(/---DETAILS---\s*([\s\S]*?)$/);

    if (synopsisMatch) {
      return {
        synopsis: synopsisMatch[1].trim(),
        details: detailsMatch ? detailsMatch[1].trim() : null
      };
    }

    // Fallback: if no markers found, show full content as synopsis
    return { synopsis: content, details: null };
  }, [content, isUser]);

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
            {/* Synopsis - always shown */}
            <div className="font-medium mb-2">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
                components={{
                  p: ({children}) => <p className="mb-2 last:mb-0">{children}</p>,
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
                }}
              >
                {parsedContent.synopsis}
              </ReactMarkdown>
            </div>

            {/* Details - shown when expanded */}
            {parsedContent.details && (
              <>
                {showDetails && (
                  <div className="mt-3 pt-3 border-t border-border">
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
                      {parsedContent.details}
                    </ReactMarkdown>
                  </div>
                )}
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDetails(!showDetails)}
                  className="h-7 text-xs gap-1 mt-2"
                  data-testid="button-toggle-details"
                >
                  {showDetails ? (
                    <>
                      <ChevronUp className="h-3 w-3" />
                      Show less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3 w-3" />
                      Show more
                    </>
                  )}
                </Button>
              </>
            )}
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
