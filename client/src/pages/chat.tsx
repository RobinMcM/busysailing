import { useState, useEffect, useRef } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Sparkles, Volume2, VolumeX, StopCircle, Lock, CheckCircle, BarChart3 } from 'lucide-react';
import ChatMessage from '@/components/ChatMessage';
import MessageInput from '@/components/MessageInput';
import ExamplePrompts from '@/components/ExamplePrompts';
import TypingIndicator from '@/components/TypingIndicator';
import RealisticAvatar from '@/components/RealisticAvatar';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useAvatarTalk, type AvatarType } from '@/hooks/use-avatartalk';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface ParagraphVideo {
  id: string;
  paragraph: string;
  avatarType: AvatarType;
  status: 'pending' | 'ready' | 'failed';
  videoUrl: string | null;
  error: string | null;
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(true); // Start muted for autoplay compliance, will auto-unmute
  const [passwordInput, setPasswordInput] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  
  // Avatar video queue state
  const [paragraphQueue, setParagraphQueue] = useState<ParagraphVideo[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [queueStatus, setQueueStatus] = useState<'idle' | 'generating' | 'playing'>('idle');
  const [isGeneratingVideos, setIsGeneratingVideos] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const cleanupUrlsRef = useRef<string[]>([]);
  const primaryVideoRef = useRef<HTMLVideoElement>(null);
  const { toast} = useToast();
  
  const CORRECT_PASSWORD = 'MKS2005';
  
  // AvatarTalk hook for video generation
  const avatarTalk = useAvatarTalk();
  
  // Track when avatar is speaking
  const isPlaybackActive = queueStatus === 'playing' && !isMuted;
  const isSpeaking = isPlaybackActive;

  // Cleanup function to revoke object URLs
  const cleanupUrls = () => {
    cleanupUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
    cleanupUrlsRef.current = [];
  };

  // Stop playback and cleanup
  const stopPlayback = () => {
    console.log('[Video] Stopping playback');
    setQueueStatus('idle');
    setCurrentIndex(-1);
    
    // Pause and clear video source before cleanup
    if (primaryVideoRef.current) {
      primaryVideoRef.current.pause();
      primaryVideoRef.current.removeAttribute('src');
      primaryVideoRef.current.load(); // Reset video element
    }
    
    // Now safe to cleanup blob URLs
    cleanupUrls();
  };

  // Play next video in queue
  const playNext = (indexOverride?: number) => {
    let nextIndex = indexOverride !== undefined ? indexOverride : currentIndex + 1;
    
    // Find next playable video (skip failed ones)
    while (nextIndex < paragraphQueue.length) {
      const nextVideo = paragraphQueue[nextIndex];
      
      if (nextVideo.status === 'ready' && nextVideo.videoUrl) {
        // Found a playable video
        console.log(`[Video] Playing paragraph ${nextIndex + 1}/${paragraphQueue.length} with ${nextVideo.avatarType}`);
        
        setCurrentIndex(nextIndex);
        setQueueStatus('playing');
        
        // Auto-unmute when video starts playing (users want to hear the avatar)
        if (isMuted) {
          setIsMuted(false);
          console.log('[Video] Auto-unmuted for playback');
        }
        
        return;
      }
      
      console.warn(`[Video] Skipping paragraph ${nextIndex + 1} (not ready)`);
      nextIndex++;
    }
    
    // No more playable videos
    console.log('[Video] Playback complete - no more videos');
    setQueueStatus('idle');
    setCurrentIndex(-1);
  };

  // Generate ONE video per AI response to save credits (not per paragraph)
  const generateSingleVideo = async (text: string, messageIndex: number) => {
    console.log(`[Video] Generating single video for AI message ${messageIndex}`);
    
    // Stop any existing playback
    stopPlayback();
    
    // Always use Consultant avatar
    const avatarType: AvatarType = 'european_woman';
    
    // Truncate text to 2000 characters (AvatarTalk API limit)
    const maxLength = 2000;
    let truncatedText = text;
    if (text.length > maxLength) {
      // Truncate at sentence boundary if possible
      const truncated = text.substring(0, maxLength);
      const lastPeriod = truncated.lastIndexOf('.');
      const lastQuestion = truncated.lastIndexOf('?');
      const lastExclamation = truncated.lastIndexOf('!');
      const lastSentenceEnd = Math.max(lastPeriod, lastQuestion, lastExclamation);
      
      if (lastSentenceEnd > maxLength * 0.8) {
        truncatedText = truncated.substring(0, lastSentenceEnd + 1);
      } else {
        truncatedText = truncated + '...';
      }
      
      console.log(`[Video] Text truncated from ${text.length} to ${truncatedText.length} characters`);
    }
    
    // Initialize queue with single video
    const initialQueue: ParagraphVideo[] = [{
      id: `${Date.now()}`,
      paragraph: truncatedText,
      avatarType,
      status: 'pending',
      videoUrl: null,
      error: null
    }];
    
    setParagraphQueue(initialQueue);
    setQueueStatus('generating');
    setIsGeneratingVideos(true);
    
    try {
      console.log(`[Video] Calling AvatarTalk API with ${avatarType}...`);
      
      const videoUrl = await avatarTalk.generateVideo(
        truncatedText,
        avatarType,
        'neutral'
      );
      
      // Store URL for cleanup
      cleanupUrlsRef.current.push(videoUrl);
      
      console.log(`[Video] Video generated successfully`);
      
      // Update queue with ready video (use truncated text)
      setParagraphQueue([{
        id: `${Date.now()}`,
        paragraph: truncatedText,
        avatarType,
        status: 'ready',
        videoUrl,
        error: null
      }]);
      
      setIsGeneratingVideos(false);
      setQueueStatus('idle'); // Set to idle so useEffect can trigger playback
      
    } catch (error: any) {
      console.error(`[Video] Failed to generate video:`, error);
      
      // Update queue with error (use truncated text)
      setParagraphQueue([{
        id: `${Date.now()}`,
        paragraph: truncatedText,
        avatarType,
        status: 'failed',
        videoUrl: null,
        error: error.message
      }]);
      
      setIsGeneratingVideos(false);
      setQueueStatus('idle');
      
      toast({
        title: 'Video Generation Failed',
        description: error.message || 'Failed to generate video',
        variant: 'destructive'
      });
    }
  };

  const handleSendMessage = async (content: string) => {
    console.log('[Chat] Sending message:', content);
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      console.log('[Chat] Making API request...');
      const res = await apiRequest('POST', '/api/chat', {
        message: content,
        conversationHistory
      });

      console.log('[Chat] Got response, status:', res.status);
      const data = await res.json() as { message: string; success: boolean };
      console.log('[Chat] Response data:', data.success ? 'Success' : 'Failed');

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message,
        timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      };

      setMessages((prev) => {
        const updated = [...prev, aiMessage];
        
        // Count AI messages to determine which avatar to use
        const aiMessageCount = updated.filter(m => m.role === 'assistant').length;
        
        // Auto-generate single video for AI response (saves credits)
        setTimeout(() => {
          generateSingleVideo(data.message, aiMessageCount - 1);
        }, 100);
        
        return updated;
      });
    } catch (error: any) {
      console.error('Failed to get AI response:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: "I apologize, but I'm having trouble processing your request right now. Please try again in a moment.",
        timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      };
      
      setMessages((prev) => [...prev, errorMessage]);
      
      toast({
        title: "Error",
        description: error.message || "Failed to get a response. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePromptClick = (prompt: string) => {
    if (!isUnlocked) {
      toast({
        title: "Access Required",
        description: "Please enter the access code to use the chatbot.",
        variant: "destructive",
      });
      return;
    }
    handleSendMessage(prompt);
  };

  const stopAllSpeech = () => {
    stopPlayback();
  };

  const handleClearChat = () => {
    stopPlayback();
    setMessages([]);
  };

  const handleToggleMute = () => {
    if (!isMuted) {
      stopPlayback();
    }
    setIsMuted(!isMuted);
  };

  const handleReplayMessage = (content: string) => {
    // Count AI messages to determine which avatar to use for replay
    const aiMessageCount = messages.filter(m => m.role === 'assistant').length;
    const messageIndex = messages.findIndex(m => m.content === content && m.role === 'assistant');
    const aiMessagesBeforeThis = messages.slice(0, messageIndex).filter(m => m.role === 'assistant').length;
    
    // Generate single video for replay (saves credits)
    generateSingleVideo(content, aiMessagesBeforeThis);
  };

  // Partner avatar is now enabled automatically when she first appears (odd-numbered AI messages)

  // Auto-start playback when video is ready
  useEffect(() => {
    if (paragraphQueue.length > 0 && 
        paragraphQueue[0].status === 'ready' && 
        queueStatus === 'idle' &&
        currentIndex === -1) {
      console.log('[Video] Auto-starting playback for ready video');
      playNext(0);
    }
  }, [paragraphQueue, queueStatus, currentIndex]);

  // Check password when input changes
  useEffect(() => {
    if (passwordInput === CORRECT_PASSWORD) {
      setIsUnlocked(true);
    } else {
      setIsUnlocked(false);
    }
  }, [passwordInput, CORRECT_PASSWORD]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Stop playback when component unmounts
  useEffect(() => {
    return () => {
      stopPlayback();
    };
  }, []);

  // Cleanup video URLs when component unmounts
  useEffect(() => {
    return () => {
      cleanupUrls();
    };
  }, []);

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="border-b border-border bg-background px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">UK Tax & Finance Advisor</h1>
              <p className="text-sm text-muted-foreground">Expert guidance on UK taxes, HMRC & finance</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <>
                {isSpeaking && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={stopPlayback}
                    className="gap-2 animate-pulse"
                    data-testid="button-stop-speaking"
                    title="Stop speaking"
                  >
                    <StopCircle className="h-4 w-4" />
                    Stop Speaking
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleToggleMute}
                  className="gap-2"
                  data-testid="button-mute-toggle"
                  title={isMuted ? "Unmute avatar voice" : "Mute avatar voice"}
                >
                  {isMuted ? (
                    <>
                      <VolumeX className="h-4 w-4" />
                      Unmute
                    </>
                  ) : (
                    <>
                      <Volume2 className="h-4 w-4" />
                      Mute
                    </>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearChat}
                  className="gap-2"
                  data-testid="button-clear"
                >
                  <Trash2 className="h-4 w-4" />
                  Clear Chat
                </Button>
              </>
            )}
            
            {/* Admin Link */}
            <Link href="/admin">
              <Button
                variant="ghost"
                size="sm"
                className="gap-2"
                data-testid="button-admin"
                title="Admin Analytics"
              >
                <BarChart3 className="h-4 w-4" />
                Admin
              </Button>
            </Link>
            
            {/* Password Input - Always visible */}
            <div className="relative w-32">
              <Input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Access code"
                className={`pr-8 text-sm ${
                  passwordInput.length > 0
                    ? isUnlocked
                      ? 'border-green-500 focus-visible:ring-green-500'
                      : 'border-destructive focus-visible:ring-destructive'
                    : ''
                }`}
                data-testid="input-password"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                {passwordInput.length > 0 ? (
                  isUnlocked ? (
                    <CheckCircle className="h-4 w-4 text-green-500" data-testid="icon-unlocked" />
                  ) : (
                    <Lock className="h-4 w-4 text-destructive" data-testid="icon-locked" />
                  )
                ) : (
                  <Lock className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        <div className="h-full max-w-6xl mx-auto px-6 py-6">
          <div className="flex flex-col gap-6 items-center justify-center h-full">
            {messages.length === 0 && (
              <div className="text-center mb-4 max-w-lg" data-testid="welcome-prompt">
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  How can I help you today?
                </h2>
                <p className="text-base text-muted-foreground">
                  Ask me anything about UK taxes, HMRC regulations, and personal finance
                </p>
              </div>
            )}
            
            <div className="flex flex-col lg:flex-row gap-6 items-center justify-center w-full">
              {/* Text Output Box - Mobile Phone Style */}
              <div className="relative w-full max-w-[307px] h-[400px] lg:h-[520px] flex-shrink-0" data-testid="phone-container">
                {/* Phone bezel/frame */}
                <div className="absolute inset-0 bg-gradient-to-b from-border to-muted/30 rounded-[2.5rem] p-[12px] shadow-2xl">
                  {/* Phone screen */}
                  <div className="relative h-full flex flex-col bg-card rounded-[2rem] overflow-hidden">
                    {/* Notch */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-border rounded-b-2xl z-10 flex items-center justify-center">
                      <div className="w-12 h-1 bg-muted rounded-full"></div>
                    </div>
                    
                    {/* Header with extra top padding for notch */}
                    <div className="border-b border-border bg-muted px-4 py-3 pt-8">
                      <h3 className="text-sm font-semibold text-foreground">Chat</h3>
                    </div>
                    
                    {/* Scrollable chat content */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-3" data-testid="chat-messages">
                      {messages.map((message) => (
                        <ChatMessage
                          key={message.id}
                          content={message.content}
                          role={message.role}
                          timestamp={message.timestamp}
                          onReplay={message.role === 'assistant' ? () => handleReplayMessage(message.content) : undefined}
                        />
                      ))}
                      {isLoading && (
                        <div className="flex justify-start">
                          <div className="bg-muted rounded-2xl rounded-bl-sm px-3 py-2">
                            <TypingIndicator />
                          </div>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                    
                    {/* Home indicator bar at bottom */}
                    <div className="w-full h-8 bg-card flex items-center justify-center">
                      <div className="w-24 h-1 bg-muted rounded-full"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Consultant Avatar */}
              <div className="flex flex-col items-center gap-2">
                <div 
                  className="w-64 h-64 lg:w-72 lg:h-72 rounded-full overflow-hidden"
                  data-testid="avatar-primary"
                >
                  <RealisticAvatar 
                    isActive={true}
                    isSpeaking={isSpeaking}
                    avatarType="consultant"
                    className="w-full h-full"
                    videoUrl={
                      currentIndex >= 0 && 
                      currentIndex < paragraphQueue.length
                        ? paragraphQueue[currentIndex].videoUrl
                        : null
                    }
                    videoRef={primaryVideoRef}
                    onEnded={() => playNext()}
                    isGenerating={isGeneratingVideos}
                    isMuted={isMuted}
                  />
                </div>
                <span className="text-sm font-medium text-foreground">Consultant</span>
              </div>
            </div>
            
            {messages.length === 0 && (
              <ExamplePrompts onPromptClick={handlePromptClick} disabled={!isUnlocked} />
            )}
          </div>
        </div>
      </main>

      <div className="border-t border-border bg-background p-4">
        <div className="max-w-4xl mx-auto">
          <MessageInput onSend={handleSendMessage} disabled={isLoading || !isUnlocked} />
          <p className="text-xs text-muted-foreground text-center mt-2">
            {!isUnlocked ? (
              'Enter the access code in the header to unlock the chatbot'
            ) : (
              'This AI assistant provides general UK tax information. Consult a UK-qualified professional for specific advice.'
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
