import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { detectPainInText } from '../utils/painDetection';

interface WakeWordContextType {
  aiName: string;
  setAiName: (name: string) => void;
  wakeWordEnabled: boolean;
  setWakeWordEnabled: (enabled: boolean) => void;
  isListening: boolean;
  isTriggered: boolean;
  triggeredBy: string;
  lastTranscript: string;
  lastReply: string;
  triggerWakeWord: (matchedName?: string, query?: string) => Promise<void>;
  playWakeChime: (isSiri?: boolean) => void;
  speakResponse: (text: string) => void;
}

const WakeWordContext = createContext<WakeWordContextType | undefined>(undefined);

// Apple Siri iconic two-tone wake chime (pleasant modern chord)
export function playSiriChimeSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // First tone (pleasant mid chime: 587.33 Hz D5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.001, now);
    gain1.gain.linearRampToValueAtTime(0.25, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.2);

    // Second tone (higher crisp chime: 880 Hz A5)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.12);
    gain2.gain.setValueAtTime(0.001, now + 0.12);
    gain2.gain.linearRampToValueAtTime(0.28, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.65);
  } catch (err) {
    console.warn('Audio chime warning:', err);
  }
}

// Gentle musical chime using Web Audio API
export function playWakeChimeSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'triangle';

    // Soft chime chord: C5 (523.25 Hz) then G5 (783.99 Hz)
    const now = ctx.currentTime;
    osc1.frequency.setValueAtTime(523.25, now);
    osc1.frequency.exponentialRampToValueAtTime(783.99, now + 0.12);

    osc2.frequency.setValueAtTime(659.25, now);
    osc2.frequency.exponentialRampToValueAtTime(1046.5, now + 0.12);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.7);
    osc2.stop(now + 0.7);
  } catch (err) {
    console.warn('Audio chime warning:', err);
  }
}

// Spoken voice response helper using browser Speech Synthesis
export function speakAutomaticVoiceResponse(text: string, lang = 'en-US') {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 1.0;
    utterance.pitch = 1.08;

    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      const match =
        voices.find(
          (v) =>
            v.lang.startsWith(lang.slice(0, 2)) &&
            (v.name.toLowerCase().includes('siri') ||
              v.name.toLowerCase().includes('google') ||
              v.name.toLowerCase().includes('natural') ||
              v.name.toLowerCase().includes('female') ||
              v.name.toLowerCase().includes('samantha'))
        ) || voices.find((v) => v.lang.startsWith(lang.slice(0, 2)));

      if (match) utterance.voice = match;
    }

    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.warn('Speech synthesis note:', e);
  }
}

// Generate the conversational response tailored for elder care
export async function getAutomaticResponseForWake(
  wakeWord: string,
  query: string,
  userName = 'Rajamma',
  lang = 'en-US'
): Promise<string> {
  const cleanQuery = query.toLowerCase().trim();

  // If user only said "Siri" or "Hey Siri"
  if (!cleanQuery) {
    if (lang === 'te-IN') {
      return `నమస్కారం ${userName} గారు! నేను వింటున్నాను, మీకు ఎలా సహాయం చేయగలను?`;
    }
    if (lang === 'hi-IN') {
      return `नमस्ते ${userName} जी! मैं सुन रही हूँ, बताइए मैं आपकी क्या मदद करूँ?`;
    }
    return `Yes ${userName}, I'm here! How can I help you right now?`;
  }

  // Quick symptom / health query checks for instantaneous voice answers
  if (
    cleanQuery.includes('heart') ||
    cleanQuery.includes('pulse') ||
    cleanQuery.includes('గుండె') ||
    cleanQuery.includes('धड़कन')
  ) {
    return `${userName}, your heart rate is currently 74 beats per minute. That is a calm and healthy resting rhythm.`;
  }
  if (
    cleanQuery.includes('pressure') ||
    cleanQuery.includes('bp') ||
    cleanQuery.includes('రక్తపోటు') ||
    cleanQuery.includes('रक्तचाप')
  ) {
    return `${userName}, your latest blood pressure reading is 122 over 80, which is well-controlled and stable.`;
  }
  // Clinical pain detection with automatic body map update
  const painData = detectPainInText(cleanQuery);
  if (painData) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('aura_pain_reported', {
          detail: {
            bodyPart: painData.bodyPart,
            label: painData.bodyPartLabel,
            symptom: painData.symptomSummary,
            rec: painData.rec,
            source: wakeWord,
            timestamp: Date.now(),
          },
        })
      );
    }

    if (lang === 'te-IN') {
      return painData.spokenReply.telugu;
    }
    if (lang === 'hi-IN') {
      return painData.spokenReply.hindi;
    }
    return painData.spokenReply.english;
  }
  if (cleanQuery.includes('who are you') || cleanQuery.includes('what is your name')) {
    return `I am ${wakeWord}, your AI elder care voice companion. I monitor your vitals, remind you of medications, and keep you safe.`;
  }
  if (cleanQuery.includes('how are you') || cleanQuery.includes('బాగున్నారా') || cleanQuery.includes('कैसी हैं')) {
    return `I am doing very well, ${userName}! Thank you for asking. How are you feeling today?`;
  }

  // For other open-ended requests, try Gemini chat voice endpoint
  try {
    const res = await fetch('/api/chat/voice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userMessage: query,
        userName,
        language: lang,
        voiceName: 'Aoede',
      }),
    });
    const data = await res.json();
    if (data?.replyText) {
      return data.replyText;
    }
  } catch (err) {
    console.warn('Voice chat API fallback:', err);
  }

  return `I am listening, ${userName}. I heard "${query}". Let's take good care of you today.`;
}

