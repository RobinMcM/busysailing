import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Sparkles, Volume2, VolumeX, StopCircle, Lock, CheckCircle } from 'lucide-react';
import ChatMessage from '@/components/ChatMessage';
import MessageInput from '@/components/MessageInput';
import ExamplePrompts from '@/components/ExamplePrompts';
import TypingIndicator from '@/components/TypingIndicator';
import { AvatarWelcome } from '@/components/AvatarWelcome';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useTTS } from '@/hooks/use-tts';
import { useWav2Lip } from '@/hooks/use-wav2lip';
import femaleAdvisorImage from '@assets/generated_images/Older_European_female_advisor_portrait_b60fd6fc.png';
import defaultAvatarImage from '@assets/generated_images/Video_call_tax_advisor_3ce91073.png';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSecondAvatarEnabled, setIsSecondAvatarEnabled] = useState(false);
  const [activeAvatar, setActiveAvatar] = useState<'primary' | 'support'>('primary');
  const [isParagraphSpeaking, setIsParagraphSpeaking] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [primaryVideoSrc, setPrimaryVideoSrc] = useState<string | null>(null);
  const [supportVideoSrc, setSupportVideoSrc] = useState<string | null>(null);
  const paragraphCancelledRef = useRef(false);
  const isLipSyncRunningRef = useRef(false);
  const lipSyncCompletionPromiseRef = useRef<Promise<void> | null>(null);
  const lipSyncCompletionResolveRef = useRef<((value: void) => void) | null>(null);
  const videoEndedResolveRef = useRef<((value: void) => void) | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  const CORRECT_PASSWORD = 'MKS2005';
  
  // Dual TTS hooks - one for each avatar with different voice characteristics
  const primaryTTS = useTTS();
  const supportTTS = useTTS();
  
  // Wav2Lip hook for lip-synced video generation
  const wav2lip = useWav2Lip();
  
  // Track which avatar is currently speaking
  const isSpeaking = primaryTTS.isSpeaking || supportTTS.isSpeaking || isParagraphSpeaking;
  const isSupported = primaryTTS.isSupported;

  // Callback when avatar video ends
  const handleVideoEnded = () => {
    console.log('[LipSync] Video ended callback');
    if (videoEndedResolveRef.current) {
      videoEndedResolveRef.current();
      videoEndedResolveRef.current = null;
    }
  };

  // Function to speak response with lip-synced video using Wav2Lip
  const speakResponseWithLipSync = async (text: string) => {
    // Guard against concurrent executions
    if (isLipSyncRunningRef.current && lipSyncCompletionPromiseRef.current) {
      console.log('[LipSync] Already running, cancelling previous and waiting for completion');
      paragraphCancelledRef.current = true;
      
      // Resolve any pending video promise to unblock previous run
      if (videoEndedResolveRef.current) {
        videoEndedResolveRef.current();
        videoEndedResolveRef.current = null;
      }
      
      // Wait for previous run to fully complete (NO TIMEOUT - must wait)
      console.log('[LipSync] Waiting for previous run to complete cleanup...');
      await lipSyncCompletionPromiseRef.current;
      console.log('[LipSync] Previous run completed, starting new run');
    }
    
    // Create completion promise for this run
    lipSyncCompletionPromiseRef.current = new Promise<void>((resolve) => {
      lipSyncCompletionResolveRef.current = resolve;
    });
    
    // Mark as running
    isLipSyncRunningRef.current = true;
    paragraphCancelledRef.current = false;
    
    // Use try/finally to guarantee cleanup and promise resolution on ALL exit paths
    try {
      // Split by double line breaks to get paragraphs
      const paragraphs = text
        .split(/\n\n+/)
        .map(p => p.trim())
        .filter(p => p.length > 0);
      
      console.log(`[LipSync] Split response into ${paragraphs.length} paragraphs`);
      
      if (paragraphs.length === 0) {
        console.warn('[LipSync] No paragraphs found in response');
        return;
      }
      
      setIsParagraphSpeaking(true);
    
      // Process each paragraph sequentially
      for (let i = 0; i < paragraphs.length; i++) {
        // Check if cancelled (at start of loop)
        if (paragraphCancelledRef.current) {
          console.log('[LipSync] Cancelled at loop start');
          // Resolve any pending promise before breaking
          if (videoEndedResolveRef.current) {
            videoEndedResolveRef.current();
            videoEndedResolveRef.current = null;
          }
          break;
        }
        
        const paragraph = paragraphs[i];
        const usePrimary = i % 2 === 0; // Even indices use primary, odd use support
        const avatarImage = usePrimary ? defaultAvatarImage : femaleAdvisorImage;
        const voice = usePrimary ? 'nova' : 'shimmer'; // Different voices for each avatar
        
        console.log(`[LipSync] Processing paragraph ${i + 1}/${paragraphs.length} with ${usePrimary ? 'Primary' : 'Support'} avatar`);
        
        // Update active avatar
        setActiveAvatar(usePrimary ? 'primary' : 'support');
        
        try {
          // Generate lip-synced video
          const videoDataUrl = await wav2lip.generateLipSyncVideo({
            text: paragraph,
            avatarImage: avatarImage,
            options: { voice, speed: 1.0 }
          });
          
          // Check if cancelled after async operation
          if (paragraphCancelledRef.current) {
            console.log('[LipSync] Cancelled after video generation');
            // Resolve any pending promise before breaking
            if (videoEndedResolveRef.current) {
              videoEndedResolveRef.current();
              videoEndedResolveRef.current = null;
            }
            break;
          }
          
          if (!videoDataUrl) {
            console.error('[LipSync] Failed to generate video, falling back to Web Speech API');
            // Fallback to Web Speech API
            speakResponseInParagraphs(text);
            return;
          }
          
          // Create promise to wait for video end
          const videoEndPromise = new Promise<void>((resolve) => {
            videoEndedResolveRef.current = resolve;
            
            // Fallback timeout in case onVideoEnded doesn't fire
            const words = paragraph.split(/\s+/).length;
            const estimatedDuration = (words / 2.5) * 1000 + 1000;
            setTimeout(() => {
              console.log('[LipSync] Timeout fallback triggered');
              if (videoEndedResolveRef.current === resolve) {
                resolve();
                videoEndedResolveRef.current = null;
              }
            }, estimatedDuration);
          });
          
          // Set video source for the appropriate avatar
          if (usePrimary) {
            setPrimaryVideoSrc(videoDataUrl);
          } else {
            setSupportVideoSrc(videoDataUrl);
          }
          
          // Wait for video to finish playing (using actual video event)
          console.log(`[LipSync] Waiting for video end event`);
          await videoEndPromise;
          
          // Check if cancelled after video playback
          if (paragraphCancelledRef.current) {
            console.log('[LipSync] Cancelled after video playback');
            // Resolve any pending promise before breaking
            if (videoEndedResolveRef.current) {
              videoEndedResolveRef.current();
              videoEndedResolveRef.current = null;
            }
            break;
          }
          
          // Clear video source
          if (usePrimary) {
            setPrimaryVideoSrc(null);
          } else {
            setSupportVideoSrc(null);
          }
          
          // Small pause between paragraphs
          await new Promise(resolve => setTimeout(resolve, 400));
          
          // Final cancellation check before next paragraph
          if (paragraphCancelledRef.current) {
            console.log('[LipSync] Cancelled before next paragraph');
            // Resolve any pending promise before breaking
            if (videoEndedResolveRef.current) {
              videoEndedResolveRef.current();
              videoEndedResolveRef.current = null;
            }
            break;
          }
          
        } catch (error) {
          console.error('[LipSync] Error:', error);
          toast({
            title: "Video generation failed",
            description: "Falling back to voice-only mode",
            variant: "default",
          });
          // Fallback to Web Speech API
          speakResponseInParagraphs(text);
          return;
        }
      }
    } finally {
      // Cleanup - ALWAYS runs on ALL exit paths
      setIsParagraphSpeaking(false);
      setPrimaryVideoSrc(null);
      setSupportVideoSrc(null);
      videoEndedResolveRef.current = null;
      
      // Mark as complete and resolve completion promise
      isLipSyncRunningRef.current = false;
      if (lipSyncCompletionResolveRef.current) {
        lipSyncCompletionResolveRef.current();
        lipSyncCompletionResolveRef.current = null;
      }
      lipSyncCompletionPromiseRef.current = null;
    }
  };

  // Function to speak response by alternating advisors per paragraph (fallback)
  const speakResponseInParagraphs = (text: string) => {
    // Reset cancellation flag
    paragraphCancelledRef.current = false;
    
    // Split by double line breaks to get paragraphs
    const paragraphs = text
      .split(/\n\n+/)
      .map(p => p.trim())
      .filter(p => p.length > 0);
    
    console.log(`TTS: Split response into ${paragraphs.length} paragraphs`);
    
    if (paragraphs.length === 0) {
      console.warn('TTS: No paragraphs found in response');
      return;
    }
    
    // Create a chain of utterances that alternate between advisors
    let paragraphIndex = 0;
    
    const speakNextParagraph = () => {
      // Check if cancelled
      if (paragraphCancelledRef.current) {
        console.log('TTS: Paragraph chain cancelled');
        setIsParagraphSpeaking(false);
        return;
      }
      
      if (paragraphIndex >= paragraphs.length) {
        // All done
        setIsParagraphSpeaking(false);
        return;
      }
      
      const paragraph = paragraphs[paragraphIndex];
      const usePrimary = paragraphIndex % 2 === 0; // Even indices use primary, odd use support
      
      console.log(`TTS: Speaking paragraph ${paragraphIndex + 1}/${paragraphs.length} with ${usePrimary ? 'Primary' : 'Support'} advisor`);
      
      // Mark as speaking
      setIsParagraphSpeaking(true);
      
      // Update active avatar for speaking indicator
      setActiveAvatar(usePrimary ? 'primary' : 'support');
      
      // Get available voices
      const voices = window.speechSynthesis.getVoices();
      const femaleUKVoices = voices.filter((voice) => {
        const name = voice.name.toLowerCase();
        const lang = voice.lang.toLowerCase();
        const isUK = lang.startsWith('en-gb') || name.includes('uk') || name.includes('british');
        const isFemale = name.includes('female') || name.includes('woman') ||
                         name.includes('hazel') || name.includes('susan') || 
                         name.includes('kate') || name.includes('serena') ||
                         name.includes('karen') || name.includes('fiona') ||
                         name.includes('libby') || name.includes('olivia');
        return isUK && isFemale;
      });
      const ukVoice = voices.find(v => v.lang.startsWith('en-GB'));
      const selectedVoice = femaleUKVoices[0] || ukVoice || voices[0] || null;
      
      if (selectedVoice) {
        console.log(`TTS: Using voice: ${selectedVoice.name} (${selectedVoice.lang})`);
      } else {
        console.warn('TTS: No voice selected, will use browser default');
      }
      
      // Create utterance
      const utterance = new SpeechSynthesisUtterance(paragraph);
      utterance.voice = selectedVoice;
      utterance.lang = 'en-GB';
      
      if (usePrimary) {
        utterance.pitch = 1.5;
        utterance.rate = 0.95;
      } else {
        utterance.pitch = 0.95;
        utterance.rate = 1.0;
      }
      
      // When this paragraph finishes, speak the next one
      utterance.onend = () => {
        paragraphIndex++;
        // Small pause between paragraphs
        setTimeout(speakNextParagraph, 400);
      };
      
      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event.error);
        // Try to continue anyway
        paragraphIndex++;
        setTimeout(speakNextParagraph, 400);
      };
      
      // Speak this paragraph
      window.speechSynthesis.speak(utterance);
    };
    
    // Start with the first paragraph
    speakNextParagraph();
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
        
        // Calculate AI response count
        const aiCount = updated.filter(m => m.role === 'assistant').length;
        
        // Enable second avatar immediately when we reach 2 AI responses
        if (aiCount >= 2) {
          setTimeout(() => setIsSecondAvatarEnabled(true), 0);
        }
        
        // Determine which avatar should speak this response
        const secondAvatarShouldBeActive = aiCount >= 2;
        const shouldUseSupportAvatar = secondAvatarShouldBeActive && aiCount % 2 === 0;
        setActiveAvatar(shouldUseSupportAvatar ? 'support' : 'primary');
        
        // Auto-play TTS for AI responses if not muted - use lip-sync video
        if (!isMuted && isSupported) {
          setTimeout(() => {
            speakResponseWithLipSync(data.message);
          }, 100);
        }
        
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
    // Set cancellation flag to prevent paragraph chaining
    paragraphCancelledRef.current = true;
    
    // Resolve any pending video promises to unblock awaiting coroutines
    if (videoEndedResolveRef.current) {
      console.log('[LipSync] Resolving pending video promise due to stop');
      videoEndedResolveRef.current();
      videoEndedResolveRef.current = null;
    }
    
    primaryTTS.stop();
    supportTTS.stop();
    window.speechSynthesis.cancel();
    setIsParagraphSpeaking(false);
    
    // Clear video sources
    setPrimaryVideoSrc(null);
    setSupportVideoSrc(null);
    
    // Reset active avatar
    setActiveAvatar('primary');
    
    // DO NOT clear isLipSyncRunningRef here - let cleanup block handle it
    // This ensures the coroutine completes its cleanup before a new run starts
  };

  const handleClearChat = () => {
    stopAllSpeech();
    setMessages([]);
    setIsSecondAvatarEnabled(false);
    setActiveAvatar('primary');
  };

  const handleToggleMute = () => {
    if (!isMuted) {
      stopAllSpeech();
    }
    setIsMuted(!isMuted);
  };

  const handleReplayMessage = (content: string) => {
    if (isMuted) {
      toast({
        title: "Voice is muted",
        description: "Please unmute to replay this message.",
        variant: "default",
      });
      return;
    }
    
    if (!isSupported) {
      toast({
        title: "Text-to-speech not supported",
        description: "Your browser doesn't support text-to-speech.",
        variant: "destructive",
      });
      return;
    }
    
    // Use primary avatar for replays
    primaryTTS.speak(content, {
      pitch: 1.5,
      rate: 0.95,
      lang: 'en-GB'
    });
  };

  // Auto-enable second avatar after 2 AI responses
  useEffect(() => {
    const aiResponseCount = messages.filter(m => m.role === 'assistant').length;
    if (aiResponseCount >= 2 && !isSecondAvatarEnabled) {
      setIsSecondAvatarEnabled(true);
    }
  }, [messages, isSecondAvatarEnabled]);

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

  // Stop speech when component unmounts
  useEffect(() => {
    return () => {
      stopAllSpeech();
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
                    onClick={stopAllSpeech}
                    className="gap-2 animate-pulse"
                    data-testid="button-stop-speaking"
                    title="Stop speaking"
                  >
                    <StopCircle className="h-4 w-4" />
                    Stop Speaking
                  </Button>
                )}
                {isSupported && (
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
                )}
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
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-280px)]">
              <AvatarWelcome isSpeaking={isSpeaking} />
              <div className="text-center mb-8 max-w-lg" data-testid="welcome-prompt">
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  How can I help you today?
                </h2>
                <p className="text-base text-muted-foreground">
                  Ask me anything about UK taxes, HMRC regulations, and personal finance
                </p>
              </div>
              
              <ExamplePrompts onPromptClick={handlePromptClick} disabled={!isUnlocked} />
            </div>
          ) : (
            <div className="flex flex-col lg:flex-row gap-6 items-center justify-center h-full">
              {/* Text Output Box - Mobile Phone Style */}
              <div className="relative w-full lg:w-[307px] h-[400px] lg:h-[480px]" data-testid="phone-container">
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
                        <div
                          key={message.id}
                          className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                          data-testid={`message-${message.role}-${message.id}`}
                        >
                          <div
                            className={`max-w-[85%] rounded-2xl px-3 py-2 ${
                              message.role === 'user'
                                ? 'bg-[#25D366] text-white rounded-br-sm'
                                : 'bg-muted text-foreground rounded-bl-sm'
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap break-words">
                              {message.content}
                            </p>
                            <p className={`text-[10px] mt-1 ${
                              message.role === 'user' ? 'text-white/70' : 'text-muted-foreground'
                            }`}>
                              {message.timestamp}
                            </p>
                          </div>
                        </div>
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

              {/* Avatars - Side by Side */}
              <div className="flex flex-row gap-4 flex-shrink-0">
                <AvatarWelcome 
                  isSpeaking={(primaryTTS.isSpeaking || isParagraphSpeaking) && activeAvatar === 'primary'}
                  isDimmed={isParagraphSpeaking && activeAvatar === 'support'}
                  avatarId="primary"
                  label="Consultant"
                  avatarImage={defaultAvatarImage}
                  videoSrc={primaryVideoSrc}
                  onVideoEnded={handleVideoEnded}
                />
                <AvatarWelcome 
                  isSpeaking={(supportTTS.isSpeaking || isParagraphSpeaking) && activeAvatar === 'support'} 
                  isDisabled={!isSecondAvatarEnabled && !(isParagraphSpeaking && activeAvatar === 'support')}
                  isDimmed={isParagraphSpeaking && activeAvatar === 'primary' && isSecondAvatarEnabled}
                  avatarId="support"
                  label="Partner"
                  avatarImage={femaleAdvisorImage}
                  videoSrc={supportVideoSrc}
                  onVideoEnded={handleVideoEnded}
                />
              </div>
            </div>
          )}
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
