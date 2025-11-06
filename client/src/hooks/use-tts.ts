import { useEffect, useRef, useState, useCallback } from 'react';

export interface TTSOptions {
  voice?: SpeechSynthesisVoice;
  rate?: number;
  pitch?: number;
  volume?: number;
  lang?: string;
}

export function useTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [currentUtterance, setCurrentUtterance] = useState<SpeechSynthesisUtterance | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setIsSupported(true);

      const loadVoices = () => {
        const availableVoices = window.speechSynthesis.getVoices();
        setVoices(availableVoices);
      };

      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;

      return () => {
        window.speechSynthesis.cancel();
        window.speechSynthesis.onvoiceschanged = null;
      };
    }
  }, []);

  const speak = useCallback((text: string, options: TTSOptions = {}) => {
    if (!isSupported) {
      console.error('Text-to-speech is not supported in this browser');
      return;
    }

    // Use current voices or reload if empty
    let voiceList = voices;
    if (voiceList.length === 0) {
      console.warn('No voices available yet, attempting to reload');
      const availableVoices = window.speechSynthesis.getVoices();
      if (availableVoices.length === 0) {
        // Schedule retry after voices load
        const retrySpeak = () => {
          window.speechSynthesis.removeEventListener('voiceschanged', retrySpeak);
          speak(text, options);
        };
        window.speechSynthesis.addEventListener('voiceschanged', retrySpeak);
        return;
      }
      voiceList = availableVoices;
      setVoices(availableVoices);
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Find female UK English voices
    const femaleUKVoices = voiceList.filter((voice) => {
      const name = voice.name.toLowerCase();
      const lang = voice.lang.toLowerCase();
      const isUK = lang.startsWith('en-gb') || name.includes('uk') || name.includes('british');
      const isFemale = name.includes('female') || 
                       name.includes('woman') ||
                       name.includes('hazel') || 
                       name.includes('susan') || 
                       name.includes('kate') ||
                       name.includes('serena') ||
                       name.includes('karen') ||
                       name.includes('fiona') ||
                       name.includes('libby') ||
                       name.includes('olivia');
      return isUK && isFemale;
    });
    
    // Fallback to any UK voice
    const ukVoice = voiceList.find(
      (voice) => voice.lang.startsWith('en-GB') || voice.name.toLowerCase().includes('uk') || voice.name.toLowerCase().includes('british')
    );
    
    // Select voice: specified > female UK > any UK > first available
    const selectedVoice = options.voice || femaleUKVoices[0] || ukVoice || voiceList[0] || null;
    
    // Log selected voice for debugging
    if (selectedVoice) {
      console.log('TTS using voice:', selectedVoice.name, selectedVoice.lang);
    } else {
      console.warn('No suitable voice found, using default');
    }
    
    utterance.voice = selectedVoice;
    utterance.rate = options.rate || 0.95; // Slightly slower for clarity
    utterance.pitch = options.pitch || 1.0;
    utterance.volume = options.volume || 1.0;
    utterance.lang = options.lang || 'en-GB';

    utterance.onstart = () => {
      setIsSpeaking(true);
      setIsPaused(false);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
      utteranceRef.current = null;
      setCurrentUtterance(null);
    };

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event.error);
      setIsSpeaking(false);
      setIsPaused(false);
      utteranceRef.current = null;
      setCurrentUtterance(null);
    };

    utteranceRef.current = utterance;
    setCurrentUtterance(utterance);
    window.speechSynthesis.speak(utterance);
  }, [isSupported, voices]);

  const stop = useCallback(() => {
    if (isSupported) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setIsPaused(false);
      utteranceRef.current = null;
      setCurrentUtterance(null);
    }
  }, [isSupported]);

  const pause = useCallback(() => {
    if (isSupported && isSpeaking) {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  }, [isSupported, isSpeaking]);

  const resume = useCallback(() => {
    if (isSupported && isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    }
  }, [isSupported, isPaused]);

  return {
    speak,
    stop,
    pause,
    resume,
    isSpeaking,
    isPaused,
    isSupported,
    voices,
    currentUtterance,
  };
}