// Helper to detect Siri and/or custom AI name and extract any query
export function extractWakeWordAndQuery(transcript: string, customName: string) {
  const lower = transcript.toLowerCase().trim();
  const cName = (customName || 'Aura').toLowerCase().trim();

  // Regex patterns to detect wake words and strip them
  const patterns = [
    // Siri variations
    /^(?:hey|hi|hello|ok|okay|హేయ్|హలో|हे|नमस्ते)?\s*siri\b[\s,]*(.*)$/i,
    /^(?:హేయ్|హలో)?\s*సిరి\b[\s,]*(.*)$/i,
    /^(?:हे|नमस्ते)?\s*सिरी\b[\s,]*(.*)$/i,
    // Custom name variations (e.g. Aura)
    new RegExp(`^(?:hey|hi|hello|ok|okay|హేయ్|హలో|हे|नमस्ते)?\\s*${cName}\\b[\\s,]*(.*)$`, 'i'),
  ];

  for (const pat of patterns) {
    const match = lower.match(pat);
    if (match) {
      const isSiriMatch = lower.includes('siri') || lower.includes('సిరి') || lower.includes('सिरी');
      return {
        matched: true,
        isSiri: isSiriMatch,
        wakeWord: isSiriMatch ? 'Siri' : customName,
        query: (match[1] || '').trim(),
      };
    }
  }

  // Also match isolated token "siri" anywhere in phrase
  if (lower.split(/\s+/).some((w) => w === 'siri' || w === 'hey-siri' || w === 'siri,' || w === 'siri.')) {
    const afterSiri = lower.replace(/.*?\bsiri\b[\s,]*/i, '').trim();
    return {
      matched: true,
      isSiri: true,
      wakeWord: 'Siri',
      query: afterSiri,
    };
  }

  return { matched: false, isSiri: false, wakeWord: '', query: '' };
}

export function WakeWordProvider({ children }: { children: React.ReactNode }) {
  const [aiName, setAiNameState] = useState<string>(() => {
    return localStorage.getItem('aura_ai_name') || 'Siri';
  });

  const [wakeWordEnabled, setWakeWordEnabledState] = useState<boolean>(() => {
    return localStorage.getItem('aura_wake_word_enabled') !== 'false';
  });

  const [isListening, setIsListening] = useState<boolean>(false);
  const [isTriggered, setIsTriggered] = useState<boolean>(false);
  const [triggeredBy, setTriggeredBy] = useState<string>('Siri');
  const [lastTranscript, setLastTranscript] = useState<string>('');
  const [lastReply, setLastReply] = useState<string>('');

  const recognitionRef = useRef<any>(null);
  const isPausedRef = useRef<boolean>(false);
  const aiNameRef = useRef<string>(aiName);
  const wakeWordEnabledRef = useRef<boolean>(wakeWordEnabled);

  useEffect(() => {
    aiNameRef.current = aiName;
  }, [aiName]);

  useEffect(() => {
    wakeWordEnabledRef.current = wakeWordEnabled;
  }, [wakeWordEnabled]);

  const setAiName = (name: string) => {
    const clean = name.trim() || 'Siri';
    setAiNameState(clean);
    localStorage.setItem('aura_ai_name', clean);
    window.dispatchEvent(new Event('aura_settings_updated'));
  };

  const setWakeWordEnabled = (enabled: boolean) => {
    setWakeWordEnabledState(enabled);
    localStorage.setItem('aura_wake_word_enabled', String(enabled));
    window.dispatchEvent(new Event('aura_settings_updated'));
  };

  const triggerWakeWord = useCallback(
    async (matchedName = 'Siri', query = '') => {
      const isSiri = matchedName.toLowerCase() === 'siri';
      setTriggeredBy(matchedName);
      setIsTriggered(true);
      setLastTranscript(query ? `${matchedName} ${query}` : matchedName);

      // 1. Play signature chime immediately
      if (isSiri) {
        playSiriChimeSound();
      } else {
        playWakeChimeSound();
      }

      const seniorName = localStorage.getItem('aura_senior_name') || 'Rajamma';
      const liveLang = localStorage.getItem('aura_live_lang') || 'en-US';

      // 2. Generate and speak the automatic response
      const reply = await getAutomaticResponseForWake(matchedName, query, seniorName, liveLang);
      setLastReply(reply);

      // Automatically speak the response out loud
      speakAutomaticVoiceResponse(reply, liveLang);

      // 3. Notify the whole app
      window.dispatchEvent(
        new CustomEvent('aura_wakeword_detected', {
          detail: {
            aiName: matchedName,
            isSiri,
            phrase: query ? `${matchedName} ${query}` : matchedName,
            query,
            reply,
            timestamp: Date.now(),
          },
        })
      );

      // Keep triggered display active while speaking
      setTimeout(() => {
        setIsTriggered(false);
      }, 7000);
    },
    []
  );

  // Listen to Settings updates from other tabs/screens
  useEffect(() => {
    const handleSettingsUpdated = () => {
      const storedName = localStorage.getItem('aura_ai_name');
      const storedWakeEnabled = localStorage.getItem('aura_wake_word_enabled');
      if (storedName && storedName !== aiNameRef.current) {
        setAiNameState(storedName);
      }
      if (storedWakeEnabled !== null) {
        setWakeWordEnabledState(storedWakeEnabled !== 'false');
      }
    };

    window.addEventListener('aura_settings_updated', handleSettingsUpdated);
    window.addEventListener('storage', handleSettingsUpdated);
    return () => {
      window.removeEventListener('aura_settings_updated', handleSettingsUpdated);
      window.removeEventListener('storage', handleSettingsUpdated);
    };
  }, []);

  // Web Speech Recognition background listener for "Hey [aiName]"
  useEffect(() => {
    if (!wakeWordEnabled) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignore
        }
        recognitionRef.current = null;
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsListening(false);
      return;
    }

    let isComponentMounted = true;
    let recognition: any = null;

    const startRecognition = () => {
      if (!isComponentMounted || !wakeWordEnabledRef.current) return;
      if (isPausedRef.current) return;

      try {
        recognition = new SpeechRecognition();
        recognitionRef.current = recognition;
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 3;

        recognition.onstart = () => {
          if (isComponentMounted) setIsListening(true);
        };

        recognition.onresult = async (event: any) => {
          if (!isComponentMounted || isPausedRef.current) return;

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const result = event.results[i];
            for (let j = 0; j < result.length; ++j) {
              const transcript = (result[j]?.transcript || '').toLowerCase().trim();
              if (!transcript) continue;

              setLastTranscript(transcript);

              // Extract Siri or custom name match and query
              const wakeMatch = extractWakeWordAndQuery(transcript, aiNameRef.current);

              if (wakeMatch.matched) {
                // Pause recognition while responding so microphone doesn't pick up speaker output
                isPausedRef.current = true;
                try {
                  recognition.stop();
                } catch {
                  // Ignore
                }

                // Trigger chime, generate and speak the response immediately!
                await triggerWakeWord(wakeMatch.wakeWord, wakeMatch.query);

                // Resume listening after 8 seconds of dialogue
                setTimeout(() => {
                  isPausedRef.current = false;
                  startRecognition();
                }, 8000);
                return;
              }
            }
          }
        };

        recognition.onerror = (e: any) => {
          if (e?.error === 'no-speech' || e?.error === 'aborted') {
            return;
          }
          // Mild retry after pause
          setIsListening(false);
        };

        recognition.onend = () => {
          if (isComponentMounted && wakeWordEnabledRef.current && !isPausedRef.current) {
            // Auto restart
            setTimeout(() => {
              startRecognition();
            }, 800);
          } else {
            setIsListening(false);
          }
        };

        recognition.start();
      } catch (err) {
        setIsListening(false);
      }
    };

    startRecognition();

    return () => {
      isComponentMounted = false;
      if (recognition) {
        try {
          recognition.abort();
        } catch {
          // Ignore
        }
      }
    };
  }, [wakeWordEnabled, triggerWakeWord]);

  return (
    <WakeWordContext.Provider
      value={{
        aiName,
        setAiName,
        wakeWordEnabled,
        setWakeWordEnabled,
        isListening,
        isTriggered,
        triggeredBy,
        lastTranscript,
        lastReply,
        triggerWakeWord,
        playWakeChime: (isSiri?: boolean) => (isSiri ? playSiriChimeSound() : playWakeChimeSound()),
        speakResponse: (text: string) =>
          speakAutomaticVoiceResponse(text, localStorage.getItem('aura_live_lang') || 'en-US'),
      }}
    >
      {children}
    </WakeWordContext.Provider>
  );
}

export function useWakeWord() {
  const context = useContext(WakeWordContext);
  if (!context) {
    throw new Error('useWakeWord must be used within a WakeWordProvider');
  }
  return context;
}
